import { describe, beforeEach, it, expect, jest } from "@jest/globals"
import { SimulatedClock } from "../../../src/utils/SimulatedClock"

describe("SimulatedClock", () => {
  beforeEach(() => {
    // Reset the singleton clock before each test
    jest.clearAllMocks()
  })

  describe("setSimulationStartTime", () => {
    it("should initialize the clock with correct start time", () => {
      const realEpochMs = 1704067200000 // 2024-01-01
      const simulatedStart = new Date("2050-01-01T00:00:00Z")

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)

      expect(SimulatedClock.isInitialized()).toBe(true)
      expect(SimulatedClock.getCurrentSimulatedDayOffset()).toBe(0)
    })

    it("should normalize simulated start to beginning of day", () => {
      const realEpochMs = 1704067200000
      const simulatedStart = new Date("2050-01-01T15:30:45Z") // Mid-day

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)

      const result = SimulatedClock.getSimulatedDate()
      expect(result.getUTCHours()).toBe(0)
      expect(result.getUTCMinutes()).toBe(0)
      expect(result.getUTCSeconds()).toBe(0)
    })
  })

  describe("advanceDay", () => {
    it("should advance the simulation by one day", () => {
      const realEpochMs = 1704067200000
      const simulatedStart = new Date("2050-01-01T00:00:00Z")

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)
      SimulatedClock.advanceDay()

      expect(SimulatedClock.getCurrentSimulatedDayOffset()).toBe(1)

      const currentDate = SimulatedClock.getSimulatedDate()
      expect(currentDate.toISOString().split("T")[0]).toBe("2050-01-02")
    })

    it("should throw error if clock not initialized", () => {
      expect(() => SimulatedClock.advanceDay()).toThrow("SimulatedClock not initialized")
    })
  })

  describe("getSimulatedDate", () => {
    it("should return correct simulated date after multiple advances", () => {
      const realEpochMs = 1704067200000
      const simulatedStart = new Date("2050-01-01T00:00:00Z")

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)

      // Advance 10 days
      for (let i = 0; i < 10; i++) {
        SimulatedClock.advanceDay()
      }

      const result = SimulatedClock.getSimulatedDate()
      expect(result.toISOString().split("T")[0]).toBe("2050-01-11")
      expect(SimulatedClock.getCurrentSimulatedDayOffset()).toBe(10)
    })
  })

  describe("getSimulatedEndOfDay", () => {
    it("should return end of day timestamp", () => {
      const realEpochMs = 1704067200000
      const simulatedStart = new Date("2050-01-01T00:00:00Z")

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)

      const endOfDay = SimulatedClock.getSimulatedEndOfDay()
      expect(endOfDay.getUTCHours()).toBe(23)
      expect(endOfDay.getUTCMinutes()).toBe(59)
      expect(endOfDay.getUTCSeconds()).toBe(59)
      expect(endOfDay.getUTCMilliseconds()).toBe(999)
    })
  })

  describe("getSimulatedDateString", () => {
    it("should return YYYY-MM-DD format", () => {
      const realEpochMs = 1704067200000
      const simulatedStart = new Date("2050-01-01T00:00:00Z")

      SimulatedClock.setSimulationStartTime(realEpochMs, simulatedStart)

      const dateString = SimulatedClock.getSimulatedDateString()
      expect(dateString).toBe("2050-01-01")
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
