import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { jest } from "@jest/globals";

type MockedPoolClient = PoolClient & {
  query: jest.MockedFunction<(queryText: string, params?: any[]) => Promise<QueryResult<any>>>;
  release: jest.MockedFunction<() => void>;
};

/**
 * Creates a mock database pool for testing
 */
export function createMockPool() {
  const mockClient: MockedPoolClient = {
    query: jest.fn(),
    release: jest.fn(),
  } as unknown as MockedPoolClient;

  const mockPool: Pool = {
    connect: jest.fn<() => Promise<PoolClient>>().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn(),
  } as unknown as Pool;

  return { mockPool, mockClient };
}

/**
 * Creates a mock database client for testing
 */
export function createMockClient(): MockedPoolClient {
  return {
    query: jest.fn(),
    release: jest.fn(),
  } as unknown as MockedPoolClient;
}

/**
 * Helper to mock successful query results
 */
export function mockQuerySuccess<T extends QueryResultRow = any>(
  mockClient: MockedPoolClient,
  rows: T[],
  rowCount?: number
) {
  const result: QueryResult<T> = {
    rows,
    rowCount: rowCount ?? rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  };

  mockClient.query.mockResolvedValue(result);
}

/**
 * Helper to mock query errors
 */
export function mockQueryError(mockClient: MockedPoolClient, error: Error) {
  mockClient.query.mockRejectedValue(error);
}

/**
 * Helper to verify query was called with specific SQL pattern
 */
export function expectQueryContains(
  mockClient: MockedPoolClient,
  sqlPattern: string
) {
  const calls = mockClient.query.mock.calls;
  const found = calls.some(([sql]) => typeof sql === "string" && sql.includes(sqlPattern));

  if (!found) {
    throw new Error(`Expected query to contain "${sqlPattern}" but it was not found in any calls`);
  }
}
