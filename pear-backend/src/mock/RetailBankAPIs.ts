import {
  RetailBankTransationRequest,
  RetailBankTransationResponse
} from "../types/extenalApis.js";

/**
 * Mock: Create a new retail bank transaction.
 */
export async function createRetailTransaction(
  payload: RetailBankTransationRequest
): Promise<RetailBankTransationResponse | undefined> {
  // Just echo back a fake transferId for demonstration purposes
  return {
    transferId: `TRX-${Date.now()}`
  };
}
