import { SRGBColorSpace, TextureLoader, type Texture } from 'three'

const loader = new TextureLoader()
let maxAnisotropy = 1

// Call once with renderer.capabilities.getMaxAnisotropy() so textures stay
// sharp when viewed at grazing angles.
export function setMaxAnisotropy(value: number): void {
  maxAnisotropy = value
}

// Low-res set loads first; 2K versions in public/textures/2k are streamed in later (M5).
export function loadTexture(file: string): Texture {
  const texture = loader.load(`${import.meta.env.BASE_URL}textures/1k/${file}`)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return texture
}
