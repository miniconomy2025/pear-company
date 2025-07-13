import { pool } from "../config/database.js"
import { createAccount, takeLoan, getBalance } from "../externalAPIs/CommercialBankAPIs.js"

export class BankingService {
  private readonly MINIMUM_BALANCE = 1000000;
  private readonly LOAN_AMOUNT = 5000000;


  async initializeBanking(): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const existingAccount = await client.query("SELECT value FROM system_settings WHERE key = 'bank_account_number'")

      let accountNumber: string

      if (existingAccount.rows.length > 0) {
        accountNumber = existingAccount.rows[0].value
      } else {
 
        const accountResponse = await createAccount()

        if (!accountResponse || !accountResponse.account_number) {
          throw new Error("Failed to create bank account")
        }

        accountNumber = accountResponse.account_number

        await client.query(
          `INSERT INTO system_settings (key, value) 
           VALUES ('bank_account_number', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [accountNumber],
        )
      }

      const currentBalance = await this.getCurrentBalance()

      if (currentBalance === undefined || currentBalance < this.MINIMUM_BALANCE) {
        const loanAmount = 20000000

        const loanResponse = await takeLoan(loanAmount)

        if (!loanResponse || !loanResponse.success) {
          throw new Error("Failed to take initial loan")
        }

        await client.query(
          `INSERT INTO system_settings (key, value) 
           VALUES ('initial_loan_number', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [loanResponse.loan_number],
        )
      }

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("Banking initialization failed:", error)
      throw error
    } finally {
      client.release()
    }
  }

  async performDailyBalanceCheck(simulatedDate: Date): Promise<number> {
    try {
      const currentBalance = await this.getCurrentBalance()
      const simDateStr = simulatedDate.toISOString().split("T")[0]

      if (currentBalance === undefined) {
        console.warn(`Could not retrieve balance for ${simDateStr}`)
        return 0
      }

      if (currentBalance < this.MINIMUM_BALANCE) {
        const loanNumber = await this.takeAdditionalLoan(this.LOAN_AMOUNT)

        if (loanNumber) {
          await this.logEmergencyLoan(loanNumber, this.LOAN_AMOUNT, simulatedDate)
          return currentBalance + this.LOAN_AMOUNT
        } else {
          console.error(`Failed to secure emergency loan on ${simDateStr}`)
          return currentBalance
        }
      } else {
        return currentBalance
      }
    } catch (error) {
      console.error("Error during daily balance check:", error)
      return 0
    }
  }

  private async logEmergencyLoan(loanNumber: string, amount: number, simulatedDate: Date): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ($1, $2)`,
        [`emergency_loan_${simulatedDate.toISOString().split("T")[0]}`, `${loanNumber}:${amount}`],
      )
    } catch (error) {
      console.error("Error logging emergency loan:", error)
    } finally {
      client.release()
    }
  }

  async getCurrentBalance(): Promise<number | undefined> {
    try {
      return await getBalance()
    } catch (error) {
      console.error("Error getting balance:", error)
      return undefined
    }
  }

  async getBankAccountNumber(): Promise<string | null> {
    const client = await pool.connect()
    try {
      const result = await client.query("SELECT value FROM system_settings WHERE key = 'bank_account_number'")
      return result.rows.length > 0 ? result.rows[0].value : null
    } catch (error) {
      console.error("Error getting bank account number:", error)
      return null
    } finally {
      client.release()
    }
  }


  async takeAdditionalLoan(amount: number): Promise<string | null> {
    try {
      const loanResponse = await takeLoan(amount)

      if (!loanResponse || !loanResponse.success) {
        throw new Error("Failed to take additional loan")
      }

      return loanResponse.loan_number
    } catch (error) {
      console.error("Error taking additional loan:", error)
      return null
    }
  }
}
