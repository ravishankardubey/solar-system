import './style.css'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Group,
  MathUtils,
  PerspectiveCamera,
  PointLight,
  Scene,
  Timer,
  WebGLRenderer,
} from 'three'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { detectArMode, type ArMode } from './ar/index.ts'
import { startWebXr, type WebXrSession } from './ar/webxr.ts'
import { loadAsteroids, type AsteroidField } from './asteroids/index.ts'
import { setMaxAnisotropy } from './assets/index.ts'
import {
  AR_LABEL_ACTIVE_COLOR,
  AR_LABEL_COLOR,
  createBodies,
  fitArLabels,
  updateBodies,
} from './bodies/index.ts'
import {
  CameraController,
  OVERVIEW_POSITION,
  onBodyClick,
} from './camera/index.ts'
import { SimClock } from './clock/index.ts'
import { createSky } from './sky/index.ts'
import { mountArButton } from './ui/arButton.ts'
import { mountBodyList } from './ui/bodyList.ts'
import { mountCredits } from './ui/credits.ts'
import { mountInfoPanel } from './ui/infoPanel.ts'
import { mountTimeControls } from './ui/timeControls.ts'

const MAX_PIXEL_RATIO = 2
const FOV = 45
// Below this aspect ratio (portrait phones), widen the FOV so the same
// horizontal span stays in view instead of cropping the outer planets.
const MIN_ASPECT_FOR_FIXED_FOV = 1.6

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
// alpha lets the camera feed show through in AR.
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.xr.enabled = true
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
renderer.toneMapping = ACESFilmicToneMapping
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy())

// Labels are HTML laid over the canvas; pointer events pass through to it.
const labelRenderer = new CSS2DRenderer()
labelRenderer.domElement.className = 'labels'
document.body.append(labelRenderer.domElement)

const scene = new Scene()
const camera = new PerspectiveCamera(FOV, 1, 0.1, 5000)
camera.position.copy(OVERVIEW_POSITION)

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches
const clock = new SimClock()
// Respect reduced motion: start paused and skip camera flights.
clock.playing = !reducedMotion
const timer = new Timer()

// Everything that belongs to the solar system lives in one group, so AR can
// scale it to tabletop size and place it on a surface. The sky stays outside.
const system = new Group()
system.name = 'Solar system'
scene.add(system)

// Sunlight doesn't fall off with distance at this compressed scale; a faint
// ambient keeps night sides from going fully black.
system.add(new PointLight(0xfff5e8, 3.2, 0, 0))
system.add(new AmbientLight(0xffffff, 0.06))

const stars = createSky(scene)
const skyBackground = scene.background
const views = createBodies(system, clock.date)
let asteroids: AsteroidField | undefined
loadAsteroids(system, renderer.getPixelRatio())
  .then((field) => (asteroids = field))
  .catch((err) => console.warn('Asteroid data failed to load', err))
const cameraController = new CameraController(camera, canvas, reducedMotion)

// Selection drives the camera, info panel, list and labels together.
// null returns to the overview.
// In AR the camera is the phone, so only the panel and AR zoom button follow.
function select(id: string | null): void {
  const view = id ? views.get(id) : undefined
  if (xrSession) {
    xrSession.setSelected(id)
  } else {
    cameraController.focusOn(
      view
        ? {
            object: view.root,
            radius: view.radius,
            viewDistance: view.radius * (view.data.rings ? 8 : 5),
          }
        : null,
    )
  }
  infoPanel.show(id)
  bodyList.setActive(id)
  for (const [key, v] of views) {
    v.label.classList.toggle('active', key === id)
    v.arLabel.material.color.set(
      key === id ? AR_LABEL_ACTIVE_COLOR : AR_LABEL_COLOR,
    )
  }
  goalInset = panelInset()
}

// Shift the rendered centre into the part of the screen the info panel
// leaves free: left of a side panel, or below a top sheet on phones.
const inset = { x: 0, y: 0 }
let goalInset = { x: 0, y: 0 }

function panelInset(): { x: number; y: number } {
  const el = infoPanel.element
  if (el.hidden) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  const w = canvas.clientWidth
  return r.width < w * 0.6
    ? { x: (w - r.left) / 2, y: 0 }
    : { x: 0, y: -r.bottom / 2 }
}

