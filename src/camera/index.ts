import type { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function createCameraController(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.minDistance = 15
  controls.maxDistance = 1200
  // Arrow keys pan the view.
  controls.listenToKeyEvents(window)
  return controls
}
