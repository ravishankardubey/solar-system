import {
  MathUtils,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const OVERVIEW_POSITION = new Vector3(0, 150, 420)
const OVERVIEW_MIN_DISTANCE = 15
const MAX_DISTANCE = 1200
const TWEEN_SECONDS = 1.4
const UP = new Vector3(0, 1, 0)
const ORIGIN = new Vector3()

export interface FocusTarget {
  object: Object3D // must sit directly in the scene, so position is world space
  radius: number
  viewDistance: number
}

interface Tween {
  t: number
  fromPosition: Vector3
  fromTarget: Vector3
  offset: Vector3 // camera position relative to the goal target
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

// Orbit camera that can fly to a body and then follow it as it moves, while
// the user keeps orbiting and zooming around it.
export class CameraController {
  readonly controls: OrbitControls
  private readonly camera: PerspectiveCamera
  private focus: FocusTarget | null = null
  private tween: Tween | null = null
  private readonly lastGoal = new Vector3()
  private readonly delta = new Vector3()
  private readonly goalPosition = new Vector3()
  private readonly instant: boolean

  // `instant` skips the flight animation (reduced motion).
  constructor(
    camera: PerspectiveCamera,
    domElement: HTMLElement,
    instant = false,
  ) {
    this.camera = camera
    this.instant = instant
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = OVERVIEW_MIN_DISTANCE
    this.controls.maxDistance = MAX_DISTANCE
    // Arrow keys pan the view.
    this.controls.listenToKeyEvents(window)
  }

  // Fly to a body, or back to the overview with null.
  focusOn(target: FocusTarget | null): void {
    this.focus = target
    const goal = target ? target.object.position : ORIGIN
    const offset = target
      ? this.viewOffset(goal, target.viewDistance)
      : OVERVIEW_POSITION.clone()
    this.tween = {
      t: 0,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      offset,
    }
    this.controls.enabled = false
    this.controls.minDistance = target
      ? target.radius * 1.5
      : OVERVIEW_MIN_DISTANCE
    this.lastGoal.copy(goal)
  }

  update(realDeltaSeconds: number): void {
    const goal = this.focus ? this.focus.object.position : ORIGIN
    const tween = this.tween
    if (tween) {
      // The goal keeps moving during the flight, so it is re-read every frame.
      tween.t = this.instant
        ? 1
        : Math.min(1, tween.t + realDeltaSeconds / TWEEN_SECONDS)
      const e = easeInOutCubic(tween.t)
      this.goalPosition.copy(goal).add(tween.offset)
      this.controls.target.lerpVectors(tween.fromTarget, goal, e)
      this.camera.position.lerpVectors(tween.fromPosition, this.goalPosition, e)
      if (tween.t === 1) {
        this.tween = null
        this.controls.enabled = true
      }
    } else if (this.focus) {
      // Carry the camera along with the body.
      this.delta.subVectors(goal, this.lastGoal)
      this.camera.position.add(this.delta)
      this.controls.target.add(this.delta)
    }
    this.lastGoal.copy(goal)
    if (!this.tween) this.controls.update()
  }

  // View a planet from 40° off the Sun line, slightly above, so both its lit
  // face and the terminator show. The Sun keeps the current view direction.
  private viewOffset(goal: Vector3, distance: number): Vector3 {
    const dir =
      goal.lengthSq() === 0
        ? this.camera.position.clone().sub(goal)
        : goal
            .clone()
            .negate()
            .normalize()
            .applyAxisAngle(UP, MathUtils.degToRad(40))
            .add(new Vector3(0, 0.35, 0))
    return dir.normalize().multiplyScalar(distance)
  }
}

const MIN_HIT_PX = 16
const CLICK_MAX_MOVE_PX = 6
const CLICK_MAX_MS = 500

export interface Pickable {
  id: string
  object: Object3D
  radius: number
}

// Screen-space picking: a body is hit if the click lands within its drawn
// disc, or within MIN_HIT_PX of its centre so small planets stay clickable.
// The nearest hit body wins.
export function onBodyClick(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  pickables: Pickable[],
  onPick: (id: string) => void,
): void {
  let down: { x: number; y: number; time: number } | null = null
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, time: performance.now() }
  })
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    const quick = performance.now() - down.time < CLICK_MAX_MS
    down = null
    if (moved > CLICK_MAX_MOVE_PX || !quick) return // it was a drag

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const tanHalfFov = Math.tan(MathUtils.degToRad(camera.fov / 2))
    const p = new Vector3()
    let best: { id: string; depth: number } | null = null
    for (const { id, object, radius } of pickables) {
      p.copy(object.position).project(camera)
      if (p.z < -1 || p.z > 1) continue // behind the camera or clipped
      const sx = ((p.x + 1) / 2) * rect.width
      const sy = ((1 - p.y) / 2) * rect.height
      const depth = camera.position.distanceTo(object.position)
      const drawnPx = (radius / (depth * tanHalfFov)) * (rect.height / 2)
      const hitPx = Math.max(drawnPx, MIN_HIT_PX)
      if (Math.hypot(x - sx, y - sy) > hitPx) continue
      if (!best || depth < best.depth) best = { id, depth }
    }
    if (best) onPick(best.id)
  })
}
