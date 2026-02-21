import type { SongDrumKit, SongInstrumentation, SongTimbre } from "./song";
import type { SongPreset } from "./song";

import { Mulberry32 } from "./random";

export type WebTimbreProfile = {
  droneSawMix: number;
  droneSquareMix: number;
  droneDrive: number;
  droneCutoffBase: number;
  droneCutoffMove: number;
  stereoWidth: number;
  airGain: number;
  shimmerGain: number;
  riffSawMix: number;
  riffSquareMix: number;
  riffDrive: number;
  riffCutoffBase: number;
  riffCutoffMove: number;
};

export type WebDrumKitProfile = {
  kickDecay: number;
  kickClick: number;
  kickSweep: number;
  kickBase: number;
  snareBody: number;
  snareNoise: number;
  hatMetal: number;
  hatNoise: number;
  clapNoise: number;
  drive: number;
};

export type NativeTimbreProfile = {
  sawMix: number;
  pulseMix: number;
  droneDrive: number;
  riffDrive: number;
  airGain: number;
  shimmerGain: number;
};

export type NativeDrumKitProfile = {
  kickDecay: number;
  kickClick: number;
  snareNoise: number;
  hatNoise: number;
  drive: number;
};

export type MixProfile = {
  reverbBedSend: number;
  reverbDrumSend: number;
  reverbRiffSend: number;
  echoSend: number;
  echoFeedback: number;
  stereoWidth: number;
  glueAmount: number;
  masterDrive: number;
  compThreshold: number;
  compRatio: number;
};

export type InstrumentationProfile = {
  padVoices: 1 | 2 | 3;
  bassModel: "sub" | "saw" | "pluck";
  pulseModel: "tone" | "fm" | "noise";
  riffModel: "saw" | "square" | "sine";
  riffEnabled: boolean;
  carrierLevel: number;
  bedLevel: number;
  drumLevel: number;
  airLevel: number;
  shimmerLevel: number;
  openHatOn: boolean;
  clapOn: boolean;
  rimOn: boolean;
};

const WEB_TIMBRE_PROFILES: Record<SongTimbre, WebTimbreProfile> = {
  analog: {
    droneSawMix: 0.22,
    droneSquareMix: 0.06,
    droneDrive: 0.12,
    droneCutoffBase: 480,
    droneCutoffMove: 1800,
    stereoWidth: 0.7,
    airGain: 1,
    shimmerGain: 0.9,
    riffSawMix: 0.74,
    riffSquareMix: 0.12,
    riffDrive: 0.2,
    riffCutoffBase: 750,
    riffCutoffMove: 2200
  },
  glass: {
    droneSawMix: 0.12,
    droneSquareMix: 0.16,
    droneDrive: 0.08,
    droneCutoffBase: 620,
    droneCutoffMove: 2600,
    stereoWidth: 0.85,
    airGain: 1.15,
    shimmerGain: 1.22,
    riffSawMix: 0.44,
    riffSquareMix: 0.32,
    riffDrive: 0.12,
    riffCutoffBase: 1100,
    riffCutoffMove: 2800
  },
  noir: {
    droneSawMix: 0.18,
    droneSquareMix: 0.1,
    droneDrive: 0.18,
    droneCutoffBase: 360,
    droneCutoffMove: 1500,
    stereoWidth: 0.62,
    airGain: 0.74,
    shimmerGain: 0.58,
    riffSawMix: 0.68,
    riffSquareMix: 0.18,
    riffDrive: 0.28,
    riffCutoffBase: 620,
    riffCutoffMove: 1750
  },
  dust: {
    droneSawMix: 0.26,
    droneSquareMix: 0.08,
    droneDrive: 0.24,
    droneCutoffBase: 420,
    droneCutoffMove: 1400,
    stereoWidth: 0.74,
    airGain: 0.92,
    shimmerGain: 0.78,
    riffSawMix: 0.58,
    riffSquareMix: 0.24,
    riffDrive: 0.35,
    riffCutoffBase: 680,
    riffCutoffMove: 1900
  }
};

const WEB_DRUM_KITS: Record<SongDrumKit, WebDrumKitProfile> = {
  kit808: {
    kickDecay: 0.22,
    kickClick: 0.02,
    kickSweep: 105,
    kickBase: 34,
    snareBody: 0.32,
    snareNoise: 0.8,
    hatMetal: 0.1,
    hatNoise: 0.9,
    clapNoise: 0.7,
    drive: 0.12
  },
  kit909: {
    kickDecay: 0.16,
    kickClick: 0.07,
    kickSweep: 145,
    kickBase: 40,
    snareBody: 0.48,
    snareNoise: 1,
    hatMetal: 0.24,
    hatNoise: 1,
    clapNoise: 0.9,
    drive: 0.18
  },
  linndrum: {
    kickDecay: 0.12,
    kickClick: 0.05,
    kickSweep: 82,
    kickBase: 46,
    snareBody: 0.55,
    snareNoise: 0.72,
    hatMetal: 0.15,
    hatNoise: 0.82,
    clapNoise: 0.85,
    drive: 0.24
  }
};

const NATIVE_TIMBRE_PROFILES: Record<SongTimbre, NativeTimbreProfile> = {
  analog: {
    sawMix: 0.24,
    pulseMix: 0.08,
    droneDrive: 0.12,
    riffDrive: 0.18,
    airGain: 1,
    shimmerGain: 0.95
  },
  glass: {
    sawMix: 0.12,
    pulseMix: 0.18,
    droneDrive: 0.06,
    riffDrive: 0.1,
    airGain: 1.18,
    shimmerGain: 1.2
  },
  noir: {
    sawMix: 0.22,
    pulseMix: 0.1,
    droneDrive: 0.18,
    riffDrive: 0.28,
    airGain: 0.7,
    shimmerGain: 0.62
  },
  dust: {
    sawMix: 0.26,
    pulseMix: 0.12,
    droneDrive: 0.23,
    riffDrive: 0.32,
    airGain: 0.9,
    shimmerGain: 0.76
  }
};

