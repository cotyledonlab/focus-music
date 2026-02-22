import { MODE_CONFIGS, type FocusMode, type ModeConfig } from "../constants/modes";

import { buildSongComposition, midiToHz, type SongComposition } from "./composition";
import { getInstrumentationProfile, getMixProfile, type InstrumentationProfile, type MixProfile } from "./profiles";
import type { SongPreset } from "./song";

export type ArrangementState<TTimbre, TDrums> = {
  mode: FocusMode;
  cfg: ModeConfig;
  song: SongPreset;
  timbre: TTimbre;
  drums: TDrums;
  instrumentation: InstrumentationProfile;
  mix: MixProfile;
  patterns: SongComposition;
  rootHz: number;
};

export const createArrangementState = <TTimbre, TDrums>(args: {
  mode: FocusMode;
  song: SongPreset;
  evolveTick: number;
  resolveTimbre: (song: SongPreset) => TTimbre;
  resolveDrums: (song: SongPreset) => TDrums;
}): ArrangementState<TTimbre, TDrums> => {
  const { mode, song, evolveTick, resolveTimbre, resolveDrums } = args;
  const cfg = MODE_CONFIGS[mode];

  return {
    mode,
    cfg,
    song,
    timbre: resolveTimbre(song),
    drums: resolveDrums(song),
    instrumentation: getInstrumentationProfile(song),
    mix: getMixProfile(song),
    patterns: buildSongComposition(mode, song, evolveTick, cfg.pulseBpm),
    rootHz: midiToHz(song.rootMidi)
  };
};
