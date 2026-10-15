import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SOUND_PACKS,
  keyboardSettingFor,
  keyboardVisible,
  sanitiseSettings,
  type Settings,
} from "./settings";

/** The 14 fields that existed before the sound pack, volume and error sound were added. */
const LEGACY: Partial<Settings> = {
  lang: "en",
  onError: "block",
  restartAfter: 5,
  backspace: "full",
  theme: "ember",
  fontSize: "xl",
  caret: "block",
  keyboard: "always",
  colorByFinger: false,
  highlightNext: false,
  fingerHint: false,
  sound: true,
  reduceMotion: true,
  testMode: { kind: "words", value: 50 },
};

describe("sound settings defaults", () => {
  it("defaults to a quiet, off, soft pack at volume 60 with error sounds on", () => {
    expect(DEFAULT_SETTINGS.sound).toBe(false);
    expect(DEFAULT_SETTINGS.soundPack).toBe("soft");
    expect(DEFAULT_SETTINGS.soundVolume).toBe(60);
    expect(DEFAULT_SETTINGS.soundErrors).toBe(true);
  });
  it("lists the four packs and the default is one of them", () => {
    expect(SOUND_PACKS).toEqual(["soft", "clicky", "typewriter", "bubble"]);
    expect(SOUND_PACKS).toContain(DEFAULT_SETTINGS.soundPack);
  });
  it("returns complete defaults for non-object input", () => {
    for (const bad of [null, undefined, 42, "x", [], true]) {
      expect(sanitiseSettings(bad)).toEqual(DEFAULT_SETTINGS);
    }
  });
});

describe("sanitiseSettings: sound fields", () => {
  it("keeps every valid pack", () => {
    for (const soundPack of SOUND_PACKS) {
      expect(sanitiseSettings({ soundPack }).soundPack).toBe(soundPack);
    }
  });
  it("falls back for an unknown or mistyped pack", () => {
    for (const soundPack of ["loud", "", null, 3, {}, "SOFT"]) {
      expect(sanitiseSettings({ soundPack }).soundPack).toBe("soft");
    }
  });
  it("clamps the volume to 0..100 and rounds to an integer", () => {
    expect(sanitiseSettings({ soundVolume: 0 }).soundVolume).toBe(0);
    expect(sanitiseSettings({ soundVolume: 100 }).soundVolume).toBe(100);
    expect(sanitiseSettings({ soundVolume: 250 }).soundVolume).toBe(100);
    expect(sanitiseSettings({ soundVolume: -5 }).soundVolume).toBe(0);
    expect(sanitiseSettings({ soundVolume: 41.4 }).soundVolume).toBe(41);
    expect(sanitiseSettings({ soundVolume: 41.6 }).soundVolume).toBe(42);
    expect(sanitiseSettings({ soundVolume: Infinity }).soundVolume).toBe(60);
  });
  it("falls back to the default volume for non-numbers and NaN", () => {
    for (const soundVolume of ["80", null, NaN, {}, true]) {
      expect(sanitiseSettings({ soundVolume }).soundVolume).toBe(60);
    }
  });
  it("accepts booleans for soundErrors and falls back otherwise", () => {
    expect(sanitiseSettings({ soundErrors: false }).soundErrors).toBe(false);
    expect(sanitiseSettings({ soundErrors: true }).soundErrors).toBe(true);
    expect(sanitiseSettings({ soundErrors: "no" }).soundErrors).toBe(true);
    expect(sanitiseSettings({ soundErrors: 0 }).soundErrors).toBe(true);
  });
});

describe("sanitiseSettings: existing fields are unchanged", () => {
  it("round trips all 14 legacy fields and fills the new ones with defaults", () => {
    const out = sanitiseSettings(LEGACY);
    expect(out).toEqual({
      ...LEGACY,
      soundPack: "soft",
      soundVolume: 60,
      soundErrors: true,
    });
    expect(Object.keys(LEGACY)).toHaveLength(14);
  });
  it("has exactly 17 fields, well under the Firestore settings cap of 40", () => {
    expect(Object.keys(DEFAULT_SETTINGS)).toHaveLength(17);
  });
  it("still repairs legacy fields independently of the new ones", () => {
    const out = sanitiseSettings({ theme: "neon", restartAfter: 99, soundVolume: 10 });
    expect(out.theme).toBe("dark");
    expect(out.restartAfter).toBe(10);
    expect(out.soundVolume).toBe(10);
  });
});

describe("keyboard toggle", () => {
  it("shows the real state and stores an override only where it differs from the phase default", () => {
    const auto = { ...DEFAULT_SETTINGS, keyboard: "phases1to8" as const };
    expect(keyboardVisible(auto, 3)).toBe(true);
    expect(keyboardVisible(auto, 12)).toBe(false);
    expect(keyboardSettingFor(true, 12)).toBe("always");
    expect(keyboardSettingFor(false, 12)).toBe("phases1to8");
    expect(keyboardSettingFor(false, 3)).toBe("never");
    expect(keyboardSettingFor(true, 3)).toBe("phases1to8");
  });
});
