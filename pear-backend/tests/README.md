# Testing Guide for Pear Backend

## Overview
This directory contains all tests for the Pear manufacturing backend system. Tests are organized by type: unit, integration, and e2e (end-to-end).

## Directory Structure
\`\`\`
tests/
├── helpers/           # Reusable test utilities and mocks
│   ├── mockDatabase.ts      # Database mocking utilities
│   ├── mockHttp.ts          # Express request/response mocks
│   ├── testData.ts          # Test data factories
│   ├── testUtils.ts         # General testing utilities
│   └── mockExternalApis.ts  # External API mocks
├── unit/              # Unit tests (isolated component tests)
│   ├── services/      # Service layer tests
│   └── utils/         # Utility function tests
├── integration/       # Integration tests (multiple components)
└── e2e/              # End-to-end tests (full system)
\`\`\`

## Running Tests

### All Tests
\`\`\`bash
npm test
\`\`\`

### Unit Tests Only
\`\`\`bash
npm run test:unit
\`\`\`

### Integration Tests Only
\`\`\`bash
npm run test:integration
\`\`\`

### Watch Mode (for development)
\`\`\`bash
npm run test:watch
\`\`\`

### With Coverage Report
\`\`\`bash
npm test -- --coverage
\`\`\`

### CI Mode
\`\`\`bash
npm run test:ci
\`\`\`

## Writing Tests

### Unit Test Example
\`\`\`typescript
import { StockService } from "../../../src/services/StockService"
import { createMockPool, mockQuerySuccess } from "../../helpers/mockDatabase"
import { TestData } from "../../helpers/testData"

describe("StockService", () => {
  let stockService: StockService
  let mockPool: any
  let mockClient: any

  beforeEach(() => {
    const mocks = createMockPool()
    mockPool = mocks.mockPool
    mockClient = mocks.mockClient
    stockService = new StockService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should get stock items", async () => {
    const stockItems = [TestData.createStockItem()]
    mockQuerySuccess(mockClient, stockItems)

    const result = await stockService.getStock()

    expect(result.items).toHaveLength(1)
  })
})
\`\`\`

### Integration Test Example
\`\`\`typescript
import request from "supertest"
import { app } from "../../../src/index"
import { pool } from "../../../src/config/database"

describe("Stock API Integration", () => {
  beforeAll(async () => {
    // Setup test database
    await pool.query("DELETE FROM stock")
  })

  afterAll(async () => {
    await pool.end()
  })

  it("should create and retrieve stock", async () => {
    const response = await request(app)
      .get("/api/stock")
      .expect(200)

    expect(response.body).toHaveProperty("items")
  })
})
\`\`\`

## Test Helpers

### Database Mocking
\`\`\`typescript
import { createMockPool, mockQuerySuccess } from "../helpers/mockDatabase"

const { mockPool, mockClient } = createMockPool()
mockQuerySuccess(mockClient, [{ id: 1, name: "Test" }])
\`\`\`

### HTTP Mocking
\`\`\`typescript
import { createMockRequest, createMockResponse } from "../helpers/mockHttp"

const req = createMockRequest({ body: { quantity: 10 } })
const res = createMockResponse()
\`\`\`

### Test Data
\`\`\`typescript
import { TestData } from "../helpers/testData"

const order = TestData.createOrder({ quantity: 5 })
const orders = TestData.createMultiple(TestData.createOrder, 10)
\`\`\`

### External API Mocking
\`\`\`typescript
import { MockBulkLogistics, mockFetchResponse } from "../helpers/mockExternalApis"

global.fetch = jest.fn().mockImplementation(() =>
  mockFetchResponse(MockBulkLogistics.createShipmentSuccess())
)
\`\`\`

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on other tests
2. **Use Factories**: Use TestData factories for consistent test data
3. **Mock External Dependencies**: Always mock database, HTTP, and external APIs
4. **Test Edge Cases**: Don't just test happy paths
5. **Descriptive Names**: Use clear, descriptive test names
6. **Clean Up**: Always clean up resources in afterEach/afterAll
7. **Fast Tests**: Keep unit tests fast (< 100ms each)

## Coverage Goals

- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: Cover all API endpoints
- **E2E Tests**: Cover critical user flows

## Debugging Tests

### Run Single Test File
\`\`\`bash
npm test -- StockService.test.ts
\`\`\`

### Run Tests Matching Pattern
\`\`\`bash
npm test -- --testNamePattern="should get stock"
\`\`\`

### Debug Mode
\`\`\`bash
node --inspect-brk node_modules/.bin/jest --runInBand
\`\`\`

## Common Issues

### Database Connection Errors
- Ensure test database is running
- Check .env.test configuration
- Verify DATABASE_URL is set correctly

### Timeout Errors
- Increase timeout in jest.config.ts
- Check for unresolved promises
- Ensure all async operations complete

### Mock Not Working
- Verify mock is called before the code under test
- Check mock path matches actual import path
- Use jest.clearAllMocks() in afterEach
\`\`\`

```typescript file="" isHidden
