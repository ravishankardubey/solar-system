# Changelog

All notable changes to this project are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Asteroid belt (pulled forward from "Later"):
  - 24,504 real asteroids brighter than H 14 from the NASA/JPL Small-Body Database: inner/main/outer belt (20k) plus Jupiter Trojans (4.5k, tinted blue).
  - Each follows its own Kepler orbit solved on the GPU from the sim date (one draw call); brighter asteroids draw larger. Data loads in the background after first render.
  - `scripts/fetch-asteroids.mjs` fetches and packs the data into `public/data/asteroids.bin` (343 KB, 16-bit quantized) + `asteroids.json`; run by hand to refresh, output is committed.
  - Ceres (dwarf planet) and Vesta as selectable bodies with facts, Dawn global maps (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA via USGS), SBDB orbital elements and IAU rotation constants. Kepler position checked against JPL Horizons for Ceres: agrees within ~5×10⁻⁵ AU.
  - `src/orbits/kepler.ts`: shared Kepler math (CPU for named bodies, mirrored in the asteroid shader).
- Credits line now also credits Dawn imagery and JPL SBDB; bottom panel sits above it when it wraps.
- M4 interaction:
  - Click a planet (screen-space hit test, min 16 px target so small planets are easy to hit) or its label to select it; drags don't select.
  - Camera flies to the selected body over 1.4 s (ease in-out), viewing it 40° off the Sun line so the terminator shows, then follows it as it moves while orbit/zoom still work. Reduced motion skips the flight.
  - Info panel (`src/ui/infoPanel.ts`) with type, description and facts (radius, mass, gravity, day, year, distance, temperature, moons, tilt) from NASA fact sheets. Close button or Esc returns to the overview.
  - Body list (`src/ui/bodyList.ts`): accessible buttons for Sun…Neptune; chip bar on phones. Keys 0–8 select bodies.
  - The view's centre shifts into the space the info panel leaves free (left of it on desktop, below it on phones).
- `src/bodies/data.ts`: typed body data with no Three.js import, so the UI can use it.

### Fixed

- Moon counts updated to current figures (Jupiter 115, Apr 2026; Saturn 293, Jun 2026) and shown with an as-of date, since they keep changing.
- Time shortcuts stopped working while any button had focus; now only Space/Enter are left to a focused button.
- M3 motion and time:
  - Planets move every frame to their `astronomy-engine` positions for the sim date.
  - Real body orientation from the IAU rotation model (`RotationAxis`): true pole direction and prime-meridian spin, so day/night sides and Saturn's ring angle match the date. Checked: sub-solar point on Earth lands within ~1° of the expected longitude/latitude at equinox, solstices, and an arbitrary date.
  - `SimClock` speed presets (real time → 1 year/s), reverse, play/pause, jump to now.
  - Time panel (`src/ui/timeControls.ts`): date/time readout, speed, reverse, slower, play/pause, faster, Now.
  - Keyboard: Space play/pause, `[` slower, `]` faster, `R` reverse, `N` now.
  - `prefers-reduced-motion` starts the clock paused.
- GitHub Pages deployment: pushes to `master` build with base `/solar-system/` and deploy to https://ravishankardubey.github.io/solar-system/.
- Visual polish (pulled forward from MVP/v1 because the bare scene looked primitive):
  - Sky (`src/sky`): seeded procedural starfield (3 layers, soft round points, tinted) that follows the camera, over a faint Milky Way panorama (Solar System Scope, 250 KB).
  - Sun corona: additive camera-facing glow sprite.
  - Orbit lines: one full revolution per planet sampled from `astronomy-engine` at the same readable scale.
  - Saturn's rings from real ring radii (74,658–136,775 km), in the planet's equatorial plane.
  - Planet name labels (HTML overlay via `CSS2DRenderer`, click-through).
  - ACES filmic tone mapping; max anisotropic filtering on textures.
- `orbitalPeriodDays` and Saturn `rings` added to `src/bodies/data.json`.

### Changed

- Bodies get a position function (`planetPosition` via astronomy-engine, or `elementsPosition` from Kepler elements) and an orientation function (`iauOrientation` or `elementsOrientation` from IAU constants).
- Number-key shortcuts come from `shortcut` in `data.json` (0–8 stay Sun…Neptune).
- Body orientation no longer uses `axialTiltDeg` (kept as a display fact); the tilt group is now a pole group driven by the rotation model.
- Each body is now a group: position root → axial-tilt group → mesh (+ rings), with an upright label beside the tilt group.
- M2 static scene: Sun and 8 planets at their real heliocentric positions for the current date (`astronomy-engine`), ecliptic plane as the scene's XZ plane.
- Readable scale: distances `20 + 45·√AU`, radii `0.04·√km`, Sun fixed at 16 units (`src/orbits`, `src/bodies`).
- Body data in `src/bodies/data.json` (id, name, radius, axial tilt, texture); axial tilt applied to each mesh.
- Solar System Scope textures: 1024×512 set loaded now (~0.9 MB), 2K originals kept in `public/textures/2k` for later streaming.
- Lighting: point light at the Sun (no distance falloff) plus faint ambient; the Sun itself is unlit/self-lit.
- Orbit camera (`src/camera`): drag to orbit, scroll/pinch to zoom, arrow keys to pan, with damping and zoom limits.
- Portrait screens widen the field of view so all planets stay in frame.
- Texture credit line (CC BY 4.0) in the page corner (`src/ui/credits.ts`).
- Milestone 1 scaffold: Vite + TypeScript static site with Three.js and `astronomy-engine`.
- Full-screen WebGL canvas with render loop, pixel ratio capped at 2, and loop paused while the tab is hidden.
- `SimClock` (`src/clock`) holding sim date, speed (sim-days per real second, negative = reverse) and play state.
- Empty module folders: `orbits`, `bodies`, `camera`, `ui`, `assets`.
- ESLint (flat config, typescript-eslint) and Prettier, with `lint`, `format`, `format:check` and `typecheck` scripts.
- GitHub Actions CI: lint, format check, typecheck, build, upload `dist` artifact. Node version read from `.nvmrc` (24).
- `README.md` with setup and scripts.
- Project index for AI assistants in `.claude/index.md`, loaded via `CLAUDE.md`.

### Removed

- Vite template demo (counter, hero image, logos, icon sprite, demo styles).
- Previous 2023 Angular implementation (history kept in git).

### Decided

- UI: plain TypeScript + CSS (no Angular for now).
- Scale: real positions from `astronomy-engine` with a readable (compressed) default scale.
- Hosting: GitHub Pages (decided 2026-09-30).
