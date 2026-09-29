# Project index

Quick map of the codebase. Update this file whenever files or modules are added, moved, or removed.

## Top level

| Path                       | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `README.md`                | Public overview and dev commands                                                  |
| `BRIEF.md`                 | Product brief: goals, stack, architecture, phases, milestones, open decisions     |
| `CHANGELOG.md`             | Human-readable history of notable changes                                         |
| `index.html`               | Single page; hosts the `#scene` canvas                                            |
| `CLAUDE.md`                | Working rules for Claude; imports this index                                      |
| `tsconfig.json`            | Bundler mode, `noEmit`, unused-code checks                                        |
| `eslint.config.js`         | ESLint flat config (js + typescript-eslint + prettier)                            |
| `.prettierrc.json`         | No semicolons, single quotes                                                      |
| `.nvmrc`                   | Node 24                                                                           |
| `.github/workflows/ci.yml` | Lint, format, typecheck, build on every push/PR; deploys `master` to GitHub Pages |
| `public/`                  | Static files copied as-is (`favicon.svg`)                                         |
| `public/textures/1k/`      | Textures loaded at startup: 1024×512 planets, `milky_way.jpg`, `saturn_ring.png`  |
| `public/textures/2k/`      | 2K originals from Solar System Scope, for M5 streaming                            |

## Source modules (`src/`)

Modules stay small and independent. UI talks only to `clock` and `camera`, never to Three.js directly.

| Module      | Status    | Responsibility                                                                                                                                 |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`   | M3        | Renderer, label overlay, lights, camera, portrait FOV fit; frame: tick clock → update bodies → UI → render                                     |
| `style.css` | M2        | Full-screen canvas, label overlay and label style, credits                                                                                     |
| `clock/`    | done (M3) | `SimClock` + `SPEEDS`: date, speed preset, direction, play/pause, faster/slower/reverse/now                                                    |
| `orbits/`   | done (M3) | `heliocentricPosition`, `bodyOrientation` (IAU pole + spin), `toSceneDistance`, `createOrbitLine`                                              |
| `bodies/`   | M3        | `data.json`, `createBodies` → `Map<id, BodyView>` (root/pole/mesh + label), `updateBodies(views, date)`, `rings.ts`, `sunGlow.ts`; moons in M6 |
| `camera/`   | M2        | `createCameraController`: OrbitControls with damping, zoom limits, arrow-key pan; focus tween in M4                                            |
| `ui/`       | M3        | `timeControls.ts` (panel + keyboard), `credits.ts`; info panel and body list in M4                                                             |
| `assets/`   | M2        | `loadTexture(name)` from the 1K set; 2K streaming and KTX2 in M5                                                                               |
| `sky/`      | M2        | `createSky`: Milky Way background + seeded starfield (caller keeps it centred on the camera)                                                   |

## Milestone progress

- [x] 1. Project setup (repo, CI, GitHub Pages deploy)
- [x] 2. Static scene
- [x] 3. Motion and time
- [ ] 4. Interaction
- [ ] 5. MVP polish and launch
- [ ] 6. v1 features (done early: Saturn rings, labels (no toggle yet), starfield skybox)

## Deferred tasks

Not urgent. Do not start these unless the user asks.

- [ ] Custom domain or subdomain (for example under ravishankardubey.in).
- [ ] Analytics: none, or a privacy-friendly option with no cookie banner.
