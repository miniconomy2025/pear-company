// GLobal test setup
import dotenv from "dotenv"
import { jest, afterAll } from "@jest/globals"

dotenv.config({ path: ".env.test" })

process.env.NODE_ENV = "test"
process.env.DB_NAME = "peardb_test"

jest.setTimeout(30000);

global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as any

afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
})