import { describe, expect, it } from "vitest";

import { type FocusMode } from "../../constants/modes";
import { MODE_BOUNDS, createSongPreset, getSongBounds, sanitizeSongPreset } from "../song";

const assertInRange = (value: number, min: number, max: number) => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

describe("song presets", () => {
  it("generates deterministic musical identity for the same seed", () => {
    const a = createSongPreset("focus", 777777);
    const b = createSongPreset("focus", 777777);

    expect(a.name).toBe(b.name);
    expect(a.rootMidi).toBe(b.rootMidi);
    expect(a.scaleFamily).toBe(b.scaleFamily);
    expect(a.progression).toBe(b.progression);
    expect(a.timbre).toBe(b.timbre);
    expect(a.drumKit).toBe(b.drumKit);
    expect(a.groove).toBe(b.groove);
    expect(a.hookStyle).toBe(b.hookStyle);
    expect(a.instrumentation).toBe(b.instrumentation);
    expect(a.tempoScale).toBe(b.tempoScale);
    expect(a.drumDensity).toBe(b.drumDensity);
    expect(a.hookDensity).toBe(b.hookDensity);
    expect(a.brightness).toBe(b.brightness);
    expect(a.subTrim).toBe(b.subTrim);
    expect(a.swing).toBe(b.swing);
    expect(a.riffRegister).toBe(b.riffRegister);
  });

  it("keeps all generated values inside mode bounds", () => {
    const modes: FocusMode[] = ["focus", "relax", "sleep"];

    modes.forEach((mode) => {
      const bounds = getSongBounds(mode);

      for (let seed = 100; seed < 130; seed += 1) {
        const song = createSongPreset(mode, seed);

        assertInRange(song.rootMidi, bounds.rootMidi.min, bounds.rootMidi.max);
        assertInRange(song.tempoScale, bounds.tempoScale.min, bounds.tempoScale.max);
        assertInRange(song.drumDensity, bounds.drumDensity.min, bounds.drumDensity.max);
        assertInRange(song.hookDensity, bounds.hookDensity.min, bounds.hookDensity.max);
        assertInRange(song.brightness, bounds.brightness.min, bounds.brightness.max);
        assertInRange(song.subTrim, bounds.subTrim.min, bounds.subTrim.max);
        assertInRange(song.swing, bounds.swing.min, bounds.swing.max);
        assertInRange(song.riffRegister, bounds.riffRegister.min, bounds.riffRegister.max);

        expect(bounds.scales).toContain(song.scaleFamily);
        expect(bounds.progressions).toContain(song.progression);
        expect(bounds.timbres).toContain(song.timbre);
        expect(bounds.drumKits).toContain(song.drumKit);
        expect(bounds.grooves).toContain(song.groove);
        expect(bounds.hookStyles).toContain(song.hookStyle);
        expect(bounds.instrumentations).toContain(song.instrumentation);
      }
    });
  });

  it("sanitizes legacy favorites that are missing new schema fields", () => {
    const migrated = sanitizeSongPreset({
      id: "legacy-focus-1",
      mode: "focus",
      name: "Legacy Focus",
      seed: 424242,
      tempoScale: 99,
      drumDensity: -5,
      hookDensity: 0.7,
      brightness: 0.1,
      subTrim: 0.2,
      swing: 1,
      riffRegister: 999,
      favorite: true
    });

    expect(migrated).not.toBeNull();
    if (!migrated) {
      return;
    }

    const bounds = MODE_BOUNDS.focus;
    assertInRange(migrated.rootMidi, bounds.rootMidi.min, bounds.rootMidi.max);
    assertInRange(migrated.tempoScale, bounds.tempoScale.min, bounds.tempoScale.max);
    assertInRange(migrated.drumDensity, bounds.drumDensity.min, bounds.drumDensity.max);
    assertInRange(migrated.hookDensity, bounds.hookDensity.min, bounds.hookDensity.max);
    assertInRange(migrated.brightness, bounds.brightness.min, bounds.brightness.max);
    assertInRange(migrated.subTrim, bounds.subTrim.min, bounds.subTrim.max);
    assertInRange(migrated.swing, bounds.swing.min, bounds.swing.max);
    assertInRange(migrated.riffRegister, bounds.riffRegister.min, bounds.riffRegister.max);

    expect(bounds.scales).toContain(migrated.scaleFamily);
    expect(bounds.progressions).toContain(migrated.progression);
    expect(bounds.timbres).toContain(migrated.timbre);
    expect(bounds.drumKits).toContain(migrated.drumKit);
    expect(bounds.grooves).toContain(migrated.groove);
    expect(bounds.hookStyles).toContain(migrated.hookStyle);
    expect(bounds.instrumentations).toContain(migrated.instrumentation);
  });

  it("rejects invalid presets", () => {
    expect(sanitizeSongPreset({})).toBeNull();
    expect(
      sanitizeSongPreset({
        id: "broken",
        mode: "focus",
        name: "Broken",
        seed: Number.NaN
      })
    ).toBeNull();
  });
});
