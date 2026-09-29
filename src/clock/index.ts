// Speed presets in sim-days per real second, slowest to fastest.
export const SPEEDS = [
  { days: 1 / 86_400, label: 'Real time' },
  { days: 1 / 1_440, label: '1 min/s' },
  { days: 1 / 24, label: '1 hour/s' },
  { days: 1, label: '1 day/s' },
  { days: 7, label: '1 week/s' },
  { days: 30, label: '1 month/s' },
  { days: 365.25, label: '1 year/s' },
]

const DEFAULT_SPEED = 3
const DAY_MS = 86_400_000

// Simulation clock: the single source of "what date is it in the sim".
export class SimClock {
  date: Date
  playing = true
  speedIndex = DEFAULT_SPEED
  direction: 1 | -1 = 1

  constructor(start = new Date()) {
    this.date = new Date(start)
  }

  // Signed sim-days per real second; negative runs time backwards.
  get speed(): number {
    return this.direction * SPEEDS[this.speedIndex].days
  }

  tick(realDeltaSeconds: number): void {
    if (!this.playing) return
    const ms = realDeltaSeconds * this.speed * DAY_MS
    this.date = new Date(this.date.getTime() + ms)
  }

  setDate(date: Date): void {
    this.date = new Date(date)
  }

  togglePlay(): void {
    this.playing = !this.playing
  }

  reverse(): void {
    this.direction = this.direction === 1 ? -1 : 1
  }

  faster(): void {
    this.speedIndex = Math.min(this.speedIndex + 1, SPEEDS.length - 1)
  }

  slower(): void {
    this.speedIndex = Math.max(this.speedIndex - 1, 0)
  }

  resetToNow(): void {
    this.date = new Date()
  }
}
