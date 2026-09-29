import type { Body } from 'astronomy-engine'
import {
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  type Object3D,
} from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { loadTexture } from '../assets/index.ts'
import {
  createOrbitLine,
  elementsOrientation,
  elementsPosition,
  iauOrientation,
  planetPosition,
  type OrientationFn,
  type PositionFn,
} from '../orbits/index.ts'
import { BODIES, type BodyData } from './data.ts'
import { createLabelTexture } from './labelTexture.ts'
import { createRings } from './rings.ts'
import { createSunGlow } from './sunGlow.ts'

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
//   └─ label (stays upright above the body; click selects the body)
export interface BodyView {
  data: BodyData
  radius: number // scene units
  root: Group
  pole: Group
  mesh: Mesh
  label: HTMLElement
  arLabel: Sprite // 3D label, only shown in WebXR AR
  position: PositionFn
  orientation: OrientationFn
}

function positionOf(body: BodyData): PositionFn {
  const o = body.orbit
  if (!o) return planetPosition(body.id as Body)
  const rad = MathUtils.degToRad
  return elementsPosition({
    a: o.a,
    e: o.e,
    i: rad(o.iDeg),
    node: rad(o.nodeDeg),
    peri: rad(o.periDeg),
    meanAnomaly: rad(o.meanAnomalyDeg),
    epochJd: o.epochJd,
  })
}

function orientationOf(body: BodyData): OrientationFn {
  return body.rotation
    ? elementsOrientation(body.rotation)
    : iauOrientation(body.id as Body)
}

const geometry = new SphereGeometry(1, 64, 32)

// Label height as a fraction of viewing distance: stays readable at any
// distance, ~2.2 cm tall seen from 1 m.
const AR_LABEL_SIZE = 0.022
export const AR_LABEL_COLOR = 0xe8ecf2
export const AR_LABEL_ACTIVE_COLOR = 0xffb74d

// WebXR can't place HTML labels, so AR uses camera-facing sprites of constant
// on-screen size, drawn on top of everything.
function createArLabel(body: BodyData, height: number): Sprite {
  const { texture, aspect } = createLabelTexture(body.name)
  const size = AR_LABEL_SIZE * (body.minor ? 0.75 : 1)
  const sprite = new Sprite(
    new SpriteMaterial({
      map: texture,
      color: AR_LABEL_COLOR,
      sizeAttenuation: false,
      depthTest: false,
      transparent: true,
    }),
  )
  sprite.center.set(0.5, 0)
  sprite.scale.set(size * aspect, size, 1)
  sprite.position.y = height
  sprite.renderOrder = 10
  sprite.visible = false
  return sprite
}

function createLabel(body: BodyData, height: number): CSS2DObject {
  const el = document.createElement('div')
  el.className = 'label'
  el.textContent = body.name
  el.dataset.body = body.id
  if (body.minor) el.classList.add('minor')
  // The body list is the accessible way to select; labels are visual only.
  el.setAttribute('aria-hidden', 'true')
  const label = new CSS2DObject(el)
  label.center.set(0.5, 1)
  label.position.y = height
  return label
}

export function createBodies(
  parent: Object3D,
  date: Date,
): Map<string, BodyView> {
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
    const labelHeight = radius * 1.25 + 1.5
    const label = createLabel(body, labelHeight)
    const arLabel = createArLabel(body, labelHeight)
    root.add(pole, label, arLabel)
    if (body.emissive) root.add(createSunGlow(radius * 7))
    parent.add(root)

    const position = positionOf(body)
    if (body.orbitalPeriodDays) {
      parent.add(
        createOrbitLine(position, date, body.orbitalPeriodDays, body.name),
      )
    }
    views.set(body.id, {
      data: body,
      radius,
      root,
      pole,
      mesh,
      label: label.element,
      arLabel,
      position,
      orientation: orientationOf(body),
    })
  }
  updateBodies(views, date)
  return views
}

// Move every body to where it is at `date` and spin it to its real rotation.
export function updateBodies(views: Map<string, BodyView>, date: Date): void {
  for (const { root, pole, mesh, position, orientation } of views.values()) {
    position(date, root.position)
    mesh.rotation.y = orientation(date, pole.quaternion)
  }
}
