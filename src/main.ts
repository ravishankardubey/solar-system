import './style.css'
import { PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import { SimClock } from './clock/index.ts'

const MAX_PIXEL_RATIO = 2

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const renderer = new WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))

const scene = new Scene()
const camera = new PerspectiveCamera(45, 1, 0.1, 1e6)
camera.position.set(0, 50, 150)

const clock = new SimClock()
const timer = new Timer()

function resize(): void {
  const { clientWidth: w, clientHeight: h } = canvas
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

function frame(time: number): void {
  timer.update(time)
  clock.tick(timer.getDelta())
  renderer.render(scene, camera)
}

// Stop the loop entirely while the tab is hidden, per the perf budget.
function syncLoop(): void {
  renderer.setAnimationLoop(document.hidden ? null : frame)
  timer.reset()
}
document.addEventListener('visibilitychange', syncLoop)
syncLoop()
