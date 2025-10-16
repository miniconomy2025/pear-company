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
import { MachinePurchasingService } from "./services/MachinePurchasingService.js"
import { PartsInventoryService } from "./services/PartsInventoryService.js"
import { MachineFailureService } from "./services/MachineFailureService.js"
import { StockController } from "./controllers/StockController.js"
import { OrderController } from "./controllers/OrderController.js"
import { LogisticsController } from "./controllers/LogisticsController.js"
import { SimulationController } from "./controllers/SimulationController.js"
import { MachineFailureController } from "./controllers/MachineFailureController.js"
import { createPublicApiRoutes } from "./routes/publicApiRoutes.js"
import { loggingMiddleware, errorHandlingMiddleware, notFoundMiddleware } from "./middleware/index.js"
import { InventoryService } from "./services/InventoryService.js"
import { InventoryController } from "./controllers/InventoryController.js"
import { FinancialService } from "./services/FinancialService.js"
import { FinancialController } from "./controllers/FinancialController.js"
import { ProductionService } from "./services/ProductionService.js"
import { ProductionController } from "./controllers/ProductionController.js"
import { createInternalApiRoutes } from "./routes/internalApiRoutes.js"
import cors from "cors"
import { BankingService } from "./services/BankingService.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

await testConnection()

app.use(express.json())
app.use(loggingMiddleware)

const allowedOrigins = [
  "https://pear-web.duckdns.org",
  "http://localhost:3000", // for local dev
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)

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
container.register("OrderService", () => new OrderService(), true)
container.register("MachineFailureService", () => new MachineFailureService(), true)
container.register("PaymentService", () => new PaymentService(), true)
container.register("BankingService", () => new BankingService(), true)
container.register("MachinePurchasingService", () => new MachinePurchasingService(), true)
container.register("ManufacturingService", () => new ManufacturingService(), true)
container.register("PartsInventoryService", () => new PartsInventoryService(), true)
container.register(
  "SimulationService",
  () => {
    const orderService = container.resolve<OrderService>("OrderService")
    const manufacturingService = container.resolve<ManufacturingService>("ManufacturingService")
    const bankingService = container.resolve<BankingService>("BankingService")
    const machinePurchasingService = container.resolve<MachinePurchasingService>("MachinePurchasingService")
    const partsInventoryService = container.resolve<PartsInventoryService>("PartsInventoryService")
    return new SimulationService(orderService, manufacturingService, bankingService, machinePurchasingService, partsInventoryService)
  },
  true,
)
container.register(
  "LogisticsService",
  () => {
    const machinePurchasingService = container.resolve<MachinePurchasingService>("MachinePurchasingService")
    return new LogisticsService(machinePurchasingService)
  },
  true,
)
container.register("InventoryService", () => new InventoryService(), true)
container.register("FinancialService", () => new FinancialService(), true)
container.register("ProductionService", () => new ProductionService(), true)

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
container.register(
  "InventoryController",
  () => {
    const inventoryService = container.resolve<InventoryService>("InventoryService")
    return new InventoryController(inventoryService)
  },
  true,
)
container.register(
  "FinancialController",
  () => {
    const financialService = container.resolve<FinancialService>("FinancialService")
    return new FinancialController(financialService)
  },
  true,
)
container.register(
  "ProductionController",
  () => {
    const productionService = container.resolve<ProductionService>("ProductionService")
    return new ProductionController(productionService)
  },
  true,
)
container.register(
  "MachineFailureController",
  () => {
    const machineFailureService = container.resolve<MachineFailureService>("MachineFailureService")
    return new MachineFailureController(machineFailureService)
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
      internal: "/internal-api/*",
    },
  })
})

// Public API routes
app.use("/public-api", createPublicApiRoutes())

// Internal/Admin API routes
app.use("/internal-api", createInternalApiRoutes())

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
