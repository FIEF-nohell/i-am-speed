import { sanitiseSettings } from "@/features/settings/settings";
import { isObj, sanitiseAggregates } from "@/features/storage/sanitise";
import type { Attempt } from "@/features/storage/schema";
import { isContribId } from "./ids";
import type { Aggregates, CloudProfile, Contribution } from "./types";

/** Limits mirrored by firestore.rules. Documents beyond them are treated as garbage. */
const MAX_SETTINGS_FIELDS = 40;
const MAX_KEYS = 300;
const MAX_DAYS = 20000;
const MAX_LESSONS = 500;
const MAX_SOURCE = 64;
const ATTEMPT_ID = /^[A-Za-z0-9_.-]{1,96}$/;
const KEY_PATTERN = /^k[0-9a-f]{1,6}(_[0-9a-f]{1,6})*$/;

/** "k" + the code points in hex joined by "_", so any typed character is a safe Firestore field name. */
export function encodeKey(k: string): string {
  return "k" + Array.from(k, (ch) => (ch.codePointAt(0) ?? 0).toString(16)).join("_");
}

export function decodeKey(s: string): string | null {
  if (!KEY_PATTERN.test(s)) return null;
  let out = "";
  for (const part of s.slice(1).split("_")) {
    const cp = parseInt(part, 16);
    if (cp > 0x10ffff) return null;
    out += String.fromCodePoint(cp);
  }
  return out;
}

const nonNeg = (n: unknown): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
const isNonNegNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

export function profileToDoc(p: CloudProfile, now: number): Record<string, unknown> {
  return {
    schema: 2,
    settings: JSON.parse(JSON.stringify(p.settings)) as Record<string, unknown>,
    settingsUpdatedAt: nonNeg(p.settingsUpdatedAt),
    updatedAt: now,
  };
}

export function docToProfile(raw: unknown): CloudProfile | null {
  if (!isObj(raw) || !isObj(raw.settings)) return null;
  if (Object.keys(raw.settings).length > MAX_SETTINGS_FIELDS) return null;
  if (!isNonNegNumber(raw.settingsUpdatedAt)) return null;
  return { settings: sanitiseSettings(raw.settings), settingsUpdatedAt: raw.settingsUpdatedAt };
}

export function contribToDoc(c: Contribution): Record<string, unknown> {
  const keys: Record<string, unknown> = {};
  for (const [k, s] of Object.entries(c.keys)) {
    if (k.length > 0) keys[encodeKey(k)] = { ...s };
  }
  const fingers: Record<string, unknown> = {};
  for (const [f, s] of Object.entries(c.fingers)) fingers[f] = { ...s };
  const days: Record<string, unknown> = {};
  for (const [d, s] of Object.entries(c.days)) days[d] = { ...s };
  const lessons: Record<string, unknown> = {};
  for (const [id, l] of Object.entries(c.lessons)) lessons[id] = { ...l };
  return {
    id: c.id,
    rev: Math.max(0, Math.floor(c.rev)),
    updatedAt: c.updatedAt,
    keys,
    fingers,
    days,
    lessons,
    totals: {
      attempts: nonNeg(c.totals.attempts),
      timeMs: nonNeg(c.totals.timeMs),
      chars: nonNeg(c.totals.chars),
    },
  };
}

export function docToContrib(id: string, raw: unknown): Contribution | null {
  if (!isContribId(id) || !isObj(raw) || raw.id !== id) return null;
  if (typeof raw.rev !== "number" || !Number.isInteger(raw.rev) || raw.rev < 0) return null;
  if (typeof raw.updatedAt !== "number" || !Number.isFinite(raw.updatedAt)) return null;
  if (!isObj(raw.keys) || !isObj(raw.fingers) || !isObj(raw.days) || !isObj(raw.lessons))
    return null;
  if (!isObj(raw.totals)) return null;
  const t = raw.totals;
  if (!isNonNegNumber(t.attempts) || !isNonNegNumber(t.timeMs) || !isNonNegNumber(t.chars))
    return null;
  if (
    Object.keys(raw.keys).length > MAX_KEYS ||
    Object.keys(raw.days).length > MAX_DAYS ||
    Object.keys(raw.lessons).length > MAX_LESSONS
  )
    return null;

  const keys: Record<string, unknown> = {};
  for (const [enc, v] of Object.entries(raw.keys)) {
    const k = decodeKey(enc);
    if (k !== null && k.length > 0) keys[k] = v;
  }
  const aggs: Aggregates = sanitiseAggregates({ ...raw, keys });
  return { ...aggs, id, rev: raw.rev, updatedAt: raw.updatedAt };
}

export function attemptToDoc(a: Attempt): Record<string, unknown> {
  return {
    id: a.id,
    at: nonNeg(a.at),
    source: a.source.slice(0, MAX_SOURCE),
    lang: a.lang,
    netWpm: nonNeg(a.netWpm),
    rawWpm: nonNeg(a.rawWpm),
    accuracy: Math.min(100, nonNeg(a.accuracy)),
    consistency: nonNeg(a.consistency),
    errors: nonNeg(a.errors),
    durationMs: nonNeg(a.durationMs),
    chars: nonNeg(a.chars),
    passed: a.passed,
  };
}

export function docToAttempt(id: string, raw: unknown): Attempt | null {
  if (!ATTEMPT_ID.test(id) || !isObj(raw) || raw.id !== id) return null;
  if (typeof raw.source !== "string" || raw.source.length > MAX_SOURCE) return null;
  if (raw.lang !== "de" && raw.lang !== "en") return null;
  if (typeof raw.passed !== "boolean") return null;
  const n = {
    at: raw.at,
    netWpm: raw.netWpm,
    rawWpm: raw.rawWpm,
    accuracy: raw.accuracy,
    consistency: raw.consistency,
    errors: raw.errors,
    durationMs: raw.durationMs,
    chars: raw.chars,
  };
  if (!Object.values(n).every(isNonNegNumber)) return null;
  if ((n.accuracy as number) > 100) return null;
  return {
    id,
    at: n.at as number,
    source: raw.source,
    lang: raw.lang,
    netWpm: n.netWpm as number,
    rawWpm: n.rawWpm as number,
    accuracy: n.accuracy as number,
    consistency: n.consistency as number,
    errors: n.errors as number,
    durationMs: n.durationMs as number,
    chars: n.chars as number,
    passed: raw.passed,
  };
}
