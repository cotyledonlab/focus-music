import type { FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";
import type { SongGroove, SongHookStyle, SongInstrumentation, SongPreset, SongScaleFamily } from "./song";

export type SongComposition = {
  seed: number;
  chordRatioSeq: number[];
  padRatioSeqs: number[][];
  bassRatioSeq: number[];
  pulseGateSeq: number[];
  pulseRatioSeq: number[];
  pulseAccentSeq: number[];
  drumRate: number;
  pulseRate: number;
  kickSeq: number[];
  snareSeq: number[];
  hatSeq: number[];
  openHatSeq: number[];
  clapSeq: number[];
  rimSeq: number[];
  riffRatioSeq: number[];
  riffGateSeq: number[];
  riffAccentSeq: number[];
  riffRate: number;
  arrangementRate: number;
  sceneBedSeq: number[];
  sceneBassSeq: number[];
  scenePulseSeq: number[];
  sceneRiffSeq: number[];
  sceneDrumSeq: number[];
  sceneAirSeq: number[];
  sceneShimmerSeq: number[];
  sceneWidthSeq: number[];
  formStateSeq: number[];
  formBedSeq: number[];
  formPulseSeq: number[];
  formHookSeq: number[];
  formDrumSeq: number[];
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

const rotatePattern = (seq: number[], offset: number) => {
  const n = seq.length;
  if (!n) {
    return seq;
  }

  const shift = mod(offset, n);
  return [...seq.slice(n - shift), ...seq.slice(0, n - shift)];
};

const euclideanPattern = (steps: number, pulses: number, rotation = 0) => {
  const pattern: number[] = [];
  let bucket = 0;

  for (let i = 0; i < steps; i += 1) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(1);
    } else {
      pattern.push(0);
    }
  }

  return rotatePattern(pattern, rotation);
};

const withAnchors = (seq: number[], anchors: number[]) => {
  const next = [...seq];
  anchors.forEach((index) => {
    next[mod(index, next.length)] = 1;
  });
  return next;
};

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export const SCALE_INTERVALS: Record<SongScaleFamily, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9]
};

export const PROGRESSION_LIBRARY = {
  driver: [0, 5, 3, 6],
  lift: [0, 2, 5, 4],
  descent: [5, 4, 3, 0],
  orbit: [0, 0, 3, 0],
  tide: [0, 4, 5, 4],
  hush: [0, 3, 4, 3],
  pulse: [0, 1, 0, 4],
  drone: [0, 0, 5, 0]
} as const;

export const HOOK_LIBRARY: Record<SongHookStyle, Array<number | null>> = {
  arpeggio: [0, 2, 4, 2, 0, 2, 5, 2, 0, 2, 4, 2, 0, 2, 6, 4],
  stabs: [0, null, 4, null, 2, null, 5, null, 0, null, 4, null, 2, null, 6, null],
  motif: [0, 1, 2, 4, 5, 4, 2, 1, 0, 1, 2, 4, 5, 2, 1, 0],
  glide: [0, 2, 3, 5, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 2, 0]
};

export const GROOVE_PULSE: Record<SongGroove, number[]> = {
  straight: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  shuffle: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
  broken: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1]
};

export const DRUM_BPM_BY_MODE: Record<FocusMode, number> = {
  focus: 122,
  relax: 98,
  sleep: 76
};

type ArrangementScene = {
  bed: number;
  bass: number;
  pulse: number;
  riff: number;
  drums: number;
  air: number;
  shimmer: number;
  width: number;
};

type FormState = "intro" | "build" | "drop" | "break" | "outro";
type FormMix = {
  bed: number;
  pulse: number;
  hook: number;
  drums: number;
  gate: number;
  accent: number;
};

