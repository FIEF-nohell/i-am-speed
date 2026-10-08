import { describe, expect, it } from "vitest";
import {
  acceptSentence,
  buildWordList,
  gutenbergParagraphs,
  rankSentences,
  spread,
  tokenise,
} from "./build";

describe("content build helpers", () => {
  it("tokenises letters and drops contractions", () => {
    expect(tokenise("Don't stop, Straße 5!")).toEqual(["stop", "Straße"]);
  });
  it("builds a ranked canonical word list and drops names and English proper nouns", () => {
    const texts = ["the cat saw the dog", "the cat ran", "Tom saw Berlin", "Berlin Berlin Berlin"];
    expect(buildWordList(texts, "en", 10, 1)).toEqual(["the", "cat", "saw", "dog", "ran"]);
  });
  it("keeps German noun capitalisation", () => {
    const words = buildWordList(["Das Haus ist alt", "Das Haus"], "de", 5, 1);
    expect(words[0]).toBe("Das");
    expect(words).toContain("Haus");
  });
  it("accepts and rejects sentences", () => {
    expect(acceptSentence("This is a perfectly calm sentence.")).not.toBeNull();
    expect(acceptSentence("Too short.")).toBeNull();
    expect(acceptSentence("Tom went to the market on Monday.")).toBeNull();
    expect(acceptSentence("No punctuation at the end of this one")).toBeNull();
  });
  it("ranks easy sentences first", () => {
    const rank = new Map([
      ["the", 0],
      ["cat", 1],
    ]);
    const r = rankSentences(["The cat.", "Zygomatic quarrelsome exigency."], rank, 2);
    expect(r[0]).toBe("The cat.");
  });
  it("strips gutenberg framing and unwraps lines", () => {
    const t =
      "junk\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\nFirst line\nsecond line\n\nNext para\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nlicense";
    expect(gutenbergParagraphs(t)).toEqual(["First line second line", "Next para"]);
  });
  it("spreads picks evenly", () => {
    expect(spread([1, 2, 3, 4, 5, 6], 3)).toEqual([1, 3, 5]);
  });
});

describe("german casing", () => {
  it("lowercases words that are only capitalised at sentence start", () => {
    const texts = [
      "Ich sehe das Haus",
      "Das Haus ist alt",
      "Heute sehe ich das Haus",
      "ich weiß es",
    ];
    const words = buildWordList(texts, "de", 20, 1);
    expect(words).toContain("ich");
    expect(words).toContain("Haus");
    expect(words).not.toContain("Ich");
  });
});
