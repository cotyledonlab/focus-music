# Focus Music Architecture

This document gives a shared architecture map for roadmap work. Diagrams use Mermaid and follow a C4-style breakdown.

## C4 Level 1: System Context

```mermaid
flowchart LR
  User[User] --> App[Focus Music App<br/>Expo Router + React Native]
  App --> AudioSession[Device Audio Session<br/>expo-av]
  App --> Storage[Local Favorites Storage<br/>AsyncStorage]
  App --> WebAudio[Web Audio Runtime<br/>Elementary + AudioContext]
  App --> NativeAudio[Native Audio Runtime<br/>Generated WAV + AV playback]
```

## C4 Level 2: Containers

```mermaid
flowchart LR
  subgraph Client["Focus Music Client (single app repo)"]
    UI[Routes + UI Components<br/>app/* + src/components/*]
    PlayerState[Player State + Actions<br/>src/context/PlayerContext.tsx]
    EngineFacade[Platform Engine Facade<br/>src/audio/musicEngine.ts]
    WebEngine[Web DSP Engine<br/>src/audio/musicEngine.web.ts]
    NativeEngine[Native Segment Engine<br/>src/audio/musicEngine.native.ts]
    SongModel[Song/Composition/Profile Model<br/>src/audio/song.ts, composition.ts, profiles.ts, arrangement.ts]
  end

  UI --> PlayerState
  PlayerState --> EngineFacade
  PlayerState --> SongModel
  EngineFacade --> WebEngine
  EngineFacade --> NativeEngine
  WebEngine --> SongModel
  NativeEngine --> SongModel
  PlayerState --> AsyncStorage[(AsyncStorage)]
  WebEngine --> WebAudioAPI[(Web Audio API)]
  NativeEngine --> ExpoAV[(expo-av + expo-file-system)]
```

## C4 Level 3: Component View (Audio Generation Domain)

```mermaid
flowchart TD
  SongPreset[song.ts<br/>SongPreset + bounds + sanitize] --> Composition[composition.ts<br/>Harmonic and rhythmic pattern generation]
  SongPreset --> Profiles[profiles.ts<br/>Timbre, drums, instrumentation, mix]
  Composition --> Arrangement[arrangement.ts<br/>createArrangementState]
  Profiles --> Arrangement
  SongPreset --> Arrangement

  Arrangement --> WebGraph[musicEngine.web.ts<br/>Elementary graph builders]
  Arrangement --> NativeRender[musicEngine.native.ts<br/>Sample-by-sample WAV render]
  WebGraph --> WebOutput[Continuous WebAudio playback]
  NativeRender --> NativeOutput[Crossfaded looping native playback]
```

## Runtime Sequence: Play, Evolve, and Song Switch

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Player UI
  participant Ctx as PlayerContext
  participant Eng as Engine Facade
  participant Impl as Web/Native Engine
  participant Arr as Arrangement Builder

  U->>UI: Press Play
  UI->>Ctx: togglePlayback()
  Ctx->>Eng: start({ mode, volume, song })
  Eng->>Impl: start(...)
  Impl->>Arr: createArrangementState(...)
  Arr-->>Impl: cfg + song + profiles + patterns
  Impl-->>Ctx: audio running

  loop Every phrase window
    Impl->>Arr: createArrangementState(evolveTick++)
    Arr-->>Impl: evolved arrangement
    Impl->>Impl: graph/segment refresh
  end

  U->>UI: New Song / Favorite Song
  UI->>Ctx: generateSong() / loadSong()
  Ctx->>Eng: setMode() + setSong()
  Eng->>Impl: apply update
  Impl->>Arr: rebuild arrangement
```

## Roadmap Mapping

These diagram boundaries map directly to future workstreams:

- Song quality and musicality: `song.ts`, `composition.ts`, `profiles.ts`, `arrangement.ts`
- Engine rendering and mix glue: `musicEngine.web.ts`, `musicEngine.native.ts`
- UX and session workflow: `PlayerContext`, `app/index.tsx`, `app/player.tsx`
- Persistence and recall: favorites storage + preset schema compatibility
