import type { PublicStockResponse } from "../types/publicApi.js"

export class StockService {
  // GET /stock - Get current phone inventory
  async getStock(): Promise<PublicStockResponse> {
    // TODO: Query database for actual stock levels
    const items = [
      {
        phone_id: 1,
        name: "Pear Phone Basic",
        quantity: 50,
        price: 299.99,
      },
      {
        phone_id: 2,
        name: "Pear Phone Pro",
        quantity: 25,
        price: 599.99,
      },
      {
        phone_id: 3,
        name: "Pear Phone Max",
        quantity: 10,
        price: 899.99,
      },
    ]

    return { items }
  }

  async reserveStock(phoneId: number, quantity: number): Promise<boolean> {
    // TODO: Update stock table to reserve quantity
    console.log(`Reserving ${quantity} units of phone ${phoneId}`)
    return true
  }

  async releaseReservedStock(phoneId: number, quantity: number): Promise<boolean> {
    // TODO: Release reserved stock back to available
    console.log(`Releasing ${quantity} reserved units of phone ${phoneId}`)
    return true
  }

  async confirmStockSale(phoneId: number, quantity: number): Promise<boolean> {
    // TODO: Remove sold items from stock
    console.log(`Confirming sale of ${quantity} units of phone ${phoneId}`)
    return true
  }

  async checkAvailability(phoneId: number, quantity: number): Promise<boolean> {
    // TODO: Check if enough stock is available
    return true
  }
}
