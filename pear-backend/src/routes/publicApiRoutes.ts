import { Router } from "express"
import { container } from "../container/DIContainer.js"
import type { StockController } from "../controllers/StockController.js"
import type { OrderController } from "../controllers/OrderController.js"
import type { LogisticsController } from "../controllers/LogisticsController.js"
import type { SimulationController } from "../controllers/SimulationController.js"

export const createPublicApiRoutes = (): Router => {
  const router = Router()

  // Resolve controllers from DI container
  const stockController = container.resolve<StockController>("StockController")
  const orderController = container.resolve<OrderController>("OrderController")
  const logisticsController = container.resolve<LogisticsController>("LogisticsController")
  const simulationController = container.resolve<SimulationController>("SimulationController")

  // Stock endpoints
  router.get("/stock", stockController.getStock)

  // Order management endpoints
  router.post("/order", orderController.createOrder)
  router.post("/payment-made", orderController.processPayment)

  // Logistics endpoints
  router.post("/goods-delivered", logisticsController.confirmGoodsDelivered)
  router.post("/goods-collection", logisticsController.confirmGoodsCollection)

  // Simulation control endpoints
  router.post("/simulation/start", simulationController.startSimulation)
  router.post("/simulation/tick", simulationController.processSimulationTick)

  return router
}
