import { ALL_TYPEABLE, DIGITS, LOWER, UPPER, unique } from "./charsets";
import type { Lesson, LessonSpec, Phase } from "./types";

export const PHASES: readonly Phase[] = [
  { id: 1, slug: "home", title: "home row", description: "One finger and key at a time, starting on f and j." },
  { id: 2, slug: "top", title: "top row", description: "Reach up from the home row and come back." },
  { id: 3, slug: "bottom", title: "bottom row", description: "Reach down, including comma, period and minus." },
  { id: 4, slug: "letters", title: "all letters", description: "Umlauts and the sharp s inside real words." },
  { id: 5, slug: "shift", title: "shift and capitals", description: "The opposite hand presses shift." },
  { id: 6, slug: "numbers", title: "numbers", description: "The number row, one pair of fingers at a time." },
  { id: 7, slug: "punctuation", title: "punctuation", description: "Marks, quotes, brackets and signs." },
  { id: 8, slug: "altgr", title: "altgr symbols", description: "At sign, brackets, braces, backslash, tilde, pipe and euro." },
  { id: 9, slug: "words", title: "words", description: "Common to rare words, in three variants." },
  { id: 10, slug: "sentences", title: "sentences", description: "Whole sentences, easy to harder." },
  { id: 11, slug: "paragraphs", title: "paragraphs", description: "Longer passages with everything mixed." },
];

interface Step {
  title: string;
  description: string;
  newChars: string;
  length: number;
  spec: LessonSpec;
  /** Set explicitly when the set is not simply the cumulative unlocked set. */
  chars?: string;
}

function build(phase: number, slug: string, steps: Step[], baseChars: string, cumulative: boolean): Lesson[] {
  let unlocked = baseChars;
  return steps.map((s, i) => {
    if (cumulative) unlocked = unique(unlocked + s.newChars);
    return {
      id: `${slug}-${String(i + 1).padStart(2, "0")}`,
      phase,
      title: s.title,
      description: s.description,
      chars: s.chars ?? unlocked,
      newChars: s.newChars,
      lengthTarget: s.length,
      spec: s.spec,
    };
  });
}

const drill = (title: string, newChars: string, description: string, length = 100): Step => ({
  title,
  description,
  newChars,
  length,
  spec: { type: "drill", newChars },
});

// Letters unlocked so far are carried between phases 1 to 4 by building them in one ladder.
const LADDER: { phase: number; slug: string; steps: Step[] }[] = [
  {
    phase: 1,
    slug: "home",
    steps: [
      drill("f and j", "fj", "Index fingers on the bumps. Press f with the left, j with the right.", 80),
      drill("d and k", "dk", "Middle fingers join in.", 90),
      drill("s and l", "sl", "Ring fingers.", 90),
      drill("a and ö", "aö", "Pinkies. Keep the other fingers resting on f and j.", 90),
      drill("g and h", "gh", "Index fingers stretch one key inward.", 100),
      drill("ä", "ä", "The last home-row key, right pinky.", 100),
      drill("home row mix", "", "All eleven home-row keys together.", 110),
    ],
  },
  {
    phase: 2,
    slug: "top",
    steps: [
      drill("r and u", "ru", "Index fingers reach up.", 100),
      drill("e and i", "ei", "Middle fingers reach up.", 100),
      drill("w and o", "wo", "Ring fingers reach up.", 100),
      drill("q and p", "qp", "Pinkies reach up.", 100),
      drill("t and z", "tz", "Index fingers stretch up and inward. Note z sits where y is on a US keyboard.", 100),
      drill("ü", "ü", "Right pinky, one past p.", 100),
      drill("top row mix", "", "Everything from the top two rows.", 120),
    ],
  },
  {
    phase: 3,
    slug: "bottom",
    steps: [
      drill("v and m", "vm", "Index fingers reach down.", 100),
      drill("c and comma", "c,", "Middle fingers reach down. Commas follow words.", 100),
      drill("x and period", "x.", "Ring fingers reach down. Periods end words.", 100),
      drill("y and minus", "y-", "Left pinky for y, right pinky for the minus key.", 100),
      drill("b and n", "bn", "Index fingers stretch down and inward.", 100),
      drill("bottom row mix", "", "Every letter key, plus comma, period and minus.", 130),
    ],
  },
  {
    phase: 4,
    slug: "letters",
    steps: [
      drill("ä in words", "ä", "Real words with ä.", 110),
      drill("ö in words", "ö", "Real words with ö.", 110),
      drill("ü in words", "ü", "Real words with ü.", 110),
      drill("ß in words", "ß", "The sharp s sits next to 0, right pinky.", 110),
      drill("all letters", "", "The whole alphabet with umlauts.", 140),
    ],
  },
];

