export const USE_MOCKS = process.env.USE_MOCKS === "true" || process.env.NODE_ENV === "test"

export const MOCK_CONFIG = {
  // Enable/disable specific mock services
  SIMULATION_API: USE_MOCKS,
  COMMERCIAL_BANK: USE_MOCKS,
  BULK_LOGISTICS: USE_MOCKS,
  CUSTOMER_LOGISTICS: USE_MOCKS,
  SUPPLIERS: USE_MOCKS,
}

console.log("Mock Services Configuration:", {
  enabled: USE_MOCKS,
  details: MOCK_CONFIG,
})
