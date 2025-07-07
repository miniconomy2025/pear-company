import dotenv from "dotenv"
import express from "express"
import { testConnection } from "./config/database.js"
import { container } from "./container/DIContainer.js"
import { StockService } from "./services/StockService.js"
import { OrderService } from "./services/OrderService.js"
import { PaymentService } from "./services/PaymentService.js"
import { LogisticsService } from "./services/LogisticsService.js"
import { SimulationService } from "./services/SimulationService.js"
import { ManufacturingService } from "./services/ManufacturingService.js"
import { StockController } from "./controllers/StockController.js"
import { OrderController } from "./controllers/OrderController.js"
import { LogisticsController } from "./controllers/LogisticsController.js"
import { SimulationController } from "./controllers/SimulationController.js"
import { createPublicApiRoutes } from "./routes/publicApiRoutes.js"
import { loggingMiddleware, errorHandlingMiddleware, notFoundMiddleware } from "./middleware/index.js"

// Load environment variables from .env file
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Test database connection on startup
await testConnection()

// Middleware setup
app.use(express.json())
app.use(loggingMiddleware)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    },
  })
})

// Dependency Injection setup - Services
container.register("StockService", () => new StockService(), true)
container.register(
  "OrderService",
  () => {
    return new OrderService()
  },
  true,
)
container.register(
  "PaymentService",
  () => {
    return new PaymentService()
  },
  true,
)
container.register("LogisticsService", () => new LogisticsService(), true)
container.register(
  "SimulationService",
  () => {
    const orderService = container.resolve<OrderService>("OrderService")
    const manufacturingService = container.resolve<ManufacturingService>("OrderService")
    return new SimulationService(orderService, manufacturingService)
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
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      public: "/public-api/*",
      health: "/health",
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
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`🔗 Public API: http://localhost:${PORT}/public-api`)
  console.log(`📋 API Documentation: /documentation/public-api.yaml`)
  console.log(`🏭 Ready for manufacturing simulation!`)
})