const letterLessons = (() => {
  let unlocked = " ";
  const out: Lesson[] = [];
  for (const group of LADDER) {
    const lessons = build(group.phase, group.slug, group.steps, unlocked, true);
    unlocked = lessons[lessons.length - 1].chars;
    out.push(...lessons);
  }
  return out;
})();

const LETTERS_AND_SPACE = LOWER + " ";
const caps = (mode: Extract<LessonSpec, { type: "caps" }>["mode"]): LessonSpec => ({ type: "caps", mode });
const symbols = (s: string): LessonSpec => ({ type: "symbols", symbols: s });
const WORD_SYMBOL_BASE = LOWER + " ";
const sym = (title: string, newChars: string, description: string, extra = ""): Step => ({
  title,
  description,
  newChars,
  length: 110,
  spec: symbols(newChars),
  chars: unique(WORD_SYMBOL_BASE + DIGITS + ".,-" + newChars + extra),
});

const shiftLessons = build(5, "shift", [
  { title: "left shift", description: "Capitals on the right hand: press left shift with the left pinky.", newChars: "", length: 110, spec: caps("rightHand") },
  { title: "right shift", description: "Capitals on the left hand: press right shift with the right pinky.", newChars: "", length: 110, spec: caps("leftHand") },
  { title: "capitalised words", description: "Both shifts, one capital per word.", newChars: "", length: 120, spec: caps("mixed") },
  { title: "title case", description: "Every word starts with a capital.", newChars: "", length: 120, spec: caps("both") },
  { title: "capitals in sentences", description: "Sentence starts and, in German, every noun.", newChars: "", length: 160, spec: caps("sentences"), chars: ALL_TYPEABLE },
].map((s) => ({ ...s, chars: s.chars ?? unique(LOWER + UPPER + " ") })), "", false);

const numberStep = (title: string, digits: string, description: string): Step => ({
  title,
  description,
  newChars: digits,
  length: 90,
  spec: { type: "digits" },
  chars: unique(digits + " "),
});

const numberLessons = build(6, "numbers", [
  numberStep("4 and 5", "45", "Left index finger reaches up."),
  numberStep("6 and 7", "67", "Right index finger reaches up."),
  numberStep("3 and 8", "38", "Middle fingers reach up."),
  numberStep("2 and 9", "29", "Ring fingers reach up."),
  numberStep("1 and 0", "10", "Pinkies reach up."),
  { title: "all digits", description: "Every digit on the number row.", newChars: "", length: 110, spec: { type: "digits" }, chars: DIGITS + " " },
  { title: "numbers in words", description: "Digits next to letters.", newChars: "", length: 110, spec: { type: "wordsWithDigits" }, chars: unique(LOWER + DIGITS + " ") },
  { title: "dates and times", description: "Dots, colons and minus between digits.", newChars: ".:-", length: 100, spec: { type: "dates" }, chars: DIGITS + ".:- " },
], "", false);

const punctuationLessons = build(7, "punctuation", [
  sym("; and :", ";:", "Shift with the left pinky for the semicolon, then the colon."),
  sym("_ ? !", "_?!", "Underscore, question mark and exclamation mark."),
  sym("quotes and brackets", "\"'()", "Double quote, apostrophe and parentheses."),
  sym("/ % & §", "/%&§", "Slash, percent, ampersand and paragraph sign."),
  sym("$ = * #", "$=*#", "Dollar, equals, star and hash."),
  { ...sym("punctuation mix", "", "Every mark so far, in combinations."), spec: symbols(";:_?!\"'()/%&§$=*#"), chars: unique(LOWER + DIGITS + " .,-;:_?!\"'()/%&§$=*#"), length: 140 },
], "", false);