const ARRANGEMENT_LIBRARY: Record<SongInstrumentation, ArrangementScene[]> = {
  band: [
    { bed: 1.05, bass: 0.95, pulse: 0.72, riff: 0.7, drums: 0.65, air: 0.9, shimmer: 0.8, width: 0.94 },
    { bed: 0.96, bass: 1.08, pulse: 1.02, riff: 0.94, drums: 1.03, air: 0.74, shimmer: 0.74, width: 1.04 },
    { bed: 0.88, bass: 1.02, pulse: 0.92, riff: 1.2, drums: 0.92, air: 0.72, shimmer: 0.9, width: 1.08 },
    { bed: 1.12, bass: 0.82, pulse: 0.45, riff: 0.58, drums: 0.34, air: 1.12, shimmer: 1.08, width: 0.82 },
    { bed: 1.0, bass: 0.94, pulse: 0.84, riff: 0.98, drums: 0.78, air: 1.01, shimmer: 1.12, width: 1.16 }
  ],
  pulseLab: [
    { bed: 0.88, bass: 0.9, pulse: 1.1, riff: 0.76, drums: 0.82, air: 0.8, shimmer: 0.96, width: 1.08 },
    { bed: 0.78, bass: 0.96, pulse: 1.22, riff: 0.84, drums: 0.96, air: 0.74, shimmer: 0.86, width: 1.12 },
    { bed: 0.7, bass: 0.86, pulse: 0.92, riff: 1.18, drums: 0.76, air: 0.68, shimmer: 1.02, width: 1.14 },
    { bed: 1.02, bass: 0.74, pulse: 0.52, riff: 0.42, drums: 0.4, air: 1.06, shimmer: 1.14, width: 0.86 },
    { bed: 0.9, bass: 1.04, pulse: 1.12, riff: 0.66, drums: 1.06, air: 0.76, shimmer: 0.72, width: 1.0 }
  ],
  percussionForward: [
    { bed: 0.64, bass: 0.84, pulse: 0.66, riff: 0.26, drums: 1.0, air: 0.62, shimmer: 0.56, width: 0.96 },
    { bed: 0.58, bass: 0.88, pulse: 0.82, riff: 0.16, drums: 1.22, air: 0.54, shimmer: 0.44, width: 1.02 },
    { bed: 0.54, bass: 0.78, pulse: 0.7, riff: 0.3, drums: 1.1, air: 0.58, shimmer: 0.52, width: 0.9 },
    { bed: 0.84, bass: 0.72, pulse: 0.34, riff: 0.12, drums: 0.56, air: 0.86, shimmer: 0.82, width: 0.76 },
    { bed: 0.62, bass: 0.9, pulse: 0.88, riff: 0.22, drums: 1.18, air: 0.52, shimmer: 0.48, width: 1.08 }
  ],
  droneNocturne: [
    { bed: 1.22, bass: 0.82, pulse: 0.32, riff: 0.18, drums: 0.18, air: 1.24, shimmer: 0.86, width: 0.72 },
    { bed: 1.12, bass: 0.76, pulse: 0.26, riff: 0.14, drums: 0.12, air: 1.18, shimmer: 0.96, width: 0.8 },
    { bed: 1.3, bass: 0.9, pulse: 0.44, riff: 0.22, drums: 0.24, air: 1.3, shimmer: 1.16, width: 0.88 },
    { bed: 0.96, bass: 0.68, pulse: 0.18, riff: 0.08, drums: 0.08, air: 1.08, shimmer: 1.06, width: 0.62 },
    { bed: 1.18, bass: 0.78, pulse: 0.28, riff: 0.16, drums: 0.14, air: 1.2, shimmer: 0.9, width: 0.78 }
  ],
  riffMachine: [
    { bed: 0.84, bass: 0.94, pulse: 0.76, riff: 1.06, drums: 0.8, air: 0.72, shimmer: 0.9, width: 1.04 },
    { bed: 0.7, bass: 0.9, pulse: 0.88, riff: 1.28, drums: 0.92, air: 0.62, shimmer: 0.84, width: 1.14 },
    { bed: 0.64, bass: 0.82, pulse: 0.62, riff: 1.36, drums: 0.68, air: 0.58, shimmer: 0.9, width: 1.2 },
    { bed: 0.98, bass: 0.72, pulse: 0.42, riff: 0.58, drums: 0.34, air: 0.92, shimmer: 1.02, width: 0.84 },
    { bed: 0.78, bass: 0.9, pulse: 0.78, riff: 1.14, drums: 1.04, air: 0.66, shimmer: 0.74, width: 1.06 }
  ],
  minimalDub: [
    { bed: 0.96, bass: 1.08, pulse: 0.62, riff: 0.76, drums: 0.62, air: 0.82, shimmer: 0.72, width: 0.96 },
    { bed: 0.84, bass: 1.14, pulse: 0.74, riff: 0.84, drums: 0.78, air: 0.72, shimmer: 0.66, width: 1.02 },
    { bed: 0.76, bass: 1.02, pulse: 0.58, riff: 0.98, drums: 0.54, air: 0.68, shimmer: 0.76, width: 1.08 },
    { bed: 1.08, bass: 0.78, pulse: 0.28, riff: 0.34, drums: 0.22, air: 1.02, shimmer: 0.88, width: 0.78 },
    { bed: 0.88, bass: 0.96, pulse: 0.66, riff: 0.66, drums: 0.88, air: 0.74, shimmer: 0.62, width: 0.92 }
  ]
};

