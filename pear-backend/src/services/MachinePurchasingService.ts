import { pool } from "../config/database.js";
import { purchaseMachine, confirmMachinePayment } from "../externalAPIs/SimulationAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";
import type { SimulationBuyMachineResponse } from "../types/extenalApis.js";
import { MachineLogisticsService } from "./MachineLogisticsService.js";

export class MachinePurchasingService {
  private machineLogistics: MachineLogisticsService;
  private readonly MACHINE_CONFIGS = [
    { machineName: "ephone_machine", phoneModel: "ePhone", phoneId: 1, priority: 1 },
    { machineName: "ephone_plus_machine", phoneModel: "ePhone plus", phoneId: 2, priority: 2 },
    { machineName: "ephone_pro_max_machine", phoneModel: "ePhone pro max", phoneId: 3, priority: 3 },
  ];

  private readonly EXPANSION_THRESHOLD = 1000000;
  private readonly SAFETY_BUFFER = 200000;

  constructor() {
    this.machineLogistics = new MachineLogisticsService();
  }

  async initializeMachines(): Promise<void> {
    for (const config of this.MACHINE_CONFIGS) {
      try {
        const success = await this.purchaseAndPayForMachine(config.machineName, 3, config.phoneId);
        if (!success) {
          console.error(`Failed to acquire ${config.machineName}`);
        }
      } catch (error) {
        console.error(`Error purchasing ${config.machineName}:`, error);
      }
    }
  }

  async performDailyMachineExpansion(simulatedDate: Date, currentBalance: number): Promise<void> {
    if (currentBalance > this.EXPANSION_THRESHOLD) {
      await this.performWealthBasedExpansion(simulatedDate, currentBalance);
      return;
    }

    const expansionNeeds = await this.assessBasicMachineExpansionNeeds();
    if (expansionNeeds.length === 0) return;

    const totalCost = expansionNeeds.reduce((sum, need) => sum + need.estimatedCost, 0);
    if (currentBalance < totalCost + this.SAFETY_BUFFER) return;

    for (const need of expansionNeeds) {
      try {
        const success = await this.purchaseAndPayForMachine(need.machineName, need.quantity, need.phoneId);
        if (!success) {
          console.error(`Failed to expand ${need.machineName} capacity`);
        }
      } catch (error) {
        console.error(`Error expanding ${need.machineName}:`, error);
      }
    }
  }

  private async performWealthBasedExpansion(simulatedDate: Date, currentBalance: number): Promise<void> {
    const estimatedTotalCost = this.MACHINE_CONFIGS.length * 75000;
    if (currentBalance < estimatedTotalCost + this.SAFETY_BUFFER) return;

    let successCount = 0;
    let totalSpent = 0;

    for (const config of this.MACHINE_CONFIGS) {
      try {
        const remainingFunds = currentBalance - totalSpent;
        if (remainingFunds < 75000 + this.SAFETY_BUFFER) break;

        const success = await this.purchaseAndPayForMachine(config.machineName, 1, config.phoneId);
        if (success) {
          successCount++;
          totalSpent += 75000;
        } else {
          console.error(`Failed to purchase additional ${config.machineName}`);
        }
      } catch (error) {
        console.error(`Error in wealth expansion for ${config.machineName}:`, error);
      }
    }

    if (successCount > 0) {
      await this.logWealthExpansion(simulatedDate, successCount, totalSpent);
    }
  }

