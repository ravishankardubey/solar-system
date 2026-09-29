# Changelog

All notable changes to this project are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Visual polish (pulled forward from MVP/v1 because the bare scene looked primitive):
  - Sky (`src/sky`): seeded procedural starfield (3 layers, soft round points, tinted) that follows the camera, over a faint Milky Way panorama (Solar System Scope, 250 KB).
  - Sun corona: additive camera-facing glow sprite.
  - Orbit lines: one full revolution per planet sampled from `astronomy-engine` at the same readable scale.
  - Saturn's rings from real ring radii (74,658–136,775 km), in the planet's equatorial plane.
  - Planet name labels (HTML overlay via `CSS2DRenderer`, click-through).
  - ACES filmic tone mapping; max anisotropic filtering on textures.
- `orbitalPeriodDays` and Saturn `rings` added to `src/bodies/data.json`.

### Changed

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
- Hosting: deferred; CI builds only, no deploy step yet.