const ARRANGEMENT_SHAPE_BY_MODE: Record<FocusMode, ArrangementScene> = {
  focus: { bed: 1, bass: 1, pulse: 1, riff: 1, drums: 1, air: 0.94, shimmer: 0.94, width: 1 },
  relax: { bed: 1.04, bass: 0.9, pulse: 0.82, riff: 0.84, drums: 0.78, air: 1.02, shimmer: 1.02, width: 0.95 },
  sleep: { bed: 1.08, bass: 0.82, pulse: 0.54, riff: 0.6, drums: 0.42, air: 1.08, shimmer: 1.1, width: 0.88 }
};

const ARRANGEMENT_BLUEPRINT_BY_MODE: Record<FocusMode, number[]> = {
  focus: [0, 1, 2, 1, 3, 2, 4, 1],
  relax: [0, 1, 0, 2, 1, 3, 2, 0],
  sleep: [0, 2, 0, 1, 2, 3, 0, 2]
};

const FORM_SEQUENCE_BY_MODE: Record<FocusMode, FormState[]> = {
  focus: ["intro", "build", "drop", "break", "build", "drop", "outro", "drop"],
  relax: ["intro", "build", "break", "build", "drop", "break", "outro", "build"],
  sleep: ["intro", "build", "break", "build", "break", "build", "outro", "break"]
};

const FORM_MIX: Record<FormState, FormMix> = {
  intro: { bed: 1.08, pulse: 0.72, hook: 0.62, drums: 0.54, gate: 0.46, accent: 0.9 },
  build: { bed: 1, pulse: 0.92, hook: 0.94, drums: 0.9, gate: 0.68, accent: 0.98 },
  drop: { bed: 0.94, pulse: 1.08, hook: 1.14, drums: 1.16, gate: 0.84, accent: 1.08 },
  break: { bed: 1.1, pulse: 0.58, hook: 0.44, drums: 0.34, gate: 0.3, accent: 0.82 },
  outro: { bed: 1.02, pulse: 0.64, hook: 0.58, drums: 0.5, gate: 0.4, accent: 0.86 }
};

const clampRange = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildFormLanes = (mode: FocusMode, rng: Mulberry32) => {
  const base = [...FORM_SEQUENCE_BY_MODE[mode]];
  if (mode !== "sleep" && rng.chance(0.38)) {
    base[5] = "break";
  }
  if (mode === "focus" && rng.chance(0.36)) {
    base[3] = "build";
  }
  if (mode === "relax" && rng.chance(0.42)) {
    base[2] = "intro";
  }

  const formStateSeq = base.map((state) => ["intro", "build", "drop", "break", "outro"].indexOf(state));
  const formBedSeq = base.map((state) => FORM_MIX[state].bed);
  const formPulseSeq = base.map((state) => FORM_MIX[state].pulse);
  const formHookSeq = base.map((state) => FORM_MIX[state].hook);
  const formDrumSeq = base.map((state) => FORM_MIX[state].drums);

  return { formStateSeq, formBedSeq, formPulseSeq, formHookSeq, formDrumSeq, formNames: base };
};

