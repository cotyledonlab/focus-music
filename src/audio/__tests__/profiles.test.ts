import { describe, expect, it } from "vitest";

import { createSongPreset, getSongBounds } from "../song";
import {
  PROFILE_KEYS,
  getInstrumentationProfile,
  getMixProfile,
  getNativeDrumKitProfile,
  getNativeTimbreProfile,
  getWebDrumKitProfile,
  getWebTimbreProfile
} from "../profiles";

describe("audio profiles", () => {
  it("has complete web/native profile coverage for every timbre and drum kit", () => {
    PROFILE_KEYS.timbres.forEach((timbre) => {
      expect(getWebTimbreProfile(timbre)).toBeDefined();
      expect(getNativeTimbreProfile(timbre)).toBeDefined();
    });

    PROFILE_KEYS.drumKits.forEach((kit) => {
      expect(getWebDrumKitProfile(kit)).toBeDefined();
      expect(getNativeDrumKitProfile(kit)).toBeDefined();
    });
  });

  it("keeps mode bounds aligned with supported profile keys", () => {
    ["focus", "relax", "sleep"].forEach((mode) => {
      const bounds = getSongBounds(mode as "focus" | "relax" | "sleep");

      bounds.timbres.forEach((timbre) => {
        expect(PROFILE_KEYS.timbres).toContain(timbre);
      });

      bounds.drumKits.forEach((kit) => {
        expect(PROFILE_KEYS.drumKits).toContain(kit);
      });

      bounds.instrumentations.forEach((instrumentation) => {
        expect(PROFILE_KEYS.instrumentations).toContain(instrumentation);
      });
    });
  });

  it("creates deterministic mix profiles with sane bounds", () => {
    const song = createSongPreset("focus", 999999);
    const a = getMixProfile(song);
    const b = getMixProfile(song);

    expect(a).toEqual(b);
    expect(a.reverbBedSend).toBeGreaterThan(0.1);
    expect(a.reverbBedSend).toBeLessThan(0.4);
    expect(a.reverbDrumSend).toBeGreaterThan(0.03);
    expect(a.reverbDrumSend).toBeLessThan(0.2);
    expect(a.echoSend).toBeGreaterThan(0.05);
    expect(a.echoSend).toBeLessThan(0.25);
    expect(a.echoFeedback).toBeGreaterThan(0.17);
    expect(a.echoFeedback).toBeLessThan(0.55);
    expect(a.stereoWidth).toBeGreaterThan(0.7);
    expect(a.stereoWidth).toBeLessThan(1.05);
    expect(a.glueAmount).toBeGreaterThan(0.1);
    expect(a.glueAmount).toBeLessThan(0.45);
    expect(a.masterDrive).toBeGreaterThan(0.9);
    expect(a.masterDrive).toBeLessThan(1.2);
    expect(a.compThreshold).toBeGreaterThan(0.3);
    expect(a.compThreshold).toBeLessThan(0.5);
    expect(a.compRatio).toBeGreaterThan(1.9);
    expect(a.compRatio).toBeLessThan(4.3);
  });

  it("creates deterministic instrumentation profiles", () => {
    const song = createSongPreset("relax", 121212);
    const a = getInstrumentationProfile(song);
    const b = getInstrumentationProfile(song);

    expect(a).toEqual(b);
    expect(a.padVoices).toBeGreaterThanOrEqual(1);
    expect(a.padVoices).toBeLessThanOrEqual(3);
    expect(a.carrierLevel).toBeGreaterThan(0.06);
    expect(a.carrierLevel).toBeLessThan(0.2);
    expect(a.bedLevel).toBeGreaterThan(0.65);
    expect(a.bedLevel).toBeLessThan(1.3);
    expect(a.drumLevel).toBeGreaterThan(0.5);
    expect(a.drumLevel).toBeLessThan(1.35);
  });
});
