import {
  HelioVector,
  MakeTime,
  RotateVector,
  RotationAxis,
  Rotation_EQJ_ECL,
  Vector,
  type Body,
} from 'astronomy-engine'
import {
  BufferGeometry,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { julianDay, keplerPositionAu, type OrbitalElements } from './kepler.ts'

// Readable scale: distances are compressed (sqrt of AU) and offset past the
// Sun's surface so inner planets stay visible next to the outer ones.
export const DISTANCE_OFFSET = 20
export const DISTANCE_FACTOR = 45

export function toSceneDistance(au: number): number {
  return au === 0 ? 0 : DISTANCE_OFFSET + DISTANCE_FACTOR * Math.sqrt(au)
}

const EQJ_TO_ECL = Rotation_EQJ_ECL()
const DAY_MS = 86_400_000

// EQJ (J2000 equatorial) direction to scene axes: rotate to the ecliptic,
// then map ecliptic (x, y, z) to scene (x, z, -y).
function eqjToScene(v: Vector, target: Vector3): Vector3 {
  const ecl = RotateVector(EQJ_TO_ECL, v)
  return target.set(ecl.x, ecl.z, -ecl.y)
}

// Where a body is at a given date, in scene units.
export type PositionFn = (date: Date, target: Vector3) => Vector3

function toScene(target: Vector3): Vector3 {
  const au = target.length()
  return au === 0 ? target : target.setLength(toSceneDistance(au))
}

// Planets and the Sun via astronomy-engine. The ecliptic plane maps to the XZ
// plane with ecliptic north as +Y.
export function planetPosition(body: Body): PositionFn {
  return (date, target) => toScene(eqjToScene(HelioVector(body, date), target))
}

// Small bodies from their orbital elements (two-body Kepler orbit).
export function elementsPosition(el: OrbitalElements): PositionFn {
  return (date, target) => toScene(keplerPositionAu(el, date, target))
}

const orbitMaterial = new LineBasicMaterial({
  color: 0x8fa6c4,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
})

// One full revolution sampled from `date`, using the same scale as the body.
export function createOrbitLine(
  position: PositionFn,
  date: Date,
  periodDays: number,
  name: string,
  segments = 360,
): LineLoop {
  const points: Vector3[] = []
  const start = date.getTime()
  for (let i = 0; i < segments; i++) {
    const t = new Date(start + (periodDays * DAY_MS * i) / segments)
    points.push(position(t, new Vector3()))
  }
  const line = new LineLoop(
    new BufferGeometry().setFromPoints(points),
    orbitMaterial,
  )
  line.name = `${name} orbit`
  return line
}

// Writes a body's pole frame into `pole` (local +Y = north pole, local +X =
// ascending node of the body's equator on the J2000 equator) and returns the
// prime-meridian spin angle W in radians, measured east from that node.
// Spinning a mesh by W about +Y puts its texture's longitude 0 (u = 0.5 on a
// SphereGeometry, local +X) where it really is.
export type OrientationFn = (date: Date, pole: Quaternion) => number

// IAU pole and spin constants for bodies astronomy-engine doesn't cover:
// α0/δ0 = pole RA/Dec (deg, J2000), W = w0 + wRate·d (deg, d = days from J2000).
export interface RotationElements {
  poleRaDeg: number
  poleDecDeg: number
  w0Deg: number
  wRateDegPerDay: number
}

const J2000_JD = 2451545
const north = new Vector3()
const node = new Vector3()
const east = new Vector3()
const basis = new Matrix4()

function poleFrame(n: Vector, pole: Quaternion): void {
  eqjToScene(n, north)
  // Node = J2000 pole × body pole.
  eqjToScene(new Vector(-n.y, n.x, 0, n.t), node).normalize()
  east.crossVectors(node, north)
  pole.setFromRotationMatrix(basis.makeBasis(node, north, east))
}

// Real orientation from the IAU rotation model built into astronomy-engine.
export function iauOrientation(body: Body): OrientationFn {
  return (date, pole) => {
    const axis = RotationAxis(body, date)
    poleFrame(axis.north, pole)
    return MathUtils.degToRad(axis.spin)
  }
}

// Same model from explicit constants.
export function elementsOrientation(rot: RotationElements): OrientationFn {
  const ra = MathUtils.degToRad(rot.poleRaDeg)
  const dec = MathUtils.degToRad(rot.poleDecDeg)
  const n = new Vector(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
    MakeTime(0),
  )
  return (date, pole) => {
    poleFrame(n, pole)
    const days = julianDay(date) - J2000_JD
    return MathUtils.degToRad(rot.w0Deg + rot.wRateDegPerDay * days)
  }
}
