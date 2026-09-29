import {
  AnimationClip,
  CatmullRomCurve3,
  Color,
  FrontSide,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  QuaternionKeyframeTrack,
  TubeGeometry,
  Vector3,
  VectorKeyframeTrack,
  type BufferGeometry,
  type KeyframeTrack,
  type LineLoop,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { AsteroidSample } from '../asteroids/index.ts'
import type { PositionFn } from '../orbits/index.ts'

// Same metres-per-unit as the Android view: Neptune's orbit ≈ 1 m across.
const AR_SCALE = 0.002
const ORBIT_TUBE_RADIUS = 0.5
const ORBIT_SEGMENTS = 180
// Asteroids to include; callers pass field.sample(date, ASTEROID_COUNT).
export const ASTEROID_COUNT = 1000
const ASTEROID_SIZE = 0.7
const ASTEROID_COLORS: Record<string, number> = {
  belt: 0xc9b9a3,
  trojans: 0x9fb8d6,
}

// Quick Look plays baked animation on a loop. One loop is one Jupiter year.
// Each body inside Jupiter's orbit runs a whole number of its real orbits per
// loop (speed nudged by a few percent) so the loop is seamless; bodies that
// would manage less than half an orbit (Saturn, Uranus, Neptune) stay still.
const LOOP_DAYS = 4332.59
const LOOP_SECONDS = 60
const SAMPLES_PER_ORBIT = 32
const BELT_TURNS = 3 // mean belt period ≈ 4.6 yr → ~2.6 per Jupiter year
const TROJAN_TURNS = 1 // Trojans share Jupiter's orbit
const TURN_SAMPLES = 8
const DAY_MS = 86_400_000
const UP = new Vector3(0, 1, 0)

export interface ExportBody {
  root: Object3D // direct child of the system group, at the body's position
  position: PositionFn
  periodDays?: number
}

export interface QuickLookInput {
  system: Object3D
  bodies: ExportBody[]
  asteroids?: AsteroidSample
  date: Date
}

// Real positions along the body's orbit, time-scaled to fit `turns` orbits
// into the loop. The last key repeats the first so the loop closes exactly.
function orbitTrack(
  target: Object3D,
  body: ExportBody,
  date: Date,
  turns: number,
): KeyframeTrack {
  const count = turns * SAMPLES_PER_ORBIT
  const times: number[] = []
  const values: number[] = []
  const p = new Vector3()
  for (let k = 0; k < count; k++) {
    const days = (k / count) * turns * body.periodDays!
    body.position(new Date(date.getTime() + days * DAY_MS), p)
    times.push((k / count) * LOOP_SECONDS)
    values.push(p.x, p.y, p.z)
  }
  times.push(LOOP_SECONDS)
  values.push(values[0], values[1], values[2])
  return new VectorKeyframeTrack(`${target.uuid}.position`, times, values)
}

// Rigid prograde rotation about the ecliptic pole (scene +Y).
function spinTrack(target: Object3D, turns: number): KeyframeTrack {
  const count = turns * TURN_SAMPLES
  const times: number[] = []
  const values: number[] = []
  const q = new Quaternion()
  for (let k = 0; k <= count; k++) {
    q.setFromAxisAngle(UP, (k / count) * turns * Math.PI * 2)
    times.push((k / count) * LOOP_SECONDS)
    values.push(q.x, q.y, q.z, q.w)
  }
  return new QuaternionKeyframeTrack(`${target.uuid}.quaternion`, times, values)
}

// Copies of a mesh with standard materials. USDZ has no unlit or
// double-sided materials: the Sun becomes emissive, and flat surfaces
// (Saturn's rings) get a flipped back copy.
function exportMeshes(mesh: Mesh, matrix: Matrix4): Mesh[] {
  const source = mesh.material as MeshStandardMaterial
  const material = source.isMeshStandardMaterial
    ? source
    : new MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: source.map,
      })
  const front = new Mesh(mesh.geometry, material)
  front.name = mesh.name || 'Mesh'
  front.applyMatrix4(matrix)
  if (source.side === FrontSide) return [front]

  front.material = Object.assign(source.clone(), { side: FrontSide })
  const back = new Mesh(mesh.geometry, front.material)
  back.name = `${front.name} back`
  back.applyMatrix4(matrix)
  back.rotateX(Math.PI)
  return [front, back]
}

