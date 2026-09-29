# Changelog

All notable changes to this project are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added

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
