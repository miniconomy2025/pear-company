import { describe, beforeEach, it, expect } from "@jest/globals"
import { DatabaseDateHelper } from "../../../src/utils/DatabaseDateHelper"
import { SimulatedClock } from "../../../src/utils/SimulatedClock"

describe("DatabaseDateHelper", () => {
  beforeEach(() => {
    // Initialize SimulatedClock for tests
    const realEpochMs = 1704067200000
    const simulatedStart = new Date("2050-01-01T00:00:00Z")
    SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)
  })

  describe("getCurrentSimulatedDate", () => {
    it("should return current simulated date as Date object", () => {
      const result = DatabaseDateHelper.getCurrentSimulatedDate()

      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString().split("T")[0]).toBe("2050-01-01")
    })
  })

  describe("getCurrentSimulatedDateString", () => {
    it("should return date in YYYY-MM-DD format", () => {
      const result = DatabaseDateHelper.getCurrentSimulatedDateString()

      expect(result).toBe("2050-01-01")
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe("getSimulatedTimestampForDay", () => {
    it("should calculate correct timestamp for day offset", () => {
      const day5 = DatabaseDateHelper.getSimulatedTimestampForDay(5)

      expect(day5).toContain("2050-01-06")
    })

    it("should handle day 0 correctly", () => {
      const day0 = DatabaseDateHelper.getSimulatedTimestampForDay(0)

      expect(day0).toContain("2050-01-01")
    })
  })

  describe("parseDateStringToDayOffset", () => {
    it("should calculate correct day offset from date string", () => {
      const offset = DatabaseDateHelper.parseDateStringToDayOffset("2050-01-11")

      expect(offset).toBe(10)
    })

    it("should return 0 for start date", () => {
      const offset = DatabaseDateHelper.parseDateStringToDayOffset("2050-01-01")

      expect(offset).toBe(0)
    })
  })

  describe("getSimulatedDateDaysAgo", () => {
    it("should calculate date X days ago", () => {
      // Advance to day 10
      for (let i = 0; i < 10; i++) {
        SimulatedClock.advanceDay()
      }

      const threeDaysAgo = DatabaseDateHelper.getSimulatedDateDaysAgo(3)

      expect(threeDaysAgo).toContain("2050-01-08")
    })

    it("should not go below day 0", () => {
      const result = DatabaseDateHelper.getSimulatedDateDaysAgo(100)

      expect(result).toContain("2050-01-01")
    })
  })

  describe("isSimulationActive", () => {
    it("should return true when simulation is initialized", () => {
      expect(DatabaseDateHelper.isSimulationActive()).toBe(true)
    })
  })
})
