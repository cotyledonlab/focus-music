import { describe, expect, it } from "vitest";

import { getSongBounds } from "../song";
import {
  PROFILE_KEYS,
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
    });
  });
});
