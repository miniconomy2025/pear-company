/**
 * Test data factories for creating consistent test data
 */

export const TestData = {
  /**
   * Creates a mock stock item
   */
  createStockItem: (overrides: Partial<any> = {}) => ({
    phone_id: 1,
    model: "ePhone",
    quantity_available: 100,
    quantity_reserved: 0,
    price: 299.99,
    ...overrides,
  }),

  /**
   * Creates a mock order
   */
  createOrder: (overrides: Partial<any> = {}) => ({
    order_id: 1,
    phone_id: 1,
    quantity: 10,
    total_price: 2999.9,
    status: "pending",
    created_at: new Date("2050-01-01"),
    ...overrides,
  }),

  /**
   * Creates a mock machine
   */
  createMachine: (overrides: Partial<any> = {}) => ({
    machine_id: 1,
    machine_type: "assembly",
    status: "idle",
    current_order_id: null,
    ...overrides,
  }),

  /**
   * Creates a mock payment
   */
  createPayment: (overrides: Partial<any> = {}) => ({
    payment_id: 1,
    order_id: 1,
    amount: 2999.9,
    status: "pending",
    payment_method: "bank_transfer",
    created_at: new Date("2050-01-01"),
    ...overrides,
  }),

  /**
   * Creates a mock logistics shipment
   */
  createShipment: (overrides: Partial<any> = {}) => ({
    shipment_id: 1,
    order_id: 1,
    status: "pending",
    tracking_number: "TRACK123",
    created_at: new Date("2050-01-01"),
    ...overrides,
  }),

  /**
   * Creates multiple items with sequential IDs
   */
  createMultiple: (factory: any, count: number): any[] => {
    return Array.from({ length: count }, (_, i) => factory({ id: i + 1 }))
  },
}
