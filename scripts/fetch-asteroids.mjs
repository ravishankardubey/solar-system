// Fetches asteroid orbits from the JPL Small-Body Database and packs them into
// public/data/asteroids.bin (+ .json header). Run by hand when the data should
// be refreshed; the output is committed so builds never call the API.
//
//   node scripts/fetch-asteroids.mjs
//
// Layout (struct of arrays, little-endian), N = header.count:
//   Uint16[N] x6: a, e, i, node, peri, meanAnomaly — each scaled to 0..65535
//                 over the ranges in header.ranges
//   Uint8[N]:     absolute magnitude H × 10 (0–255)
//   Uint8[N]:     group index into header.groups

import { writeFile } from 'node:fs/promises'

const API = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api'
const MAX_H = 14 // brighter than H 14 ≈ larger than ~5–10 km
const GROUPS = [
  { id: 'belt', classes: ['IMB', 'MBA', 'OMB'] },
  { id: 'trojans', classes: ['TJN'] },
]
const TAU = Math.PI * 2
const RANGES = {
  a: [1.5, 6],
  e: [0, 1],
  i: [0, Math.PI],
  node: [0, TAU],
  peri: [0, TAU],
  meanAnomaly: [0, TAU],
}
const DEG = Math.PI / 180
const GAUSS_K = 0.01720209895 // rad/day, Sun GM in AU³/day²

async function query(cls) {
  const params = new URLSearchParams({
    fields: 'a,e,i,om,w,ma,epoch,H',
    'sb-class': cls,
    'sb-cdata': JSON.stringify({ AND: [`H|LT|${MAX_H}`] }),
  })
  const res = await fetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`${cls}: HTTP ${res.status}`)
  const json = await res.json()
  return json.data.map((row) => row.map(Number))
}

const rows = []
for (const [g, group] of GROUPS.entries()) {
  for (const cls of group.classes) {
    const data = await query(cls)
    console.log(`${cls}: ${data.length}`)
    for (const r of data) rows.push({ r, g })
  }
}

// Propagate every mean anomaly to one shared epoch (the most common one).
const counts = new Map()
for (const { r } of rows) counts.set(r[6], (counts.get(r[6]) ?? 0) + 1)
const epochJd = [...counts].sort((x, y) => y[1] - x[1])[0][0]

const n = rows.length
const cols = Object.fromEntries(
  Object.keys(RANGES).map((k) => [k, new Uint16Array(n)]),
)
const mags = new Uint8Array(n)
const groups = new Uint8Array(n)
const wrap = (x) => ((x % TAU) + TAU) % TAU
const q = (k, v) => {
  const [lo, hi] = RANGES[k]
  return Math.round(((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 65535)
}

let skipped = 0
rows.forEach(({ r, g }, idx) => {
  const [a, e, i, om, w, ma, epoch, H] = r
  if (!(a > RANGES.a[0] && a < RANGES.a[1] && e < 1)) {
    skipped++
    return
  }
  const meanMotion = GAUSS_K / Math.pow(a, 1.5)
  cols.a[idx] = q('a', a)
  cols.e[idx] = q('e', e)
  cols.i[idx] = q('i', i * DEG)
  cols.node[idx] = q('node', wrap(om * DEG))
  cols.peri[idx] = q('peri', wrap(w * DEG))
  cols.meanAnomaly[idx] = q(
    'meanAnomaly',
    wrap(ma * DEG + meanMotion * (epochJd - epoch)),
  )
  mags[idx] = Math.min(255, Math.round((Number.isFinite(H) ? H : MAX_H) * 10))
  groups[idx] = g
})
if (skipped) throw new Error(`${skipped} rows outside the packed ranges`)

const buffers = [...Object.values(cols), mags, groups].map(
  (arr) => new Uint8Array(arr.buffer),
)
await writeFile('public/data/asteroids.bin', Buffer.concat(buffers))
await writeFile(
  'public/data/asteroids.json',
  JSON.stringify(
    {
      source: 'NASA/JPL Small-Body Database (ssd-api.jpl.nasa.gov)',
      fetched: new Date().toISOString().slice(0, 10),
      filter: `H < ${MAX_H}`,
      count: n,
      epochJd,
      frame: 'heliocentric ecliptic J2000',
      ranges: RANGES,
      groups: GROUPS.map((g) => g.id),
    },
    null,
    2,
  ) + '\n',
)
console.log(`wrote ${n} asteroids, epoch JD ${epochJd}`)
