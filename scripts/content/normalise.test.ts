import { describe, expect, it } from "vitest";
import { isFullyTypeable, isOffensive, normaliseText } from "./normalise";

describe("normaliseText", () => {
  it("converts curly quotes, dashes, ellipsis and odd spaces", () => {
    expect(normaliseText("„Hallo“ – sagte er…")).toBe('"Hallo" - sagte er...');
    expect(normaliseText("It’s  fine now")).toBe("It's fine now");
  });
  it("rejects untypeable characters", () => {
    expect(normaliseText("café")).toBeNull();
    expect(normaliseText("a ^ b")).toBeNull();
    expect(normaliseText("emoji 😀")).toBeNull();
    expect(normaliseText("   ")).toBeNull();
  });
  it("accepts AltGr and umlaut text", () => {
    expect(normaliseText("a@b.de {x} 5 € Üöß")).not.toBeNull();
    expect(isFullyTypeable("Straße")).toBe(true);
  });
});

describe("isOffensive", () => {
  it("flags blocklisted fragments", () => {
    expect(isOffensive("What the fuck")).toBe(true);
    expect(isOffensive("Das ist Scheiße")).toBe(true);
    expect(isOffensive("A calm morning")).toBe(false);
  });
});
