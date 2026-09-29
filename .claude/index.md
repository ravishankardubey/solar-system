# Project index

Quick map of the codebase. Update this file whenever files or modules are added, moved, or removed.

## Top level

| Path                       | Purpose                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `README.md`                | Public overview and dev commands                                              |
| `BRIEF.md`                 | Product brief: goals, stack, architecture, phases, milestones, open decisions |
| `CHANGELOG.md`             | Human-readable history of notable changes                                     |
| `index.html`               | Single page; hosts the `#scene` canvas                                        |
| `CLAUDE.md`                | Working rules for Claude; imports this index                                  |
| `tsconfig.json`            | Bundler mode, `noEmit`, unused-code checks                                    |
| `eslint.config.js`         | ESLint flat config (js + typescript-eslint + prettier)                        |
| `.prettierrc.json`         | No semicolons, single quotes                                                  |
| `.nvmrc`                   | Node 24                                                                       |
| `.github/workflows/ci.yml` | Lint, format check, typecheck, build on every push/PR                         |
| `public/`                  | Static files copied as-is (`favicon.svg`)                                     |

## Source modules (`src/`)

Modules stay small and independent. UI talks only to `clock` and `camera`, never to Three.js directly.

| Module      | Status         | Responsibility                                                         |
| ----------- | -------------- | ---------------------------------------------------------------------- |
| `main.ts`   | done (M1)      | Renderer, scene, camera, resize, render loop, pause when hidden        |
| `style.css` | done (M1)      | Full-screen dark canvas layout                                         |
| `clock/`    | done (M1)      | `SimClock`: sim date, speed (days/sec, negative = reverse), play/pause |
| `orbits/`   | empty (M3)     | Body positions for a date via `astronomy-engine`                       |
| `bodies/`   | empty (M2)     | Meshes, materials, static JSON facts for Sun/planets/moons             |
| `camera/`   | empty (M2, M4) | OrbitControls, click-to-focus tween                                    |
| `ui/`       | empty (M3, M4) | Time controls, info panel, body list (plain TS + CSS)                  |
| `assets/`   | empty (M2, M5) | Texture loading, low-res then 2K/4K streaming, KTX2                    |

## Milestone progress

- [x] 1. Project setup (local; GitHub repo + deploy pending)
- [ ] 2. Static scene
- [ ] 3. Motion and time
- [ ] 4. Interaction
- [ ] 5. MVP polish and launch
- [ ] 6. v1 features
