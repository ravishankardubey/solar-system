import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
  type Object3D,
} from 'three'
import {
  eccentricAnomaly,
  julianDay,
  meanMotion,
  orbitAxes,
} from '../orbits/kepler.ts'
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
  uniform float uAr;          // 1 in AR: lighter, larger dots for real floors

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
    gl_PointSize = size * uPixelRatio * (1.0 + 0.5 * uAr);
    // Dimmed rock colours suit black space but read as dark specks (dirt)
    // over a camera feed, so AR lifts them toward white.
    vColor = mix(color, vec3(1.0), 0.5 * uAr);
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

export interface AsteroidSample {
  positions: Float32Array // scene units, xyz per asteroid
  groups: Uint8Array // index into header.groups
  groupNames: string[]
}

export interface AsteroidField {
  update(date: Date): void
  setArMode(on: boolean): void
  // Every nth asteroid's position at `date`, computed on the CPU with the
  // same math as the shader (for exports that can't run it, e.g. USDZ).
  sample(date: Date, maxCount: number): AsteroidSample
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
  parent: Object3D,
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
      uAr: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
  })
  const geometry = decode(header, buffer)
  const points = new Points(geometry, material)
  points.name = 'Asteroids'
  points.frustumCulled = false // positions only exist on the GPU
  parent.add(points)

  const orbit = geometry.getAttribute('orbit').array as Float32Array
  const axisP = geometry.getAttribute('axisP').array as Float32Array
  const axisQ = geometry.getAttribute('axisQ').array as Float32Array
  const allGroups = new Uint8Array(
    buffer,
    COLUMNS.length * header.count * 2 + header.count,
    header.count,
  )

  return {
    update(date) {
      material.uniforms.uDays.value = julianDay(date) - header.epochJd
    },
    setArMode(on) {
      material.uniforms.uAr.value = on ? 1 : 0
    },
    sample(date, maxCount) {
      const step = Math.max(1, Math.ceil(header.count / maxCount))
      const count = Math.ceil(header.count / step)
      const positions = new Float32Array(count * 3)
      const groups = new Uint8Array(count)
      const days = julianDay(date) - header.epochJd
      const p = new Vector3()
      const q = new Vector3()
      for (let k = 0, idx = 0; idx < header.count; k++, idx += step) {
        const [a, e, n, m0] = orbit.subarray(idx * 4, idx * 4 + 4)
        const E = eccentricAnomaly(m0 + n * days, e)
        p.fromArray(axisP, idx * 3).multiplyScalar(a * (Math.cos(E) - e))
        q.fromArray(axisQ, idx * 3)
        p.addScaledVector(q, a * Math.sqrt(1 - e * e) * Math.sin(E))
        const r = p.length()
        p.setLength(DISTANCE_OFFSET + DISTANCE_FACTOR * Math.sqrt(r))
        p.toArray(positions, k * 3)
        groups[k] = allGroups[idx]
      }
      return { positions, groups, groupNames: header.groups }
    },
  }
}
