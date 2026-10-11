import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import type { Attempt } from "@/features/storage/schema";
import { emptyAggregates } from "./combine";
import {
  attemptToDoc,
  contribToDoc,
  decodeKey,
  docToAttempt,
  docToContrib,
  docToProfile,
  encodeKey,
  profileToDoc,
} from "./serialize";
import type { Contribution } from "./types";

const ATTEMPT: Attempt = {
  id: "abc123-7",
  at: 1_700_000_000_000,
  source: "home-01",
  lang: "de",
  netWpm: 41.5,
  rawWpm: 44,
  accuracy: 97.25,
  consistency: 80,
  errors: 2,
  durationMs: 31_000,
  chars: 120,
  passed: true,
};

const CONTRIB: Contribution = {
  ...emptyAggregates(),
  id: "Abcdefgh12345678",
  rev: 4,
  updatedAt: 99,
  keys: {
    a: { attempts: 3, errors: 1, totalMs: 300, timedHits: 2 },
    " ": { attempts: 9, errors: 0, totalMs: 10, timedHits: 9 },
    "@": { attempts: 1, errors: 0, totalMs: 1, timedHits: 1 },
    ".": { attempts: 1, errors: 1, totalMs: 0, timedHits: 0 },
    "\\": { attempts: 2, errors: 0, totalMs: 2, timedHits: 2 },
    ß: { attempts: 5, errors: 0, totalMs: 5, timedHits: 5 },
    "😀": { attempts: 1, errors: 0, totalMs: 1, timedHits: 1 },
  },
  fingers: { leftPinky: { attempts: 3, errors: 1 }, thumb: { attempts: 9, errors: 0 } },
  days: { "2026-10-11": { attempts: 3, wpmSum: 120, accuracySum: 290, timeMs: 90_000 } },
  lessons: {
    "home-01": {
      completed: true,
      bestWpm: 40,
      bestAccuracy: 99,
      lastWpm: 38,
      lastAccuracy: 96,
      attempts: 3,
      lastAt: 90,
    },
  },
  totals: { attempts: 3, timeMs: 90_000, chars: 360 },
};

describe("encodeKey / decodeKey", () => {
  it("encodes code points in hex", () => {
    expect(encodeKey(" ")).toBe("k20");
    expect(encodeKey("@")).toBe("k40");
    expect(encodeKey("😀")).toBe("k1f600");
    expect(encodeKey("ab")).toBe("k61_62");
  });
  it("round-trips every character that can be typed", () => {
    for (const k of [" ", ".", "@", "\\", "ß", "ä", "😀", "__x__", "a.b", "~", "\u0000"]) {
      expect(decodeKey(encodeKey(k))).toBe(k);
    }
    for (let cp = 32; cp < 0x250; cp++) {
      const ch = String.fromCodePoint(cp);
      expect(decodeKey(encodeKey(ch))).toBe(ch);
    }
  });
  it("matches the rules key pattern and rejects anything else", () => {
    expect(encodeKey("x")).toMatch(/^k[0-9a-f]{1,6}(_[0-9a-f]{1,6})*$/);
    for (const bad of [
      "",
      "k",
      "a",
      "K20",
      "k20_",
      "k_20",
      "kxyz",
      "k1234567",
      "k110000",
      "k20 ",
    ]) {
      expect(decodeKey(bad)).toBeNull();
    }
  });
});

describe("profile docs", () => {
  it("round-trips and stamps updatedAt", () => {
    const p = {
      settings: { ...DEFAULT_SETTINGS, theme: "dusk" as const },
      settingsUpdatedAt: 123,
    };
    const doc = profileToDoc(p, 456);
    expect(doc.schema).toBe(2);
    expect(doc.updatedAt).toBe(456);
    expect(Object.keys(doc.settings as object).length).toBeLessThanOrEqual(40);
    expect(docToProfile(JSON.parse(JSON.stringify(doc)))).toEqual(p);
  });
  it("round-trips the sound settings", () => {
    const p = {
      settings: {
        ...DEFAULT_SETTINGS,
        sound: true,
        soundPack: "typewriter" as const,
        soundVolume: 35,
        soundErrors: false,
      },
      settingsUpdatedAt: 7,
    };
    const back = docToProfile(JSON.parse(JSON.stringify(profileToDoc(p, 8))));
    expect(back).toEqual(p);
    expect(back?.settings.soundPack).toBe("typewriter");
    expect(back?.settings.soundVolume).toBe(35);
    expect(back?.settings.soundErrors).toBe(false);
  });
  it("gives defaults for the sound fields when a profile comes from an old client", () => {
    const old = { theme: "light", lang: "en", sound: true, reduceMotion: false };
    const p = docToProfile({ settings: old, settingsUpdatedAt: 3 });
    expect(p?.settings.theme).toBe("light");
    expect(p?.settings.sound).toBe(true);
    expect(p?.settings.soundPack).toBe(DEFAULT_SETTINGS.soundPack);
    expect(p?.settings.soundVolume).toBe(DEFAULT_SETTINGS.soundVolume);
    expect(p?.settings.soundErrors).toBe(DEFAULT_SETTINGS.soundErrors);
  });
  it("falls back for invalid sound values coming from the cloud", () => {
    const p = docToProfile({
      settings: { soundPack: "boom", soundVolume: 9000, soundErrors: "yes" },
      settingsUpdatedAt: 1,
    });
    expect(p?.settings.soundPack).toBe("soft");
    expect(p?.settings.soundVolume).toBe(100);
    expect(p?.settings.soundErrors).toBe(true);
  });
  it("keeps the settings field count within the Firestore rule cap", () => {
    const doc = profileToDoc({ settings: DEFAULT_SETTINGS, settingsUpdatedAt: 1 }, 2);
    expect(Object.keys(doc.settings as object).length).toBeLessThanOrEqual(40);
    expect(Object.keys(doc.settings as object)).toHaveLength(17);
  });
  it("sanitises settings and rejects garbage", () => {
    const p = docToProfile({
      settings: { theme: "neon", restartAfter: 999 },
      settingsUpdatedAt: 5,
    });
    expect(p?.settings.theme).toBe("dark");
    expect(p?.settings.restartAfter).toBe(10);
    expect(docToProfile(null)).toBeNull();
    expect(docToProfile("x")).toBeNull();
    expect(docToProfile({ settings: 5, settingsUpdatedAt: 1 })).toBeNull();
    expect(docToProfile({ settings: {}, settingsUpdatedAt: -1 })).toBeNull();
    expect(docToProfile({ settings: {}, settingsUpdatedAt: "1" })).toBeNull();
    expect(docToProfile({ settings: {} })).toBeNull();
    const big = Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`f${i}`, i]));
    expect(docToProfile({ settings: big, settingsUpdatedAt: 1 })).toBeNull();
  });
});

