import express from "express"
import { container } from "./container/DIContainer.js"
import { StockService } from "./services/StockService.js"
import { OrderService } from "./services/OrderService.js"
import { PaymentService } from "./services/PaymentService.js"
import { LogisticsService } from "./services/LogisticsService.js"
import { SimulationService } from "./services/SimulationService.js"
import { StockController } from "./controllers/StockController.js"
import { OrderController } from "./controllers/OrderController.js"
import { LogisticsController } from "./controllers/LogisticsController.js"
import { SimulationController } from "./controllers/SimulationController.js"
import { createPublicApiRoutes } from "./routes/publicApiRoutes.js"
import { loggingMiddleware, errorHandlingMiddleware, notFoundMiddleware } from "./middleware/index.js"

const app = express()
const PORT = process.env.PORT || 5000

// Middleware setup
app.use(express.json())
app.use(loggingMiddleware)

// Dependency Injection setup - Services
container.register("StockService", () => new StockService(), true)
container.register(
  "OrderService",
  () => {
    const stockService = container.resolve<StockService>("StockService")
    return new OrderService(stockService)
  },
  true,
)
container.register(
  "PaymentService",
  () => {
    const orderService = container.resolve<OrderService>("OrderService")
    const stockService = container.resolve<StockService>("StockService")
    return new PaymentService(orderService, stockService)
  },
  true,
)
container.register("LogisticsService", () => new LogisticsService(), true)
container.register(
  "SimulationService",
  () => {
    const orderService = container.resolve<OrderService>("OrderService")
    return new SimulationService(orderService)
  },
  true,
)

// Dependency Injection setup - Controllers
container.register(
  "StockController",
  () => {
    const stockService = container.resolve<StockService>("StockService")
    return new StockController(stockService)
  },
  true,
)
container.register(
  "OrderController",
  () => {
    const orderService = container.resolve<OrderService>("OrderService")
    const paymentService = container.resolve<PaymentService>("PaymentService")
    return new OrderController(orderService, paymentService)
  },
  true,
)
container.register(
  "LogisticsController",
  () => {
    const logisticsService = container.resolve<LogisticsService>("LogisticsService")
    return new LogisticsController(logisticsService)
  },
  true,
)
container.register(
  "SimulationController",
  () => {
    const simulationService = container.resolve<SimulationService>("SimulationService")
    return new SimulationController(simulationService)
  },
  true,
)

// Routes setup
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Pear Company Manufacturing API",
    company: "Pear Company - Premium Phone Manufacturer",
    version: "1.0.0",
    endpoints: {
      public: "/public-api/*",
    },
    available_phones: ["Pear Phone Basic", "Pear Phone Pro", "Pear Phone Max"],
    patterns: [
      "Repository Pattern",
      "Service Layer Pattern",
      "Dependency Injection Pattern",
      "Controller Pattern",
      "Router Pattern",
      "Middleware Pattern",
      "Single Responsibility Principle",
    ],
  })
})

// Public API routes
app.use("/public-api", createPublicApiRoutes())

// Error handling
app.use(notFoundMiddleware)
app.use(errorHandlingMiddleware)

app.listen(PORT, () => {
  console.log(`🍐 Pear Company Manufacturing API Server`)
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Phone Models: Basic ($299.99), Pro ($599.99), Max ($899.99)`)
  console.log(`🔗 Public API: http://localhost:${PORT}/public-api`)
  console.log(`📋 API Documentation: /documentation/public-api.yaml`)
  console.log(`🏭 Ready for manufacturing simulation!`)
})
