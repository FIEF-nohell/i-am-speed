import { isTypeable } from "../../src/features/keyboard/layout/atQwertz";

const REPLACEMENTS: [RegExp, string][] = [
  [/[‘’‚‛′´`]/g, "'"],
  [/[“”„‟«»″]/g, '"'],
  [/[–—―−]/g, "-"],
  [/…/g, "..."],
  [/[   ​]/g, " "],
  [/\s+/g, " "],
];

/** Characters the app can never ask for: dead keys are not typeable, so they fail here too. */
export function isFullyTypeable(text: string): boolean {
  for (const ch of text) if (!isTypeable(ch)) return false;
  return true;
}

/** Curly quotes, dashes and spaces to typeable ASCII. Returns null if anything untypeable remains. */
export function normaliseText(raw: string): string | null {
  let s = raw;
  for (const [re, to] of REPLACEMENTS) s = s.replace(re, to);
  s = s.trim();
  return s.length > 0 && isFullyTypeable(s) ? s : null;
}

const OFFENSIVE = [
  "fuck", "shit", "cunt", "nigg", "fagg", "bitch", "whore", "rape", "slut", "cock", "pussy",
  "nazi", "hitler", "penis", "vagina", "porn", "sex", "dick", "kill", "murder", "suicid",
  "scheiß", "scheiss", "fick", "fotze", "arsch", "hure", "nutte", "schwuchtel", "neger",
  "vergewalt", "schwanz", "titten", "porno", "töte", "mord", "selbstmord", "terror", "bomb",
];

export function isOffensive(text: string): boolean {
  const t = text.toLowerCase();
  return OFFENSIVE.some((w) => t.includes(w));
}

/** Names that dominate Tatoeba and make poor drill words. */
export const BLOCKED_NAMES = new Set(
  (
    "tom mary maria john boston bob alice ken jim paul peter anna lisa mike david tony jack " +
    "sam ann betty susan bill harry sally nancy fred george james tom's mary's toms marias marys " +
    "frankreich japan tokyo australien kanada london paris berlin deutschland amerika " +
    "kafka fuji usa york coca alaska hawaii texas chicago china russland italien spanien england " +
    "europa afrika asien indien mexiko brasilien österreich wien münchen hamburg köln ky cola " +
    "fuji osaka kyoto sydney kalifornien florida ohio nick tim sue jane lucy emily ben dan"
  ).split(" "),
);
