import { pool } from "../config/database.js"
import { purchaseMachine, confirmMachinePayment } from "../externalAPIs/SimulationAPIs.js"
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js"
import type { SimulationBuyMachineResponse } from "../types/extenalApis.js"

export class MachinePurchasingService {
  private readonly MACHINE_CONFIGS = [
    { machineName: "ephone_machine", phoneModel: "ePhone", phoneId: 1, priority: 1 },
    { machineName: "ephone_plus_machine", phoneModel: "ePhone plus", phoneId: 2, priority: 2 },
    { machineName: "ephone_pro_max_machine", phoneModel: "ePhone pro max", phoneId: 3, priority: 3 },
  ]

  private readonly EXPANSION_THRESHOLD = 1000000
  private readonly SAFETY_BUFFER = 200000


  async initializeMachines(): Promise<void> {

    for (const config of this.MACHINE_CONFIGS) {
      try {
        const success = await this.purchaseAndPayForMachine(config.machineName, 3, config.phoneId)

        if (success) {
          console.log(`Successfully acquired ${config.machineName}`)
        } else {
          console.error(`Failed to acquire ${config.machineName}`)
        }
      } catch (error) {
        console.error(`Error purchasing ${config.machineName}:`, error)
      }
    }

    console.log("Machine initialization complete")
  }

  async performDailyMachineExpansion(simulatedDate: Date, currentBalance: number): Promise<void> {
    const simDateStr = simulatedDate.toISOString().split("T")[0]

    if (currentBalance > this.EXPANSION_THRESHOLD) {
      await this.performWealthBasedExpansion(simulatedDate, currentBalance)
      return
    }

    const expansionNeeds = await this.assessBasicMachineExpansionNeeds()

    if (expansionNeeds.length === 0) {
      return
    }

    const totalCost = expansionNeeds.reduce((sum, need) => sum + need.estimatedCost, 0)

    if (currentBalance < totalCost + this.SAFETY_BUFFER) {
      console.log(
        `Insufficient funds for basic expansion. Need: $${totalCost.toLocaleString()}, Available: $${(currentBalance - this.SAFETY_BUFFER).toLocaleString()}`,
      )
      return
    }

    for (const need of expansionNeeds) {
      try {
        console.log(`Basic expansion: ${need.machineName} (+${need.quantity} machines)...`)
        const success = await this.purchaseAndPayForMachine(need.machineName, need.quantity, need.phoneId)

        if (success) {
          console.log(`Successfully expanded ${need.machineName} capacity`)
        } else {
          console.error(`Failed to expand ${need.machineName} capacity`)
        }
      } catch (error) {
        console.error(`Error expanding ${need.machineName}:`, error)
      }
    }
  }

  private async performWealthBasedExpansion(simulatedDate: Date, currentBalance: number): Promise<void> {
    const simDateStr = simulatedDate.toISOString().split("T")[0]

    const estimatedTotalCost = this.MACHINE_CONFIGS.length * 75000

    if (currentBalance < estimatedTotalCost + this.SAFETY_BUFFER) {
      console.log(
        `Insufficient funds for wealth expansion. Estimated cost: $${estimatedTotalCost.toLocaleString()}, Available: $${(currentBalance - this.SAFETY_BUFFER).toLocaleString()}`,
      )
      return
    }

    console.log(`Purchasing one additional machine of each type...`)

    let successCount = 0
    let totalSpent = 0

    for (const config of this.MACHINE_CONFIGS) {
      try {

        const remainingFunds = currentBalance - totalSpent
        if (remainingFunds < 75000 + this.SAFETY_BUFFER) {
          console.log(`Stopping expansion - insufficient remaining funds: $${remainingFunds.toLocaleString()}`)
          break
        }

        const success = await this.purchaseAndPayForMachine(config.machineName, 1, config.phoneId)

        if (success) {
          successCount++
          totalSpent += 75000
          console.log(`Successfully purchased additional ${config.machineName}`)
        } else {
          console.error(`Failed to purchase additional ${config.machineName}`)
        }
      } catch (error) {
        console.error(`Error in wealth expansion for ${config.machineName}:`, error)
      }
    }

    if (successCount > 0) {
      console.log(
        `Wealth-based expansion complete: ${successCount}/${this.MACHINE_CONFIGS.length} machines purchased`,
      )

      await this.logWealthExpansion(simulatedDate, successCount, totalSpent)
    } else {
      console.log(`Wealth-based expansion failed - no machines purchased`)
    }
  }

