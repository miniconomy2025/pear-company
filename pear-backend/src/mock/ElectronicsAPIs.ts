import {
  ElectronicsPriceResponse,
  ElectronicsCreateOrderResponse,
  ElectronicsGetOrderResponse,
} from "../types/extenalApis.js";

/**
 * Mock: Get available stock and price per unit for electronics.
 */
export async function getElectronics(): Promise<ElectronicsPriceResponse | undefined> {
  return {
    availableStock: 500,
    pricePerUnit: 2999.99,
  };
}

/**
 * Mock: Create a new electronics order.
 */
export async function createElectronicsOrder(
  quantity: number
): Promise<ElectronicsCreateOrderResponse | undefined> {
  return {
    orderId: 101,
    quantity,
    amountDue: quantity * 2999.99,
    bankNumber: "BANK-EL-001"
  };
}

/**
 * Mock: Get details for a specific electronics order.
 */
export async function getOrder(
  orderId: number
): Promise<ElectronicsGetOrderResponse | undefined> {
  return {
    orderId,
    status: "PAID",
    orderedAt: Date.now(),
    quantity: 25,
    remainingAmount: 0,
  };
}
