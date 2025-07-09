class SimulatedClock {
  private simulatedStartDate: Date | null = null
  private currentSimulatedDayOffset = 0

  private realWorldEpochStartTimeMs: number | null = null

  setSimulationStartTime(realEpochMs: number, simulatedStart: Date): void {
    this.realWorldEpochStartTimeMs = realEpochMs
    this.simulatedStartDate = new Date(simulatedStart) 
    this.simulatedStartDate.setUTCHours(0, 0, 0, 0) 
    this.currentSimulatedDayOffset = 0 
    console.log(
      `SimulatedClock initialized: Real-world epoch start: ${new Date(realEpochMs).toISOString()}, Simulated start date: ${this.simulatedStartDate.toISOString()}`,
    )
  }

  advanceDay(): void {
    if (this.simulatedStartDate === null) {
      throw new Error("SimulatedClock not initialized. Call setSimulationStartTime first.")
    }
    this.currentSimulatedDayOffset++
    console.log(`Simulated day advanced to: ${this.getSimulatedDate().toISOString().split("T")[0]}`)
  }

  getSimulatedDate(): Date {
    if (this.simulatedStartDate === null) {
      throw new Error("SimulatedClock not initialized. Call setSimulationStartTime first.")
    }
    const date = new Date(this.simulatedStartDate)
    date.setDate(date.getDate() + this.currentSimulatedDayOffset)
    date.setUTCHours(0, 0, 0, 0)
    return date
  }

  getSimulatedEndOfDay(): Date {
    if (this.simulatedStartDate === null) {
      throw new Error("SimulatedClock not initialized. Call setSimulationStartTime first.")
    }
    const date = new Date(this.simulatedStartDate)
    date.setDate(date.getDate() + this.currentSimulatedDayOffset)
    date.setUTCHours(23, 59, 59, 999)
    return date
  }

  getCurrentSimulatedDayOffset(): number {
    return this.currentSimulatedDayOffset
  }

  isInitialized(): boolean {
    return this.simulatedStartDate !== null
  }
}

const simulatedClockInstance = new SimulatedClock()
export { simulatedClockInstance as SimulatedClock }
