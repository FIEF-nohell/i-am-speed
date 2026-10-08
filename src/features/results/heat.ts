import { placementOf } from "@/features/keyboard/layout/atQwertz";
import type { KeyStat } from "@/features/engine/metrics";

/** Error intensity (0 to 1) per physical key code, relative to the worst key. */
export function heatByCode(perKey: Record<string, KeyStat>): Record<string, number> {
  const rates = new Map<string, number>();
  for (const [ch, s] of Object.entries(perKey)) {
    const p = placementOf(ch);
    if (!p || s.errors === 0) continue;
    const rate = s.errors / s.attempts;
    rates.set(p.code, Math.max(rates.get(p.code) ?? 0, rate));
  }
  const max = Math.max(0, ...rates.values());
  return Object.fromEntries([...rates].map(([code, r]) => [code, max > 0 ? r / max : 0]));
}
