# Project index

Quick map of the codebase. Update this file whenever files or modules are added, moved, or removed.

## Top level

| Path                          | Purpose                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `README.md`                   | Public overview and dev commands                                                                     |
| `BRIEF.md`                    | Product brief: goals, stack, architecture, phases, milestones, open decisions                        |
| `CHANGELOG.md`                | Human-readable history of notable changes                                                            |
| `index.html`                  | Single page; hosts the `#scene` canvas                                                               |
| `CLAUDE.md`                   | Working rules for Claude; imports this index                                                         |
| `tsconfig.json`               | Bundler mode, `noEmit`, unused-code checks                                                           |
| `eslint.config.js`            | ESLint flat config (js + typescript-eslint + prettier)                                               |
| `.prettierrc.json`            | No semicolons, single quotes                                                                         |
| `.nvmrc`                      | Node 24                                                                                              |
| `.github/workflows/ci.yml`    | Lint, format, typecheck, build on every push/PR; deploys `master` to GitHub Pages                    |
| `public/`                     | Static files copied as-is (`favicon.svg`)                                                            |
| `public/textures/1k/`         | Textures loaded at startup: 1024×512 planets, Ceres/Vesta (Dawn), `milky_way.jpg`, `saturn_ring.png` |
| `public/data/`                | `asteroids.bin` + `asteroids.json`: packed JPL SBDB orbits (generated)                               |
| `scripts/fetch-asteroids.mjs` | Refreshes `public/data/asteroids.*` from JPL SBDB (run by hand, commit output)                       |
| `public/textures/2k/`         | 2K originals from Solar System Scope, for M5 streaming                                               |

## Source modules (`src/`)

Modules stay small and independent. UI talks only to `clock` and `camera`, never to Three.js directly.

| Module       | Status    | Responsibility                                                                                                                                                                     |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`    | M4        | Renderer, label overlay, lights, portrait FOV fit, `select(id)` wiring, panel view inset; frame: clock → bodies → UI → camera → render                                             |
| `style.css`  | M2        | Full-screen canvas, label overlay and label style, credits                                                                                                                         |
| `clock/`     | done (M3) | `SimClock` + `SPEEDS`: date, speed preset, direction, play/pause, faster/slower/reverse/now                                                                                        |
| `orbits/`    | M4+       | `planetPosition`/`elementsPosition` → `PositionFn`, `iauOrientation`/`elementsOrientation` → `OrientationFn`, `createOrbitLine`, `toSceneDistance`; `kepler.ts` shared Kepler math |
| `bodies/`    | M4+       | `data.json` (planets + Ceres/Vesta with `orbit`/`rotation`) + `data.ts`, `createBodies` → `Map<id, BodyView>`, `updateBodies`, `rings.ts`, `sunGlow.ts`                            |
| `camera/`    | done (M4) | `CameraController` (OrbitControls, fly-to tween, follow), `onBodyClick` screen-space picking, `OVERVIEW_POSITION`                                                                  |
| `ui/`        | M4        | `timeControls.ts`, `bodyList.ts` (list + 0–8 keys), `infoPanel.ts` (facts, Esc), `credits.ts`                                                                                      |
| `assets/`    | M2        | `loadTexture(name)` from the 1K set; 2K streaming and KTX2 in M5                                                                                                                   |
| `sky/`       | M2        | `createSky`: Milky Way background + seeded starfield (caller keeps it centred on the camera)                                                                                       |
| `asteroids/` | done      | `loadAsteroids`: fetch packed data, GPU Kepler shader `Points`; `update(date)` sets days since epoch                                                                               |

## Milestone progress

- [x] 1. Project setup (repo, CI, GitHub Pages deploy)
- [x] 2. Static scene
- [x] 3. Motion and time
- [x] 4. Interaction
- [ ] 5. MVP polish and launch
- [ ] 6. v1 features (done early: Saturn rings, labels (no toggle yet), starfield skybox)
- [x] Later: asteroid belt (+ Jupiter Trojans, Ceres, Vesta), done early

## Next up

- Major moons (~20): Moon + Galilean via astronomy-engine, others from JPL mean elements; own compressed distance scale; fade in near their planet; textures from Solar System Scope (Moon) and NASA/USGS maps. See the moons feasibility notes in the 2026-09-30 session.
- Labels clutter on phones in the overview (consider the v1 labels toggle or hiding minor labels when zoomed out).

## Deferred tasks

Not urgent. Do not start these unless the user asks.

- [ ] Custom domain or subdomain (for example under ravishankardubey.in).
- [ ] Re-check moon counts (`moons` / `moonsAsOf` in `src/bodies/data.json`) before launch; Jupiter and Saturn gain moons often.
- [ ] Analytics: none, or a privacy-friendly option with no cookie banner.
