import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
  type Scene,
} from 'three'
import { loadTexture } from '../assets/index.ts'

const SKY_RADIUS = 2000

// Seeded so the star pattern is identical on every load.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A few layers of fixed-pixel-size points: many faint small stars, few bright
// large ones. Tints range from blue-white to warm yellow.
const LAYERS = [
  { count: 5000, size: 2, brightness: 0.6 },
  { count: 1200, size: 3, brightness: 0.85 },
  { count: 150, size: 4.5, brightness: 1 },
]
const TINTS = [0xaecbff, 0xffffff, 0xfff4e0, 0xffd9a8].map((c) => new Color(c))

// Round, soft-edged dot so stars don't render as square pixels.
function createStarSprite(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255, 255, 255, 1)')
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.6)')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  return new CanvasTexture(canvas)
}

function createStars(): Group {
  const rand = mulberry32(42)
  const map = createStarSprite()
  const group = new Group()
  for (const layer of LAYERS) {
    const positions: number[] = []
    const colors: number[] = []
    for (let i = 0; i < layer.count; i++) {
      // Uniform direction on a sphere.
      const z = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      positions.push(
        SKY_RADIUS * r * Math.cos(a),
        SKY_RADIUS * z,
        SKY_RADIUS * r * Math.sin(a),
      )
      const c = TINTS[Math.floor(rand() * TINTS.length)].clone()
      c.multiplyScalar(layer.brightness * (0.4 + 0.6 * rand()))
      colors.push(c.r, c.g, c.b)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    const material = new PointsMaterial({
      size: layer.size,
      sizeAttenuation: false,
      map,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    group.add(new Points(geometry, material))
  }
  return group
}

// Faint Milky Way panorama as the background, with crisp point stars on top.
// Returns the star group so the caller can keep it centred on the camera.
export function createSky(scene: Scene): Group {
  const milkyWay = loadTexture('milky_way.jpg')
  milkyWay.mapping = EquirectangularReflectionMapping
  scene.background = milkyWay
  scene.backgroundIntensity = 0.12

  const stars = createStars()
  scene.add(stars)
  return stars
}
