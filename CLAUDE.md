# Working agreements for Claude

## Pull requests
- **Open a PR whenever you have changes you deem ready** — don't wait to be
  asked. Push the branch, open the PR against `main`, and report it. (This
  overrides the default "only open a PR when explicitly asked" behavior.)
- Keep developing on the designated feature branch; restart it from the
  latest `main` when the previous PR has merged.

## Project shape
- npm workspaces monorepo: `apps/web` (Vite PWA, the app), `apps/mobile`
  (Capacitor shell), `packages/{mir,notation,schema}`.
- `packages/mir` is dependency-free TypeScript so it runs both in the
  browser analysis worker and in Node for the CI accuracy gate.
- Full SQLite schema (`packages/schema`) is created at P0; later phases are
  additive migrations only.

## Quality bar before opening a PR
- `npm run typecheck` and `npm test` (includes the §9.1 accuracy gate) pass.
- For anything with runtime/visual surface, verify in a real browser
  (headless Chromium is available), not just via tests.
- Hosted via GitHub Pages on push to `main`; keep the app fully offline —
  no network calls, no external soundfonts/CDNs.
