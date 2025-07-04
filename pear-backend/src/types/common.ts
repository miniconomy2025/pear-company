// Common/Shared Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
