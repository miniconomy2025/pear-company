import type { Request, Response } from "express";
import type {
  PublicOrderRequest,
  PaymentNotification,
} from "../types/publicApi.js";
import type { OrderService } from "../services/OrderService.js";
import type { PaymentService } from "../services/PaymentService.js";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isPaymentNotification = (v: unknown): v is PaymentNotification => {
  if (!isObject(v)) return false;
  const ref = (v as any).reference;
  const amount = (v as any).amount;
  return typeof ref === "string" && typeof amount === "number";
};

const isClientError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const name = (err.name || "").toLowerCase();
  const msg = (err.message || "").toLowerCase();
  return (
    name.includes("validation") ||
    name.includes("badrequest") ||
    msg.includes("invalid") ||
    msg.includes("missing") ||
    msg.includes("not enough stock") ||
    msg.includes("insufficient stock") ||
    msg.includes("phone not found") ||
    msg.includes("not found")
  );
};

export class OrderController {
  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService
  ) {}

  createOrder = async (
    req: Request<unknown, unknown, PublicOrderRequest>,
    res: Response
  ): Promise<void> => {
    const orderRequest = req.body; 

    try {
      const orderResponse = await this.orderService.createOrder(orderRequest);
      res.status(201).json(orderResponse);
    } catch (error) {
      console.error("Error creating order:", error);
      if (isClientError(error)) {
        res.status(400).json({
          error: "Invalid order data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  processPayment = async (req: Request, res: Response): Promise<void> => {
    const body = req.body;

    if (!isPaymentNotification(body)) {
      res.status(400).json({
        error: "Invalid payment data",
        message: "Required fields: reference (string), amount (number)",
      });
      return;
    }

    const payment: PaymentNotification = body;

    try {
      await this.paymentService.processPayment(payment);
      res.status(200).json({ message: "Payment accepted" });
    } catch (error) {
      console.error("Error processing payment:", error);
      if (isClientError(error)) {
        res.status(400).json({
          error: "Invalid payment data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
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
