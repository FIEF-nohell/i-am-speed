import type { Rng } from "@/lib/rng";

/**
 * Collects tokens and enforces the lesson's allowed character set, so no generator can leave it.
 * Tokens containing a disallowed character are dropped.
 */
export class TextBuilder {
  private readonly parts: string[] = [];
  private length = 0;
  private readonly allowed: ReadonlySet<string>;

  constructor(
    chars: string,
    private readonly target: number,
  ) {
    this.allowed = new Set(chars);
  }

  get done(): boolean {
    return this.length >= this.target;
  }

  accepts(token: string): boolean {
    if (token.length === 0) return false;
    for (const ch of token) if (!this.allowed.has(ch)) return false;
    return true;
  }

  /** Returns false when the token was rejected or repeats the previous one. */
  push(token: string): boolean {
    if (!this.accepts(token) || this.parts[this.parts.length - 1] === token) return false;
    this.parts.push(token);
    this.length += token.length + 1;
    return true;
  }

  text(): string {
    return this.parts.join(" ").trim();
  }
}

/** Run `next` until the builder is full or the attempt budget is spent (guards empty pools). */
export function fill(builder: TextBuilder, next: () => string | null, maxAttempts = 4000): void {
  for (let i = 0; i < maxAttempts && !builder.done; i++) {
    const token = next();
    if (token) builder.push(token);
  }
}

export const capitalise = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

export const isLettersOnly = (w: string, letters: ReadonlySet<string>): boolean =>
  [...w].every((c) => letters.has(c));

export function digitsToken(rng: Rng, digits: string, min: number, max: number): string {
  const n = min + Math.floor(rng() * (max - min + 1));
  let out = "";
  for (let i = 0; i < n; i++) out += digits[Math.floor(rng() * digits.length)];
  return out;
}
