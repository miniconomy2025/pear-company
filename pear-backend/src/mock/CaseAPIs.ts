import {
  CasesPriceResponse,
  CasesCreateOrderResponse,
  CasesGetOrderResponse
} from "../types/extenalApis.js";

/**
 * Mock for getting available cases and their price.
 */
export async function getCases(): Promise<CasesPriceResponse | undefined> {
  return {
    available_units: 1200,
    price_per_unit: 15.5
  };
}

/**
 * Mock for creating a case order.
 */
export async function createCaseOrder(
  quantity: number
): Promise<CasesCreateOrderResponse | undefined> {
  return {
    id: 1234,
    order_status_id: 1,
    quantity,
    total_price: quantity * 15.5,
    ordered_at: new Date().toISOString(),
    account_number: "MOCK_ACCOUNT_123"
  };
}

/**
 * Mock for getting a specific case order.
 */
export async function getOrder(
  id: number
): Promise<CasesGetOrderResponse | undefined> {
  return {
    id,
    order_status_id: "1",
    ordered_at: new Date().toISOString(),
    quantity: 100,
    status: "PENDING"
  };
}
