import { Router } from "express";
import { container } from "../container/DIContainer.js";
import { OrderController } from "../controllers/OrderController.js";
import { LogisticsController } from "../controllers/LogisticsController.js";
import { InventoryController } from "../controllers/InventoryController.js";
import { FinancialController } from "../controllers/FinancialController.js";
import { ProductionController } from "../controllers/ProductionController.js";

export const createInternalApiRoutes = (): Router => {
  const router = Router();

  try {
    const orderController =
      container.resolve<OrderController>("OrderController");
    const logisticsController = container.resolve<LogisticsController>(
      "LogisticsController"
    );
    const inventoryController = container.resolve<InventoryController>(
      "InventoryController"
    );
    const financialController = container.resolve<FinancialController>(
      "FinancialController"
    );
    const productionController = container.resolve<ProductionController>(
      "ProductionController"
    );

    // Order management endpoints
    router.get("/reports/sales", orderController.getOrdersReport);

    // Logistics endpoints
    router.get(
      "/reports/logistics/bulk",
      logisticsController.getBulkDeliveries
    );
    router.get(
      "/reports/logistics/consumer",
      logisticsController.getConsumerDeliveries
    );
    router.get(
      "/reports/logistics/consumer/pending",
      logisticsController.getConsumerPendingDeliveries
    );

    // Inventory endpoint
    router.get("/reports/inventory", inventoryController.getInventoryReport);

    // Financial endpoint
    router.get("/reports/financial", financialController.getFinancialData);

    // Production endpoint
    router.get("/reports/production", productionController.getProductionReport);

    return router;

  } catch (error) {
    console.error("Error registering internal API routes:", error);
  }

  return router;
};