describe("contribution docs", () => {
  it("round-trips with encoded keys", () => {
    const doc = contribToDoc(CONTRIB);
    expect(Object.keys(doc.keys as object).every((k) => /^k[0-9a-f_]+$/.test(k))).toBe(true);
    expect(docToContrib(CONTRIB.id, JSON.parse(JSON.stringify(doc)))).toEqual(CONTRIB);
  });
  it("round-trips an empty contribution", () => {
    const empty: Contribution = { ...emptyAggregates(), id: "Zzzzzzzz9999", rev: 0, updatedAt: 0 };
    expect(docToContrib(empty.id, contribToDoc(empty))).toEqual(empty);
  });
  it("rejects garbage, bad ids, id mismatch, bad numbers and wrong shapes", () => {
    const good = contribToDoc(CONTRIB);
    expect(docToContrib(CONTRIB.id, null)).toBeNull();
    expect(docToContrib(CONTRIB.id, [])).toBeNull();
    expect(docToContrib("short", { ...good, id: "short" })).toBeNull();
    expect(docToContrib("Other12345678", good)).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, rev: -1 })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, rev: 1.5 })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, rev: "4" })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, updatedAt: NaN })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, keys: 5 })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, totals: { attempts: 1 } })).toBeNull();
    expect(
      docToContrib(CONTRIB.id, { ...good, totals: { attempts: -1, timeMs: 0, chars: 0 } }),
    ).toBeNull();
  });
  it("rejects oversize maps and drops undecodable keys and bad values", () => {
    const good = contribToDoc(CONTRIB);
    const stat = { attempts: 1, errors: 0, totalMs: 0, timedHits: 0 };
    const many = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${(i + 1).toString(16)}`, stat]));
    expect(docToContrib(CONTRIB.id, { ...good, keys: many(301) })).toBeNull();
    expect(docToContrib(CONTRIB.id, { ...good, keys: many(300) })).not.toBeNull();
    const lessons = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`l${i}`, {}]));
    expect(docToContrib(CONTRIB.id, { ...good, lessons })).toBeNull();

    const c = docToContrib(CONTRIB.id, {
      ...good,
      keys: { k61: stat, "not a key": stat, k110000: stat, k62: { attempts: "x" }, k63: "bad" },
      fingers: { leftPinky: { attempts: 1, errors: 0 }, sixthFinger: { attempts: 9, errors: 0 } },
    });
    expect(Object.keys(c?.keys ?? {}).sort()).toEqual(["a", "b"]);
    expect(c?.keys.b.attempts).toBe(0);
    expect(Object.keys(c?.fingers ?? {})).toEqual(["leftPinky"]);
  });
});

describe("attempt docs", () => {
  it("round-trips with exactly the twelve rule fields", () => {
    const doc = attemptToDoc(ATTEMPT);
    expect(Object.keys(doc).sort()).toEqual(
      [
        "accuracy",
        "at",
        "chars",
        "consistency",
        "durationMs",
        "errors",
        "id",
        "lang",
        "netWpm",
        "passed",
        "rawWpm",
        "source",
      ].sort(),
    );
    expect(docToAttempt(ATTEMPT.id, JSON.parse(JSON.stringify(doc)))).toEqual(ATTEMPT);
  });
  it("keeps old v1 ids and clamps what the rules would reject", () => {
    expect(
      docToAttempt("1700000000000-5", { ...attemptToDoc({ ...ATTEMPT, id: "1700000000000-5" }) }),
    ).not.toBeNull();
    const doc = attemptToDoc({ ...ATTEMPT, accuracy: 140, netWpm: -3, source: "x".repeat(100) });
    expect(doc.accuracy).toBe(100);
    expect(doc.netWpm).toBe(0);
    expect((doc.source as string).length).toBe(64);
  });
  it("rejects garbage", () => {
    const good = attemptToDoc(ATTEMPT);
    expect(docToAttempt(ATTEMPT.id, null)).toBeNull();
    expect(docToAttempt(ATTEMPT.id, "x")).toBeNull();
    expect(docToAttempt("bad id!", { ...good, id: "bad id!" })).toBeNull();
    expect(docToAttempt("", { ...good, id: "" })).toBeNull();
    expect(docToAttempt("a".repeat(97), { ...good, id: "a".repeat(97) })).toBeNull();
    expect(docToAttempt("other-1", good)).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, lang: "fr" })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, passed: "yes" })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, source: "x".repeat(65) })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, source: 5 })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, accuracy: 100.5 })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, netWpm: -1 })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, errors: "2" })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, at: undefined })).toBeNull();
    expect(docToAttempt(ATTEMPT.id, { ...good, chars: Infinity })).toBeNull();
  });
});