// USDZ only carries meshes, so the live scene is rebuilt: orbit lines become
// thin tubes and a sample of asteroids becomes tiny rocks. Glow, stars and
// labels are left out.
function buildExport(input: QuickLookInput): {
  scene: Group
  clip: AnimationClip
} {
  const { system, bodies, asteroids, date } = input
  const root = new Group()
  root.scale.setScalar(AR_SCALE)
  system.updateMatrixWorld(true)
  const tracks: KeyframeTrack[] = []

  // Bodies: one group per body (so rings move with Saturn), meshes inside it
  // keep their orientation relative to the body.
  for (const body of bodies) {
    const group = new Group()
    group.position.copy(body.root.position)
    const toLocal = body.root.matrixWorld.clone().invert()
    body.root.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return
      const matrix = toLocal.clone().multiply(obj.matrixWorld)
      group.add(...exportMeshes(obj as Mesh, matrix))
    })
    group.name = group.children[0]?.name ?? 'Body'
    root.add(group)

    const turns = body.periodDays ? Math.round(LOOP_DAYS / body.periodDays) : 0
    if (turns > 0) tracks.push(orbitTrack(group, body, date, turns))
  }

  // Orbit lines as tubes.
  const orbitMaterial = new MeshStandardMaterial({
    color: 0x8fa6c4,
    emissive: new Color(0x8fa6c4).multiplyScalar(0.4),
    roughness: 1,
  })
  system.traverse((obj) => {
    if (!(obj as LineLoop).isLineLoop) return
    const pos = (obj as LineLoop).geometry.getAttribute('position')
    const points = Array.from({ length: pos.count }, (_, i) =>
      new Vector3().fromBufferAttribute(pos, i),
    )
    const tube = new TubeGeometry(
      new CatmullRomCurve3(points, true),
      ORBIT_SEGMENTS,
      ORBIT_TUBE_RADIUS,
      3,
      true,
    )
    const mesh = new Mesh(tube, orbitMaterial)
    mesh.name = obj.name
    root.add(mesh)
  })

  // Asteroids: one merged mesh per group, each spinning about the Sun.
  if (asteroids) {
    const rock = new OctahedronGeometry(ASTEROID_SIZE, 0)
    asteroids.groupNames.forEach((name, g) => {
      const parts: BufferGeometry[] = []
      for (let k = 0; k < asteroids.groups.length; k++) {
        if (asteroids.groups[k] !== g) continue
        const [x, y, z] = asteroids.positions.subarray(k * 3, k * 3 + 3)
        parts.push(rock.clone().translate(x, y, z))
      }
      if (!parts.length) return
      const mesh = new Mesh(
        mergeGeometries(parts),
        new MeshStandardMaterial({
          color: ASTEROID_COLORS[name] ?? 0xaaaaaa,
          roughness: 1,
        }),
      )
      mesh.name = `Asteroids ${name}`
      const spinner = new Group().add(mesh)
      spinner.name = `${mesh.name} orbit`
      root.add(spinner)
      tracks.push(
        spinTrack(spinner, name === 'trojans' ? TROJAN_TURNS : BELT_TURNS),
      )
    })
  }

  // The exporter writes the children of the object it's given and reads
  // each object's cached matrix, so wrap the scaled root and refresh them.
  const scene = new Group().add(root)
  scene.updateMatrixWorld(true)
  return { scene, clip: new AnimationClip('orbits', LOOP_SECONDS, tracks) }
}

export async function exportUsdz(input: QuickLookInput): Promise<Blob> {
  const { USDZExporter } =
    await import('three/addons/exporters/USDZExporter.js')
  const { scene, clip } = buildExport(input)
  const buffer = await new USDZExporter().parseAsync(scene, {
    quickLookCompatible: true,
    maxTextureSize: 1024,
    animations: [clip],
    animationFrameRate: 30,
  })
  return new Blob([buffer], { type: 'model/vnd.usdz+zip' })
}

// Animated loop starting at the current sim date, opened in AR Quick Look.
// No time controls or labels there; Saturn and beyond stay still.
export async function openQuickLook(input: QuickLookInput): Promise<void> {
  const blob = await exportUsdz(input)
  const link = document.createElement('a')
  link.setAttribute('rel', 'ar')
  link.href = `${URL.createObjectURL(blob)}#allowsContentScaling=1`
  // Quick Look requires the link to wrap an image.
  link.append(document.createElement('img'))
  link.click()
}
