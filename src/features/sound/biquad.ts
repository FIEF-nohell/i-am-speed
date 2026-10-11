export type FilterKind = "lowpass" | "highpass" | "bandpass";

/** Direct form I biquad (RBJ cookbook). Returns a stateful per-sample processor. */
export function createBiquad(
  kind: FilterKind,
  freq: number,
  q: number,
  sampleRate: number,
): (x: number) => number {
  const f = Math.min(Math.max(freq, 20), sampleRate * 0.45);
  const w0 = (2 * Math.PI * f) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Math.max(q, 0.1));
  let b0: number;
  let b1: number;
  let b2: number;
  if (kind === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  } else if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}
