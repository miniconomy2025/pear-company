import {
  ScreensPriceResponse,
  ScreensCreateOrderResponse,
  ScreensGetOrderResponse,
} from "../types/extenalApis.js";

/**
 * Mock: Get available screen stock and price per unit.
 */
export async function getScreens(): Promise<ScreensPriceResponse | undefined> {
  return {
    screens: {
      quantity: 320,
      price: 1599.99,
    }
  };
}

/**
 * Mock: Create a new screen order.
 */
export async function createScreenOrder(
  quantity: number
): Promise<ScreensCreateOrderResponse | undefined> {
  return {
    orderId: 789,
    totalPrice: quantity * 1599.99,
    bankAccountNumber: "BANK-SCREEN-987"
  };
}

/**
 * Mock: Get details for a specific screen order.
 */
export async function getOrder(
  orderId: number
): Promise<ScreensGetOrderResponse | undefined> {
  return {
    orderId,
    quantity: 10,
    unitPrice: 1599.99,
    totalPrice: 15999.90,
    status: "DELIVERED",
    amountPaid: 15999.90,
    remainingBalance: 0,
    isFullyPaid: true
  };
}
