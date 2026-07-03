# Lyd 🎵

*Your playful, fully-offline music companion.* Record or import a song and
see its chords, key, and tempo — hum a melody and watch it become notation —
tune up, keep time, jot how it felt. No account, no network, no theory
prerequisites.

This repo implements **P0 — the offline instrument** from the
[Technical Design Document](docs/) (v0.3): the tier-1 core that must stay
independently useful forever, even if every connected feature disappears.

> **P0 exit criterion:** a stranger with no theory background records a song
> and sees its chords, entirely offline. ✅

## What's here

| Area | Status |
|---|---|
| 🎧 Record / import (wav, mp3, m4a) → chords, key, tempo, "vibe" | ✅ |
| 🎤 Melody doodler — hum → notation (free-time first, snap optional) | ✅ |
| 🎸 Tuner — chromatic, guitar EADGBE, drop-D, bass EADG, voice | ✅ |
| 🥁 Metronome — 2/4…7/8 (incl. compound groupings), swing, tap tempo | ✅ |
| 📚 Library — recordings, doodles, journal stub, SQLite over OPFS | ✅ |
| 📴 Full offline PWA (everything precached, zero network calls) | ✅ |
| 🤖 Android shell (Capacitor) | scaffolded — see `apps/mobile/README.md` |

Deliberately **not** in P0 (per TDD §9.1): networking of any kind, the spell
engine, the Phrasebook, goals UI beyond the journal stub. The full §5.1
database schema *is* created now so those arrive as additive migrations.

## Layout

```
apps/web/          Vite + React PWA — the app (deploys to Cloudflare Pages later)
apps/mobile/       Capacitor Android shell wrapping apps/web
packages/mir/      Pure-TS MIR engine: FFT, chromagram, chord HMM, key,
                   tempo, YIN pitch, note segmentation
packages/notation/ ABC generation (melody + chord charts) for abcjs
packages/schema/   zod schemas + SQLite DDL shared by everything
```

The MIR engine is dependency-free TypeScript so the same code runs in the
browser's analysis worker and in Node for CI. Essentia.js can slot in behind
the same interfaces later if higher accuracy is needed on dense mixes.

## Develop

```bash
npm install
npm run dev        # web app at localhost:5173
npm test           # unit tests + the accuracy gate
npm run typecheck
npm run build      # production PWA → apps/web/dist
```

### Hosting (GitHub Pages)

`.github/workflows/pages.yml` builds and deploys `apps/web` to GitHub Pages
on every push to `main`. The app is a fully static, offline-capable PWA —
no Cloudflare (or any server) is required for the P0 feature set; the
SQLite-over-OPFS store uses the SAH-pool VFS, so it needs no cross-origin
isolation headers, which Pages can't set anyway.

Because a project site is served from a subpath
(`https://<user>.github.io/MonkeyMusic/`), the workflow builds with
`BASE_PATH=/MonkeyMusic/` so asset URLs resolve. Local dev, local builds,
and the Capacitor mobile shell leave `BASE_PATH` unset and serve from `/`.
To enable it once: repo **Settings → Pages → Source → GitHub Actions**.

### The accuracy gate (TDD §9.1)

CI synthesizes 8 ground-truth songs (varied keys, modes, tempi, one waltz)
and fails the build if the analyzer drops below: **≥70%** beat-level chord
accuracy, key correct on **≥6/8**, tempo within **±2 BPM**. Current standing:
100% chords on all 8, 8/8 keys, ≤0.2 BPM error. (Real recordings are messier
than sine-partial synths — the gate is a floor, not a victory lap; see TDD
§10 risk 1.)

## Principles baked in already

- **Sound before symbol** — the doodler shows what you hummed, free-time
  first; snap-to-grid is an invitation, never a correction.
- **Descriptive, not prescriptive** — analysis confidence reads as
  "pretty sure / best guess", never as a verdict.
- **Offline-first, local-first** — no telemetry, no update pings, audio
  and journal never leave the device. (Kid profiles and the adult gate
  land in P1 per TDD §5.4.)
- **Strings externalized from commit one** — English only for now, but
  Norwegian is a translation task, not a refactor.