const NATIVE_DRUM_KITS: Record<SongDrumKit, NativeDrumKitProfile> = {
  kit808: {
    kickDecay: 0.24,
    kickClick: 0.012,
    snareNoise: 0.74,
    hatNoise: 0.82,
    drive: 0.12
  },
  kit909: {
    kickDecay: 0.17,
    kickClick: 0.04,
    snareNoise: 0.92,
    hatNoise: 1,
    drive: 0.17
  },
  linndrum: {
    kickDecay: 0.13,
    kickClick: 0.032,
    snareNoise: 0.64,
    hatNoise: 0.78,
    drive: 0.23
  }
};

const INSTRUMENTATION_PROFILES: Record<SongInstrumentation, InstrumentationProfile> = {
  band: {
    padVoices: 3,
    bassModel: "saw",
    pulseModel: "tone",
    riffModel: "saw",
    riffEnabled: true,
    carrierLevel: 0.12,
    bedLevel: 1,
    drumLevel: 1,
    airLevel: 1,
    shimmerLevel: 1,
    openHatOn: true,
    clapOn: true,
    rimOn: true
  },
  pulseLab: {
    padVoices: 2,
    bassModel: "pluck",
    pulseModel: "fm",
    riffModel: "square",
    riffEnabled: true,
    carrierLevel: 0.1,
    bedLevel: 0.92,
    drumLevel: 0.95,
    airLevel: 0.9,
    shimmerLevel: 1.1,
    openHatOn: true,
    clapOn: false,
    rimOn: true
  },
  percussionForward: {
    padVoices: 1,
    bassModel: "sub",
    pulseModel: "noise",
    riffModel: "sine",
    riffEnabled: false,
    carrierLevel: 0.1,
    bedLevel: 0.75,
    drumLevel: 1.24,
    airLevel: 0.78,
    shimmerLevel: 0.72,
    openHatOn: true,
    clapOn: true,
    rimOn: true
  },
  droneNocturne: {
    padVoices: 3,
    bassModel: "sub",
    pulseModel: "tone",
    riffModel: "sine",
    riffEnabled: false,
    carrierLevel: 0.16,
    bedLevel: 1.14,
    drumLevel: 0.55,
    airLevel: 1.2,
    shimmerLevel: 0.65,
    openHatOn: false,
    clapOn: false,
    rimOn: false
  },
  riffMachine: {
    padVoices: 2,
    bassModel: "pluck",
    pulseModel: "fm",
    riffModel: "square",
    riffEnabled: true,
    carrierLevel: 0.08,
    bedLevel: 0.88,
    drumLevel: 1.05,
    airLevel: 0.72,
    shimmerLevel: 1.05,
    openHatOn: true,
    clapOn: false,
    rimOn: true
  },
  minimalDub: {
    padVoices: 1,
    bassModel: "sub",
    pulseModel: "tone",
    riffModel: "saw",
    riffEnabled: true,
    carrierLevel: 0.1,
    bedLevel: 0.84,
    drumLevel: 0.82,
    airLevel: 0.82,
    shimmerLevel: 0.8,
    openHatOn: false,
    clapOn: true,
    rimOn: false
  }
};

export const getWebTimbreProfile = (timbre: SongTimbre) => WEB_TIMBRE_PROFILES[timbre];
export const getWebDrumKitProfile = (drumKit: SongDrumKit) => WEB_DRUM_KITS[drumKit];
export const getNativeTimbreProfile = (timbre: SongTimbre) => NATIVE_TIMBRE_PROFILES[timbre];
export const getNativeDrumKitProfile = (drumKit: SongDrumKit) => NATIVE_DRUM_KITS[drumKit];

export const getMixProfile = (song: SongPreset): MixProfile => {
  const rng = new Mulberry32(song.seed ^ 0x45d9f3b);
  const lowHook = 1 - song.hookDensity;

  return {
    reverbBedSend: 0.12 + rng.range(0, 0.16) + lowHook * 0.08,
    reverbDrumSend: 0.04 + rng.range(0, 0.09),
    reverbRiffSend: 0.07 + rng.range(0, 0.16),
    echoSend: 0.06 + rng.range(0, 0.14),
    echoFeedback: 0.18 + rng.range(0, 0.32),
    stereoWidth: 0.72 + rng.range(0, 0.3),
    glueAmount: 0.12 + rng.range(0, 0.2) + song.drumDensity * 0.08,
    masterDrive: 0.92 + rng.range(0, 0.26),
    compThreshold: 0.34 + rng.range(0, 0.14),
    compRatio: 2 + rng.range(0, 2.2)
  };
};

export const getInstrumentationProfile = (song: SongPreset): InstrumentationProfile => {
  const base = INSTRUMENTATION_PROFILES[song.instrumentation];
  const rng = new Mulberry32(song.seed ^ 0x3c6ef372);
  const width = 0.92 + rng.range(0, 0.18);
  const bed = base.bedLevel * (0.95 + rng.range(0, 0.12));
  const drums = base.drumLevel * (0.95 + rng.range(0, 0.12));

  return {
    ...base,
    carrierLevel: base.carrierLevel * width,
    bedLevel: bed,
    drumLevel: drums
  };
};

export const PROFILE_KEYS = {
  timbres: ["analog", "glass", "noir", "dust"] as const,
  drumKits: ["kit808", "kit909", "linndrum"] as const,
  instrumentations: ["band", "pulseLab", "percussionForward", "droneNocturne", "riffMachine", "minimalDub"] as const
};
