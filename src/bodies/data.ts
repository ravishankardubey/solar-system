import data from './data.json'

// Static facts for every body. Kept free of Three.js so the UI can import it.
export interface BodyData {
  id: string
  name: string
  type: string
  color: string
  description: string
  radiusKm: number
  massEarths: number
  gravity: number // m/s² at the surface (cloud tops for giants)
  dayHours: number // solar day; equatorial rotation for the Sun
  orbitalPeriodDays?: number
  distanceAu?: number // semi-major axis
  meanTempC: number // surface temperature for the Sun
  moons?: number // confirmed moons as of 2025
  axialTiltDeg: number
  texture: string
  emissive?: boolean
  rings?: { innerKm: number; outerKm: number; texture: string }
}

export const BODIES: BodyData[] = data
