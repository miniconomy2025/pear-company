import { SimulatedClock } from "./SimulatedClock.js"


export class DatabaseDateHelper {

  static getCurrentSimulatedDate(): Date {
    return SimulatedClock.getSimulatedDate()
  }
 
  static getCurrentSimulatedDateString(): string {
    return SimulatedClock.getSimulatedDateString()
  }


  static getCurrentSimulatedTimestamp(): string {
    return SimulatedClock.getSimulatedTimestamp()
  }


  static getCurrentDayOffset(): number {
    return SimulatedClock.getCurrentSimulatedDayOffset()
  }


  static getSimulatedTimestampForDay(dayOffset: number): string {
    const startDate = new Date("2050-01-01T00:00:00Z")
    const targetDate = new Date(startDate)
    targetDate.setDate(targetDate.getDate() + dayOffset)
    return targetDate.toISOString()
  }


  static parseDateStringToDayOffset(dateString: string): number {
    const startDate = new Date("2050-01-01T00:00:00Z")
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - startDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }


  static getSimulatedDateDaysAgo(daysAgo: number): string {
    const currentOffset = SimulatedClock.getCurrentSimulatedDayOffset()
    const targetOffset = Math.max(0, currentOffset - daysAgo)
    return this.getSimulatedTimestampForDay(targetOffset)
  }

  static isSimulationActive(): boolean {
    return SimulatedClock.isInitialized()
  }
}
