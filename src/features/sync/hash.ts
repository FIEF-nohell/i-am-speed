import type { Aggregates, ContribId } from "./types";

/** JSON with object keys sorted recursively, so equal data always serialises identically. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    const parts = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const OFFSET = BigInt("0xcbf29ce484222325");
const PRIME = BigInt("0x100000001b3");

/** FNV-1a 64-bit over the canonical JSON, as 16 lowercase hex characters. Not cryptographic. */
export function stableHash(value: unknown): string {
  const text = canonicalJson(value);
  let h = OFFSET;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = BigInt.asUintN(64, h * PRIME);
  }
  return h.toString(16).padStart(16, "0");
}

/** Deterministic id for pre-sync data, so the same legacy data from two devices dedupes. */
export function legacyContribId(a: Aggregates): ContribId {
  const { keys, fingers, days, lessons, totals } = a;
  return `legacy-${stableHash({ keys, fingers, days, lessons, totals })}`;
}
