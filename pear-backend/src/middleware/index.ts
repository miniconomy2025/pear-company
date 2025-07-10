import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../types/common.js"

// Middleware Pattern Implementation

// Logging middleware
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
}

// Error handling middleware
export const errorHandlingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error("Error:", error)

  const response: ApiResponse = {
    success: false,
    error: "Internal server error",
  }

  res.status(500).json(response)
}

// Not found middleware
export const notFoundMiddleware = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  }

  res.status(404).json(response)
}
