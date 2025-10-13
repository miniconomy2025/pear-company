/**
 * Mock helpers for external API integrations
 */

/**
 * Creates mock responses for Bulk Logistics API
 */
export const MockBulkLogistics = {
  createShipmentSuccess: () => ({
    shipment_id: "SHIP123",
    status: "created",
    tracking_number: "TRACK123",
    estimated_delivery: "2050-01-05",
  }),

  createShipmentError: () => ({
    error: "Insufficient capacity",
    code: "CAPACITY_ERROR",
  }),

  getShipmentStatus: (status = "in_transit") => ({
    shipment_id: "SHIP123",
    status,
    current_location: "Distribution Center",
    updated_at: new Date().toISOString(),
  }),
}

/**
 * Creates mock responses for Commercial Bank API
 */
export const MockCommercialBank = {
  initiatePaymentSuccess: () => ({
    transaction_id: "TXN123",
    status: "pending",
    amount: 2999.9,
    created_at: new Date().toISOString(),
  }),

  initiatePaymentError: () => ({
    error: "Insufficient funds",
    code: "INSUFFICIENT_FUNDS",
  }),

  getPaymentStatus: (status = "completed") => ({
    transaction_id: "TXN123",
    status,
    amount: 2999.9,
    updated_at: new Date().toISOString(),
  }),
}

/**
 * Creates mock responses for Simulation API
 */
export const MockSimulation = {
  advanceDaySuccess: () => ({
    current_day: 5,
    current_date: "2050-01-06",
    events_processed: 10,
  }),

  getSimulationState: (day = 1) => ({
    current_day: day,
    current_date: `2050-01-${String(day + 1).padStart(2, "0")}`,
    is_running: true,
  }),
}

/**
 * Helper to mock fetch responses
 */
export function mockFetchResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response)
}

/**
 * Helper to mock fetch errors
 */
export function mockFetchError(message = "Network error") {
  return Promise.reject(new Error(message))
}
