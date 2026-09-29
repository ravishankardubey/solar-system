import {
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
  type Group,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three'

// Scene units → metres. At 0.002 Neptune's orbit is about 1 m across.
const DEFAULT_SCALE = 0.002
const MIN_SCALE = 0.0005
const MAX_SCALE = 0.1
const SCALE_STEP = 1.5
// Float the system this far above the surface it's placed on.
const HOVER_HEIGHT = 0.15
const AR_NEAR = 0.01
// "Zoom to" scales the system so the chosen body is this big (radius, m).
const FOCUS_RADIUS = 0.05
// Taps within this angle of a body's centre select it, so millimetre-sized
// planets stay tappable.
const MIN_HIT_ANGLE = MathUtils.degToRad(2.5)
const HINT_SECONDS = 4

export interface ArBody {
  id: string
  name: string
  root: Object3D // direct child of `system`
  radius: number // scene units
}

export interface WebXrContext {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  system: Group // everything that should appear in AR
  panels: HTMLElement[] // page panels to show over the camera view
  bodies: ArBody[]
  onSelect(id: string | null): void
  onLabels(visible: boolean): void
  onEnd(): void
}

export interface WebXrSession {
  // Call every XR frame with the frame the animation loop receives.
  update(frame: XRFrame): void
  // Keep the zoom button in step with the app's selection.
  setSelected(id: string | null): void
}

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'ar-overlay'
  overlay.innerHTML = `
    <div class="ar-top">
      <button type="button" data-ar="exit">Exit AR</button>
      <div class="ar-scale" role="group" aria-label="Size">
        <button type="button" data-ar="smaller" aria-label="Smaller">−</button>
        <button type="button" data-ar="bigger" aria-label="Bigger">+</button>
      </div>
    </div>
    <p class="ar-hint">Point at the floor or a table, then tap to place.</p>
    <div class="ar-actions" hidden>
      <button type="button" data-ar="move">Move</button>
      <button type="button" data-ar="labels" aria-pressed="true">Labels</button>
      <button type="button" data-ar="zoom" hidden></button>
    </div>`
  return overlay
}

