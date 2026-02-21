import type { FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";

export type SongPreset = {
  id: string;
  mode: FocusMode;
  name: string;
  seed: number;
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

type SongBounds = {
  tempoScale: Range;
  drumDensity: Range;
  hookDensity: Range;
  brightness: Range;
  subTrim: Range;
  swing: Range;
  riffRegister: Range;
};

const MODE_BOUNDS: Record<FocusMode, SongBounds> = {
  focus: {
    tempoScale: { min: 1.0, max: 1.12 },
    drumDensity: { min: 0.65, max: 0.95 },
    hookDensity: { min: 0.55, max: 0.9 },
    brightness: { min: 0.55, max: 0.9 },
    subTrim: { min: 0.5, max: 0.85 },
    swing: { min: 0.02, max: 0.12 },
    riffRegister: { min: 1.5, max: 2.2 }
  },
  relax: {
    tempoScale: { min: 0.9, max: 1.02 },
    drumDensity: { min: 0.45, max: 0.7 },
    hookDensity: { min: 0.35, max: 0.7 },
    brightness: { min: 0.35, max: 0.65 },
    subTrim: { min: 0.58, max: 0.9 },
    swing: { min: 0.05, max: 0.16 },
    riffRegister: { min: 1.2, max: 1.8 }
  },
  sleep: {
    tempoScale: { min: 0.82, max: 0.95 },
    drumDensity: { min: 0.2, max: 0.45 },
    hookDensity: { min: 0.2, max: 0.45 },
    brightness: { min: 0.2, max: 0.45 },
    subTrim: { min: 0.7, max: 0.95 },
    swing: { min: 0.08, max: 0.2 },
    riffRegister: { min: 0.95, max: 1.4 }
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

const makeName = (mode: FocusMode, rng: Mulberry32) => {
  const bank = NAME_BANK[mode];
  const adjective = bank.adjectives[Math.floor(rng.range(0, bank.adjectives.length))] ?? "Echo";
  const noun = bank.nouns[Math.floor(rng.range(0, bank.nouns.length))] ?? "Flow";

  return `${adjective} ${noun}`;
};

const makeId = (mode: FocusMode, seed: number) => `${mode}-${seed}-${Date.now().toString(36)}`;

export const createSongPreset = (mode: FocusMode, seed = Date.now(), favorite = false): SongPreset => {
  const rng = new Mulberry32(seed);
  const bounds = MODE_BOUNDS[mode];

  return {
    id: makeId(mode, seed),
    mode,
    name: makeName(mode, rng),
    seed,
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
  const clamp = (v: number, range: Range) => clampRound(Math.max(range.min, Math.min(range.max, v)));

  return {
    id: input.id,
    mode,
    name: input.name,
    seed: input.seed,
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
