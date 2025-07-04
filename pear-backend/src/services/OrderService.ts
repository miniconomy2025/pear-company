import type { PublicOrderRequest, PublicOrderResponse, OrderReservation } from "../types/publicApi.js"
import type { StockService } from "./StockService.js"

export class OrderService {
  private orderReservations = new Map<number, OrderReservation>()

  constructor(private stockService: StockService) {}

  async createOrder(orderRequest: PublicOrderRequest): Promise<PublicOrderResponse> {
    // Validate order items
    if (!orderRequest.items || orderRequest.items.length === 0) {
      throw new Error("Order must contain at least one item")
    }

    for (const item of orderRequest.items) {
      if (!item.phone_id || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item: phone_id and positive quantity required")
      }
    }

    // Check stock availability
    for (const item of orderRequest.items) {
      const available = await this.stockService.checkAvailability(item.phone_id, item.quantity)
      if (!available) {
        throw new Error(`Insufficient stock for phone ${item.phone_id}`)
      }
    }

    // Calculate total price
    const priceMap = new Map([
      [1, 299.99], // Pear Phone Basic
      [2, 599.99], // Pear Phone Pro
      [3, 899.99], // Pear Phone Max
    ])

    let totalPrice = 0
    for (const item of orderRequest.items) {
      const unitPrice = priceMap.get(item.phone_id)
      if (!unitPrice) {
        throw new Error(`Phone with ID ${item.phone_id} not found`)
      }
      totalPrice += unitPrice * item.quantity
    }

    // Generate order ID
    const orderId = Date.now()

    // Reserve stock
    for (const item of orderRequest.items) {
      await this.stockService.reserveStock(item.phone_id, item.quantity)
    }

    // Create 24-hour reservation
    const reservation: OrderReservation = {
      order_id: orderId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      total_price: totalPrice,
      items: orderRequest.items,
    }

    this.orderReservations.set(orderId, reservation)
    console.log(`Order ${orderId} created with 24-hour reservation`)

    return {
      order_id: orderId,
      price: totalPrice,
    }
  }

  async getOrderReservation(orderId: number): Promise<OrderReservation | null> {
    return this.orderReservations.get(orderId) || null
  }

  async cancelOrder(orderId: number): Promise<boolean> {
    const reservation = this.orderReservations.get(orderId)
    if (!reservation) return false

    // Release reserved stock
    for (const item of reservation.items) {
      await this.stockService.releaseReservedStock(item.phone_id, item.quantity)
    }

    this.orderReservations.delete(orderId)
    console.log(`Order ${orderId} cancelled and stock released`)
    return true
  }

  cleanupExpiredReservations(): void {
    const now = new Date()
    for (const [orderId, reservation] of this.orderReservations.entries()) {
      if (now > reservation.expires_at) {
        console.log(`Cleaning up expired reservation: ${orderId}`)
        this.cancelOrder(orderId)
      }
    }
  }
}
