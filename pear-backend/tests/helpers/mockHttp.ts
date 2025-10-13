import type { Request, Response } from "express"
import { jest, expect } from "@jest/globals"

/**
 * Creates a mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  }
}

/**
 * Creates a mock Express response object with chainable methods
 */
export function createMockResponse(): Partial<Response> {
  const res = {} as Partial<Response>;

  res.status = jest.fn<(code: number) => Response>().mockReturnValue(res as Response);
  res.json = jest.fn<(body?: any) => Response>().mockReturnValue(res as Response);
  res.send = jest.fn<(body?: any) => Response>().mockReturnValue(res as Response);
  res.sendStatus = jest.fn<(code: number) => Response>().mockReturnValue(res as Response);

  return res;
}


/**
 * Helper to verify response status and JSON body
 */
export function expectJsonResponse(res: Partial<Response>, status: number, body?: any) {
  expect(res.status).toHaveBeenCalledWith(status)
  if (body !== undefined) {
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining(body))
  }
}
