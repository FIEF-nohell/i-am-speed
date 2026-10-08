import { describe, expect, it } from "vitest";
import { CHAR_MAP, DEAD_CHARS, KEYS, KEY_BY_CODE, fingerOf, isTypeable, placementOf } from "./atQwertz";

const SHIFT_PAIRS: Record<string, string> = {
  "°": "^", "!": "1", '"': "2", "§": "3", $: "4", "%": "5", "&": "6", "/": "7", "(": "8",
  ")": "9", "=": "0", "?": "ß", "*": "+", "'": "#", ">": "<", ";": ",", ":": ".", _: "-",
};
const ALTGR_PAIRS: Record<string, string> = {
  "@": "q", "€": "e", "{": "7", "[": "8", "]": "9", "}": "0", "\\": "ß", "~": "+", "|": "<",
};

describe("atQwertz layout", () => {
  it("has unique physical codes", () => {
    expect(new Set(KEYS.map((k) => k.code)).size).toBe(KEYS.length);
  });

  it("maps every typeable character to exactly one key, modifier and finger", () => {
    const seen = new Map<string, string>();
    for (const key of KEYS) {
      for (const [layer, ch] of [["none", key.base], ["shift", key.shift], ["altgr", key.altgr]] as const) {
        if (!ch || key.dead?.includes(layer)) continue;
        expect(seen.has(ch), `duplicate ${ch}`).toBe(false);
        seen.set(ch, key.code);
        const p = CHAR_MAP.get(ch);
        expect(p?.code).toBe(key.code);
        expect(p?.modifier).toBe(layer);
        expect(p?.finger).toBeTruthy();
      }
    }
  });

  it("puts shifted characters on the expected base key", () => {
    for (const [shifted, base] of Object.entries(SHIFT_PAIRS)) {
      const p = placementOf(shifted);
      expect(p?.modifier, shifted).toBe("shift");
      expect(KEY_BY_CODE.get(p?.code ?? "")?.base, shifted).toBe(base);
    }
  });

  it("puts AltGr characters on the expected key", () => {
    for (const [ch, base] of Object.entries(ALTGR_PAIRS)) {
      const p = placementOf(ch);
      expect(p?.modifier, ch).toBe("altgr");
      expect(p?.modifierCode).toBe("AltRight");
      expect(KEY_BY_CODE.get(p?.code ?? "")?.base, ch).toBe(base);
    }
  });

  it("types all letters, umlauts, sharp s and digits", () => {
    for (const ch of "abcdefghijklmnopqrstuvwxyzäöüßABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789 ") {
      expect(isTypeable(ch), ch).toBe(true);
    }
  });

  it("excludes dead-key characters", () => {
    expect([...DEAD_CHARS].sort()).toEqual(["^", "`", "´"].sort());
    for (const ch of DEAD_CHARS) expect(isTypeable(ch)).toBe(false);
  });

  it("uses the opposite-hand shift", () => {
    expect(placementOf("A")?.modifierCode).toBe("ShiftRight");
    expect(placementOf("J")?.modifierCode).toBe("ShiftLeft");
  });

  it("assigns the documented fingers", () => {
    expect(fingerOf("a")).toBe("leftPinky");
    expect(fingerOf("y")).toBe("leftPinky");
    expect(fingerOf("x")).toBe("leftRing");
    expect(fingerOf("c")).toBe("leftMiddle");
    expect(fingerOf("z")).toBe("rightIndex");
    expect(fingerOf("ö")).toBe("rightPinky");
    expect(fingerOf(" ")).toBe("thumb");
  });

  it("knows its keys by code", () => {
    expect(KEY_BY_CODE.get("KeyY")?.base).toBe("z");
    expect(KEY_BY_CODE.get("KeyZ")?.base).toBe("y");
  });
});
