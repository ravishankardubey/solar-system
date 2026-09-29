import {
  AdditiveBlending,
  CanvasTexture,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
} from 'three'

// Soft corona drawn as a camera-facing sprite. The Sun mesh occludes its
// centre, so only the halo around the limb shows.
export function createSunGlow(size: number): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255, 236, 190, 1)')
  g.addColorStop(0.2, 'rgba(255, 190, 90, 0.75)')
  g.addColorStop(0.45, 'rgba(255, 130, 40, 0.18)')
  g.addColorStop(1, 'rgba(255, 100, 20, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  const sprite = new Sprite(
    new SpriteMaterial({
      map,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  sprite.scale.setScalar(size)
  return sprite
}
