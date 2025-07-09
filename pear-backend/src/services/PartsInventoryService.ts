import {pool} from "../config/database.js";
import { createScreenOrder } from "../externalAPIs/ScreensAPIs.js";
import { createCaseOrder } from "../externalAPIs/CaseAPIs.js";
import { createElectronicsOrder } from "../externalAPIs/ElectronicsAPIs.js";
import { createTransaction } from "../externalAPIs/COmmercialBankAPIs.js";
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
       WHERE p.name IN ('screens', 'cases', 'electronics')`
    );
    const levels: Record<string, number> = {};
    res.rows.forEach((row) => {
      levels[row.name] = row.quantity_available;
    });
    return levels;
  }

  async checkAndOrderLowStock(): Promise<void> {
    const levels = await this.getPartLevels();

    for (const part of ["screens", "cases", "electronics"]) {
      const currentLevel = levels[part] || 0;
      if (currentLevel < THRESHOLDS[part]) {
        const amountToOrder = THRESHOLDS[part] - currentLevel;
        console.log(`Stock low for ${part}: ${currentLevel}. Ordering ${amountToOrder}.`);
        await this.orderPart(part, amountToOrder);
      } else {
        console.log(`${part} stock sufficient: ${currentLevel}`);
      }
    }
  }

  private async orderPart(part: string, quantity: number): Promise<void> {
    try {
      let order;
      switch (part) {
        case "screens": {
          const res = await createScreenOrder(quantity);
          
          if (!!res?.bankAccountNumber && !!res?.totalPrice && !!res?.orderId) {
            order = {
              to_account_number: res.bankAccountNumber,
              amount: res.totalPrice,
              description: `Payment for Order #${res.orderId} for ${part}`
            };
          }
          break;
        }
        case "cases": {
          const res = await createCaseOrder(quantity);

          if (!!res?.total_price && !!res?.id) {
            order = {
              to_account_number: "unknown", //TODO: account number
              amount: res.total_price,
              description: `Payment for Order #${res.id} for ${part}`
            };
          }
          break;
        }
        case "electronics": {
          const res = await createElectronicsOrder(quantity);
          
          if (!!res?.bankNumber && !!res?.amountDue && !!res?.orderId) {
            order = {
              to_account_number: res.bankNumber,
              amount: res.amountDue,
              description: `Payment for Order #${res.orderId} for ${part}`
            };
          }
          break;
        }
        default:
          throw new Error(`Unknown part: ${part}`);
      }

      if (!order) {
        throw new Error(`api failed: ${part}`);
      }
      await createTransaction(order);

      const partRes = await pool.query<{ part_id: number }>(
        `SELECT part_id FROM parts WHERE name = $1`,
        [part]
      );
      const partId = partRes.rows[0].part_id;
      
      const refRes = await pool.query<{ nextval: number }>(
        `SELECT nextval('parts_purchases_reference_number_seq') AS nextval`
      );
      const referenceNumber = refRes.rows[0].nextval;

      const statusRes = await pool.query<{ status_id: number }>(
        `SELECT status_id FROM status WHERE description = 'pending'`
      );
      const statusId = statusRes.rows[0].status_id;

      const purchaseRes = await pool.query<{ parts_purchase_id: number }>(
        `
        INSERT INTO parts_purchases
          (reference_number, cost, status, purchased_at, account_number, part_id, quantity)
        VALUES
          ($1, $2, $3, NOW(), $4, $5, $6)
        RETURNING parts_purchase_id`,
        [referenceNumber, order.amount, statusId, order.to_account_number, partId, quantity]
      );
      const partsPurchaseId = purchaseRes.rows[0].parts_purchase_id;

      await this.requestBulkDelivery(partsPurchaseId, part);
    } catch (err) {
      console.error(`Failed to order ${part}:`, err);
    }
  }

  private async requestBulkDelivery(
    partsPurchaseId: number,
    address: string
  ): Promise<void> {

    const pickupRes = await createPickupRequest({
      originalExternalOrderId: partsPurchaseId.toString(),
      originCompanyId: `${address}-supplier`,
      destinationCompanyId: "pear-company",
      items: [
        { description: `delivery for #${address}`}
      ]
    });
    console.log(`External pickup created:`, pickupRes);

    if (!pickupRes?.bulkLogisticsBankAccountNumber || !pickupRes?.cost || !pickupRes?.paymentReferenceId || !pickupRes?.pickupRequestId) {
      throw new Error(`Failed to create pickup`);
    }

    const refRes = await pool.query<{ nextval: number }>(
      `SELECT nextval('bulk_deliveries_bulk_delivery_id_seq') AS nextval`
    );
    const deliveryReference = refRes.rows[0].nextval;

    const statusRes = await pool.query<{ status_id: number }>(
      `SELECT status_id FROM status WHERE description = 'pending'`
    );
    const statusId = statusRes.rows[0].status_id;

    const { rows } = await pool.query<{ bulk_delivery_id: number }>(
      `
      INSERT INTO bulk_deliveries
        (parts_purchase_id, delivery_reference, cost, status, address, account_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING bulk_delivery_id
      `,
      [partsPurchaseId, deliveryReference, pickupRes.cost, statusId, `${address}-supplier`, pickupRes.bulkLogisticsBankAccountNumber]
    );
    const bulkDeliveryId = rows[0].bulk_delivery_id;
    console.log(`Inserted bulk_delivery_id=${bulkDeliveryId}`);

    await createTransaction({
      to_account_number: pickupRes.bulkLogisticsBankAccountNumber,
      amount: pickupRes.cost,
      description: `Payment for Order #${pickupRes.paymentReferenceId} for ${pickupRes.pickupRequestId}`
    });
  }
}
