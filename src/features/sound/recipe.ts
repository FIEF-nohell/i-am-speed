import type { FilterKind } from "./biquad";

/** A damped sine, optionally gliding exponentially toward `freq * ratio`. */
export interface PartialSpec {
  freq: number;
  /** Amplitude decay time constant in seconds. */
  decay: number;
  gain: number;
  /** Onset delay in seconds. */
  delay?: number;
  glide?: { ratio: number; time: number };
}

/** A filtered noise burst (the transient of a key strike). */
export interface NoiseSpec {
  filter: FilterKind;
  freq: number;
  q: number;
  decay: number;
  gain: number;
  /** Onset delay in seconds. */
  delay?: number;
}

export interface Recipe {
  /** Rendered length in seconds (20 to 180 ms). */
  length: number;
  /** Peak scale after normalisation, 0..1. */
  level: number;
  partials: readonly PartialSpec[];
  noise?: readonly NoiseSpec[];
  /** Overall low-pass cutoff in Hz applied to the mix, which darkens the sound. */
  tone?: number;
}
