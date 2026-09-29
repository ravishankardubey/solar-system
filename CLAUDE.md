# Solar System

Static Three.js + Vite + TypeScript 3D solar system explorer. See `BRIEF.md` for scope.

@.claude/index.md

## Working rules

- Use Node 24 (`nvm use`). Vite 8 will not run on older Node.
- Before finishing a change, run: `npm run lint && npm run format:check && npm run typecheck && npm run build`.
- Record every notable change under `## [Unreleased]` in `CHANGELOG.md`.
- Keep `.claude/index.md` in sync when adding, moving, or removing files/modules, or completing a milestone.
- No backend, no runtime API calls. All data is static JSON; orbital math runs client-side.
- Style: Prettier (no semicolons, single quotes); relative imports keep the `.ts` extension.
- Commits carry only the user's name: no `Co-Authored-By: Claude` trailers or "Generated with Claude Code" lines.
