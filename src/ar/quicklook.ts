import {
  CatmullRomCurve3,
  Color,
  FrontSide,
  Group,
  OctahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type LineLoop,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { AsteroidSample } from '../asteroids/index.ts'

// Same metres-per-unit as the Android view: Neptune's orbit ≈ 1 m across.
const AR_SCALE = 0.002
const ORBIT_TUBE_RADIUS = 0.5
// Asteroids to include; callers pass field.sample(date, ASTEROID_COUNT).
export const ASTEROID_COUNT = 1000
const ASTEROID_SIZE = 0.7
const ORBIT_SEGMENTS = 180
const ASTEROID_COLORS: Record<string, number> = {
  belt: 0xc9b9a3,
  trojans: 0x9fb8d6,
}

// USDZ only carries meshes with standard materials, so the live scene is
// rebuilt: the unlit Sun becomes emissive, orbit lines become thin tubes and
// a sample of asteroids becomes tiny rocks. Glow, stars and labels are left out.
function buildExport(
  system: Object3D,
  asteroids: AsteroidSample | undefined,
): Group {
  const root = new Group()
  root.scale.setScalar(AR_SCALE)
  system.updateMatrixWorld(true)

  const orbitMaterial = new MeshStandardMaterial({
    color: 0x8fa6c4,
    emissive: new Color(0x8fa6c4).multiplyScalar(0.4),
    roughness: 1,
  })

  system.traverse((obj) => {
    if ((obj as Mesh).isMesh) {
      const mesh = obj as Mesh
      const source = mesh.material as MeshStandardMaterial
      const material = source.isMeshStandardMaterial
        ? source
        : new MeshStandardMaterial({
            color: 0x000000,
            emissive: 0xffffff,
            emissiveMap: source.map,
          })
      const copy = new Mesh(mesh.geometry, material)
      copy.name = mesh.name || 'Mesh'
      copy.applyMatrix4(mesh.matrixWorld)
      root.add(copy)
      // USDZ has no double-sided materials: add a flipped copy so flat
      // surfaces (Saturn's rings) show from both sides.
      if (source.side !== FrontSide) {
        const back = new Mesh(
          mesh.geometry,
          Object.assign(source.clone(), { side: FrontSide }),
        )
        back.name = `${copy.name} back`
        back.applyMatrix4(mesh.matrixWorld)
        back.rotateX(Math.PI)
        root.add(back)
        copy.material = back.material
      }
    } else if ((obj as LineLoop).isLineLoop) {
      const line = obj as LineLoop
      const pos = line.geometry.getAttribute('position')
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
      mesh.name = line.name
      root.add(mesh)
    }
  })

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
      root.add(mesh)
    })
  }
  // The exporter writes the children of the object it's given and reads
  // each object's cached matrix, so wrap the scaled root and refresh them.
  const scene = new Group().add(root)
  scene.updateMatrixWorld(true)
  return scene
}

export async function exportUsdz(
  system: Object3D,
  asteroids: AsteroidSample | undefined,
): Promise<Blob> {
  const { USDZExporter } =
    await import('three/addons/exporters/USDZExporter.js')
  const buffer = await new USDZExporter().parseAsync(
    buildExport(system, asteroids),
    { quickLookCompatible: true, maxTextureSize: 1024 },
  )
  return new Blob([buffer], { type: 'model/vnd.usdz+zip' })
}

// Snapshot of the current moment, opened in AR Quick Look. Quick Look shows
// a still scene: no motion, time controls or labels.
export async function openQuickLook(
  system: Object3D,
  asteroids: AsteroidSample | undefined,
): Promise<void> {
  const blob = await exportUsdz(system, asteroids)
  const link = document.createElement('a')
  link.setAttribute('rel', 'ar')
  link.href = `${URL.createObjectURL(blob)}#allowsContentScaling=1`
  // Quick Look requires the link to wrap an image.
  link.append(document.createElement('img'))
  link.click()
}
