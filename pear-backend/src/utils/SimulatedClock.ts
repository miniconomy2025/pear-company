class SimulatedClock {
  private simulatedStartDate: Date | null = null
  private currentSimulatedDayOffset = 0

  private realWorldEpochStartTimeMs: number | null = null

  setSimulationStartTime(realEpochMs: number, simulatedStart: Date): void {
    this.realWorldEpochStartTimeMs = realEpochMs
    this.simulatedStartDate = new Date(simulatedStart) 
    this.simulatedStartDate.setUTCHours(0, 0, 0, 0) 
    this.currentSimulatedDayOffset = 0 
  }

  advanceDay(): void {
    if (this.simulatedStartDate === null) {
      throw new Error("SimulatedClock not initialized. Call setSimulationStartTime first.")
    }
    this.currentSimulatedDayOffset++
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

  async saveCurrentDateToDatabase(): Promise<void> {
    if (this.simulatedStartDate === null) {
      throw new Error("SimulatedClock not initialized. Call setSimulationStartTime first.")
    }

    try {
      const { pool } = await import("../config/database.js")
      const client = await pool.connect()

      try {
        const currentDate = this.getSimulatedDate()
        const dateString = currentDate.toISOString().split("T")[0]

        await client.query(
          `INSERT INTO system_settings (key, value) 
           VALUES ('current_simulation_date', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [dateString],
        )

        await client.query(
          `INSERT INTO system_settings (key, value) 
           VALUES ('current_simulation_day_offset', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [this.currentSimulatedDayOffset.toString()],
        )

      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error saving simulation date to database:", error)
      throw error
    }
  }

  async loadCurrentDateFromDatabase(): Promise<boolean> {
    try {
      const { pool } = await import("../config/database.js")
      const client = await pool.connect()

      try {
        const result = await client.query(
          `SELECT key, value FROM system_settings 
           WHERE key IN ('current_simulation_date', 'current_simulation_day_offset')`,
        )

        if (result.rows.length === 2) {
          const dateRow = result.rows.find((r) => r.key === "current_simulation_date")
          const offsetRow = result.rows.find((r) => r.key === "current_simulation_day_offset")

          if (dateRow && offsetRow) {
            this.currentSimulatedDayOffset = Number.parseInt(offsetRow.value, 10)
            return true
          }
        }

        return false
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error loading simulation date from database:", error)
      return false
    }
  }

  getSimulatedDateString(): string {
    return this.getSimulatedDate().toISOString().split("T")[0]
  }

  getSimulatedTimestamp(): string {
    return this.getSimulatedDate().toISOString()
  }
  
}

const simulatedClockInstance = new SimulatedClock()
export { simulatedClockInstance as SimulatedClock }
