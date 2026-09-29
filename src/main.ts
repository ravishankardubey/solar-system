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
import { createBodies } from './bodies/index.ts'
import { createCameraController } from './camera/index.ts'
import { SimClock } from './clock/index.ts'
import { createSky } from './sky/index.ts'
import { mountCredits } from './ui/credits.ts'

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
camera.position.set(0, 150, 420)

const clock = new SimClock()
const timer = new Timer()

// Sunlight doesn't fall off with distance at this compressed scale; a faint
// ambient keeps night sides from going fully black.
scene.add(new PointLight(0xfff5e8, 3.2, 0, 0))
scene.add(new AmbientLight(0xffffff, 0.06))

const stars = createSky(scene)
createBodies(scene, clock.date)
const controls = createCameraController(camera, canvas)
mountCredits(document.body)

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
}
window.addEventListener('resize', resize)
resize()

function frame(time: number): void {
  timer.update(time)
  clock.tick(timer.getDelta())
  controls.update()
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
