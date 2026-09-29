import {
  HelioVector,
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

// Readable scale: distances are compressed (sqrt of AU) and offset past the
// Sun's surface so inner planets stay visible next to the outer ones.
const DISTANCE_OFFSET = 20
const DISTANCE_FACTOR = 45

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

// Heliocentric position in scene units. The ecliptic plane maps to the XZ
// plane with ecliptic north as +Y.
export function heliocentricPosition(
  body: Body,
  date: Date,
  target = new Vector3(),
): Vector3 {
  eqjToScene(HelioVector(body, date), target)
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

const north = new Vector3()
const node = new Vector3()
const east = new Vector3()
const basis = new Matrix4()

// Real body orientation from the IAU rotation model. Writes the pole frame
// into `pole` (local +Y = north pole, local +X = ascending node of the body's
// equator on the J2000 equator) and returns the prime-meridian spin angle W in
// radians, measured east from that node. Spinning a mesh by W about +Y puts
// its texture's longitude 0 (u = 0.5 on a SphereGeometry, local +X) where it
// really is.
export function bodyOrientation(
  body: Body,
  date: Date,
  pole: Quaternion,
): number {
  const axis = RotationAxis(body, date)
  const n = axis.north
  eqjToScene(n, north)
  // Node = J2000 pole x body pole.
  eqjToScene(new Vector(-n.y, n.x, 0, n.t), node).normalize()
  east.crossVectors(node, north)
  pole.setFromRotationMatrix(basis.makeBasis(node, north, east))
  return MathUtils.degToRad(axis.spin)
}