// Live AR: tap a detected surface to place the solar system, then walk
// around it while time keeps running. Tap a planet for its facts, zoom to it
// (it then stays put while the others move around it), toggle labels.
// Uses hit-test and DOM overlay.
export async function startWebXr(ctx: WebXrContext): Promise<WebXrSession> {
  const { renderer, scene, camera, system, panels, bodies } = ctx
  const overlay = createOverlay()
  document.body.append(overlay)

  let session: XRSession
  try {
    session = await navigator.xr!.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlay },
    })
  } catch (err) {
    overlay.remove()
    throw err
  }

  const homes = panels.map((panel) => panel.parentElement!)
  overlay.append(...panels)
  const hint = overlay.querySelector<HTMLElement>('.ar-hint')!
  const actions = overlay.querySelector<HTMLElement>('.ar-actions')!
  const zoomBtn = overlay.querySelector<HTMLButtonElement>('[data-ar=zoom]')!
  const labelsBtn =
    overlay.querySelector<HTMLButtonElement>('[data-ar=labels]')!

  const savedNear = camera.near
  camera.near = AR_NEAR
  camera.updateProjectionMatrix()
  camera.clearViewOffset()
  system.visible = false
  system.scale.setScalar(DEFAULT_SCALE)
  ctx.onLabels(true)

  const reticle = new Mesh(
    new RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffb74d }),
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  let hitSource: XRHitTestSource | undefined
  let placing = true
  const anchor = new Vector3() // where the Sun (or focused body) sits
  let selectedId: string | null = null
  let focusId: string | null = null
  let hintTimer = 0

  session
    .requestReferenceSpace('viewer')
    .then((space) => session.requestHitTestSource?.({ space }))
    .then((source) => (hitSource = source))
    .catch((err) => console.warn('AR hit test unavailable', err))

  const bodyById = (id: string | null) => bodies.find((b) => b.id === id)

  function showHint(text: string | null): void {
    window.clearTimeout(hintTimer)
    hint.hidden = !text
    if (text) hint.textContent = text
  }

  function setPlacing(value: boolean): void {
    placing = value
    actions.hidden = value
    if (value) {
      showHint('Point at the floor or a table, then tap to place.')
    } else {
      reticle.visible = false
      showHint('Tap a planet to see its facts.')
      hintTimer = window.setTimeout(() => showHint(null), HINT_SECONDS * 1000)
    }
  }

  function updateZoomButton(): void {
    const selected = bodyById(selectedId)
    const showAll = focusId !== null && (!selected || selectedId === focusId)
    zoomBtn.hidden = !showAll && !selected
    zoomBtn.textContent = showAll ? 'Show all' : `Zoom to ${selected?.name}`
  }

  // Keep the anchor on the focused body (or the Sun) as everything moves.
  function layout(): void {
    const focus = bodyById(focusId)
    system.position.copy(anchor)
    if (focus) {
      system.position.addScaledVector(focus.root.position, -system.scale.x)
    }
  }

  function zoom(): void {
    const selected = bodyById(selectedId)
    if (focusId !== null && (!selected || selectedId === focusId)) {
      focusId = null
      system.scale.setScalar(DEFAULT_SCALE)
    } else if (selected) {
      focusId = selected.id
      system.scale.setScalar(
        MathUtils.clamp(FOCUS_RADIUS / selected.radius, MIN_SCALE, MAX_SCALE),
      )
    }
    updateZoomButton()
  }

  const origin = new Vector3()
  const direction = new Vector3()
  const toBody = new Vector3()
  const orientation = new Quaternion()

  // The body under a screen tap: closest to the camera among those whose
  // disc (or minimum hit angle) contains the tap ray.
  function pick(event: XRInputSourceEvent): string | null {
    const space = renderer.xr.getReferenceSpace()
    const pose =
      space && event.frame.getPose(event.inputSource.targetRaySpace, space)
    if (!pose) return null
    const { position: o, orientation: q } = pose.transform
    origin.set(o.x, o.y, o.z)
    orientation.set(q.x, q.y, q.z, q.w)
    direction.set(0, 0, -1).applyQuaternion(orientation)
    let best: { id: string; distance: number } | null = null
    for (const body of bodies) {
      body.root.getWorldPosition(toBody).sub(origin)
      const distance = toBody.length()
      const discAngle = Math.atan((body.radius * system.scale.x) / distance)
      if (toBody.angleTo(direction) > Math.max(discAngle, MIN_HIT_ANGLE))
        continue
      if (!best || distance < best.distance) best = { id: body.id, distance }
    }
    return best?.id ?? null
  }

  // Screen taps place the system or pick a body; taps on overlay controls
  // and panels must not.
  overlay.addEventListener('beforexrselect', (e) => {
    const target = e.target as Element
    if (target.closest('button, .time-panel, .info-panel')) e.preventDefault()
  })
  session.addEventListener('select', (event) => {
    if (placing) {
      if (!reticle.visible) return
      anchor.setFromMatrixPosition(reticle.matrix)
      anchor.y += HOVER_HEIGHT
      system.visible = true
      setPlacing(false)
      return
    }
    ctx.onSelect(pick(event))
  })

  overlay.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-ar]')
      ?.dataset.ar
    const scale = system.scale.x
    if (action === 'exit') session.end()
    if (action === 'move') setPlacing(true)
    if (action === 'zoom') zoom()
    if (action === 'labels') {
      const on = labelsBtn.getAttribute('aria-pressed') !== 'true'
      labelsBtn.setAttribute('aria-pressed', String(on))
      ctx.onLabels(on)
    }
    if (action === 'bigger')
      system.scale.setScalar(Math.min(MAX_SCALE, scale * SCALE_STEP))
    if (action === 'smaller')
      system.scale.setScalar(Math.max(MIN_SCALE, scale / SCALE_STEP))
  })

  session.addEventListener('end', () => {
    window.clearTimeout(hintTimer)
    hitSource?.cancel()
    scene.remove(reticle)
    reticle.geometry.dispose()
    panels.forEach((panel, i) => homes[i].append(panel))
    overlay.remove()
    camera.near = savedNear
    camera.updateProjectionMatrix()
    system.position.set(0, 0, 0)
    system.scale.setScalar(1)
    system.visible = true
    ctx.onLabels(false)
    ctx.onEnd()
  })

  renderer.xr.setReferenceSpaceType('local')
  await renderer.xr.setSession(session)

  return {
    update(frame) {
      if (!placing) {
        layout()
        return
      }
      const space = renderer.xr.getReferenceSpace()
      if (!hitSource || !space) return
      const pose = frame.getHitTestResults(hitSource)[0]?.getPose(space)
      reticle.visible = !!pose
      if (pose) reticle.matrix.fromArray(pose.transform.matrix)
    },
    setSelected(id) {
      selectedId = id
      updateZoomButton()
    },
  }
}
