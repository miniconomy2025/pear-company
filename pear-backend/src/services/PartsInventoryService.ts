import {pool} from "../config/database.js";
import { createScreenOrder } from "../externalAPIs/ScreensAPIs.js";
import { createCaseOrder } from "../externalAPIs/CaseAPIs.js";
import { createElectronicsOrder } from "../externalAPIs/ElectronicsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";
import { createPickupRequest } from "../externalAPIs/BulkLogisticsAPIs.js";

const THRESHOLDS: { [key: string]: number } = {
  screens: 500,
  cases: 500,
  electronics: 500,
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
      const currentLevel = levels[part] || 0;
      if (currentLevel < THRESHOLDS[part]) {
        const amountToOrder = THRESHOLDS[part] - currentLevel;
        await this.orderPart(part, amountToOrder, simulatedDate);
      } 
    }
  }

  async requestBulkDelivery(partsPurchaseId: number, address: string, quantity: number): Promise<void> {
    try {
        const client = await pool.connect();
        const pickupRes = await createPickupRequest({
        originalExternalOrderId: partsPurchaseId.toString(),
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

        const refRes = await client.query<{ nextval: number }>(
        `SELECT nextval('bulk_deliveries_bulk_delivery_id_seq') AS nextval`
        );
        const deliveryReference = refRes.rows[0].nextval;

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
          }
          break;
        }
        default:
          throw new Error(`Unknown part: ${part}`);
      }
      console.log('stock to order', order);

      if (!order) {
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
      
      const refRes = await client.query<{ nextval: number }>(
        `SELECT nextval('parts_purchases_reference_number_seq') AS nextval`
      );
      const referenceNumber = refRes.rows[0].nextval;

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

      await this.requestBulkDelivery(partsPurchaseId, part, quantity);
    } catch (err) {
      console.error(`Failed to order ${part}:`, err);
    }
  }
}