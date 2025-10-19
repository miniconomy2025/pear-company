import { pool } from "../config/database.js";
import { createAccount, takeLoan, getBalance } from "../externalAPIs/CommercialBankAPIs.js";

export class BankingService {
  private readonly MINIMUM_BALANCE = Number.parseInt(process.env.MINIMUM_BALANCE ?? "1000000", 10);
  private readonly INITIAL_LOAN_AMOUNT = Number.parseInt(process.env.INITIAL_LOAN_AMOUNT ?? "5000000", 10);
  private readonly ADDITIONAL_LOAN_AMOUNT = Number.parseInt(process.env.ADDITIONAL_LOAN_AMOUNT ?? "5000000", 10);

  async initializeBanking(): Promise<void> {
    let accountNumber = await this.getBankAccountNumber();

    if (!accountNumber) {
      const accountResponse = await createAccount();
      if (!accountResponse || !accountResponse.account_number) {
        throw new Error("Failed to create bank account");
      }
      accountNumber = accountResponse.account_number;
    }

    const currentBalance = await this.getCurrentBalance();

    const needsInitialLoan =
      currentBalance !== undefined && currentBalance < this.MINIMUM_BALANCE
        ? (await this.getCurrentBalance())! < this.MINIMUM_BALANCE
        : false;

    let initialLoanNumber: string | null = null;
    if (needsInitialLoan) {
      const loanResponse = await takeLoan(this.INITIAL_LOAN_AMOUNT);
      if (!loanResponse || !loanResponse.success) {
        throw new Error("Failed to take initial loan");
      }
      initialLoanNumber = loanResponse.loan_number;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO system_settings (key, value)
         VALUES ('bank_account_number', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [accountNumber],
      );

      if (initialLoanNumber) {
        await client.query(
          `INSERT INTO system_settings (key, value)
           VALUES ('initial_loan_number', $1)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [initialLoanNumber],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Banking initialization failed after taking loan; loan recorded externally but not in DB.", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async performDailyBalanceCheck(simulatedDate: Date): Promise<number> {
    try {
      const currentBalance = await this.getCurrentBalance();
      const simDateStr = simulatedDate.toISOString().split("T")[0];

      if (currentBalance === undefined) {
        console.warn(`Could not reliably retrieve balance for ${simDateStr}; skipping loan decision.`);
        return 0;
      }

      if (currentBalance < this.MINIMUM_BALANCE) {
        const verify = await this.getCurrentBalance();
        if (verify !== undefined && verify < this.MINIMUM_BALANCE) {
          const loanNumber = await this.takeAdditionalLoan(this.ADDITIONAL_LOAN_AMOUNT);
          if (loanNumber) {
            await this.logEmergencyLoan(loanNumber, this.ADDITIONAL_LOAN_AMOUNT, simulatedDate);
            return currentBalance + this.ADDITIONAL_LOAN_AMOUNT;
          } else {
            console.error(`Failed to secure emergency loan on ${simDateStr}`);
            return currentBalance;
          }
        }
      }

      return currentBalance;
    } catch (error) {
      console.error("Error during daily balance check:", error);
      return 0;
    }
  }

  private async logEmergencyLoan(loanNumber: string, amount: number, simulatedDate: Date): Promise<void> {
    const client = await pool.connect();
    try {
      const key = `emergency_loan_${simulatedDate.toISOString().split("T")[0]}`;
      await client.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, `${loanNumber}:${amount}`],
      );
    } catch (error) {
      console.error("Error logging emergency loan:", error);
    } finally {
      client.release();
    }
  }

  async getCurrentBalance(): Promise<number | undefined> {
    try {
      return await getBalance();
    } catch (error) {
      console.error("Error getting balance:", error);
      return undefined;
    }
  }

  async getBankAccountNumber(): Promise<string | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT value FROM system_settings WHERE key = 'bank_account_number'",
      );
      return result.rows.length > 0 ? (result.rows[0].value as string) : null;
    } catch (error) {
      console.error("Error getting bank account number:", error);
      return null;
    } finally {
      client.release();
    }
  }

  async takeAdditionalLoan(amount: number): Promise<string | null> {
    try {
      const loanResponse = await takeLoan(amount);
      if (!loanResponse || !loanResponse.success) {
        throw new Error("Failed to take additional loan");
      }
      return loanResponse.loan_number;
    } catch (error) {
      console.error("Error taking additional loan:", error);
      return null;
    }
  }
}
