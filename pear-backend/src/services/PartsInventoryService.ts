import {pool} from "../config/database.js";
import { createScreenOrder } from "../externalAPIs/ScreensAPIs.js";
import { createCaseOrder } from "../externalAPIs/CaseAPIs.js";
import { createElectronicsOrder } from "../externalAPIs/ElectronicsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";
import { createPickupRequest } from "../externalAPIs/BulkLogisticsAPIs.js";

const THRESHOLDS: { [key: string]: number } = {
  Screens: 5000,
  Cases: 5000,
  Electronics: 5000,
};

export class PartsInventoryService {
  async getPartLevels(): Promise<Record<string, number>> {
    const res = await pool.query(
      `SELECT p.name, i.quantity_available
       FROM inventory i
       JOIN parts p ON p.part_id = i.part_id
       WHERE p.name IN ('Screens', 'Cases', 'Electronics')`
    );
    const levels: Record<string, number> = {};
    res.rows.forEach((row) => {
      levels[row.name] = row.quantity_available;
    });
    return levels;
  }

  async checkAndOrderLowStock(simulatedDate: Date): Promise<void> {
    const levels = await this.getPartLevels();
    console.log('checkAndOrderLowStock', levels);

    for (const part of ["Screens", "Cases", "Electronics"]) {
      let currentLevel = levels[part];
      let threshold = THRESHOLDS[part];

      if (!currentLevel) {
        currentLevel = 0
      }
      if (!threshold) {
        threshold = 500
      }

      console.log('currentLevel threshold', currentLevel, levels[part], threshold, THRESHOLDS[part]);

      // if (currentLevel < threshold) {
      if (currentLevel > 1000 || currentLevel < threshold) {
        // let amountToOrder = threshold - currentLevel;
        let amountToOrder = 1000;
        await this.orderPart(part, amountToOrder, simulatedDate);
      } 
    }
  }

  async requestBulkDelivery(partsPurchaseId: number, address: string, quantity: number, id: number): Promise<void> {
    try {
        const client = await pool.connect();
        const pickupRes = await createPickupRequest({
        originalExternalOrderId: id.toString(),
        originCompany: `${address}-supplier`,
        destinationCompany: "pear-company",
        items: [{
            itemName: address,
            quantity: quantity
          }]
        });
        
        if (!pickupRes?.accountNumber || !pickupRes?.cost || !pickupRes?.paymentReferenceId || !pickupRes?.pickupRequestId) {
          return;
        }

        const deliveryReference = pickupRes.pickupRequestId;

        const statusRes = await client.query<{ status_id: number }>(
        `SELECT status_id FROM status WHERE description = 'Pending'`
        );
        const statusId = statusRes.rows[0].status_id;

        const { rows } = await client.query<{ bulk_delivery_id: number }>(
        `
        INSERT INTO bulk_deliveries
            (parts_purchase_id, delivery_reference, cost, status, address, account_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING bulk_delivery_id
        `,
        [partsPurchaseId, deliveryReference, pickupRes.cost, statusId, `${address}-supplier`, pickupRes.accountNumber]
        );
        const bulkDeliveryId = rows[0].bulk_delivery_id;

        await createTransaction({
          to_account_number: pickupRes.accountNumber,
          to_bank_name: "commercial-bank",
          amount: Number(pickupRes.cost),
          description: `${pickupRes.pickupRequestId}`
        });
        client.release()
    } catch (err) {
      console.error(`Failed to order ${address}:`, err);
    }
  }

  private async orderPart(part: string, quantity: number, simulatedDate: Date): Promise<void> {
    try {
      console.log('orderPart', part, quantity, simulatedDate);
      const client = await pool.connect();
      const simTime = simulatedDate.toISOString();

      let order;
      let refNum;
      switch (part) {
        case "Screens": {
          const res = await createScreenOrder(quantity);
          
          if (!!res?.bankAccountNumber && !!res?.totalPrice && !!res?.orderId) {
            order = {
              to_account_number: res.bankAccountNumber,
              to_bank_name: "commercial-bank",
              amount: Number(res.totalPrice),
              description: `${res.orderId}`
            };
            refNum = res.orderId;
          }
          break;
        }
        case "Cases": {
          const res = await createCaseOrder(quantity);

          if (!!res?.total_price && !!res?.id) {
            order = {
              to_account_number: res.account_number,
              to_bank_name: "commercial-bank",
              amount: Number(res.total_price),
              description: `${res.id}`
            };
            refNum = res.id;
          }
          break;
        }
        case "Electronics": {
          const res = await createElectronicsOrder(quantity);
          
          if (!!res?.bankNumber && !!res?.amountDue && !!res?.orderId) {
            order = {
              to_account_number: res.bankNumber,
              to_bank_name: "commercial-bank",
              amount: Number(res.amountDue),
              description: `${res.orderId}`
            };
            refNum = res.orderId;
          }
          break;
        }
        default:
          throw new Error(`Unknown part: ${part}`);
      }
      console.log('stock to order', order);

      if (!order || !refNum) {
        return;
      }
      const paymentResponse = await createTransaction(order);

      if (!paymentResponse) {
        throw new Error("Payment failed")
      }

      const partRes = await client.query<{ part_id: number }>(
        `SELECT part_id FROM parts WHERE name = $1`,
        [part]
      );
      const partId = partRes.rows[0].part_id;
      
      const referenceNumber = refNum;

      const statusRes = await client.query<{ status_id: number }>(
        `SELECT status_id FROM status WHERE description = 'Pending'`
      );
      const statusId = statusRes.rows[0].status_id;

      const purchaseRes = await client.query<{ parts_purchase_id: number }>(
        `
        INSERT INTO parts_purchases
          (reference_number, cost, status, purchased_at, account_number, part_id, quantity)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING parts_purchase_id`,
        [referenceNumber, order.amount, statusId, order.to_account_number, partId, quantity, simTime]
      );
      const partsPurchaseId = purchaseRes.rows[0].parts_purchase_id;

      await this.requestBulkDelivery(partsPurchaseId, part, quantity, refNum);
      client.release()
    } catch (err) {
      console.error(`Failed to order ${part}:`, err);
    }
  }
}