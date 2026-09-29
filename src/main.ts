import './style.css'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  MathUtils,
  PerspectiveCamera,
  PointLight,
  Scene,
  Timer,
  WebGLRenderer,
} from 'three'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { setMaxAnisotropy } from './assets/index.ts'
import { createBodies, updateBodies } from './bodies/index.ts'
import {
  CameraController,
  OVERVIEW_POSITION,
  onBodyClick,
} from './camera/index.ts'
import { SimClock } from './clock/index.ts'
import { createSky } from './sky/index.ts'
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
const renderer = new WebGLRenderer({ canvas, antialias: true })
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

// Sunlight doesn't fall off with distance at this compressed scale; a faint
// ambient keeps night sides from going fully black.
scene.add(new PointLight(0xfff5e8, 3.2, 0, 0))
scene.add(new AmbientLight(0xffffff, 0.06))

const stars = createSky(scene)
const views = createBodies(scene, clock.date)
const cameraController = new CameraController(camera, canvas, reducedMotion)

// Selection drives the camera, info panel, list and labels together.
// null returns to the overview.
function select(id: string | null): void {
  const view = id ? views.get(id) : undefined
  cameraController.focusOn(
    view
      ? {
          object: view.root,
          radius: view.radius,
          viewDistance: view.radius * (view.data.rings ? 8 : 5),
        }
      : null,
  )
  infoPanel.show(id)
  bodyList.setActive(id)
  for (const [key, v] of views) v.label.classList.toggle('active', key === id)
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

function frame(time: number): void {
  timer.update(time)
  const dt = timer.getDelta()
  clock.tick(dt)
  updateBodies(views, clock.date)
  timeControls.update()
  cameraController.update(dt)
  applyInset(dt)
  // Stars sit at "infinity": keep them centred on the camera so zooming
  // never reaches them.
  stars.position.copy(camera.position)
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

// Stop the loop entirely while the tab is hidden, per the perf budget.
function syncLoop(): void {
  renderer.setAnimationLoop(document.hidden ? null : frame)
  timer.reset()
}
document.addEventListener('visibilitychange', syncLoop)
syncLoop()
