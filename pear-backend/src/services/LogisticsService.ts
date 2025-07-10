
import type { MachinePurchasingService } from "./MachinePurchasingService.js"
import type { DeliveryConfirmation } from "../types/publicApi.js";
import {pool} from "../config/database.js";
import { createPickup as createConsumerPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createPickupRequest as createBulkPickup }     from "../externalAPIs/BulkLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";

export class LogisticsService {

   constructor(private machinePurchasingService: MachinePurchasingService) {} 

  async confirmGoodsDelivered(delivery: DeliveryConfirmation): Promise<void> {

    const isMachineDelivery = await this.isMachineDeliveryReference(delivery.delivery_reference)

    if (isMachineDelivery) {
      const success = await this.machinePurchasingService.confirmMachineDelivery(delivery.delivery_reference)

      if (success) {
        console.log(`Machine delivery confirmed successfully`)
      } else {
        throw new Error(`Failed to confirm machine delivery for reference ${delivery.delivery_reference}`)
      }
    } else {
      // TODO: Handle parts delivery confirmation
      // TODO: Find bulk_delivery record by delivery_reference
      // TODO: Update units_received instead of status
      // TODO: Update parts inventory
    }
  }

  async confirmGoodsCollection(collection: DeliveryConfirmation): Promise<void> {
    // TODO: Find consumer_delivery record by delivery_reference
    // TODO: Update units_collected instead of status
    // TODO: Update phone stock

  }

  private async isMachineDeliveryReference(deliveryReference: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const result = await client.query(`SELECT 1 FROM machine_deliveries WHERE delivery_reference = $1`, [
        deliveryReference,
      ])
      return result.rows.length > 0
    } catch (error) {
      console.error("Error checking machine delivery reference:", error)
      return false
    } finally {
      client.release()
    }
  }

  getConsumerPendingDeliveries = async () => {
    const query = `
    SELECT 
      p.model,
      SUM(oi.quantity)::INTEGER AS units_pending,
      SUM(cd.cost) AS cost
    FROM consumer_deliveries cd
    JOIN orders o ON o.order_id = cd.order_id
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN phones p ON p.phone_id = oi.phone_id
    WHERE cd.units_collected = 0
    GROUP BY p.model
    ORDER BY p.model;
    `
    const result = await pool.query(query)
    return result.rows
  }

  getBulkDeliveries = async () => {
    const query = `
    SELECT 
      p.name AS part,
      SUM(pp.quantity) AS quantity,
      SUM(bd.cost) AS cost
    FROM bulk_deliveries bd
    JOIN parts_purchases pp ON bd.parts_purchase_id = pp.parts_purchase_id
    JOIN parts p ON pp.part_id = p.part_id
    GROUP BY p.name
    ORDER BY p.name;
    `
    const result = await pool.query(query)
    return result.rows
  }

  getMachineDeliveries = async () => {
    return await this.machinePurchasingService.getPendingMachineDeliveries()
  }

  getMachineDeliveryStats = async () => {
    return await this.machinePurchasingService.getMachineDeliveryStats()
  };

  async deliverGoods(orderId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const quantityRes = await pool.query<{ total: number }>(
        `
        SELECT COALESCE(SUM(quantity), 0) AS total
          FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

      const pickupRes = await createConsumerPickup({
        quantity: quantityRes.rows[0].total,
        pickup_from: "pear-company",
        delivery_to: "customer",
      });

      const { rows: statusRows } = await client.query<{ status_id: number }>(
        `SELECT status_id
          FROM status
          WHERE description = 'reserved'`
      );
      if (statusRows.length === 0) {
        throw new Error(`Status 'reserved' not defined in status table.`);
      }
      const pendingStatusId = statusRows[0].status_id;

      await client.query(
        `
        INSERT INTO consumer_deliveries
          (order_id, delivery_reference, cost, status, account_id)
        VALUES
          ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          pickupRes?.refernceno,
          pickupRes?.amount,      
          pendingStatusId,
          "unknown"
        ]
      );

      console.log(`Created consumer_delivery with reference ${pickupRes}`);

      await createTransaction({
        to_account_number: "unknown", //TODO: account number
        amount: pickupRes?.amount || 0,
        description: `Payment for delivery #${ pickupRes?.refernceno}`
      });
      console.log(`Payment for delivery #${ pickupRes?.refernceno}`);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async requestBulkDelivery(
    partsPurchaseId: number,
    address: string
  ): Promise<void> {

    const pickupRes = await createBulkPickup({
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

