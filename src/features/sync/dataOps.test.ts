import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/features/engine/metrics";
import { createState, reduce } from "@/features/engine/engine";
import { DEFAULT_ENGINE_CONFIG } from "@/features/engine/types";
import { recordAttempt } from "@/features/storage/record";
import { createEmptyData, type DataEnv } from "@/features/storage/schema";
import { combine } from "./combine";
import { applySettingsPatch, importData, resetData } from "./dataOps";
import { isEmptyContribution } from "./merge";

function env(prefix: string, now = 9000): DataEnv {
  let n = 0;
  return { newId: () => `${prefix}${String(++n).padStart(8, "0")}`, now };
}

function metrics() {
  let s = createState("ab", DEFAULT_ENGINE_CONFIG);
  let t = 0;
  for (const ch of "ab") {
    t += 100;
    s = reduce(s, { kind: "char", char: ch, t, modifier: "none" });
  }
  return computeMetrics(s);
}

const v1File = {
  version: 1,
  settings: { theme: "ember" },
  attempts: [
    { id: "100-0", at: 100, source: "home-01", lang: "de", netWpm: 20, accuracy: 96, passed: true },
  ],
  keys: { a: { attempts: 4, errors: 0, totalMs: 40, timedHits: 4 } },
  totals: { attempts: 4, timeMs: 400, chars: 40 },
};

describe("applySettingsPatch", () => {
  it("merges the patch and stamps a strictly increasing time", () => {
    const d = createEmptyData(env("aaaa"));
    const a = applySettingsPatch(d, { theme: "light" }, 500);
    expect(a.settings.theme).toBe("light");
    expect(a.settings.lang).toBe(d.settings.lang);
    expect(a.settingsUpdatedAt).toBe(500);
    const b = applySettingsPatch(a, { sound: true }, 500);
    expect(b.settingsUpdatedAt).toBe(501);
    expect(applySettingsPatch(b, { sound: false }, 100).settingsUpdatedAt).toBe(502);
    expect(d.settings.theme).not.toBe("light");
  });
});

describe("importData", () => {
  it("importing the same v1 export twice yields the same contribution set", () => {
    const base = createEmptyData(env("aaaa"));
    const once = importData(base, v1File, env("bbbb"));
    const twice = importData(once, JSON.parse(JSON.stringify(v1File)), env("cccc"));
    const nonEmpty = (d: typeof once) =>
      Object.values(d.sync.contribs)
        .filter((c) => !isEmptyContribution(c))
        .map((c) => c.id)
        .sort();
    expect(nonEmpty(once)).toEqual(nonEmpty(twice));
    expect(nonEmpty(once)).toHaveLength(1);
    expect(once.totals).toEqual(twice.totals);
    expect(once.totals.attempts).toBe(4);
    expect(once.settings.theme).toBe("ember");
  });

  it("makes a v2 export read-only and gives the importing device a fresh own contribution", () => {
    let src = createEmptyData(env("srcs"));
    src = recordAttempt(src, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metrics(),
      at: 50,
    });
    const file = JSON.parse(JSON.stringify(src));
    const target = createEmptyData(env("tgts"));
    const d = importData(target, file, env("newn"));
    expect(d.sync.ownId).not.toBe(src.sync.ownId);
    expect(d.sync.ownId).not.toBe(target.sync.ownId);
    expect(d.sync.contribs[src.sync.ownId].rev).toBe(1);
    expect(isEmptyContribution(d.sync.contribs[d.sync.ownId])).toBe(true);
    expect(d.totals).toEqual(src.totals);
    expect(d.totals).toEqual(combine(d.sync.contribs).totals);
    // New work goes to the new own contribution and never touches the imported one.
    const next = recordAttempt(d, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metrics(),
      at: 60,
    });
    expect(next.sync.contribs[src.sync.ownId].rev).toBe(1);
    expect(next.sync.contribs[d.sync.ownId].rev).toBe(1);
    expect(next.totals.attempts).toBe(2);
  });

  it("keeps the account link, marks everything unsynced and bumps the settings stamp", () => {
    const base = createEmptyData(env("aaaa"));
    const linked = {
      ...base,
      settingsUpdatedAt: 300,
      sync: { ...base.sync, linkedUid: "u1", pushedRevs: { x1234567: 3 }, pushedSettingsAt: 300 },
    };
    const d = importData(linked, v1File, env("bbbb", 100));
    expect(d.sync.linkedUid).toBe("u1");
    expect(d.sync.pushedRevs).toEqual({});
    expect(d.sync.pushedSettingsAt).toBe(-1);
    expect(d.sync.unsyncedAttemptIds).toEqual(["100-0"]);
    expect(d.settingsUpdatedAt).toBe(301);
    expect(d.lastResult).toBeNull();
  });

  it("survives garbage", () => {
    const d = importData(createEmptyData(env("aaaa")), 42, env("bbbb"));
    expect(d.totals.attempts).toBe(0);
    expect(d.sync.contribs[d.sync.ownId]).toBeDefined();
  });
});

describe("resetData", () => {
  it("is empty, unlinked and has a fresh own id", () => {
    const d = resetData(env("zzzz"));
    expect(d.attempts).toEqual([]);
    expect(d.sync.linkedUid).toBeNull();
    expect(d.sync.ownId).toBe("zzzz00000001");
    expect(d.totals.attempts).toBe(0);
  });
});
