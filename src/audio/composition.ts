import type { FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";
import type { SongGroove, SongHookStyle, SongPreset, SongScaleFamily } from "./song";

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
    const base = pulseTemplate[step % pulseTemplate.length] ?? 0;
    if (step % 8 === 0) {
      return 1;
    }

    const ghostChance = song.groove === "broken" ? 0.12 : 0.08;
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
  const riffRatioSeq: number[] = [];
  const riffGateSeq: number[] = [];
  const riffAccentSeq: number[] = [];

  let previousRatio = scaleDegreeToRatio(scale, 0);
  for (let step = 0; step < 32; step += 1) {
    const chord = chordDegrees[Math.floor(step / 4) % chordDegrees.length] ?? 0;
    const motifDegree = hookTemplate[step % hookTemplate.length];

    if (motifDegree == null) {
      riffGateSeq.push(0);
      riffRatioSeq.push(previousRatio);
      riffAccentSeq.push(0.4);
      continue;
    }

    const octaveLift = song.hookStyle === "arpeggio" ? scale.length : song.hookStyle === "glide" ? scale.length - 1 : 0;
    const melodicDegree = chord + motifDegree + octaveLift;
    const ratio = scaleDegreeToRatio(scale, melodicDegree);

    const gateProbability = 0.62 + song.hookDensity * 0.34;
    const forceAnchor = step % 8 === 0 || step % 16 === 12;
    const gate = forceAnchor || rng.chance(gateProbability) ? 1 : 0;

    riffGateSeq.push(gate);
    riffRatioSeq.push(ratio);
    riffAccentSeq.push(forceAnchor ? 1 : 0.65 + rng.range(-0.1, 0.16));
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
    riffRate
  };
};

export { midiToHz };
