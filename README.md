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
- Evolving drones + subtle rhythmic pulses
- Non-repetitive procedural generation
- Timer + volume controls
- Background audio configuration (iOS + Android)

## Routes

- `app/index.tsx`: home/mode selection
- `app/player.tsx`: playback controls

## Audio Engine

- `src/audio/musicEngine.web.ts`
  - Elementary graph with binaural carriers, evolving drone sequencers, pulse envelopes, and filtered noise texture
  - periodic graph evolution using `el.seq`, `el.train`, and smoothed parameter refs for non-repetitive progression
- `src/audio/musicEngine.native.ts`
  - runtime synthesis to stereo PCM WAV segments
  - looped playback with crossfades for smooth continuity
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
npm run typecheck
```

If dependency install fails due offline or sandboxed networking, run install in a network-enabled environment first.
