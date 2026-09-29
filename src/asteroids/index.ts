import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
  type Scene,
} from 'three'
import { julianDay, meanMotion, orbitAxes } from '../orbits/kepler.ts'
import { DISTANCE_FACTOR, DISTANCE_OFFSET } from '../orbits/index.ts'

// Header written by scripts/fetch-asteroids.mjs next to asteroids.bin.
interface AsteroidHeader {
  count: number
  epochJd: number
  ranges: Record<
    'a' | 'e' | 'i' | 'node' | 'peri' | 'meanAnomaly',
    [number, number]
  >
  groups: string[]
}

const COLUMNS = ['a', 'e', 'i', 'node', 'peri', 'meanAnomaly'] as const
const GROUP_COLORS: Record<string, number> = {
  belt: 0xc9b9a3, // warm grey rock
  trojans: 0x9fb8d6, // cool tint so Jupiter's two swarms stand out
}

// Each asteroid follows its own Kepler orbit, solved on the GPU from the sim
// date, so ~25k bodies move for the cost of one draw call. The distance
// mapping matches toSceneDistance() for the planets.
const vertexShader = /* glsl */ `
  uniform float uDays;        // days since the data epoch
  uniform float uPixelRatio;
  uniform float uOffset;
  uniform float uFactor;

  attribute vec4 orbit;       // a (AU), e, mean motion (rad/day), M0 (rad)
  attribute vec3 axisP;       // toward perihelion, scene axes
  attribute vec3 axisQ;       // 90° ahead in the orbit plane
  attribute vec3 color;
  attribute float size;

  varying vec3 vColor;

  void main() {
    float a = orbit.x;
    float e = orbit.y;
    float M = mod(orbit.w + orbit.z * uDays, 6.28318530718);
    float E = M;
    for (int k = 0; k < 6; k++) {
      E -= (E - e * sin(E) - M) / (1.0 - e * cos(E));
    }
    vec3 p = a * ((cos(E) - e) * axisP + sqrt(1.0 - e * e) * sin(E) * axisQ);
    float r = length(p);
    vec3 scenePos = p / r * (uOffset + uFactor * sqrt(r));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(scenePos, 1.0);
    gl_PointSize = size * uPixelRatio;
    vColor = color;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Soft round dot.
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, d) * 0.8;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export interface AsteroidField {
  update(date: Date): void
}

function decode(header: AsteroidHeader, buffer: ArrayBuffer): BufferGeometry {
  const n = header.count
  const cols = Object.fromEntries(
    COLUMNS.map((k, c) => {
      const raw = new Uint16Array(buffer, c * n * 2, n)
      const [lo, hi] = header.ranges[k]
      return [k, (idx: number) => lo + (raw[idx] / 65535) * (hi - lo)]
    }),
  ) as Record<(typeof COLUMNS)[number], (idx: number) => number>
  const mags = new Uint8Array(buffer, COLUMNS.length * n * 2, n)
  const groups = new Uint8Array(buffer, COLUMNS.length * n * 2 + n, n)

  const orbit = new Float32Array(n * 4)
  const axisP = new Float32Array(n * 3)
  const axisQ = new Float32Array(n * 3)
  const color = new Float32Array(n * 3)
  const size = new Float32Array(n)
  const p = new Vector3()
  const q = new Vector3()
  const c = new Color()
  const palette = header.groups.map((g) => new Color(GROUP_COLORS[g]))

  for (let idx = 0; idx < n; idx++) {
    const a = cols.a(idx)
    orbit.set([a, cols.e(idx), meanMotion(a), cols.meanAnomaly(idx)], idx * 4)
    orbitAxes(
      { i: cols.i(idx), node: cols.node(idx), peri: cols.peri(idx) },
      p,
      q,
    )
    p.toArray(axisP, idx * 3)
    q.toArray(axisQ, idx * 3)

    // Brighter (lower H, larger) asteroids draw bigger and lighter.
    const h = mags[idx] / 10
    const t = Math.min(1, Math.max(0, (14 - h) / 6))
    c.copy(palette[groups[idx]]).multiplyScalar(0.55 + 0.45 * t)
    c.toArray(color, idx * 3)
    size[idx] = 1.6 + 2.4 * t * t
  }

  const geometry = new BufferGeometry()
  // Positions are computed in the shader; this only sets the draw count.
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(n * 3), 3),
  )
  geometry.setAttribute('orbit', new BufferAttribute(orbit, 4))
  geometry.setAttribute('axisP', new BufferAttribute(axisP, 3))
  geometry.setAttribute('axisQ', new BufferAttribute(axisQ, 3))
  geometry.setAttribute('color', new BufferAttribute(color, 3))
  geometry.setAttribute('size', new BufferAttribute(size, 1))
  return geometry
}

// Loads the packed JPL data in the background; the scene renders without it
// until it arrives.
export async function loadAsteroids(
  scene: Scene,
  pixelRatio: number,
): Promise<AsteroidField> {
  const base = `${import.meta.env.BASE_URL}data/asteroids`
  const [header, buffer] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json() as Promise<AsteroidHeader>),
    fetch(`${base}.bin`).then((r) => r.arrayBuffer()),
  ])

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uDays: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOffset: { value: DISTANCE_OFFSET },
      uFactor: { value: DISTANCE_FACTOR },
    },
    transparent: true,
    depthWrite: false,
  })
  const points = new Points(decode(header, buffer), material)
  points.name = 'Asteroids'
  points.frustumCulled = false // positions only exist on the GPU
  scene.add(points)

  return {
    update(date) {
      material.uniforms.uDays.value = julianDay(date) - header.epochJd
    },
  }
}
