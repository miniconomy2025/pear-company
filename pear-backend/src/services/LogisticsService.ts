import type { DeliveryConfirmation } from "../types/publicApi.js"

export class LogisticsService {
  async confirmGoodsDelivered(delivery: DeliveryConfirmation): Promise<void> {
    // TODO: Find bulk_delivery record by delivery_reference
    // TODO: Update status to "delivered"
    // TODO: Update parts inventory

    console.log(`Bulk delivery confirmed: ${delivery.delivery_reference}`)
  }

  async confirmGoodsCollection(collection: DeliveryConfirmation): Promise<void> {
    // TODO: Find consumer_delivery record by delivery_reference
    // TODO: Update status to "collected"
    // TODO: Update phone stock

    console.log(`Consumer goods collection confirmed: ${collection.delivery_reference}`)
  }
}
