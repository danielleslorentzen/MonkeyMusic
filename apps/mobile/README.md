# @lyd/mobile — Android shell (P0 acceptance target)

Capacitor wrapper around `apps/web`. The native `android/` project is
generated locally (it is gitignored) because building it requires the
Android SDK.

## First-time setup (on a machine with Android Studio / SDK)

```bash
npm install
npm run build -w @lyd/web        # produce apps/web/dist
cd apps/mobile
npx cap add android              # generates android/ from this config
npx cap sync android
npx cap open android             # build/run from Android Studio
```

Sideload the APK onto family devices — no Play Store needed (TDD §9.1).

## P0 native notes / P1 follow-ups

- Mic permission: Capacitor's WebView prompts for `RECORD_AUDIO`; add
  `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  to `AndroidManifest.xml` after `cap add android`.
- Low-latency tuner input via `VOICE_RECOGNITION` audio source and a
  foreground service for metronome/recording with the screen off are
  P0-spec native niceties (TDD §9.1) tracked for the first device pass —
  the WebView versions work without them.
- Native SQLite via `@capacitor-community/sqlite` is the planned upgrade
  from the OPFS build if WebView OPFS proves flaky on target devices;
  the DB layer is already isolated behind `src/db/client.ts`.