  private async logWealthExpansion(
    simulatedDate: Date,
    machinesPurchased: number,
    estimatedCost: number,
  ): Promise<void> {
    const client = await pool.connect()
    try {
      const simDateStr = simulatedDate.toISOString().split("T")[0]
      await client.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ($1, $2)`,
        [`wealth_expansion_${simDateStr}`, `machines:${machinesPurchased},cost:${estimatedCost}`],
      )
    } catch (error) {
      console.error("Error logging wealth expansion:", error)
    } finally {
      client.release()
    }
  }

  private async purchaseAndPayForMachine(machineName: string, quantity: number, phoneId: number): Promise<boolean> {
    try {
      // Step 1: Place order with THOH
      const orderResponse = await purchaseMachine(machineName, quantity)

      if (!orderResponse) {
        throw new Error("Failed to place machine order")
      }

      console.log(`Order placed: ID ${orderResponse.orderId}, Total: $${orderResponse.totalPrice}`)

      // Step 2: Store order in database
      await this.storeMachineOrder(orderResponse, phoneId)

      // Step 3: Make payment via Commercial Bank
      const paymentResponse = await createTransaction({
        to_account_number: orderResponse.bankAccount,
        amount: orderResponse.totalPrice,
        description: `Payment for ${quantity}x ${machineName} (Order #${orderResponse.orderId})`,
      })

      if (!paymentResponse || !paymentResponse.success) {
        throw new Error("Payment failed")
      }

      console.log(`Payment successful: Transaction ${paymentResponse.transaction_number}`)

      // Step 4: Update order with transaction number
      await this.updateMachineOrderPayment(orderResponse.orderId, paymentResponse.transaction_number)

      // Step 5: Confirm payment with THOH
      const confirmResponse = await confirmMachinePayment(orderResponse.orderId)

      if (!confirmResponse || confirmResponse.status !== "completed") {
        throw new Error("Payment confirmation failed")
      }


      // Step 6: Update our database with completed machine
      await this.completeMachineOrder(orderResponse.orderId, confirmResponse)

      return true
    } catch (error) {
      console.error(`❌ Machine purchase failed:`, error)
      return false
    }
  }

  /**
   * Store machine order in database
   */
  private async storeMachineOrder(orderResponse: SimulationBuyMachineResponse, phoneId: number): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(
        `
        INSERT INTO machine_purchases (
          phone_id, machines_purchased, total_cost, weight_per_machine, 
          rate_per_day, status, ratio, reference_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
        ],
      )

      console.log(`📝 Machine order stored in database`)
    } catch (error) {
      console.error("Error storing machine order:", error)
      throw error
    } finally {
      client.release()
    }
  }

  private async updateMachineOrderPayment(orderId: number, transactionNumber: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(
        `
        UPDATE machine_purchases 
        SET account_number = $1
        WHERE reference_number = $2
      `,
        [transactionNumber, orderId],
      )

    } catch (error) {
      console.error("Error updating machine payment:", error)
      throw error
    } finally {
      client.release()
    }
  }

  private async completeMachineOrder(orderId: number, confirmResponse: any): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      await client.query(
        `
        UPDATE machine_purchases 
        SET status = (SELECT status_id FROM status WHERE description = 'Completed')
        WHERE reference_number = $1
      `,
        [orderId],
      )

      const purchaseResult = await client.query(
        `
        SELECT mp.*, p.model as phone_model
        FROM machine_purchases mp
        JOIN phones p ON mp.phone_id = p.phone_id
        WHERE mp.reference_number = $1
      `,
        [orderId],
      )

      if (purchaseResult.rows.length > 0) {
        const purchase = purchaseResult.rows[0]

        for (let i = 0; i < purchase.machines_purchased; i++) {
          await client.query(
            `
            INSERT INTO machines (phone_id, rate_per_day, cost, date_acquired)
            VALUES ($1, $2, $3, NOW())
          `,
            [
              purchase.phone_id,
              purchase.rate_per_day,
              purchase.total_cost / purchase.machines_purchased,
            ],
          )
        }

      }

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("Error completing machine order:", error)
      throw error
    } finally {
      client.release()
    }
  }

  private async assessBasicMachineExpansionNeeds(): Promise<
    Array<{
      machineName: string
      phoneId: number
      quantity: number
      estimatedCost: number
    }>
  > {
    const client = await pool.connect()
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
      `)

      const expansionNeeds = []

      for (const row of result.rows) {
        if (row.current_machines < 3) {
          const config = this.MACHINE_CONFIGS.find((c) => c.phoneId === row.phone_id)
          if (config) {
            expansionNeeds.push({
              machineName: config.machineName,
              phoneId: row.phone_id,
              quantity: 1,
              estimatedCost: 50000,
            })
          }
        }
      }

      return expansionNeeds
    } catch (error) {
      console.error("Error assessing basic machine expansion needs:", error)
      return []
    } finally {
      client.release()
    }
  }

  async getMachineStatus(): Promise<any[]> {
    const client = await pool.connect()
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
      `)

      return result.rows
    } catch (error) {
      console.error("Error getting machine status:", error)
      return []
    } finally {
      client.release()
    }
  }

  getExpansionThresholds(): { expansionThreshold: number; safetyBuffer: number } {
    return {
      expansionThreshold: this.EXPANSION_THRESHOLD,
      safetyBuffer: this.SAFETY_BUFFER,
    }
  }
}