const buildSceneLanes = (mode: FocusMode, instrumentation: SongInstrumentation, rng: Mulberry32) => {
  const pool = ARRANGEMENT_LIBRARY[instrumentation];
  const modeShape = ARRANGEMENT_SHAPE_BY_MODE[mode];
  const blueprint = ARRANGEMENT_BLUEPRINT_BY_MODE[mode];
  const laneCount = 8;

  const sceneBedSeq: number[] = [];
  const sceneBassSeq: number[] = [];
  const scenePulseSeq: number[] = [];
  const sceneRiffSeq: number[] = [];
  const sceneDrumSeq: number[] = [];
  const sceneAirSeq: number[] = [];
  const sceneShimmerSeq: number[] = [];
  const sceneWidthSeq: number[] = [];

  for (let step = 0; step < laneCount; step += 1) {
    const blueprintIndex = blueprint[step % blueprint.length] ?? 0;
    const scene = pool[blueprintIndex % pool.length] ?? pool[0];
    const tightness = step % 2 === 0 ? 0.05 : 0.08;
    const energyLift = step === 1 || step === 5 ? 0.08 : step === 3 ? -0.06 : 0;

    sceneBedSeq.push(clampRange(scene.bed * modeShape.bed + rng.range(-tightness, tightness), 0.3, 1.35));
    sceneBassSeq.push(clampRange(scene.bass * modeShape.bass + rng.range(-tightness, tightness), 0.25, 1.35));
    scenePulseSeq.push(clampRange(scene.pulse * modeShape.pulse + rng.range(-tightness, tightness) + energyLift * 0.4, 0.08, 1.35));
    sceneRiffSeq.push(clampRange(scene.riff * modeShape.riff + rng.range(-tightness, tightness) + energyLift * 0.45, 0, 1.4));
    sceneDrumSeq.push(clampRange(scene.drums * modeShape.drums + rng.range(-tightness, tightness) + energyLift * 0.35, 0.05, 1.35));
    sceneAirSeq.push(clampRange(scene.air * modeShape.air + rng.range(-0.06, 0.06), 0.35, 1.4));
    sceneShimmerSeq.push(clampRange(scene.shimmer * modeShape.shimmer + rng.range(-0.06, 0.06), 0.3, 1.4));
    sceneWidthSeq.push(clampRange(scene.width * modeShape.width + rng.range(-0.05, 0.05), 0.58, 1.24));
  }

  return {
    sceneBedSeq,
    sceneBassSeq,
    scenePulseSeq,
    sceneRiffSeq,
    sceneDrumSeq,
    sceneAirSeq,
    sceneShimmerSeq,
    sceneWidthSeq
  };
};

export const scaleDegreeToRatio = (scale: number[], degree: number) => {
  const index = mod(degree, scale.length);
  const octave = Math.floor((degree - index) / scale.length);
  const semitone = scale[index] + octave * 12;
  return Math.pow(2, semitone / 12);
};

export const isRatioInScaleFamily = (ratio: number, family: SongScaleFamily) => {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return false;
  }

  const intervals = SCALE_INTERVALS[family];
  const semitone = Math.round(Math.log2(ratio) * 12);
  const normalized = mod(semitone, 12);
  return intervals.some((degree) => mod(degree, 12) === normalized);
};

const evolveDegree = (base: number, scaleLength: number, rng: Mulberry32, looseness: number) => {
  if (rng.chance(0.8 - looseness * 0.3)) {
    return mod(base, scaleLength);
  }

  const jumps = [-2, -1, 1, 2, 4];
  const jump = jumps[Math.floor(rng.range(0, jumps.length))] ?? 0;
  return mod(base + jump, scaleLength);
};

const buildMotifTheme = (hookTemplate: Array<number | null>, scaleLength: number, rng: Mulberry32) => {
  const source = hookTemplate.filter((step): step is number => step != null);
  const fallback = [0, 2, 4, 2, 1, 3, 5, 3];
  const theme = Array.from({ length: 8 }, (_, index) => source[index % Math.max(1, source.length)] ?? fallback[index] ?? 0);

  return theme.map((degree, index) => {
    if (index === 0) {
      return degree;
    }

    const move = rng.chance(0.24) ? (rng.chance(0.5) ? 1 : -1) : 0;
    return clampRange(degree + move, -2, scaleLength + 7);
  });
};

const getBarMotif = (theme: number[], formState: FormState, bar: number, rng: Mulberry32) => {
  const segment = (bar % 2) * 4;
  const base = theme.slice(segment, segment + 4);
  const pivot = base[0] ?? 0;

  if (formState === "break") {
    return [pivot, pivot, pivot + 1, pivot];
  }

  if (formState === "intro" || formState === "outro") {
    return [base[0] ?? 0, base[1] ?? 1, base[0] ?? 0, base[2] ?? 2];
  }

  if (formState === "drop") {
    const retro = [...base].reverse();
    const variant = rng.chance(0.5) ? retro : base;
    return variant.map((degree, idx) => degree + (idx === 0 ? 0 : idx === 2 ? 1 : 0));
  }

  if (rng.chance(0.34)) {
    return base.map((degree, idx) => (idx % 2 === 0 ? degree : degree + 1));
  }

  return base;
};

