# Solar System

An interactive, browser-based 3D explorer of the Sun, planets, and major moons. Static site, no backend: all rendering and orbital math run in the browser.

Live: https://ravishankardubey.github.io/solar-system/

Built with [Three.js](https://threejs.org/), [astronomy-engine](https://github.com/cosinekitty/astronomy), Vite, and TypeScript.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
nvm use
npm install
npm run dev
```

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Type-check and build to `dist/` |
| `npm run preview`   | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run format`    | Prettier (write)                |
| `npm run typecheck` | TypeScript only                 |

Asteroid data comes from the NASA/JPL Small-Body Database. To refresh it, run `node scripts/fetch-asteroids.mjs` and commit `public/data/`.

See [BRIEF.md](BRIEF.md) for scope and roadmap, and [CHANGELOG.md](CHANGELOG.md) for history.
