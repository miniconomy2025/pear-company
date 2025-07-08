import type { Request, Response } from "express";
import type {
  PublicOrderRequest,
  PaymentNotification,
} from "../types/publicApi.js";
import type { OrderService } from "../services/OrderService.js";

import type { PaymentService } from "../services/PaymentService.js";

export class OrderController {
  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService
  ) {}

  createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderRequest: PublicOrderRequest = req.body;
      const orderResponse = await this.orderService.createOrder(orderRequest);
      res.status(201).json(orderResponse);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({
        error: "Invalid order data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const payment: PaymentNotification = req.body;
      await this.paymentService.processPayment(payment);
      res.status(200).json({ message: "Payment accepted" });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(400).json({
        error: "Invalid payment data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  getOrdersReport = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      const orders = await this.orderService.getAllOrders(
        from as string,
        to as string
      );
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