const altgrLessons = build(8, "altgr", [
  { title: "@ and €", description: "Hold altgr with the right thumb. At sign on q, euro on e.", newChars: "@€", length: 100, spec: symbols("@€"), chars: unique(LOWER + DIGITS + " .,-@€") },
  { title: "[ ] and { }", description: "Brackets on 8 and 9, braces on 7 and 0.", newChars: "[]{}", length: 100, spec: symbols("[]{}"), chars: unique(LOWER + DIGITS + " .,-:[]{}") },
  { title: "\\ | ~", description: "Backslash on ß, pipe on the angle-bracket key, tilde on plus.", newChars: "\\|~", length: 100, spec: symbols("\\|~"), chars: unique(LOWER + DIGITS + " .,-:/\\|~") },
  { title: "altgr mix", description: "Email addresses, paths and code-like lines.", newChars: "", length: 130, spec: symbols("@€[]{}\\|~"), chars: unique(LOWER + DIGITS + " .,-:/@€[]{}\\|~") },
], "", false);

const wordStep = (title: string, band: readonly [number, number], variant: "lower" | "caps" | "numbers", description: string): Step => ({
  title,
  description,
  newChars: "",
  length: 160,
  spec: { type: "words", band, variant },
  chars:
    variant === "lower" ? LETTERS_AND_SPACE : variant === "caps" ? unique(LOWER + UPPER + " ") : unique(LOWER + DIGITS + " "),
});

const wordsLessons = build(9, "words", [
  wordStep("common words", [0, 1000], "lower", "The thousand most frequent words, lowercase."),
  wordStep("common, capitalised", [0, 1000], "caps", "The same words with capitals."),
  wordStep("common, with digits", [0, 1000], "numbers", "Words mixed with numbers."),
  wordStep("everyday words", [1000, 5000], "lower", "Words ranked 1,000 to 5,000."),
  wordStep("everyday, capitalised", [1000, 5000], "caps", "With capitals."),
  wordStep("everyday, with digits", [1000, 5000], "numbers", "With numbers."),
  wordStep("rarer words", [5000, 20000], "lower", "Words ranked 5,000 to 20,000."),
  wordStep("rarer, capitalised", [5000, 20000], "caps", "With capitals."),
  wordStep("rarer, with digits", [5000, 20000], "numbers", "With numbers."),
], "", false);

const sentenceStep = (title: string, band: readonly [number, number], description: string, punctuationRich = false): Step => ({
  title,
  description,
  newChars: "",
  length: 220,
  spec: { type: "sentences", band, punctuationRich },
  chars: ALL_TYPEABLE,
});

const sentenceLessons = build(10, "sentences", [
  sentenceStep("easy sentences", [0, 600], "Short, common words."),
  sentenceStep("simple sentences", [600, 1400], "A little longer."),
  sentenceStep("everyday sentences", [1400, 2200], "Normal length, normal words."),
  sentenceStep("longer sentences", [2200, 3000], "More words per line."),
  sentenceStep("harder sentences", [3000, 4000], "The rarest vocabulary."),
  sentenceStep("sentences with punctuation", [0, 4000], "Commas, quotes, question marks and more.", true),
], "", false);

const paragraphLessons = build(11, "paragraphs", [
  { title: "short paragraphs", description: "Two or three sentences at a time.", newChars: "", length: 300, spec: { type: "paragraphs", band: [0, 0.33] }, chars: ALL_TYPEABLE },
  { title: "medium paragraphs", description: "A full paragraph.", newChars: "", length: 400, spec: { type: "paragraphs", band: [0.33, 0.66] }, chars: ALL_TYPEABLE },
  { title: "long paragraphs", description: "A long passage from a book.", newChars: "", length: 500, spec: { type: "paragraphs", band: [0.66, 1] }, chars: ALL_TYPEABLE },
  { title: "numbers and marks", description: "Sentences strung together with digits and punctuation.", newChars: "", length: 300, spec: { type: "paragraphs", band: [0, 1], withNumbers: true }, chars: ALL_TYPEABLE },
], "", false);

export const LESSONS: readonly Lesson[] = [
  ...letterLessons,
  ...shiftLessons,
  ...numberLessons,
  ...punctuationLessons,
  ...altgrLessons,
  ...wordsLessons,
  ...sentenceLessons,
  ...paragraphLessons,
];

export const LESSON_BY_ID: ReadonlyMap<string, Lesson> = new Map(LESSONS.map((l) => [l.id, l]));

export function lessonsOfPhase(phase: number): Lesson[] {
  return LESSONS.filter((l) => l.phase === phase);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}
