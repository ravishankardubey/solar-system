import { Vector3 } from 'three'

// Keplerian elements, heliocentric ecliptic J2000. Angles in radians.
export interface OrbitalElements {
  a: number // semi-major axis, AU
  e: number
  i: number
  node: number // longitude of ascending node Ω
  peri: number // argument of perihelion ω
  meanAnomaly: number // at epochJd
  epochJd: number
}

export const GAUSS_K = 0.01720209895 // rad/day: √(GM☉) in AU^1.5/day
const DAY_MS = 86_400_000
const UNIX_EPOCH_JD = 2440587.5

export function julianDay(date: Date): number {
  return date.getTime() / DAY_MS + UNIX_EPOCH_JD
}

export function meanMotion(a: number): number {
  return GAUSS_K / Math.pow(a, 1.5)
}

// Orbit plane axes in scene coordinates: P toward perihelion, Q 90° ahead in
// the direction of motion. Ecliptic (x, y, z) maps to scene (x, z, -y).
export function orbitAxes(
  el: Pick<OrbitalElements, 'i' | 'node' | 'peri'>,
  p: Vector3,
  q: Vector3,
): void {
  const cO = Math.cos(el.node)
  const sO = Math.sin(el.node)
  const cw = Math.cos(el.peri)
  const sw = Math.sin(el.peri)
  const ci = Math.cos(el.i)
  const si = Math.sin(el.i)
  p.set(cO * cw - sO * sw * ci, sw * si, -(sO * cw + cO * sw * ci))
  q.set(-cO * sw - sO * cw * ci, cw * si, -(-sO * sw + cO * cw * ci))
}

// Eccentric anomaly from mean anomaly (Newton's method). Mirrors the GLSL
// in src/asteroids so CPU and GPU positions agree.
export function eccentricAnomaly(M: number, e: number): number {
  let E = M
  for (let k = 0; k < 6; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  }
  return E
}

const P = new Vector3()
const Q = new Vector3()

// Heliocentric position in AU, scene axes.
export function keplerPositionAu(
  el: OrbitalElements,
  date: Date,
  target: Vector3,
): Vector3 {
  const M = el.meanAnomaly + meanMotion(el.a) * (julianDay(date) - el.epochJd)
  const E = eccentricAnomaly(M, el.e)
  orbitAxes(el, P, Q)
  return target
    .copy(P)
    .multiplyScalar(el.a * (Math.cos(E) - el.e))
    .addScaledVector(Q, el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E))
}