export const describeSongKey = (song: SongPreset) => {
  const names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const note = names[mod(song.rootMidi, 12)] ?? "C";
  return `${note} ${song.scaleFamily}`;
};

export const buildSongComposition = (mode: FocusMode, song: SongPreset, evolveTick: number, pulseBpm: number): SongComposition => {
  const seed = (song.seed ^ ((evolveTick + 1) * 0x9e3779b9)) >>> 0;
  const rng = new Mulberry32(seed);

  const scale = SCALE_INTERVALS[song.scaleFamily];
  const progression = PROGRESSION_LIBRARY[song.progression];
  const formLanes = buildFormLanes(mode, rng);
  const formNames = formLanes.formNames;

  const chordDegrees = Array.from({ length: 8 }, (_, bar) => {
    const base = progression[bar % progression.length] ?? 0;

    if (bar === 7) {
      return 0;
    }

    if (bar >= 4) {
      return evolveDegree(base, scale.length, rng, 0.18 + song.hookDensity * 0.22);
    }

    return mod(base, scale.length);
  });

  const chordRatioSeq = chordDegrees.map((degree) => scaleDegreeToRatio(scale, degree));

  const padRatioSeqs = [0, 1, 2].map((voice) =>
    Array.from({ length: 16 }, (_, step) => {
      const bar = Math.floor(step / 2);
      const chord = chordDegrees[bar % chordDegrees.length] ?? 0;
      const triadOffset = voice === 0 ? 0 : voice === 1 ? 2 : 4;
      const octaveOffset = voice === 2 ? 7 : 0;
      const suspension = voice > 0 && step % 8 === 7 && rng.chance(0.35) ? 1 : 0;
      return scaleDegreeToRatio(scale, chord + triadOffset + octaveOffset + suspension);
    })
  );

  const bassRatioSeq = Array.from({ length: 16 }, (_, step) => {
    const bar = Math.floor(step / 2);
    const chord = chordDegrees[bar % chordDegrees.length] ?? 0;
    const walk = step % 4 === 3 && rng.chance(song.drumDensity * 0.5) ? -1 : 0;
    return scaleDegreeToRatio(scale, chord + walk - scale.length);
  });

  const pulseTemplate = GROOVE_PULSE[song.groove];
  const pulseGateSeq = Array.from({ length: 32 }, (_, step) => {
    const bar = Math.floor(step / 4) % formNames.length;
    const form = FORM_MIX[formNames[bar] ?? "build"];
    const base = pulseTemplate[step % pulseTemplate.length] ?? 0;
    if (step % 8 === 0) {
      return 1;
    }

    if (form.pulse < 0.62 && step % 4 !== 0) {
      return 0;
    }

    const ghostChance = (song.groove === "broken" ? 0.12 : 0.08) * form.pulse;
    if (!base && rng.chance(ghostChance + song.drumDensity * 0.08)) {
      return 1;
    }

    return base;
  });

  const pulseRatioSeq = Array.from({ length: 32 }, (_, step) => {
    const chord = chordDegrees[Math.floor(step / 4) % chordDegrees.length] ?? 0;
    const offsets = [0, 2, 4, 2];
    const offset = offsets[step % offsets.length] ?? 0;
    return scaleDegreeToRatio(scale, chord + offset - scale.length * 2);
  });

  const pulseAccentSeq = Array.from({ length: 32 }, (_, step) => {
    if (step % 8 === 0) {
      return 1;
    }
    if (step % 4 === 0) {
      return 0.82;
    }
    return 0.58 + rng.range(-0.08, 0.09);
  });

  const hookTemplate = HOOK_LIBRARY[song.hookStyle];
  const motifTheme = buildMotifTheme(hookTemplate, scale.length, rng);
  const barMotifs = Array.from({ length: 8 }, (_, bar) => {
    const formState = formNames[bar] ?? "build";
    return getBarMotif(motifTheme, formState, bar, rng);
  });
  const riffRatioSeq: number[] = [];
  const riffGateSeq: number[] = [];
  const riffAccentSeq: number[] = [];

  let previousRatio = scaleDegreeToRatio(scale, 0);
  for (let step = 0; step < 32; step += 1) {
    const bar = Math.floor(step / 4) % 8;
    const formState = formNames[bar] ?? "build";
    const formMix = FORM_MIX[formState];
    const chord = chordDegrees[bar % chordDegrees.length] ?? 0;
    const motifDegree = barMotifs[bar]?.[step % 4] ?? motifTheme[step % motifTheme.length] ?? 0;

    const octaveLift = song.hookStyle === "arpeggio" ? scale.length : song.hookStyle === "glide" ? scale.length - 1 : 0;
    const melodicDegree = chord + motifDegree + octaveLift;
    const ratio = scaleDegreeToRatio(scale, melodicDegree);

    const cadenceBias = step % 4 === 3 ? 0.08 : 0;
    const gateProbability = clampRange(formMix.gate + song.hookDensity * 0.3 + cadenceBias, 0.08, 0.98);
    const forceAnchor = step % 8 === 0 || step % 16 === 12 || (formState !== "break" && step % 4 === 0);
    const gate = forceAnchor || rng.chance(gateProbability) ? 1 : 0;

    riffGateSeq.push(gate);
    riffRatioSeq.push(ratio);
    riffAccentSeq.push(forceAnchor ? 1 * formMix.accent : (0.62 + rng.range(-0.08, 0.14)) * formMix.accent);
    previousRatio = ratio;
  }

  const grooveRotation = song.groove === "straight" ? 0 : song.groove === "shuffle" ? 1 : 3;

  const kickSeq = withAnchors(
    euclideanPattern(16, Math.max(2, Math.round(3 + song.drumDensity * 4)), grooveRotation),
    [0, 8]
  );

  const snareSeq = withAnchors(
    euclideanPattern(16, Math.max(2, Math.round(2 + song.drumDensity * 2)), 4 + grooveRotation),
    [4, 12]
  );

  const hatSeq = euclideanPattern(
    16,
    Math.max(5, Math.round((song.groove === "broken" ? 5 : 6) + song.drumDensity * 8)),
    2 + grooveRotation
  );

  const openHatSeq = euclideanPattern(16, Math.max(1, Math.round(2 + song.drumDensity * 3)), 3 + grooveRotation);

  const clapSeq = withAnchors(
    euclideanPattern(16, Math.max(1, Math.round(1 + song.drumDensity * 3)), 7 + grooveRotation),
    [12]
  );

  const rimSeq = euclideanPattern(16, Math.max(1, Math.round(1 + song.drumDensity * 4)), 6 + grooveRotation);

  const baseBpm = DRUM_BPM_BY_MODE[mode];
  const pulseRate = (pulseBpm / 60) * song.tempoScale;
  const drumRate = (baseBpm / 60) * song.tempoScale * 4;
  const riffRate = (baseBpm / 60) * song.tempoScale * (song.hookStyle === "arpeggio" ? 4 : 2);
  const arrangementRate = drumRate / 32;
  const sceneLanes = buildSceneLanes(mode, song.instrumentation, rng);

  return {
    seed,
    chordRatioSeq,
    padRatioSeqs,
    bassRatioSeq,
    pulseGateSeq,
    pulseRatioSeq,
    pulseAccentSeq,
    drumRate,
    pulseRate,
    kickSeq,
    snareSeq,
    hatSeq,
    openHatSeq,
    clapSeq,
    rimSeq,
    riffRatioSeq,
    riffGateSeq,
    riffAccentSeq,
    riffRate,
    arrangementRate,
    sceneBedSeq: sceneLanes.sceneBedSeq,
    sceneBassSeq: sceneLanes.sceneBassSeq,
    scenePulseSeq: sceneLanes.scenePulseSeq,
    sceneRiffSeq: sceneLanes.sceneRiffSeq,
    sceneDrumSeq: sceneLanes.sceneDrumSeq,
    sceneAirSeq: sceneLanes.sceneAirSeq,
    sceneShimmerSeq: sceneLanes.sceneShimmerSeq,
    sceneWidthSeq: sceneLanes.sceneWidthSeq,
    formStateSeq: formLanes.formStateSeq,
    formBedSeq: formLanes.formBedSeq,
    formPulseSeq: formLanes.formPulseSeq,
    formHookSeq: formLanes.formHookSeq,
    formDrumSeq: formLanes.formDrumSeq
  };
};

export { midiToHz };