  private async logWealthExpansion(
    simulatedDate: Date,
    machinesPurchased: number,
    estimatedCost: number,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      const simDateStr = simulatedDate.toISOString().split("T")[0];
      await client.query(
        `
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `,
        [`wealth_expansion_${simDateStr}`, `machines:${machinesPurchased},cost:${estimatedCost}`],
      );
    } catch (error) {
      console.error("Error logging wealth expansion:", error);
    } finally {
      client.release();
    }
  }

  private async purchaseAndPayForMachine(machineName: string, quantity: number, phoneId: number): Promise<boolean> {
    try {
      const orderResponse = await purchaseMachine(machineName, quantity);
      if (!orderResponse) {
        throw new Error("Failed to place machine order");
      }

      const machineOrderId = await this.storeMachineOrder(orderResponse, phoneId);

      const paymentResponse = await createTransaction({
        to_account_number: orderResponse.bankAccount,
        to_bank_name: "commercial-bank",
        amount: orderResponse.totalPrice,
        description: `Payment for ${quantity}x ${machineName} (Order #${orderResponse.orderId})`,
      });

      if (!paymentResponse || !paymentResponse.success) {
        throw new Error("Payment failed");
      }

      await this.updateMachineOrderPayment(orderResponse.orderId, paymentResponse.transaction_number).catch((e) => {
        console.error(
          `Warning: payment succeeded but failed to record transaction number for order ${orderResponse.orderId}`,
          e
        );
      });

      const confirmResponse = await confirmMachinePayment(orderResponse.orderId);
      if (!confirmResponse || confirmResponse.status !== "completed") {
        throw new Error("Payment confirmation failed");
      }

      const pickupSuccess = await this.machineLogistics.arrangePickup(orderResponse, machineOrderId);
      if (!pickupSuccess) {
        console.warn(
          `Pickup arrangement failed for order ${orderResponse.orderId}, but machine is paid for (machineOrderId=${machineOrderId})`
        );
        return true;
      }

      return true;
    } catch (error) {
      console.error(`Machine purchase failed:`, error);
      return false;
    }
  }

  private async storeMachineOrder(orderResponse: SimulationBuyMachineResponse, phoneId: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO machine_purchases (
          phone_id, machines_purchased, total_cost, weight_per_machine,
          rate_per_day, status, ratio, reference_number, account_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING machine_purchases_id
        `,
        [
          phoneId,
          orderResponse.quantity,
          orderResponse.totalPrice,
          orderResponse.unitWeight,
          orderResponse.machineDetails.productionRate,
          1,
          JSON.stringify(orderResponse.machineDetails.inputRatio),
          orderResponse.orderId,
          orderResponse.bankAccount,
        ],
      );

      const machineOrderId = result.rows[0].machine_purchases_id as number;
      return machineOrderId;
    } catch (error) {
      console.error("Error storing machine order:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateMachineOrderPayment(orderId: number, transactionNumber: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `,
        [`machine_payment_txn_${orderId}`, transactionNumber],
      );
    } catch (error) {
      console.error("Error recording machine payment transaction number:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmMachineDelivery(deliveryReference: string): Promise<boolean> {
    return await this.machineLogistics.confirmMachineDelivery(deliveryReference);
  }

  private async assessBasicMachineExpansionNeeds(): Promise<
    Array<{
      machineName: string;
      phoneId: number;
      quantity: number;
      estimatedCost: number;
    }>
  > {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          p.phone_id,
          p.model,
          COUNT(m.machine_id) as current_machines,
          COALESCE(SUM(m.rate_per_day), 0) as total_daily_capacity
        FROM phones p
        LEFT JOIN machines m ON p.phone_id = m.phone_id AND m.date_retired IS NULL
        GROUP BY p.phone_id, p.model
        ORDER BY p.phone_id
      `);

      const expansionNeeds: Array<{ machineName: string; phoneId: number; quantity: number; estimatedCost: number }> =
        [];

      for (const row of result.rows) {
        if (Number(row.current_machines) < 3) {
          const config = this.MACHINE_CONFIGS.find((c) => c.phoneId === row.phone_id);
          if (config) {
            expansionNeeds.push({
              machineName: config.machineName,
              phoneId: row.phone_id,
              quantity: 1,
              estimatedCost: 50000,
            });
          }
        }
      }

      return expansionNeeds;
    } catch (error) {
      console.error("Error assessing basic machine expansion needs:", error);
      return [];
    } finally {
      client.release();
    }
  }

  async getMachineStatus(): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          p.model as phone_model,
          COUNT(m.machine_id) as active_machines,
          COALESCE(SUM(m.rate_per_day), 0) as total_daily_capacity,
          COALESCE(AVG(m.cost), 0) as avg_machine_cost,
          MAX(m.date_acquired) as last_acquired
        FROM phones p
        LEFT JOIN machines m ON p.phone_id = m.phone_id AND m.date_retired IS NULL
        GROUP BY p.phone_id, p.model
        ORDER BY p.phone_id
      `);

      return result.rows;
    } catch (error) {
      console.error("Error getting machine status:", error);
      return [];
    } finally {
      client.release();
    }
  }

  async getPendingMachineDeliveries(): Promise<any[]> {
    return await this.machineLogistics.getPendingMachineDeliveries();
  }

  async getMachineDeliveryStats(): Promise<any> {
    return await this.machineLogistics.getMachineDeliveryStats();
  }

  getExpansionThresholds(): { expansionThreshold: number; safetyBuffer: number } {
    return {
      expansionThreshold: this.EXPANSION_THRESHOLD,
      safetyBuffer: this.SAFETY_BUFFER,
    };
  }
}
