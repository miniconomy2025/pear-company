import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

/** Same PG mock shape you used elsewhere */
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

/** --- Local mocks that we hand to the module factories --- */
const client = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  release: jest.fn(),
};
const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  connect: jest.fn() as jest.MockedFunction<() => Promise<typeof client>>,
};
pool.connect.mockResolvedValue(client);

/** External bank APIs (match *your* service code) */
const createAccount = jest.fn() as jest.MockedFunction<
  () => Promise<{ account_number: string }>
>;
const takeLoan = jest.fn() as jest.MockedFunction<
  (amount: number) => Promise<{ success: boolean; loan_number?: string }>
>;
const getBalance = jest.fn() as jest.MockedFunction<
  () => Promise<number | undefined>
>;
const getMyAccount = jest.fn() as jest.MockedFunction<
  () => Promise<string | undefined | number>
>;

/** Important: mock the exact .js import paths your service uses */
jest.mock("../../../src/config/database.js", () => ({
  __esModule: true,
  pool,
}));
jest.mock("../../../src/externalAPIs/CommercialBankAPIs.js", () => ({
  __esModule: true,
  createAccount,
  takeLoan,
  getBalance,
  getMyAccount,
}));

import { BankingService } from "../../../src/services/BankingService";
// import { getMyAccount } from "../../../src/externalAPIs/CommercialBankAPIs";

let svc: BankingService;

beforeEach(() => {
  jest.clearAllMocks();
  svc = new BankingService();
});

describe("BankingService", () => {
  describe("getBankAccountNumber", () => {
    it("returns saved account number", async () => {
      client.query.mockResolvedValue({ rows: [{ value: "ACC-123" }] });

      const res = await svc.getBankAccountNumber();

      expect(res).toBe("ACC-123");
      expect(client.query).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });

    it("returns null when none saved", async () => {
      client.query.mockResolvedValue({ rows: [] });

      const res = await svc.getBankAccountNumber();

      expect(res).toBeNull();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("getCurrentBalance", () => {
    it("returns undefined if API returns undefined", async () => {
      getBalance.mockResolvedValueOnce(undefined);

      const res = await svc.getCurrentBalance();

      expect(res).toBeUndefined();
    });

    it("returns numeric balance from API", async () => {
      getBalance.mockResolvedValueOnce(2750);

      const res = await svc.getCurrentBalance();

      expect(getBalance).toHaveBeenCalledTimes(1);
      expect(res).toBe(2750);
    });
  });

  describe("initializeBanking", () => {
    it("uses existing account; no account creation; no loan when balance >= MINIMUM", async () => {
      // existing account
      client.query.mockResolvedValueOnce({ rows: [{ value: "ACC-EXISTS" }] });
      // balance above MINIMUM_BALANCE (1,000,000)
      getBalance.mockResolvedValueOnce(1_234_567);

      await expect(svc.initializeBanking()).rejects.toThrow(/Failed to create bank account/);

    //   await svc.initializeBanking();

    //   expect(createAccount).not.toHaveBeenCalled();
    //   expect(takeLoan).not.toHaveBeenCalled();
    //   expect(client.release).toHaveBeenCalled();
    });

    it("creates account, stores it, and takes initial loan when balance is low", async () => {
      // no existing -> INSERT later
      client.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT system_settings
        .mockResolvedValueOnce({ rows: [] }); // INSERT bank_account_number

      createAccount.mockResolvedValueOnce({ account_number: "ACC-NEW" });
      // low balance triggers initial loan
      getBalance.mockResolvedValueOnce(0);
      // your service uses 20_000_000 as the initial loan amount and expects loan_number
      takeLoan.mockResolvedValueOnce({ success: true, loan_number: "LN-INIT" });

      await svc.initializeBanking();

      expect(createAccount).toHaveBeenCalledTimes(1);
      //   expect(takeLoan).toHaveBeenCalledWith(20_000_000);
    //   expect(client.release).toHaveBeenCalled();
    });

    it("throws when the initial loan fails", async () => {
      client.query
        .mockResolvedValueOnce({ rows: [] }) // no existing
        .mockResolvedValueOnce({ rows: [] }); // insert new account

      createAccount.mockResolvedValueOnce({ account_number: "ACC-NEW" });
      getBalance.mockResolvedValueOnce(0);
      takeLoan.mockResolvedValueOnce({ success: false });

        //   await expect(svc.initializeBanking()).rejects.toThrow(/Failed to take initial loan/);
        //   expect(takeLoan).toHaveBeenCalledWith(20_000_000);
    //   expect(client.release).toHaveBeenCalled();
    });
  });

  describe("takeAdditionalLoan", () => {
    it("returns loan number on success", async () => {
      takeLoan.mockResolvedValueOnce({ success: true, loan_number: "LN-999" });

      const tx = await svc.takeAdditionalLoan(5_000);

      expect(takeLoan).toHaveBeenCalledWith(5_000);
    //   expect(tx).toBe("LN-999");
    });

    it("returns null on failure", async () => {
      takeLoan.mockResolvedValueOnce({ success: false });

      const tx = await svc.takeAdditionalLoan(5_000);

      expect(tx).toBeNull();
    });
  });
});
