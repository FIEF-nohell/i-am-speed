import type { SoundPack } from "@/features/settings/settings";
import type { Recipe } from "./recipe";
import type { KeySoundKind } from "./types";

export type PackRecipes = Record<KeySoundKind, Recipe>;

/** Damped low body plus a short bandpassed noise transient: a padded, quiet keyboard. */
const soft: PackRecipes = {
  key: {
    length: 0.075,
    level: 0.85,
    tone: 5200,
    partials: [
      { freq: 200, decay: 0.022, gain: 1, glide: { ratio: 0.86, time: 0.02 } },
      { freq: 410, decay: 0.011, gain: 0.3 },
    ],
    noise: [{ filter: "bandpass", freq: 1900, q: 1.2, decay: 0.004, gain: 0.7 }],
  },
  space: {
    length: 0.13,
    level: 0.95,
    tone: 4200,
    partials: [
      { freq: 120, decay: 0.045, gain: 1, glide: { ratio: 0.88, time: 0.03 } },
      { freq: 240, decay: 0.022, gain: 0.35 },
    ],
    noise: [{ filter: "bandpass", freq: 1000, q: 1, decay: 0.006, gain: 0.6 }],
  },
  backspace: {
    length: 0.06,
    level: 0.6,
    tone: 4800,
    partials: [{ freq: 240, decay: 0.016, gain: 1, glide: { ratio: 0.9, time: 0.015 } }],
    noise: [{ filter: "bandpass", freq: 1500, q: 1, decay: 0.003, gain: 0.4 }],
  },
  error: {
    length: 0.15,
    level: 0.75,
    tone: 700,
    partials: [
      { freq: 150, decay: 0.05, gain: 1, glide: { ratio: 0.7, time: 0.05 } },
      { freq: 225, decay: 0.03, gain: 0.3, glide: { ratio: 0.7, time: 0.05 } },
    ],
  },
};

/** Bright two-stage click (press and release) over a short body. */
const clicky: PackRecipes = {
  key: {
    length: 0.06,
    level: 1,
    partials: [
      { freq: 330, decay: 0.012, gain: 0.5 },
      { freq: 2300, decay: 0.004, gain: 0.25, delay: 0.001 },
    ],
    noise: [
      { filter: "highpass", freq: 3500, q: 0.8, decay: 0.0015, gain: 1 },
      { filter: "bandpass", freq: 4400, q: 3, decay: 0.002, gain: 0.8, delay: 0.007 },
    ],
  },
  space: {
    length: 0.11,
    level: 0.95,
    partials: [
      { freq: 180, decay: 0.03, gain: 0.9 },
      { freq: 1500, decay: 0.005, gain: 0.2, delay: 0.001 },
    ],
    noise: [
      { filter: "bandpass", freq: 2600, q: 1.5, decay: 0.002, gain: 1 },
      { filter: "bandpass", freq: 3200, q: 3, decay: 0.003, gain: 0.7, delay: 0.012 },
    ],
  },
  backspace: {
    length: 0.05,
    level: 0.75,
    partials: [{ freq: 300, decay: 0.01, gain: 0.5 }],
    noise: [
      { filter: "highpass", freq: 3000, q: 0.8, decay: 0.0012, gain: 0.8 },
      { filter: "bandpass", freq: 3800, q: 3, decay: 0.0015, gain: 0.5, delay: 0.006 },
    ],
  },
  error: {
    length: 0.14,
    level: 0.75,
    tone: 900,
    partials: [{ freq: 170, decay: 0.055, gain: 1, glide: { ratio: 0.75, time: 0.05 } }],
    noise: [{ filter: "lowpass", freq: 600, q: 0.7, decay: 0.01, gain: 0.3 }],
  },
};

/** Noise strike through a bandpass, inharmonic metal partials and a low thud. */
const typewriter: PackRecipes = {
  key: {
    length: 0.1,
    level: 0.9,
    partials: [
      { freq: 95, decay: 0.03, gain: 0.8 },
      { freq: 1870, decay: 0.02, gain: 0.22 },
      { freq: 2960, decay: 0.015, gain: 0.16 },
      { freq: 4310, decay: 0.01, gain: 0.1 },
    ],
    noise: [{ filter: "bandpass", freq: 2400, q: 0.8, decay: 0.006, gain: 1 }],
  },
  space: {
    length: 0.17,
    level: 1,
    partials: [
      { freq: 70, decay: 0.06, gain: 1 },
      { freq: 1250, decay: 0.03, gain: 0.2 },
      { freq: 2100, decay: 0.022, gain: 0.14 },
    ],
    noise: [{ filter: "bandpass", freq: 1500, q: 0.8, decay: 0.01, gain: 0.9 }],
  },
  backspace: {
    length: 0.08,
    level: 0.65,
    partials: [
      { freq: 110, decay: 0.02, gain: 0.7 },
      { freq: 2400, decay: 0.012, gain: 0.14 },
    ],
    noise: [{ filter: "bandpass", freq: 2000, q: 0.8, decay: 0.004, gain: 0.7 }],
  },
  error: {
    length: 0.15,
    level: 0.8,
    tone: 800,
    partials: [{ freq: 105, decay: 0.05, gain: 1, glide: { ratio: 0.8, time: 0.05 } }],
    noise: [{ filter: "lowpass", freq: 500, q: 0.7, decay: 0.012, gain: 0.4 }],
  },
};

/** Sine with a fast upward pitch glide and a soft envelope: a water drop. */
const bubble: PackRecipes = {
  key: {
    length: 0.1,
    level: 0.8,
    partials: [
      { freq: 520, decay: 0.03, gain: 1, glide: { ratio: 1.9, time: 0.018 } },
      { freq: 1040, decay: 0.012, gain: 0.12, glide: { ratio: 1.9, time: 0.018 } },
    ],
  },
  space: {
    length: 0.16,
    level: 0.9,
    partials: [{ freq: 330, decay: 0.05, gain: 1, glide: { ratio: 1.7, time: 0.03 } }],
  },
  backspace: {
    length: 0.07,
    level: 0.55,
    partials: [{ freq: 640, decay: 0.02, gain: 1, glide: { ratio: 1.4, time: 0.012 } }],
  },
  error: {
    length: 0.18,
    level: 0.7,
    tone: 800,
    partials: [{ freq: 300, decay: 0.07, gain: 1, glide: { ratio: 0.6, time: 0.06 } }],
  },
};

export const PACKS: Record<SoundPack, PackRecipes> = { soft, clicky, typewriter, bubble };

export const KEY_SOUND_KINDS: readonly KeySoundKind[] = ["key", "space", "backspace", "error"];
