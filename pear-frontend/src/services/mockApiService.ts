export const mockApiService = {
  async fetchPhoneProduction() {
    return [
      { model: "ePhone", total: 1200 },
      { model: "ePhone Plus", total: 800 },
      { model: "ePhone Pro Max", total: 500 },
    ];
  },

  async fetchInventoryLevels() {
    return [
      { part: "Electronics", quantity: 500 },
      { part: "Screens", quantity: 400 },
      { part: "Cases", quantity: 450 },
    ];
  },

  async fetchSalesData() {
    return [
      { model: 'ePhone', units_sold: 120, revenue: 36000, date: '2025-07-01' },
      { model: 'ePhone plus', units_sold: 80, revenue: 32000, date: '2025-07-25' },
      { model: 'ePhone pro max', units_sold: 45, revenue: 31500, date: '2025-07-16' },
    ];
  },

  async fetchLogisticsData() {
    return {
      bulk: [
        { part: "Electronics", quantity: 500, cost: 10000 },
        { part: "Screens", quantity: 450, cost: 12000 },
        { part: "Cases", quantity: 400, cost: 8000 },
      ],
      consumer: [
        { model: "ePhone", delivered: 290, cost: 3000 },
        { model: "ePhone Plus", delivered: 240, cost: 2800 },
        { model: "ePhone Pro Max", delivered: 140, cost: 2500 },
      ],
    };
  },

  async fetchFinancialData() {
    return {
      revenue: 82500,
      expenses: {
        manufacturing: 80000,
        logistics: 10000,
        loans: 20000,
        equipment: 15000,
        supply: 20000,
      },
      loanStatus: {
        borrowed: 50000,
        repaid: 20000,
        remaining: 30000,
      },
    };
  },

  async fetchCustomersData() {
    return [{ totalCustomers: 150 }];
  },
};
