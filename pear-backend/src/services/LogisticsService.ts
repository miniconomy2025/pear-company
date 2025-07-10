
import type { MachinePurchasingService } from "./MachinePurchasingService.js"
import type { DeliveryConfirmation } from "../types/publicApi.js";
import {pool} from "../config/database.js";

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
}

