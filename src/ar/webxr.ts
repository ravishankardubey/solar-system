import {
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Group,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three'

// Scene units → metres. At 0.002 Neptune's orbit is about 1 m across.
const DEFAULT_SCALE = 0.002
const MIN_SCALE = 0.0005
const MAX_SCALE = 0.02
const SCALE_STEP = 1.5
// Float the system this far above the surface it's placed on.
const HOVER_HEIGHT = 0.15
const AR_NEAR = 0.01

export interface WebXrContext {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  system: Group // everything that should appear in AR
  timePanel: HTMLElement // shown over the camera view
  onEnd(): void
}

export interface WebXrSession {
  // Call every XR frame with the frame the animation loop receives.
  update(frame: XRFrame): void
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
    <button type="button" class="ar-move" data-ar="move" hidden>Move</button>`
  return overlay
}

// Live AR: tap a detected surface to place the solar system, then walk
// around it while time keeps running. Uses hit-test and DOM overlay.
export async function startWebXr(ctx: WebXrContext): Promise<WebXrSession> {
  const { renderer, scene, camera, system, timePanel } = ctx
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

  const timeHome = timePanel.parentElement!
  overlay.append(timePanel)
  const hint = overlay.querySelector<HTMLElement>('.ar-hint')!
  const moveBtn = overlay.querySelector<HTMLButtonElement>('.ar-move')!

  const savedNear = camera.near
  camera.near = AR_NEAR
  camera.updateProjectionMatrix()
  camera.clearViewOffset()
  system.visible = false
  system.scale.setScalar(DEFAULT_SCALE)

  const reticle = new Mesh(
    new RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffb74d }),
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  let hitSource: XRHitTestSource | undefined
  let placing = true
  session
    .requestReferenceSpace('viewer')
    .then((space) => session.requestHitTestSource?.({ space }))
    .then((source) => (hitSource = source))
    .catch((err) => console.warn('AR hit test unavailable', err))

  function setPlacing(value: boolean): void {
    placing = value
    hint.hidden = !value
    moveBtn.hidden = value
    if (!value) reticle.visible = false
  }

  // Screen taps place the system; taps on overlay controls must not.
  overlay.addEventListener('beforexrselect', (e) => {
    if ((e.target as Element).closest('button, .time-panel')) e.preventDefault()
  })
  session.addEventListener('select', () => {
    if (!placing || !reticle.visible) return
    system.position.setFromMatrixPosition(reticle.matrix)
    system.position.y += HOVER_HEIGHT
    system.visible = true
    setPlacing(false)
  })

  overlay.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-ar]')
      ?.dataset.ar
    const scale = system.scale.x
    if (action === 'exit') session.end()
    if (action === 'move') setPlacing(true)
    if (action === 'bigger')
      system.scale.setScalar(Math.min(MAX_SCALE, scale * SCALE_STEP))
    if (action === 'smaller')
      system.scale.setScalar(Math.max(MIN_SCALE, scale / SCALE_STEP))
  })

  session.addEventListener('end', () => {
    hitSource?.cancel()
    scene.remove(reticle)
    reticle.geometry.dispose()
    timeHome.append(timePanel)
    overlay.remove()
    camera.near = savedNear
    camera.updateProjectionMatrix()
    system.position.set(0, 0, 0)
    system.scale.setScalar(1)
    system.visible = true
    ctx.onEnd()
  })

  renderer.xr.setReferenceSpaceType('local')
  await renderer.xr.setSession(session)

  return {
    update(frame) {
      if (!placing || !hitSource) return
      const space = renderer.xr.getReferenceSpace()
      if (!space) return
      const pose = frame.getHitTestResults(hitSource)[0]?.getPose(space)
      reticle.visible = !!pose
      if (pose) reticle.matrix.fromArray(pose.transform.matrix)
    },
  }
}
