import type { Body } from 'astronomy-engine'
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  type Scene,
} from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { loadTexture } from '../assets/index.ts'
import {
  bodyOrientation,
  createOrbitLine,
  heliocentricPosition,
} from '../orbits/index.ts'
import data from './data.json'
import { createRings } from './rings.ts'
import { createSunGlow } from './sunGlow.ts'

export interface BodyData {
  id: string
  name: string
  radiusKm: number
  axialTiltDeg: number
  orbitalPeriodDays?: number
  texture: string
  emissive?: boolean
  rings?: { innerKm: number; outerKm: number; texture: string }
}

export const BODIES: BodyData[] = data

// Readable scale: sqrt compresses the ~290x size range between the Sun and
// Mercury. The Sun is capped so it doesn't swallow the inner orbits.
const RADIUS_FACTOR = 0.04
const SUN_RADIUS = 16

export function toSceneRadius(body: BodyData): number {
  return body.emissive ? SUN_RADIUS : RADIUS_FACTOR * Math.sqrt(body.radiusKm)
}

// Scene structure per body:
//   root (heliocentric position)
//   ├─ pole (real pole orientation) ─ mesh (scaled sphere, spins) ─ rings
//   └─ label (stays upright above the body)
export interface BodyView {
  data: BodyData
  root: Group
  pole: Group
  mesh: Mesh
}

const geometry = new SphereGeometry(1, 64, 32)

function createLabel(text: string, height: number): CSS2DObject {
  const el = document.createElement('div')
  el.className = 'label'
  el.textContent = text
  const label = new CSS2DObject(el)
  label.center.set(0.5, 1)
  label.position.y = height
  return label
}

export function createBodies(scene: Scene, date: Date): Map<string, BodyView> {
  const views = new Map<string, BodyView>()
  for (const body of BODIES) {
    const radius = toSceneRadius(body)
    const map = loadTexture(body.texture)
    const material = body.emissive
      ? new MeshBasicMaterial({ map, toneMapped: false })
      : new MeshStandardMaterial({ map, roughness: 1, metalness: 0 })
    const mesh = new Mesh(geometry, material)
    mesh.name = body.id
    mesh.scale.setScalar(radius)

    if (body.rings) {
      const { innerKm, outerKm, texture } = body.rings
      mesh.add(
        createRings(innerKm / body.radiusKm, outerKm / body.radiusKm, texture),
      )
    }

    const pole = new Group()
    pole.add(mesh)

    const root = new Group()
    root.add(pole, createLabel(body.name, radius * 1.25 + 1.5))
    if (body.emissive) root.add(createSunGlow(radius * 7))
    scene.add(root)

    if (body.orbitalPeriodDays) {
      scene.add(createOrbitLine(body.id as Body, date, body.orbitalPeriodDays))
    }
    views.set(body.id, { data: body, root, pole, mesh })
  }
  updateBodies(views, date)
  return views
}

// Move every body to where it is at `date` and spin it to its real rotation.
export function updateBodies(views: Map<string, BodyView>, date: Date): void {
  for (const { data, root, pole, mesh } of views.values()) {
    const body = data.id as Body
    heliocentricPosition(body, date, root.position)
    mesh.rotation.y = bodyOrientation(body, date, pole.quaternion)
  }
}
