import {
  HelioVector,
  RotateVector,
  Rotation_EQJ_ECL,
  type Body,
} from 'astronomy-engine'
import { BufferGeometry, LineBasicMaterial, LineLoop, Vector3 } from 'three'

// Readable scale: distances are compressed (sqrt of AU) and offset past the
// Sun's surface so inner planets stay visible next to the outer ones.
const DISTANCE_OFFSET = 20
const DISTANCE_FACTOR = 45

export function toSceneDistance(au: number): number {
  return au === 0 ? 0 : DISTANCE_OFFSET + DISTANCE_FACTOR * Math.sqrt(au)
}

const EQJ_TO_ECL = Rotation_EQJ_ECL()
const DAY_MS = 86_400_000

// Heliocentric position in scene units. The ecliptic plane maps to the XZ
// plane with ecliptic north as +Y.
export function heliocentricPosition(
  body: Body,
  date: Date,
  target = new Vector3(),
): Vector3 {
  const ecl = RotateVector(EQJ_TO_ECL, HelioVector(body, date))
  target.set(ecl.x, ecl.z, -ecl.y)
  const au = target.length()
  return au === 0 ? target : target.setLength(toSceneDistance(au))
}

const orbitMaterial = new LineBasicMaterial({
  color: 0x8fa6c4,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
})

// One full revolution sampled from `date`, using the same scale as the body.
export function createOrbitLine(
  body: Body,
  date: Date,
  periodDays: number,
  segments = 360,
): LineLoop {
  const points: Vector3[] = []
  const start = date.getTime()
  for (let i = 0; i < segments; i++) {
    const t = new Date(start + (periodDays * DAY_MS * i) / segments)
    points.push(heliocentricPosition(body, t))
  }
  const line = new LineLoop(
    new BufferGeometry().setFromPoints(points),
    orbitMaterial,
  )
  line.name = `${body} orbit`
  return line
}
