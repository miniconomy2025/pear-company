import type { PaymentNotification } from "../types/publicApi.js"
import type { OrderService } from "./OrderService.js"
import type { StockService } from "./StockService.js"

export class PaymentService {
  constructor(
    private orderService: OrderService,
    private stockService: StockService,
  ) {}

  async processPayment(payment: PaymentNotification): Promise<void> {
    const reservation = await this.orderService.getOrderReservation(payment.reference)

    if (!reservation) {
      throw new Error(`Order ${payment.reference} not found or expired`)
    }

    if (new Date() > reservation.expires_at) {
      await this.orderService.cancelOrder(payment.reference)
      throw new Error(`Order ${payment.reference} has expired`)
    }

    if (Math.abs(payment.amount - reservation.total_price) > 0.01) {
      throw new Error(`Payment amount ${payment.amount} does not match order total ${reservation.total_price}`)
    }

    // Confirm stock sale (move from reserved to sold)
    for (const item of reservation.items) {
      await this.stockService.confirmStockSale(item.phone_id, item.quantity)
    }

    // TODO: Update order status in database to "paid"
    // TODO: Create consumer delivery record

    console.log(`Payment confirmed for order ${payment.reference}: $${payment.amount}`)
  }
}
