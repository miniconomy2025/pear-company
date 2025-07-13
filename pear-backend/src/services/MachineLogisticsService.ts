import { pool } from "../config/database.js"
import { createPickupRequest, getPickupRequest } from "../externalAPIs/BulkLogisticsAPIs.js" 
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js"
import type { BulkCreatePickUpRequest, BulkCreatePickUpResponse } from "../types/extenalApis.js"
import type { SimulationBuyMachineResponse } from "../types/extenalApis.js"

interface MachineDeliveryTracking {
  machineOrderId: number
  pickupRequestId: number
  deliveryReference: number
  status: "pickup_requested" | "payment_pending" | "in_transit" | "delivered" | "failed"
  cost: number
  paymentReference?: string
  transactionNumber?: string
}

export class MachineLogisticsService {

  async arrangePickup(orderResponse: SimulationBuyMachineResponse, machineOrderId: number): Promise<boolean> {
    try {
      
      const items = []
      for (let i = 0; i < orderResponse.quantity; i++) {
        items.push({
          itemName: orderResponse.machineName,
          quantity: orderResponse.unitWeight, // Each machine's weight as quantity
        })
      }

      const pickupRequest: BulkCreatePickUpRequest = {
        originalExternalOrderId: orderResponse.orderId.toString(),
        originCompanyId: "thoh",
        destinationCompanyId: "pear-company",
        items: items,
      }

      const pickupResponse = await createPickupRequest(pickupRequest)

      if (!pickupResponse) {
        throw new Error("Failed to create pickup request")
      }

      await this.storePickupRequest(machineOrderId, pickupResponse)

      const paymentResponse = await createTransaction({
        to_account_number: pickupResponse.bulkLogisticsBankAccountNumber,
        to_bank_name: "commercial-bank",
        amount: pickupResponse.cost,
        description: `Logistics payment for machine pickup (Request #${pickupResponse.pickupRequestId}, Ref: ${pickupResponse.paymentReferenceId})`,
      })

      if (!paymentResponse || !paymentResponse.success) {
        throw new Error("Logistics payment failed")
      }

      // Step 4: Update pickup record with payment info
      await this.updatePickupPayment(
        pickupResponse.pickupRequestId,
        pickupResponse.bulkLogisticsBankAccountNumber,
        
      )

      return true
    } catch (error) {
      console.error(`Failed to arrange pickup for order ${orderResponse.orderId}:`, error)
      return false
    }
  }

