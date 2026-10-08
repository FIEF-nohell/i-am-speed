import { int, pick, type Rng } from "@/lib/rng";
import { digitsToken } from "./builder";

/** Builds code-, email- and prose-like tokens that exercise one symbol each. */
export interface TemplateContext {
  rng: Rng;
  /** A short lowercase letters-only word. */
  word: () => string;
}

const TLDS = ["com", "de", "at", "org", "net"];

type Template = (c: TemplateContext) => string;

const num = (c: TemplateContext, min = 1, max = 3): string =>
  digitsToken(c.rng, "0123456789", min, max);

export const SYMBOL_TEMPLATES: Record<string, Template[]> = {
  ";": [(c) => `${c.word()}; ${c.word()}`],
  ":": [(c) => `${c.word()}: ${c.word()}`, (c) => `${num(c, 1, 2)}:${num(c, 2, 2)}`],
  _: [(c) => `${c.word()}_${c.word()}`],
  "?": [(c) => `${c.word()} ${c.word()}?`],
  "!": [(c) => `${c.word()}!`, (c) => `${c.word()} ${c.word()}!`],
  '"': [(c) => `"${c.word()}"`],
  "'": [(c) => `'${c.word()}'`],
  "(": [(c) => `(${c.word()})`, (c) => `${c.word()} (${num(c)})`],
  ")": [(c) => `(${c.word()})`],
  "/": [(c) => `${c.word()}/${c.word()}`, (c) => `${num(c, 1, 2)}/${num(c, 1, 2)}`],
  "%": [(c) => `${num(c, 1, 2)}%`],
  "&": [(c) => `${c.word()} & ${c.word()}`],
  "§": [(c) => `§ ${num(c)}`],
  $: [(c) => `$${num(c)}`],
  "=": [(c) => `${num(c, 1, 2)} = ${num(c, 1, 2)}`, (c) => `${c.word()} = ${num(c, 1, 2)}`],
  "*": [(c) => `${num(c, 1, 2)} * ${num(c, 1, 2)}`],
  "#": [(c) => `#${num(c)}`, (c) => `#${c.word()}`],
  "@": [(c) => `${c.word()}@${c.word()}.${pick(c.rng, TLDS)}`],
  "€": [(c) => `${num(c)} €`, (c) => `${num(c)},${num(c, 2, 2)} €`],
  "[": [(c) => `${c.word()}[${num(c, 1, 2)}]`],
  "]": [(c) => `${c.word()}[${num(c, 1, 2)}]`],
  "{": [(c) => `{ ${c.word()}: ${num(c, 1, 2)} }`, (c) => `${c.word()} {}`],
  "}": [(c) => `{ ${c.word()}: ${num(c, 1, 2)} }`],
  "\\": [(c) => `c:\\${c.word()}\\${c.word()}`],
  "|": [(c) => `${c.word()} | ${c.word()}`],
  "~": [(c) => `~/${c.word()}/${c.word()}`],
};

export function symbolToken(c: TemplateContext, symbols: string): string {
  const sym = pick(c.rng, [...symbols]);
  const templates = SYMBOL_TEMPLATES[sym];
  return templates ? pick(c.rng, templates)(c) : c.word();
}

export function dateToken(rng: Rng): string {
  const d = String(int(rng, 1, 28)).padStart(2, "0");
  const m = String(int(rng, 1, 12)).padStart(2, "0");
  const y = String(int(rng, 1990, 2039));
  const h = String(int(rng, 0, 23)).padStart(2, "0");
  const min = String(int(rng, 0, 59)).padStart(2, "0");
  return pick(rng, [
    `${d}.${m}.${y}`,
    `${y}-${m}-${d}`,
    `${h}:${min}`,
    `${d}.${m}.`,
    `${h}:${min}:${min}`,
  ]);
}