function applyInset(dt: number): void {
  const k = reducedMotion ? 1 : Math.min(1, dt * 5)
  inset.x += (goalInset.x - inset.x) * k
  inset.y += (goalInset.y - inset.y) * k
  const { clientWidth: w, clientHeight: h } = canvas
  camera.setViewOffset(w, h, inset.x, inset.y, w, h)
}

const bodyList = mountBodyList(document.body, select)
const infoPanel = mountInfoPanel(document.body, () => select(null))
mountCredits(document.body)
const timeControls = mountTimeControls(document.body, clock)

onBodyClick(
  canvas,
  camera,
  [...views.values()].map((v) => ({
    id: v.data.id,
    object: v.root,
    radius: v.radius,
  })),
  select,
)
// AR: live WebXR on Android, a Quick Look snapshot on iPhone/iPad.
let xrSession: WebXrSession | undefined

function setArView(on: boolean): void {
  stars.visible = !on
  scene.background = on ? null : skyBackground
  labelRenderer.domElement.hidden = on
  document.body.classList.toggle('in-ar', on)
  if (!on) resize()
}

async function enterAr(mode: ArMode): Promise<void> {
  if (mode === 'quicklook') {
    // Loaded on demand: only iOS needs the USDZ exporter.
    const { openQuickLook, ASTEROID_COUNT } = await import('./ar/quicklook.ts')
    await openQuickLook({
      system,
      bodies: [...views.values()].map((v) => ({
        name: v.data.name,
        radius: v.radius,
        minor: v.data.minor,
        root: v.root,
        position: v.position,
        periodDays: v.data.orbitalPeriodDays,
      })),
      asteroids: asteroids?.sample(clock.date, ASTEROID_COUNT),
      date: clock.date,
    })
    return
  }
  select(null)
  setArView(true)
  try {
    xrSession = await startWebXr({
      renderer,
      scene,
      camera,
      system,
      panels: [timeControls.element, infoPanel.element],
      bodies: [...views.values()].map((v) => ({
        id: v.data.id,
        name: v.data.name,
        root: v.root,
        radius: v.radius,
      })),
      onSelect: select,
      onLabels: (on) => {
        for (const v of views.values()) v.arLabel.visible = on
      },
      onEnd: () => {
        xrSession = undefined
        setArView(false)
        select(null)
      },
    })
  } catch (err) {
    console.warn('Could not start AR', err)
    setArView(false)
  }
}

detectArMode().then((mode) => {
  if (!mode) return
  const button = mountArButton(document.body, 'View in AR', async () => {
    button.setBusy(true)
    try {
      await enterAr(mode)
    } catch (err) {
      console.warn('AR failed', err)
    } finally {
      button.setBusy(false)
    }
  })
})

labelRenderer.domElement.addEventListener('click', (e) => {
  const label = (e.target as HTMLElement).closest<HTMLElement>('[data-body]')
  if (label) select(label.dataset.body!)
})

function resize(): void {
  const { clientWidth: w, clientHeight: h } = canvas
  renderer.setSize(w, h, false)
  labelRenderer.setSize(w, h)
  camera.aspect = w / h
  camera.fov =
    camera.aspect >= MIN_ASPECT_FOR_FIXED_FOV
      ? FOV
      : MathUtils.radToDeg(
          2 *
            Math.atan(
              (Math.tan(MathUtils.degToRad(FOV / 2)) *
                MIN_ASPECT_FOR_FIXED_FOV) /
                camera.aspect,
            ),
        )
  camera.updateProjectionMatrix()
  goalInset = panelInset()
}
window.addEventListener('resize', resize)
resize()

function frame(time: number, xrFrame?: XRFrame): void {
  timer.update(time)
  const dt = timer.getDelta()
  clock.tick(dt)
  updateBodies(views, clock.date)
  asteroids?.update(clock.date)
  timeControls.update()
  const inAr = renderer.xr.isPresenting
  if (inAr) {
    if (xrFrame) xrSession?.update(xrFrame)
    fitArLabels(views, system.scale.x)
  } else {
    cameraController.update(dt)
    applyInset(dt)
    // Stars sit at "infinity": keep them centred on the camera so zooming
    // never reaches them.
    stars.position.copy(camera.position)
  }
  renderer.render(scene, camera)
  if (!inAr) labelRenderer.render(scene, camera)
}

// Stop the loop entirely while the tab is hidden, per the perf budget.
function syncLoop(): void {
  renderer.setAnimationLoop(document.hidden ? null : frame)
  timer.reset()
}
document.addEventListener('visibilitychange', syncLoop)
syncLoop()
