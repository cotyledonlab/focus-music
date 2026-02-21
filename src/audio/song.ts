import type { FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";

export type SongScaleFamily =
  | "minor"
  | "dorian"
  | "phrygian"
  | "mixolydian"
  | "lydian"
  | "minorPentatonic"
  | "majorPentatonic";

export type SongProgression = "driver" | "lift" | "descent" | "orbit" | "tide" | "hush" | "pulse" | "drone";

export type SongTimbre = "analog" | "glass" | "noir" | "dust";

export type SongDrumKit = "kit808" | "kit909" | "linndrum";

export type SongGroove = "straight" | "shuffle" | "broken";

export type SongHookStyle = "arpeggio" | "stabs" | "motif" | "glide";

export type SongPreset = {
  id: string;
  mode: FocusMode;
  name: string;
  seed: number;
  rootMidi: number;
  scaleFamily: SongScaleFamily;
  progression: SongProgression;
  timbre: SongTimbre;
  drumKit: SongDrumKit;
  groove: SongGroove;
  hookStyle: SongHookStyle;
  tempoScale: number;
  drumDensity: number;
  hookDensity: number;
  brightness: number;
  subTrim: number;
  swing: number;
  riffRegister: number;
  favorite: boolean;
  createdAt: number;
};

type Range = {
  min: number;
  max: number;
};

type IntRange = {
  min: number;
  max: number;
};

type SongBounds = {
  rootMidi: IntRange;
  tempoScale: Range;
  drumDensity: Range;
  hookDensity: Range;
  brightness: Range;
  subTrim: Range;
  swing: Range;
  riffRegister: Range;
  scales: SongScaleFamily[];
  progressions: SongProgression[];
  timbres: SongTimbre[];
  drumKits: SongDrumKit[];
  grooves: SongGroove[];
  hookStyles: SongHookStyle[];
};

const MODE_BOUNDS: Record<FocusMode, SongBounds> = {
  focus: {
    rootMidi: { min: 45, max: 57 },
    tempoScale: { min: 1.0, max: 1.14 },
    drumDensity: { min: 0.66, max: 0.97 },
    hookDensity: { min: 0.56, max: 0.95 },
    brightness: { min: 0.56, max: 0.92 },
    subTrim: { min: 0.58, max: 0.9 },
    swing: { min: 0.02, max: 0.13 },
    riffRegister: { min: 1.5, max: 2.3 },
    scales: ["minor", "dorian", "phrygian", "mixolydian"],
    progressions: ["driver", "lift", "descent", "orbit", "pulse"],
    timbres: ["analog", "glass", "noir", "dust"],
    drumKits: ["kit909", "kit808", "linndrum"],
    grooves: ["straight", "shuffle", "broken"],
    hookStyles: ["arpeggio", "motif", "stabs", "glide"]
  },
  relax: {
    rootMidi: { min: 43, max: 54 },
    tempoScale: { min: 0.9, max: 1.03 },
    drumDensity: { min: 0.46, max: 0.72 },
    hookDensity: { min: 0.34, max: 0.75 },
    brightness: { min: 0.35, max: 0.68 },
    subTrim: { min: 0.62, max: 0.94 },
    swing: { min: 0.05, max: 0.18 },
    riffRegister: { min: 1.15, max: 1.85 },
    scales: ["minor", "dorian", "lydian", "majorPentatonic"],
    progressions: ["tide", "lift", "hush", "orbit", "pulse"],
    timbres: ["analog", "noir", "dust", "glass"],
    drumKits: ["kit808", "linndrum", "kit909"],
    grooves: ["shuffle", "straight", "broken"],
    hookStyles: ["motif", "glide", "arpeggio", "stabs"]
  },
  sleep: {
    rootMidi: { min: 40, max: 50 },
    tempoScale: { min: 0.82, max: 0.96 },
    drumDensity: { min: 0.2, max: 0.48 },
    hookDensity: { min: 0.22, max: 0.5 },
    brightness: { min: 0.18, max: 0.46 },
    subTrim: { min: 0.75, max: 0.98 },
    swing: { min: 0.08, max: 0.2 },
    riffRegister: { min: 0.95, max: 1.45 },
    scales: ["minor", "dorian", "minorPentatonic", "lydian"],
    progressions: ["drone", "hush", "tide", "orbit"],
    timbres: ["noir", "dust", "analog", "glass"],
    drumKits: ["linndrum", "kit808", "kit909"],
    grooves: ["straight", "shuffle", "broken"],
    hookStyles: ["glide", "motif", "stabs", "arpeggio"]
  }
};

const NAME_BANK: Record<FocusMode, { adjectives: string[]; nouns: string[] }> = {
  focus: {
    adjectives: ["Neon", "Vector", "Pulse", "Circuit", "Prism", "Apex", "Flux", "Chrome"],
    nouns: ["Drive", "Current", "Motion", "Stride", "Signal", "Track", "Grid", "Shift"]
  },
  relax: {
    adjectives: ["Soft", "Glass", "Warm", "Mellow", "Quiet", "Velvet", "Lunar", "Drift"],
    nouns: ["Harbor", "Ripple", "Haze", "Cove", "Lane", "Glow", "Field", "Bloom"]
  },
  sleep: {
    adjectives: ["Midnight", "Deep", "Slow", "Blue", "Silent", "Low", "Distant", "Calm"],
    nouns: ["Tide", "Orbit", "Cloud", "Night", "Echo", "Float", "Blanket", "Current"]
  }
};

const clampRound = (value: number) => Math.round(value * 1000) / 1000;

const inRange = (rng: Mulberry32, range: Range) => clampRound(rng.range(range.min, range.max));

const inIntRange = (rng: Mulberry32, range: IntRange) => Math.round(rng.range(range.min, range.max + 1));

const pickOne = <T>(rng: Mulberry32, values: readonly T[]): T => {
  return values[Math.floor(rng.range(0, values.length))] ?? values[0];
};

const makeName = (mode: FocusMode, rng: Mulberry32) => {
  const bank = NAME_BANK[mode];
  const adjective = bank.adjectives[Math.floor(rng.range(0, bank.adjectives.length))] ?? "Echo";
  const noun = bank.nouns[Math.floor(rng.range(0, bank.nouns.length))] ?? "Flow";

  return `${adjective} ${noun}`;
};

const makeId = (mode: FocusMode, seed: number) => `${mode}-${seed}-${Date.now().toString(36)}`;

const deriveIdentity = (mode: FocusMode, seed: number) => {
  const rng = new Mulberry32(seed ^ 0x5f3759df);
  const bounds = MODE_BOUNDS[mode];

  return {
    rootMidi: inIntRange(rng, bounds.rootMidi),
    scaleFamily: pickOne(rng, bounds.scales),
    progression: pickOne(rng, bounds.progressions),
    timbre: pickOne(rng, bounds.timbres),
    drumKit: pickOne(rng, bounds.drumKits),
    groove: pickOne(rng, bounds.grooves),
    hookStyle: pickOne(rng, bounds.hookStyles)
  };
};

export const createSongPreset = (mode: FocusMode, seed = Date.now(), favorite = false): SongPreset => {
  const rng = new Mulberry32(seed);
  const bounds = MODE_BOUNDS[mode];
  const identity = deriveIdentity(mode, seed);

  return {
    id: makeId(mode, seed),
    mode,
    name: makeName(mode, rng),
    seed,
    rootMidi: identity.rootMidi,
    scaleFamily: identity.scaleFamily,
    progression: identity.progression,
    timbre: identity.timbre,
    drumKit: identity.drumKit,
    groove: identity.groove,
    hookStyle: identity.hookStyle,
    tempoScale: inRange(rng, bounds.tempoScale),
    drumDensity: inRange(rng, bounds.drumDensity),
    hookDensity: inRange(rng, bounds.hookDensity),
    brightness: inRange(rng, bounds.brightness),
    subTrim: inRange(rng, bounds.subTrim),
    swing: inRange(rng, bounds.swing),
    riffRegister: inRange(rng, bounds.riffRegister),
    favorite,
    createdAt: Date.now()
  };
};

export const cloneSongForFavorite = (song: SongPreset, favorite: boolean): SongPreset => ({
  ...song,
  favorite
});

export const sanitizeSongPreset = (input: Partial<SongPreset>): SongPreset | null => {
  if (
    !input ||
    typeof input.id !== "string" ||
    (input.mode !== "focus" && input.mode !== "relax" && input.mode !== "sleep") ||
    typeof input.name !== "string" ||
    typeof input.seed !== "number"
  ) {
    return null;
  }

  const mode = input.mode;
  const bounds = MODE_BOUNDS[mode];
  const identity = deriveIdentity(mode, input.seed);

  const clamp = (v: number, range: Range) => clampRound(Math.max(range.min, Math.min(range.max, v)));
  const clampInt = (v: number, range: IntRange) => Math.round(Math.max(range.min, Math.min(range.max, v)));

  const inValues = <T>(value: unknown, values: readonly T[], fallback: T): T => {
    return values.includes(value as T) ? (value as T) : fallback;
  };

  return {
    id: input.id,
    mode,
    name: input.name,
    seed: input.seed,
    rootMidi: clampInt(typeof input.rootMidi === "number" ? input.rootMidi : identity.rootMidi, bounds.rootMidi),
    scaleFamily: inValues(input.scaleFamily, bounds.scales, identity.scaleFamily),
    progression: inValues(input.progression, bounds.progressions, identity.progression),
    timbre: inValues(input.timbre, bounds.timbres, identity.timbre),
    drumKit: inValues(input.drumKit, bounds.drumKits, identity.drumKit),
    groove: inValues(input.groove, bounds.grooves, identity.groove),
    hookStyle: inValues(input.hookStyle, bounds.hookStyles, identity.hookStyle),
    tempoScale: clamp(typeof input.tempoScale === "number" ? input.tempoScale : bounds.tempoScale.min, bounds.tempoScale),
    drumDensity: clamp(typeof input.drumDensity === "number" ? input.drumDensity : bounds.drumDensity.min, bounds.drumDensity),
    hookDensity: clamp(typeof input.hookDensity === "number" ? input.hookDensity : bounds.hookDensity.min, bounds.hookDensity),
    brightness: clamp(typeof input.brightness === "number" ? input.brightness : bounds.brightness.min, bounds.brightness),
    subTrim: clamp(typeof input.subTrim === "number" ? input.subTrim : bounds.subTrim.min, bounds.subTrim),
    swing: clamp(typeof input.swing === "number" ? input.swing : bounds.swing.min, bounds.swing),
    riffRegister: clamp(typeof input.riffRegister === "number" ? input.riffRegister : bounds.riffRegister.min, bounds.riffRegister),
    favorite: Boolean(input.favorite),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : Date.now()
  };
};
