# Technical Design Document — "Lyd" Personal Music Education Companion

**Version:** 0.3 (P0 scope locked — see §9.1)
**Status:** For review
**Stack anchor:** Local LLM (Qwen3.6-35B-A3B-FP8) · Cloudflare edge · Open-source MIR toolchain
**Working name:** *Lyd* (Norwegian: "sound") — placeholder

---

## 1. Purpose & Vision

A personal music education app that treats music as a **living language for playful, improvisational self-expression** — not a body of rules to memorize. The user records or imports a song, and the system:

1. **Analyzes** the recording (chords, key, tempo, melody, structure, timbre)
2. **Discusses** the music theory present in it conversationally, in plain language, always anchored to *what the user just heard*
3. **Composes and renders** sheet music, guitar/bass tabs, and chord charts derived from or inspired by the analysis
4. **Supports goals and progress** with lightweight, self-directed tracking

The target user has **zero prerequisite music theory knowledge**. The app never gates features behind theory vocabulary; instead, vocabulary emerges from experience ("that shimmery unresolved feeling you noticed at 0:42 has a name — a suspended chord").

### 1.1 Design tenets

| Tenet | Consequence |
|---|---|
| **Sound before symbol** | Every concept is introduced by hearing/playing it first; notation is a *transcript of experience*, never the starting point. (Kodály / Orff / Suzuki lineage, plus Gordon's "audiation.") |
| **Music as language** | Theory framed as grammar of a language the user already "speaks" by ear. Phrases, dialects (genres), accents (styles), slang (blue notes, bends). |
| **Whimsy is load-bearing** | Playful framing (e.g., "chord moods," "melody doodling," "what-if machines") is a first-class requirement, not a skin. |
| **Descriptive, not prescriptive** | Theory *describes* what musicians do; it never says the user is "wrong," only "here's what that choice does." |
| **Offline-first** | The maximum feature set runs on-device with no connection. Connected features are progressive enhancements. |
| **Local-first data** | All user data lives on device; sync is optional and self-hosted-friendly. No third-party AI APIs. |
| **Open source throughout** | Every model, library, and tool is OSS (Apache-2.0 / MIT / MPL / GPL-compatible where distribution model allows). |
| **Kid-safe by default** | The app is assumed to be used by children in the household. Zero-network is the default state, all connected features are opt-in behind an adult gate, and no child-generated content (voice, journal) ever leaves the device without explicit adult action. See §5.4. |

### 1.2 Non-goals (v1)

- Multi-user / social features (sharing is export-based only)
- Formal grading, exams, or certification
- Real-time collaborative jamming over network
- DAW-grade audio editing
- Vocal pitch correction / performance scoring against a "correct" rendition (explicitly avoided — conflicts with tenets)

---

## 2. System Architecture Overview

Three tiers, with a hard rule: **Tier 1 must be independently useful forever, even if Tiers 2–3 disappear.**

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1 — ON-DEVICE (offline core)                                │
│ PWA/Capacitor app: audio capture, DSP + small-model MIR (WASM/   │
│ ONNX), notation rendering & playback, theory playground, games,  │
│ goals/journal, local DB (SQLite/OPFS)                            │
└───────────────┬─────────────────────────────────────────────────┘
                │ HTTPS (optional)
┌───────────────▼─────────────────────────────────────────────────┐
│ TIER 2 — CLOUDFLARE EDGE (thin, stateless-ish)                   │
│ Pages (app delivery/updates) · Workers (API gateway, auth,       │
│ request shaping) · Cloudflare Access (Zero Trust) · Tunnel       │
│ (secure ingress to home lab) · D1/KV (optional sync) · R2        │
│ (optional encrypted audio blob relay) · Durable Objects          │
│ (streaming session state, WebSocket relay for token streaming)   │
└───────────────┬─────────────────────────────────────────────────┘
                │ cloudflared tunnel (outbound-only from home)
┌───────────────▼─────────────────────────────────────────────────┐
│ TIER 3 — HOME LAB (DGX Spark)                                    │
│ vLLM or Ollama serving Qwen3.6-35B-A3B-FP8 (OpenAI-compatible    │
│ API) · MIR worker service (Python/FastAPI): Demucs, basic-pitch, │
│ Essentia/madmom, MT3-class transcription, music21 post-          │
│ processing · n8n for async job orchestration (optional)          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Why this split

- **Qwen3.6-35B-A3B has no audio modality** (text + image + video vision encoder only). Audio → symbols must happen in dedicated MIR models/DSP. This is a feature, not a bug: the small/fast MIR models run on-device, and the LLM only ever reasons over compact symbolic data (chord sequences, ABC notation, feature summaries) — tiny payloads, great over a home tunnel.
- **The vision encoder is exploitable**: photograph a page of sheet music, a chord chart from a songbook, or a hand-scrawled tab, and the LLM can read and discuss it. This is a connected feature with outsized value for zero cost.
- **Cloudflare Tunnel + Access** matches the existing home-lab pattern (Ollama already exposed via tunnel): no inbound ports, Zero Trust service tokens for the app, per-device policies.

### 2.2 Client platform decision

**Recommendation: TypeScript PWA, packaged with Capacitor for iOS/Android.**

| Option | Verdict |
|---|---|
| **PWA + Capacitor** ✅ | One codebase deploys to Cloudflare Pages (web) *and* app stores. Service Worker + OPFS give true offline. WASM (Essentia.js, ONNX Runtime Web) and WebAudio/AudioWorklet cover the DSP needs. Capacitor plugins fill native gaps (background audio, mic permissions, file system). |
| React Native / Expo | Better native feel, but WASM MIR story is weaker; would fragment the DSP layer. |
| Flutter | Same WASM/audio-graph friction; Dart ecosystem thinner for MIR. |
| Native ×2 | Maximum performance, maximum cost. Not justified for a personal project. |

Suggested frontend stack: **Vite + React + TypeScript**, Zustand for state, **wa-sqlite or SQLite-WASM over OPFS** for storage, Workbox for offline caching, Tailwind for UI. All app assets (including WASM/ONNX model files, soundfonts) precached for full offline cold-start.

---

## 3. Model & Inference Layer (Tier 3)

### 3.1 LLM

| Item | Choice | Notes |
|---|---|---|
| Model | **Qwen3.6-35B-A3B-FP8** | Apache-2.0. 35B total / 3B active MoE (hybrid Gated DeltaNet + gated attention). 262K native context. Multimodal (image/video input) — enables sheet-music photo reading. Thinking mode with cross-turn reasoning preservation. |
| Server | **vLLM ≥ 0.19** (primary) or Ollama (fallback/simplicity) | vLLM recommended: FP8 support, OpenAI-compatible API, structured output (JSON schema / grammar-constrained decoding — critical for emitting valid ABC/MusicXML), function calling, `preserve_thinking` for multi-turn tutoring coherence. |
| Hardware | DGX Spark (128 GB unified) | FP8 weights ≈ 35–40 GB; leaves generous headroom for KV cache (long tutoring sessions) plus co-resident MIR models. Expect modest tok/s on Spark-class bandwidth — acceptable for streamed chat; use non-thinking mode for quick lookups, thinking mode for analysis/composition. |
| Sampling | Per Qwen guidance | Thinking: temp 1.0 / top_p 0.95; instruct: temp 0.7 / top_p 0.8; presence_penalty ~1.5 to curb repetition in long tutoring chats. |

### 3.2 Why structured/grammar-constrained decoding matters here

LLMs are unreliable at freehand music notation. Mitigations, in order:

1. **ABC notation as the lingua franca** between LLM and app. It is compact, line-oriented, LLM-friendly (heavily represented in training data via thesession.org etc.), and renders directly in the client via **abcjs**.
2. **Grammar-constrained generation** (vLLM structured outputs) for machine-consumed payloads: chord progressions, practice plans, analysis JSON.
3. **Server-side validation pass**: every generated ABC/MusicXML artifact is parsed by **music21**; parse failures trigger automatic repair-and-retry before anything reaches the client. The client *never* receives unvalidated notation.

### 3.3 MIR worker service (co-resident on Spark)

Python 3.11 + FastAPI + job queue (arq/Redis or n8n webhook flows). GPU-accelerated where supported.

| Capability | Tool | License |
|---|---|---|
| Source separation (vocals/drums/bass/other stems) | **Demucs (htdemucs)** | MIT |
| Polyphonic audio → MIDI transcription | **basic-pitch** (Spotify) | Apache-2.0 |
| Higher-fidelity multi-instrument transcription (async) | **MT3 / YourMT3-class models** | Apache-2.0 |
| Beat, downbeat, structure segmentation | **madmom**, **allin1/all-in-one** | BSD/MIT |
| Key, chords, high-level descriptors | **Essentia** (full build) | AGPL* |
| Symbolic analysis & validation (Roman numerals, voice leading, key confirmation) | **music21** | BSD |
| MIDI ⇄ MusicXML ⇄ ABC conversion | music21 + **music21/abc plugins**, **Verovio** for engraving | BSD/LGPL |
| Lyrics/vocal transcription (optional) | **Whisper (faster-whisper)** | MIT |

\* AGPL is fine server-side for personal use; the *client* uses Essentia.js (AGPL) — acceptable for a personal/OSS project, but flag if the app is ever distributed commercially.

**Job model:** client uploads audio (or a *feature bundle* — see §5.3) → Worker signs and forwards → MIR service runs pipeline → results (stems metadata, MIDI, chord map, structure map, feature summary JSON) stored and returned → LLM analysis invoked with the symbolic bundle, never raw audio.

---

## 4. Feature Matrix — Offline vs. Connected

Legend: **T1** = fully on-device/offline · **T2** = needs Cloudflare edge only · **T3** = needs home LLM/GPU. Every T3 feature lists its offline fallback.

### 4.1 Listening & analysis

| Feature | Tier | Implementation | Offline fallback |
|---|---|---|---|
| Record / import audio | T1 | WebAudio + MediaRecorder; Capacitor mic plugin | — |
| Chromatic tuner | T1 | pYIN/MPM pitch detector in AudioWorklet (custom DSP or `pitchy`) | — |
| Metronome (incl. odd meters, swing) | T1 | WebAudio scheduled clock | — |
| Tempo & beat detection | T1 | Essentia.js (WASM) RhythmExtractor | — |
| Key & chord estimation (good-enough) | T1 | Essentia.js HPCP chromagram + chord template matching; smoothing via simple HMM in TS | — |
| Melody line extraction (monophonic) | T1 | pYIN on-device; **basic-pitch via ONNX Runtime Web** for light polyphony (model ≈ small enough for mobile) | — |
| Loudness/dynamics & timbre descriptors | T1 | Essentia.js (spectral centroid, MFCC summaries → plain-language "brightness/warmth") | — |
| Song structure map (verse/chorus/bridge) | T1≈ | Self-similarity matrix novelty detection in TS/WASM (rough) | T3 `allin1` gives labeled, higher-accuracy structure |
| **Stem separation** (isolate bass to learn it, mute vocals to play along) | **T3** | Demucs on Spark | On-device EQ-based "karaoke" filter (center-channel cut) as a rough fallback |
| **Full polyphonic transcription** (audio → complete score/tab) | **T3** | basic-pitch/MT3 pipeline + music21 cleanup | T1 basic-pitch ONNX gives a rougher single-pass MIDI |
| **Read sheet music / chord charts from photos** | **T3** | Qwen3.6 vision encoder (+ optional Audiveris OMR for engraved scores) | None (queue for later) |

### 4.2 Understanding & conversation (the "theory as language" layer)

| Feature | Tier | Implementation | Offline fallback |
|---|---|---|---|
| **Conversational analysis** ("why does this part feel like it's falling?") | **T3** | LLM receives symbolic bundle: chords + Roman numerals, key, structure, tempo map, timbre words, user's own reaction notes. Streams via Durable Object WebSocket relay. | T1 "Phrasebook" (below) covers the concept library non-conversationally |
| Theory **Phrasebook** — offline concept cards | T1 | Curated static content (authored with LLM assistance at build time, human-reviewed): each concept = a sound example (rendered from bundled ABC), a feeling-first description, a "where you've heard this" pop-culture anchor, and a "try it" prompt | — |
| "**Name that feeling**" — tap a moment in your recording, get the local analyzer's label + Phrasebook card | T1 | Chord/key estimate at timestamp → lookup | T3 upgrades to a bespoke conversational explanation |
| **Personalized curriculum / "quests"** generated from the user's actual listening & noodling history | **T3** | LLM + goal state → generates playful quest JSON (validated schema) that then runs entirely offline | Static quest packs bundled with app |
| Socratic "what do you hear?" guided-listening sessions | **T3** | LLM-driven, multi-turn, thinking mode | T1 static guided-listening scripts |

### 4.3 Making & notation

| Feature | Tier | Implementation | Offline fallback |
|---|---|---|---|
| Render sheet music | T1 | **abcjs** (ABC) + **Verovio WASM** (MusicXML engraving) | — |
| Render guitar/bass tabs & chord diagrams | T1 | **AlphaTab** (tabs, incl. Guitar Pro import), **VexFlow/vexchords** for diagrams | — |
| Playback of any notation | T1 | abcjs synth / AlphaTab player with bundled SoundFont (FluidR3 subset, ~20 MB curated) | — |
| **Melody doodler** — hum or tap a melody, see it appear as notation instantly | T1 | pYIN → note quantizer → ABC → abcjs live render | — |
| **Chord mood palette** — play with chords by *feeling words* (cozy, floating, tense, heroic) instead of names | T1 | Static mapping + WebAudio playback; names revealed on demand ("this one's called E minor, by the way") | — |
| **Spell System** — take any progression/melody and cast playful transforms: "make it spooky" (parallel minor), "make it float" (sus/add9), "put a hat on it" (modulate up). Spells are visible, editable, and craftable — see §4.5 | T1 core / **T3** crafting | Declarative spell engine over **tonal.js** (MIT) runs fully offline; LLM authors *new* spells on request | Bundled + user-crafted grimoire |
| **Compose with a partner** — "write me a chorus that answers my verse" | **T3** | LLM emits ABC (grammar-constrained, music21-validated), rendered client-side; user edits, round-trips | What-If Machine transforms |
| Export | T1 | MusicXML, MIDI, ABC, PDF (Verovio → PDF), Guitar Pro (AlphaTab) | — |

### 4.4 Goals, progress & play

All **T1** — tracking must never require connectivity.

| Feature | Notes |
|---|---|
| Goal setting | Free-form + templates ("play along with one song," "write an 8-bar loop," "learn the 3 chords in Song X"). Goals are *experience-shaped*, never "memorize the circle of fifths." |
| Practice/play journal | One-tap session logging; optional 10-sec audio snapshot attached to entries ("sound diary") so progress is *heard*, not just charted |
| Streak-free progress view | Deliberately no streaks/guilt mechanics. Instead: a growing "garden"/constellation visualization where each session, doodle, or discovery adds an element |
| Ear-play mini-games | Interval "call & echo," chord-mood guessing, rhythm echo tapping — all local DSP + bundled audio |
| Spaced *resurfacing* (not repetition) | Old doodles and discoveries resurface as remix prompts ("remember this melody from March? What if it were in 6/8?") |
| **LLM-enhanced reflection (T3)** | Weekly optional: LLM reads journal + goal state, writes an encouraging, specific reflection and suggests next quests. Requires explicit user tap; nothing automatic. |

### 4.5 The Spell System — transforms as remixable magic

The theory engine is itself a toy. Every musical transform in the app is a **spell**: a small, declarative, human-readable recipe that the user can inspect, tweak, combine, and eventually write. This makes the "grammar" of music tangible and manipulable — the core pedagogical move of the whole app — and gives the project a genuinely game-design-shaped system (composable verbs, emergent combinations, discovery loops).

**Anatomy of a spell (schema v1, zod-validated, stored as JSON):**

```jsonc
{
  "id": "spell.spooky.v1",
  "name": "Spookify",
  "flavor": "Drapes your tune in cobwebs.",
  "emoji": "🕸️",
  "input": ["progression", "melody"],       // what it can target
  "ops": [                                   // ordered ops over tonal.js primitives
    { "op": "mode_swap", "to": "parallel_minor" },
    { "op": "chord_color", "add": "b9", "where": "dominant", "chance": 0.5 },
    { "op": "tempo_scale", "factor": 0.9 }
  ],
  "reveal": {                                // the teaching payload, shown AFTER hearing
    "concepts": ["parallel-minor", "flat-nine"],
    "one_liner": "Same notes' home moved three doors down — that's the parallel minor."
  },
  "origin": "bundled | user | llm",
  "safety": "pure"                           // spells are pure functions: no I/O, no network
}
```

**Design rules:**

- **Pure & sandboxed.** Ops are a closed vocabulary interpreted by the spell engine (no eval, no arbitrary code) — safe for kids to edit freely and for the LLM to author without review anxiety. Unknown ops fail closed with a friendly fizzle animation.
- **Hear first, reveal after.** Casting plays the result immediately; the `reveal` card (naming the theory) appears only on tap — sound-before-symbol enforced structurally.
- **Composable.** Spells chain ("Spookify → Put a Hat On It"); the engine shows the diff between before/after notation so cause-and-effect stays legible. Chains can be saved as a new spell (a "ritual").
- **Craftable at three levels.**
  1. *Tweak* (T1): sliders/toggles on an existing spell's ops — kid-friendly.
  2. *Scribe* (T1): compose new spells from the op vocabulary in a block-style editor (Scratch-flavored UI).
  3. *Commission* (T3): describe a vibe to the LLM ("a spell that makes it feel like walking uphill") → LLM emits spell JSON via grammar-constrained decoding → schema-validated → lands in the grimoire and **runs offline forever after**. The LLM also fills the `reveal` field, so every commissioned spell teaches.
- **The Grimoire** is the collection UI: bundled starter spells (~15 at P1), user creations, and LLM commissions, with provenance badges. Spells export/import as single `.spell.json` files — shareable between family devices by AirDrop/file, no server needed (consistent with §5.4).
- **Discovery loop:** some bundled spells start "sealed" and unseal when the user *encounters the concept in the wild* (e.g., the analyzer detects a key change in a song they recorded → "you just found the ingredient for Put a Hat On It"). Ties analysis, listening, and play into one loop.

**Engine placement:** `packages/notation/spell-engine/` — shared by client (T1 execution) and homelab (T3 validation of LLM-authored spells before they're returned).

---

## 5. Data Design & Sync

### 5.1 Canonical local store (T1)

SQLite (WASM/OPFS on web, native SQLite via Capacitor on mobile). Core entities:

```
recordings(id, created_at, duration, file_ref, title, notes)
analyses(id, recording_id, engine, version, json)        -- chord maps, keys, structure
artifacts(id, kind[abc|musicxml|midi|gp|pdf], source, blob_ref, parent_id)
goals(id, title, kind, target, created_at, status)
sessions(id, started_at, duration, mood, journal_text, snapshot_ref)
quests(id, source[bundled|llm], schema_version, json, state)
concepts_seen(concept_id, first_heard_at, contexts_json) -- powers the Phrasebook "your dialect" view
llm_threads(id, topic_ref, messages_json)                -- cached conversations, readable offline
```

Audio blobs in OPFS/native filesystem; DB stores references. Everything exportable as a single zip (data portability tenet).

### 5.2 Optional sync (T2)

- **Cloudflare D1** for structured data, **R2** for blobs, per-user encryption client-side (libsodium) before upload — the edge never sees plaintext journals or audio.
- Sync strategy: simple last-writer-wins per row with vector-clock tiebreak (single user, few devices — CRDTs are overkill; revisit if that changes).

### 5.3 Privacy-preserving analysis mode

For users (or moods) where uploading raw audio feels wrong: client computes and uploads only the **feature bundle** (chromagram, beat grid, on-device MIDI sketch, descriptors) — the LLM conversation works nearly as well, and raw audio never leaves the device. This is the default; raw-audio upload (needed for Demucs/MT3 quality) is opt-in per recording.

### 5.4 Kid-safety & privacy requirements (normative)

Children in the household are assumed users. These are requirements, not suggestions:

1. **Zero-network default.** Fresh install and "kid profile" run entirely in Tier 1. No telemetry, no update pings from the app itself (updates arrive via store/Pages deploy only).
2. **Adult gate for connectivity.** Enabling any T2/T3 feature sits behind a local adult gate (device biometric/PIN, not an account). The gate is per-profile and sticky — a kid profile can never reach the tunnel.
3. **Nothing leaves without a deliberate act.** Raw audio upload is per-recording opt-in (§5.3) and disabled entirely on kid profiles; feature-bundle mode is the ceiling for a kid profile even if an adult enables connectivity for their own profile on the same device.
4. **Voice data hygiene.** Mic audio is processed in-memory for tuner/doodler; recordings persist only on explicit save, are stored locally encrypted at rest (OS keystore-derived key), and are included in the one-zip export so they can also be *deleted* verifiably.
5. **LLM content posture.** The tutoring persona prompt includes age-appropriate content rules; but since kid profiles can't reach the LLM at all (rule 2), the offline Phrasebook and bundled quests — which are human-reviewed at build time — are the entire content surface for children.
6. **No dark patterns.** Already a tenet (no streaks/guilt); additionally: no notifications by default, no time-on-app metrics surfaced to kids, session-end is celebrated ("nice noise today!") rather than resisted.
7. **UI ergonomics.** Kid profile gets larger touch targets, icon-first navigation (pre-readers), and the chord mood palette / spell grimoire as the home screen.

---

## 6. Cloudflare Edge Design (T2)

| Service | Role |
|---|---|
| **Pages** | Hosts the PWA; instant updates; also the artifact for Capacitor bundling |
| **Workers** | API gateway: auth check, request validation, rate limiting, payload shaping (OpenAI-compat proxy to tunnel), ABC/JSON schema validation at edge as belt-and-braces |
| **Cloudflare Access + Tunnel** | Zero Trust ingress to Spark services; app authenticates with service token; no inbound home ports; device posture rules optional |
| **Durable Objects** | One per live LLM session: holds streaming state, relays tokens over WebSocket, buffers if mobile network blips, enforces single-flight to protect the Spark |
| **Workers Queues** | Async MIR jobs (separation/transcription can take minutes); client polls or receives push |
| **D1 / KV / R2** | Optional sync (§5.2); KV for app config/feature flags; R2 for encrypted blob relay with lifecycle expiry (relay, not archive) |

Failure mode by design: if the tunnel or home lab is down, Workers return a typed `HOME_OFFLINE` response and the client degrades gracefully to T1 with queued jobs — the app must feel *complete*, not broken, in this state.

---

## 7. LLM Application Design

### 7.1 Prompting & persona

System prompt encodes the tenets: sound-before-symbol, descriptive-not-prescriptive, feeling-words-first, celebrate "wrong" notes as choices, always anchor explanations to the user's actual recording/timestamps, introduce at most one new term per exchange and always attach it to something just heard. Persona: a warm, slightly whimsical jam partner — never a professor.

### 7.2 Tool schema (function calling)

The LLM gets tools rather than freeform power:

- `get_analysis(recording_id)` → symbolic bundle
- `render_preview(abc)` → validation result (server-side music21 parse; the LLM sees errors and self-repairs)
- `create_quest(quest_json)` → schema-validated
- `lookup_concept(term)` → Phrasebook entry (keeps terminology consistent between offline cards and LLM chat)
- `get_progress_summary()` → goals/sessions digest (only when user invokes reflection)

### 7.3 Hallucination containment

- All notation validated (music21) before client render — hard gate.
- Analysis claims cross-checked: LLM receives *computed* chords/keys and is instructed to reason from them, not re-derive from imagination; discrepancies surfaced as "the analyzer heard X — I'd describe it as…"
- Theory content in the offline Phrasebook is human-reviewed at build time; the LLM cites Phrasebook entries for definitions.

---

## 8. Suggested Repository & Deployment Layout

```
lyd/
  apps/web/            # Vite PWA (T1) — deployed to Cloudflare Pages
  apps/mobile/         # Capacitor shell wrapping apps/web
  packages/mir-wasm/   # Essentia.js, ONNX models, DSP worklets
  packages/notation/   # abcjs/AlphaTab/Verovio wrappers, tonal.js transforms
  packages/schema/     # zod schemas shared client/edge/homelab (quests, analysis, ABC envelope)
  edge/                # Workers, DO classes, wrangler.toml
  homelab/
    llm/               # vLLM config, system prompts, tool defs
    mir-service/       # FastAPI + Demucs/basic-pitch/MT3/music21
    compose.yaml       # Spark deployment; cloudflared sidecar
  content/phrasebook/  # authored concept cards + bundled ABC examples
```

CI: GitHub Actions → Pages deploy; homelab pulls via watchtower or manual `compose up`.

---

## 9. Phased Roadmap

| Phase | Scope | Exit criterion |
|---|---|---|
| **P0 — Offline instrument** | Recorder, tuner, metronome, chord/key/tempo estimation, notation rendering + playback, melody doodler, local DB | A stranger with no theory background records a song and sees its chords, entirely offline |
| **P1 — Language layer** | Phrasebook (30–50 concepts), chord mood palette, **spell engine + ~15-spell starter grimoire + tweak/scribe editors**, kid profiles & adult gate, goals/journal/garden | User (or their kid) can go feeling → concept → play, offline; a child can safely cast and tweak spells |
| **P2 — The tunnel** | Workers gateway, Access/Tunnel, streaming chat with Qwen, conversational analysis on feature bundles | "Why does this chorus feel bigger?" gets a grounded, streamed answer about *their* recording |
| **P3 — Heavy MIR** | Demucs stems, full transcription pipeline, queued jobs, sheet-music photo reading | Isolate the bassline of a favorite song and get a playable tab for it |
| **P4 — Companion** | LLM quests, composition partner, **spell commissioning (LLM-authored spells)**, weekly reflections, sync | The app proposes a personalized, playful next step that runs offline; a described vibe becomes a permanent offline spell |

### 9.1 P0 Build Specification (locked)

| Decision | Value | Consequences |
|---|---|---|
| **Instruments** | Guitar/bass, piano/keys, voice (ukulele deferred) | Tuner presets: chromatic + standard guitar (EADGBE), bass (EADG), drop-D. Notation defaults: treble + bass clefs; guitar view offers tab toggle from day one (abcjs tab support). Soundfont subset: nylon/steel guitar, fingered bass, acoustic piano, a soft synth pad for playback of doodles ≈ 8–10 MB. Voice mode: doodler + tuner display in "sing" register with note-name-optional display. |
| **Lead platform** | **Android via Capacitor** | Native SQLite via `@capacitor-community/sqlite` (skips OPFS quirks entirely); mic via Capacitor plugin with `VOICE_RECOGNITION` audio source for low-latency tuner; foreground service for metronome/recording with screen off; APK sideload for family devices — no Play Store needed. The same codebase still builds as a PWA to Cloudflare Pages for desktop dev/testing, but Android is the acceptance target. iOS/iPad deferred to P1+. |
| **UI language** | English only, **strings externalized from commit one** (i18next, flat JSON) | Norwegian (bokmål/nynorsk) becomes a translation task later, not a refactor. No locale switcher UI in P0. |
| **Notation rendering** | **abcjs only** in P0 | Verovio (MusicXML engraving) and AlphaTab (rich tabs/GP files) deferred to P1/P3 — saves ~10 MB WASM in the offline bundle. abcjs handles P0's rendering, playback, and basic tab needs. |
| **Import formats** | wav, mp3, m4a/aac (WebAudio native decode) | FLAC/ogg deferred (would need a WASM decoder). |
| **Doodler capture** | Free-time first; snap-to-grid offered *after*, never forced | Quantization is an invitation, not a correction (tenet §1.1). |
| **Accuracy gate** | Ground-truth set of ~8 songs (varied genre, known chords/keys/tempi) run in CI against the WASM pipeline | "Good enough" = ≥70% chord-symbol accuracy at beat resolution on the set, key correct on ≥6/8, tempo within ±2 BPM. Below that, tune HMM smoothing before shipping. |
| **P0 excludes** | All networking, spell engine, Phrasebook, goals UI beyond a stub journal table | Schema (§5.1) is created in full at P0 so later phases are additive migrations only. |

---

## 10. Key Risks & Open Questions

1. **On-device MIR accuracy vs. delight.** Chord estimation on dense mixes is imperfect. Mitigation: confidence display as vibe, not verdict ("pretty sure this is G-ish"); one-tap "ask the big brain" escalation to T3.
2. **Spark throughput for long thinking-mode sessions.** 3B-active MoE helps, but Spark memory bandwidth caps tok/s; keep tutoring answers concise by prompt design; reserve thinking mode for analysis/composition turns.
3. **AGPL (Essentia) & GPL (Verovio LGPL is fine) hygiene** if the app ever ships publicly — audit before any store release; swap-in candidates exist (Meyda, MIT) with accuracy tradeoffs.
4. **ABC's limits** for dense piano music — MusicXML path must be first-class by P3, not an afterthought.
5. **Soundfont size vs. quality** on mobile — curate per-instrument subsets; lazy-load extras when online.
6. **Spell op vocabulary versioning.** LLM-commissioned spells must keep working across engine updates: ops are additive-only, schema carries `schema_version`, engine ships permanent back-compat interpreters per version. Never remove an op; deprecate by aliasing.
7. **Spell expressiveness ceiling.** A closed op vocabulary is what makes spells kid-safe and LLM-safe, but it caps creativity. Watch for the moment users want ops that don't exist; the answer is growing the vocabulary deliberately (with reveal-card coverage), never opening an escape hatch to arbitrary code.

---

*End of TDD v0.1*
