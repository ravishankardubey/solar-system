import data from './data.json'

// Static facts for every body. Kept free of Three.js so the UI can import it.
export interface BodyData {
  id: string
  name: string
  type: string
  color: string
  description: string
  shortcut?: number // number key that selects it
  minor?: boolean // small body: smaller label
  radiusKm: number
  massEarths: number
  gravity: number // m/s² at the surface (cloud tops for giants)
  dayHours: number // solar day; equatorial rotation for the Sun
  orbitalPeriodDays?: number
  distanceAu?: number // semi-major axis
  meanTempC?: number // surface temperature for the Sun
  moons?: number // known moons with confirmed orbits
  moonsAsOf?: string // when `moons` was last checked, e.g. "Apr 2026"
  axialTiltDeg: number
  texture: string
  emissive?: boolean
  rings?: { innerKm: number; outerKm: number; texture: string }
  // Bodies astronomy-engine doesn't model: Kepler elements from JPL SBDB
  // (heliocentric ecliptic J2000) and IAU rotation constants.
  orbit?: {
    a: number
    e: number
    iDeg: number
    nodeDeg: number
    periDeg: number
    meanAnomalyDeg: number
    epochJd: number
  }
  rotation?: {
    poleRaDeg: number
    poleDecDeg: number
    w0Deg: number
    wRateDegPerDay: number
  }
}

export const BODIES: BodyData[] = data
