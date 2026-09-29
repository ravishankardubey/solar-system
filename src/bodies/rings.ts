import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  Vector3,
} from 'three'
import { loadTexture } from '../assets/index.ts'

// Ring in the parent's equatorial plane, sized in planet radii. The texture is
// a radial strip, so UVs are remapped from angle-based to radius-based.
export function createRings(
  innerRadius: number,
  outerRadius: number,
  texture: string,
): Mesh {
  const geometry = new RingGeometry(innerRadius, outerRadius, 128, 1)
  const pos = geometry.attributes.position
  const uv = geometry.attributes.uv
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    uv.setXY(i, (v.length() - innerRadius) / (outerRadius - innerRadius), 0.5)
  }
  const material = new MeshStandardMaterial({
    map: loadTexture(texture),
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  })
  const mesh = new Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}
