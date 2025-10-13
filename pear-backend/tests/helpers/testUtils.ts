/**
 * General testing utilities
 */

import { expect, jest, beforeAll, afterAll } from "@jest/globals"

/**
 * Waits for a specified number of milliseconds
 * Useful for testing async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs a function and expects it to throw a specific error
 */
export async function expectToThrow(fn: () => Promise<any>, errorMessage?: string) {
  try {
    await fn()
    throw new Error("Expected function to throw, but it did not")
  } catch (error) {
    if (errorMessage) {
      expect((error as Error).message).toContain(errorMessage)
    }
  }
}

/**
 * Cleans up all mocks between tests
 */
export function cleanupMocks() {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

/**
 * Creates a spy on console methods to suppress output during tests
 */
export function suppressConsole() {
  const originalConsole = { ...console }

  beforeAll(() => {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
  })

  afterAll(() => {
    global.console = originalConsole
  })
}

/**
 * Helper to test that a value is within a range
 */
export function expectInRange(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min)
  expect(value).toBeLessThanOrEqual(max)
}
