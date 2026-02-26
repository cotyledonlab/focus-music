import { describe, expect, it } from "vitest";

import { MODE_CONFIGS, type FocusMode } from "../../constants/modes";
import {
  PROGRESSION_LIBRARY,
  SCALE_INTERVALS,
  buildSongComposition,
  isRatioInScaleFamily,
  scaleDegreeToRatio
} from "../composition";
import { createSongPreset } from "../song";

const mod = (n: number, m: number) => ((n % m) + m) % m;

const assertRatioArrayInScale = (values: number[], mode: FocusMode, seed: number) => {
  const song = createSongPreset(mode, seed);
  values.forEach((ratio) => {
    expect(isRatioInScaleFamily(ratio, song.scaleFamily)).toBe(true);
  });
};

describe("buildSongComposition", () => {
  it("is deterministic for the same song + evolve tick", () => {
    const song = createSongPreset("focus", 123456);
    const pulseBpm = MODE_CONFIGS.focus.pulseBpm;

    const first = buildSongComposition("focus", song, 2, pulseBpm);
    const second = buildSongComposition("focus", song, 2, pulseBpm);

    expect(first).toEqual(second);
  });

  it("changes phrase material when evolve tick changes", () => {
    const song = createSongPreset("focus", 123456);
    const pulseBpm = MODE_CONFIGS.focus.pulseBpm;

    const first = buildSongComposition("focus", song, 2, pulseBpm);
    const second = buildSongComposition("focus", song, 3, pulseBpm);

    expect(first.seed).not.toBe(second.seed);
    expect(first.chordRatioSeq).not.toEqual(second.chordRatioSeq);
  });

  it("keeps arrangement anchors and valid sequence lengths", () => {
    const song = createSongPreset("focus", 24680);
    const composition = buildSongComposition("focus", song, 0, MODE_CONFIGS.focus.pulseBpm);

    expect(composition.chordRatioSeq).toHaveLength(8);
    expect(composition.padRatioSeqs).toHaveLength(3);
    composition.padRatioSeqs.forEach((seq) => expect(seq).toHaveLength(16));
    expect(composition.bassRatioSeq).toHaveLength(16);
    expect(composition.pulseGateSeq).toHaveLength(32);
    expect(composition.pulseRatioSeq).toHaveLength(32);
    expect(composition.pulseAccentSeq).toHaveLength(32);
    expect(composition.kickSeq).toHaveLength(16);
    expect(composition.snareSeq).toHaveLength(16);
    expect(composition.hatSeq).toHaveLength(16);
    expect(composition.openHatSeq).toHaveLength(16);
    expect(composition.clapSeq).toHaveLength(16);
    expect(composition.rimSeq).toHaveLength(16);
    expect(composition.riffRatioSeq).toHaveLength(32);
    expect(composition.riffGateSeq).toHaveLength(32);
    expect(composition.riffAccentSeq).toHaveLength(32);
    expect(composition.sceneBedSeq).toHaveLength(8);
    expect(composition.sceneBassSeq).toHaveLength(8);
    expect(composition.scenePulseSeq).toHaveLength(8);
    expect(composition.sceneRiffSeq).toHaveLength(8);
    expect(composition.sceneDrumSeq).toHaveLength(8);
    expect(composition.sceneAirSeq).toHaveLength(8);
    expect(composition.sceneShimmerSeq).toHaveLength(8);
    expect(composition.sceneWidthSeq).toHaveLength(8);

    [0, 8].forEach((index) => expect(composition.kickSeq[index]).toBe(1));
    [4, 12].forEach((index) => expect(composition.snareSeq[index]).toBe(1));
    expect(composition.clapSeq[12]).toBe(1);
    [0, 8, 16, 24, 12, 28].forEach((index) => expect(composition.riffGateSeq[index]).toBe(1));

    for (let i = 0; i < composition.pulseGateSeq.length; i += 8) {
      expect(composition.pulseGateSeq[i]).toBe(1);
    }

    expect(composition.pulseRate).toBeGreaterThan(0);
    expect(composition.drumRate).toBeGreaterThan(0);
    expect(composition.riffRate).toBeGreaterThan(0);
    expect(composition.arrangementRate).toBeGreaterThan(0);

    composition.sceneBedSeq.forEach((value) => expect(value).toBeGreaterThan(0));
    composition.sceneDrumSeq.forEach((value) => expect(value).toBeGreaterThan(0));
    composition.sceneWidthSeq.forEach((value) => expect(value).toBeGreaterThan(0.5));
  });

  it("keeps generated ratios inside the selected scale family", () => {
    const seeds = [11, 22, 33];
    const modes: FocusMode[] = ["focus", "relax", "sleep"];

    modes.forEach((mode) => {
      seeds.forEach((seed) => {
        const song = createSongPreset(mode, seed);
        const composition = buildSongComposition(mode, song, 1, MODE_CONFIGS[mode].pulseBpm);

        assertRatioArrayInScale(composition.chordRatioSeq, mode, seed);
        assertRatioArrayInScale(composition.bassRatioSeq, mode, seed);
        assertRatioArrayInScale(composition.pulseRatioSeq, mode, seed);
        assertRatioArrayInScale(composition.riffRatioSeq, mode, seed);
        composition.padRatioSeqs.forEach((seq) => assertRatioArrayInScale(seq, mode, seed));
      });
    });
  });

  it("matches progression archetype in the first phrase", () => {
    const mode: FocusMode = "focus";
    const song = createSongPreset(mode, 314159);
    const composition = buildSongComposition(mode, song, 0, MODE_CONFIGS[mode].pulseBpm);

    const progression = PROGRESSION_LIBRARY[song.progression];
    const scale = SCALE_INTERVALS[song.scaleFamily];

    for (let bar = 0; bar < 4; bar += 1) {
      const expectedDegree = mod(progression[bar] ?? 0, scale.length);
      const expectedRatio = scaleDegreeToRatio(scale, expectedDegree);
      expect(composition.chordRatioSeq[bar]).toBeCloseTo(expectedRatio, 10);
    }

    // Phrase resolves to root by design.
    expect(composition.chordRatioSeq[7]).toBeCloseTo(1, 10);
  });
});
