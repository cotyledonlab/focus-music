# Focus Music (Expo + Elementary Audio)

Generative focus audio app scaffold inspired by Brain.fm, built with Expo Router and TypeScript.

## Stack

- Expo SDK 52+
- Expo Router v4
- TypeScript
- Elementary Audio (`@elemaudio/core` + `@elemaudio/web-renderer`) for web DSP
- `expo-av` (audio session and background playback)
- Native fallback synthesis: procedural WAV generation + seamless crossfade loops

## Features

- Modes: `Focus`, `Relax`, `Sleep`
- Binaural beat targets:
  - Focus: ~10 Hz (alpha)
  - Relax: ~6 Hz (theta)
  - Sleep: ~3 Hz (delta)
- Evolving harmonic beds + rhythmic pulse layers
- Euclidean-inspired drum sequencing with scene-based instrumentation
- Non-repetitive procedural generation
- Song presets with deterministic seeds
- Favorite songs + quick reload from Home/Player
- Timer + volume controls
- Background audio configuration (iOS + Android)

## Routes

- `app/index.tsx`: home/mode selection
- `app/index.tsx`: mode selection + favorite-song quick launch
- `app/player.tsx`: playback controls

## Architecture

- `docs/architecture.md`: C4-style Mermaid diagrams (system context, containers, audio components, runtime sequence)

## Audio Engine

- `src/audio/musicEngine.web.ts`
  - Elementary graph with binaural carriers, harmonic sequencing, riff/pulse/drum layers, and FX buses
  - periodic graph evolution using `el.seq`, `el.train`, and smoothed parameter refs for non-repetitive progression
- `src/audio/musicEngine.native.ts`
  - runtime synthesis to stereo PCM WAV segments
  - looped playback with crossfades for smooth continuity
- `src/audio/arrangement.ts`
  - shared arrangement state builder used by both web/native engines
- `src/audio/song.ts`
  - song preset schema, bounds, and favorite-compatible serialization
- `src/audio/musicEngine.ts`
  - platform resolver that chooses web or native engine

## Run

```bash
npm install
npm run start
```

Then launch on iOS/Android/web from Expo.

## Validation

```bash
npm run verify
```

`verify` runs:
- TypeScript typecheck
- Vitest unit tests
- Expo web export smoke build
