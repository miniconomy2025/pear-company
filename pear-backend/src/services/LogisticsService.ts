import type { DeliveryConfirmation } from "../types/publicApi.js";
import {pool} from "../config/database.js";
import { createPickup as createConsumerPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createPickupRequest as createBulkPickup }     from "../externalAPIs/BulkLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";

export class LogisticsService {
  constructor() {}

  async confirmGoodsDelivered(delivery: DeliveryConfirmation): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query<{ parts_purchase_id: number }>(
        `SELECT parts_purchase_id
           FROM bulk_deliveries
          WHERE delivery_reference = $1`,
        [delivery.delivery_reference]
      );
      if (res.rowCount === 0) {
        throw new Error(`Bulk delivery ${delivery.delivery_reference} not found.`);
      }
      const partsPurchaseId = res.rows[0].parts_purchase_id;

      await client.query(
        `UPDATE bulk_deliveries
            SET status = (
              SELECT status_id FROM status WHERE description = 'delivered'
            )
          WHERE delivery_reference = $1`,
        [delivery.delivery_reference]
      );

      await client.query(
        `
        UPDATE inventory i
           SET quantity_available = i.quantity_available - pi.quantity
          FROM parts_purchases_items pi
         WHERE pi.parts_purchase_id = $1
           AND i.part_id = (
             SELECT ps.part_id
               FROM parts_supplier ps
              WHERE ps.parts_supplier_id = pi.part_supplier_id
           )
        `,
        [partsPurchaseId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async confirmGoodsCollection(collection: DeliveryConfirmation): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query<{ order_id: number }>(
        `SELECT order_id
           FROM consumer_deliveries
          WHERE delivery_reference = $1`,
        [collection.delivery_reference]
      );
      if (res.rowCount === 0) {
        throw new Error(`Consumer delivery ${collection.delivery_reference} not found.`);
      }
      const orderId = res.rows[0].order_id;

      await client.query(
        `UPDATE consumer_deliveries
            SET status = (
              SELECT status_id FROM status WHERE description = 'collected'
            )
          WHERE delivery_reference = $1`,
        [collection.delivery_reference]
      );

      await client.query(
        `
        UPDATE stock s
           SET quantity_reserved = s.quantity_reserved - oi.quantity
          FROM order_items oi
         WHERE oi.order_id = $1
           AND s.phone_id = oi.phone_id
        `,
        [orderId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

  getConsumerDeliveries = async () => {
    const query = `
    SELECT 
      ph.model,
      SUM(oi.quantity) AS delivered,
      SUM(cd.cost) AS cost
    FROM 
      consumer_deliveries cd
    JOIN orders o ON cd.order_id = o.order_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN phones ph ON oi.phone_id = ph.phone_id
    GROUP BY 
      ph.model
    ORDER BY 
      ph.model;
    `;

    const result = await pool.query(query);
    return result.rows;
  };

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
  `;
    const result = await pool.query(query);
    return result.rows;
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