  private async storePickupRequest(machineOrderId: number, pickupResponse: BulkCreatePickUpResponse): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(
        `
        INSERT INTO machine_deliveries (
          machine_purchases_id, delivery_reference, cost, address, 
          account_number, created_at, units_received
        ) VALUES ($1, $2, $3, $4, $5, NOW(), 0)
      `,
        [
          machineOrderId,
          pickupResponse.pickupRequestId,
          pickupResponse.cost,
          "pear-company", 
          pickupResponse.bulkLogisticsBankAccountNumber
        ],
      )

    } catch (error) {
      console.error("Error storing pickup request:", error)
      throw error
    } finally {
      client.release()
    }
  }

  private async updatePickupPayment(
    pickupRequestId: number,
    accountNumber: string
  ): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(
        `
      UPDATE machine_deliveries 
      SET account_number = $1
      WHERE delivery_reference = $2
    `,
        [accountNumber, pickupRequestId],
      )

    } catch (error) {
      console.error("Error updating pickup payment:", error)
      throw error
    } finally {
      client.release()
    }
  }

  async checkPickupStatus(pickupRequestId: number): Promise<any> {
    try {
      const statusResponse = await getPickupRequest(pickupRequestId) 

      if (!statusResponse) {
        throw new Error(`Failed to get status for pickup request ${pickupRequestId}`)
      }


      return {
        pickupRequestId: statusResponse.pickupRequestId,
        status: statusResponse.status,
        cost: statusResponse.cost,
        originCompany: statusResponse.originCompanyName,
        originalOrderId: statusResponse.originalExternalOrderId,
        requestDate: statusResponse.requestDate,
        items: statusResponse.items,
      }
    } catch (error) {
      console.error(`Error checking pickup status for ${pickupRequestId}:`, error)
      return null
    }
  }

  async confirmMachineDelivery(deliveryReference: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")


      const deliveryResult = await client.query(
        `
      SELECT md.*, mp.phone_id, mp.machines_purchased, mp.rate_per_day, 
             mp.total_cost, p.model as phone_model, mp.reference_number as thoh_order_id
      FROM machine_deliveries md
      JOIN machine_purchases mp ON md.machine_purchases_id = mp.machine_purchases_id
      JOIN phones p ON mp.phone_id = p.phone_id
      WHERE md.delivery_reference = $1 AND md.units_received = 0
    `,
        [deliveryReference],
      )

      if (deliveryResult.rowCount === 0) {
        throw new Error(`Machine delivery record not found for pickup request ${deliveryReference}`)
      }

      const delivery = deliveryResult.rows[0]

      // Step 2: Verify that logistics payment was confirmed
      if (!delivery.account_number || !delivery.account_number.includes("|PAID")) {
        throw new Error(`Logistics payment not confirmed for pickup request ${deliveryReference}`)
      }

      // Step 3: Update delivery record to mark as received
      await client.query(
        `
      UPDATE machine_deliveries 
      SET units_received = (
        SELECT machines_purchased 
        FROM machine_purchases 
        WHERE machine_purchases_id = $1
      )
      WHERE delivery_reference = $2
    `,
        [delivery.machine_purchases_id, deliveryReference],
      )

      // Step 4: Add machines to active machines table
      const costPerMachine = delivery.total_cost / delivery.machines_purchased

      for (let i = 0; i < delivery.machines_purchased; i++) {
        await client.query(
          `
        INSERT INTO machines (phone_id, rate_per_day, cost, date_acquired)
        VALUES ($1, $2, $3, NOW())
      `,
          [delivery.phone_id, delivery.rate_per_day, costPerMachine],
        )
      }

      // Step 5: Update machine purchase status to completed
      await client.query(
        `
      UPDATE machine_purchases 
      SET status = (SELECT status_id FROM status WHERE description = 'Completed')
      WHERE machine_purchases_id = $1
    `,
        [delivery.machine_purchases_id],
      )

      await client.query("COMMIT")

      return true
    } catch (error) {
      await client.query("ROLLBACK")
      console.error(`Error confirming machine delivery:`, error)
      return false
    } finally {
      client.release()
    }
  }

  async getPendingMachineDeliveries(): Promise<any[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT 
          md.delivery_reference as pickup_request_id,
          md.cost as logistics_cost,
          md.created_at as pickup_requested_at,
          mp.machines_purchased,
          mp.total_cost as machine_cost,
          mp.reference_number as thoh_order_id,
          p.model as phone_model,
          CASE 
            WHEN md.units_received = 0 THEN 'pending_delivery'
            ELSE 'delivered'
          END as status,
          (mp.total_cost + md.cost) as total_investment
        FROM machine_deliveries md
        JOIN machine_purchases mp ON md.machine_purchases_id = mp.machine_purchases_id
        JOIN phones p ON mp.phone_id = p.phone_id
        ORDER BY md.created_at DESC
      `)

      return result.rows
    } catch (error) {
      console.error("Error getting pending machine deliveries:", error)
      return []
    } finally {
      client.release()
    }
  }

  async getMachineDeliveryStats(): Promise<any> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN units_received > 0 THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN units_received = 0 THEN 1 END) as pending_deliveries,
          COALESCE(SUM(cost), 0) as total_logistics_cost,
          COALESCE(AVG(cost), 0) as avg_logistics_cost,
          COALESCE(SUM(CASE WHEN units_received > 0 THEN cost END), 0) as completed_logistics_cost
        FROM machine_deliveries
      `)

      return result.rows[0]
    } catch (error) {
      console.error("Error getting machine delivery stats:", error)
      return {}
    } finally {
      client.release()
    }
  }

  async checkAllPendingPickupStatuses(): Promise<void> {
    const client = await pool.connect()
    try {
      const pendingDeliveries = await client.query(`
        SELECT delivery_reference as pickup_request_id
        FROM machine_deliveries 
        WHERE units_received = 0
      `)

      for (const delivery of pendingDeliveries.rows) {
        const status = await this.checkPickupStatus(delivery.pickup_request_id)
      }
    } catch (error) {
      console.error("Error checking pending pickup statuses:", error)
    } finally {
      client.release()
    }
  }
}
