import { CanvasTexture, SRGBColorSpace } from 'three'

const HEIGHT = 64
const FONT_PX = 34
const PADDING = 16

// White, letter-spaced uppercase name on a transparent background, for labels
// that live in the 3D scene (WebXR sprites, Quick Look planes). Tint it with
// the material colour. `aspect` is width / height.
export function createLabelTexture(text: string): {
  texture: CanvasTexture
  aspect: number
} {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = `600 ${FONT_PX}px system-ui, "Segoe UI", Roboto, sans-serif`
  const label = text.toUpperCase()
  ctx.font = font
  ctx.letterSpacing = '5px'
  canvas.width = Math.ceil(ctx.measureText(label).width + PADDING * 2)
  canvas.height = HEIGHT
  // Resizing the canvas resets the context state.
  ctx.font = font
  ctx.letterSpacing = '5px'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, canvas.width / 2, HEIGHT / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { texture, aspect: canvas.width / HEIGHT }
}
