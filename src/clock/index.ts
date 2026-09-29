// Simulation clock: the single source of "what date is it in the sim".
// speed is sim-days per real second; negative runs time backwards.
export class SimClock {
  date: Date
  speed = 1
  playing = true

  constructor(start = new Date()) {
    this.date = new Date(start)
  }

  tick(realDeltaSeconds: number): void {
    if (!this.playing) return
    const ms = realDeltaSeconds * this.speed * 86_400_000
    this.date = new Date(this.date.getTime() + ms)
  }

  setDate(date: Date): void {
    this.date = new Date(date)
  }
}
