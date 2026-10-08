import type { CharPlacement, Finger, KeyDef, Modifier } from "./types";

/**
 * Austrian QWERTZ (ISO, standard T1 / Windows "German (Austria)") layout.
 * Single source of truth: every other lookup in the app is derived from KEYS.
 *
 * Verified against the German T1 layout (identical for Austria) and DIN 2137 touch
 * typing. Finger deviations from the project brief: Y is left pinky, X left ring,
 * C left middle (DIN 2137 / de.wikipedia "Zehnfingersystem"). See DECISIONS.md.
 */

const letter = (code: string, lower: string, finger: Finger, x: number, y: number): KeyDef => ({
  code,
  base: lower,
  shift: lower.toUpperCase(),
  finger,
  rect: { x, y, w: 1 },
});

const sym = (
  code: string,
  base: string | undefined,
  shift: string | undefined,
  altgr: string | undefined,
  finger: Finger,
  x: number,
  y: number,
  dead: Modifier[] = [],
): KeyDef => ({ code, base, shift, altgr, finger, dead, rect: { x, y, w: 1 } });

const mod = (code: string, label: string, finger: Finger, x: number, y: number, w: number): KeyDef => ({
  code,
  label,
  finger,
  rect: { x, y, w },
});

export const KEYS: readonly KeyDef[] = [
  // Number row
  sym("Backquote", "^", "°", undefined, "leftPinky", 0, 0, ["none"]),
  sym("Digit1", "1", "!", undefined, "leftPinky", 1, 0),
  sym("Digit2", "2", '"', undefined, "leftRing", 2, 0),
  sym("Digit3", "3", "§", undefined, "leftMiddle", 3, 0),
  sym("Digit4", "4", "$", undefined, "leftIndex", 4, 0),
  sym("Digit5", "5", "%", undefined, "leftIndex", 5, 0),
  sym("Digit6", "6", "&", undefined, "rightIndex", 6, 0),
  sym("Digit7", "7", "/", "{", "rightIndex", 7, 0),
  sym("Digit8", "8", "(", "[", "rightMiddle", 8, 0),
  sym("Digit9", "9", ")", "]", "rightRing", 9, 0),
  sym("Digit0", "0", "=", "}", "rightPinky", 10, 0),
  sym("Minus", "ß", "?", "\\", "rightPinky", 11, 0),
  sym("Equal", "´", "`", undefined, "rightPinky", 12, 0, ["none", "shift"]),
  mod("Backspace", "backspace", "rightPinky", 13, 0, 2),
  // Top row
  mod("Tab", "tab", "leftPinky", 0, 1, 1.5),
  { ...letter("KeyQ", "q", "leftPinky", 1.5, 1), altgr: "@" },
  letter("KeyW", "w", "leftRing", 2.5, 1),
  { ...letter("KeyE", "e", "leftMiddle", 3.5, 1), altgr: "€" },
  letter("KeyR", "r", "leftIndex", 4.5, 1),
  letter("KeyT", "t", "leftIndex", 5.5, 1),
  letter("KeyY", "z", "rightIndex", 6.5, 1),
  letter("KeyU", "u", "rightIndex", 7.5, 1),
  letter("KeyI", "i", "rightMiddle", 8.5, 1),
  letter("KeyO", "o", "rightRing", 9.5, 1),
  letter("KeyP", "p", "rightPinky", 10.5, 1),
  letter("BracketLeft", "ü", "rightPinky", 11.5, 1),
  sym("BracketRight", "+", "*", "~", "rightPinky", 12.5, 1),
  mod("Enter", "enter", "rightPinky", 13.5, 1, 1.5),
  // Home row
  mod("CapsLock", "caps", "leftPinky", 0, 2, 1.75),
  letter("KeyA", "a", "leftPinky", 1.75, 2),
  letter("KeyS", "s", "leftRing", 2.75, 2),
  letter("KeyD", "d", "leftMiddle", 3.75, 2),
  letter("KeyF", "f", "leftIndex", 4.75, 2),
  letter("KeyG", "g", "leftIndex", 5.75, 2),
  letter("KeyH", "h", "rightIndex", 6.75, 2),
  letter("KeyJ", "j", "rightIndex", 7.75, 2),
  letter("KeyK", "k", "rightMiddle", 8.75, 2),
  letter("KeyL", "l", "rightRing", 9.75, 2),
  letter("Semicolon", "ö", "rightPinky", 10.75, 2),
  letter("Quote", "ä", "rightPinky", 11.75, 2),
  sym("Backslash", "#", "'", undefined, "rightPinky", 12.75, 2),
  // Bottom row
  mod("ShiftLeft", "shift", "leftPinky", 0, 3, 1.25),
  sym("IntlBackslash", "<", ">", "|", "leftPinky", 1.25, 3),
  letter("KeyZ", "y", "leftPinky", 2.25, 3),
  letter("KeyX", "x", "leftRing", 3.25, 3),
  letter("KeyC", "c", "leftMiddle", 4.25, 3),
  letter("KeyV", "v", "leftIndex", 5.25, 3),
  letter("KeyB", "b", "leftIndex", 6.25, 3),
  letter("KeyN", "n", "rightIndex", 7.25, 3),
  letter("KeyM", "m", "rightIndex", 8.25, 3),
  sym("Comma", ",", ";", undefined, "rightMiddle", 9.25, 3),
  sym("Period", ".", ":", undefined, "rightRing", 10.25, 3),
  sym("Slash", "-", "_", undefined, "rightPinky", 11.25, 3),
  mod("ShiftRight", "shift", "rightPinky", 12.25, 3, 2.75),
  // Space row
  mod("ControlLeft", "ctrl", "leftPinky", 0, 4, 1.25),
  mod("MetaLeft", "", "leftPinky", 1.25, 4, 1.25),
  mod("AltLeft", "alt", "thumb", 2.5, 4, 1.25),
  mod("Space", "", "thumb", 3.75, 4, 6.25),
  mod("AltRight", "altgr", "thumb", 10, 4, 1.25),
  mod("MetaRight", "", "rightPinky", 11.25, 4, 1.25),
  mod("ContextMenu", "", "rightPinky", 12.5, 4, 1.25),
  mod("ControlRight", "ctrl", "rightPinky", 13.75, 4, 1.25),
];

export const SPACE = " ";
export const SHIFT_LEFT = "ShiftLeft";
export const SHIFT_RIGHT = "ShiftRight";
export const ALTGR = "AltRight";

const LAYERS: readonly Modifier[] = ["none", "shift", "altgr"];

function layerChar(key: KeyDef, layer: Modifier): string | undefined {
  return layer === "none" ? key.base : layer === "shift" ? key.shift : key.altgr;
}

function isRightHand(finger: Finger): boolean {
  return finger.startsWith("right");
}

function modifierFor(key: KeyDef, layer: Modifier): { code: string; finger: Finger } | null {
  if (layer === "none") return null;
  if (layer === "altgr") return { code: ALTGR, finger: "thumb" };
  // Shift is pressed with the opposite hand.
  return isRightHand(key.finger)
    ? { code: SHIFT_LEFT, finger: "leftPinky" }
    : { code: SHIFT_RIGHT, finger: "rightPinky" };
}

export const KEY_BY_CODE: ReadonlyMap<string, KeyDef> = new Map(KEYS.map((k) => [k.code, k]));

/** Every directly typeable character (dead-key layers excluded) and where it lives. */
export const CHAR_MAP: ReadonlyMap<string, CharPlacement> = (() => {
  const map = new Map<string, CharPlacement>();
  for (const key of KEYS) {
    for (const layer of LAYERS) {
      const ch = layerChar(key, layer);
      if (!ch || key.dead?.includes(layer)) continue;
      const m = modifierFor(key, layer);
      map.set(ch, {
        code: key.code,
        modifier: layer,
        finger: key.finger,
        modifierFinger: m?.finger ?? null,
        modifierCode: m?.code ?? null,
      });
    }
  }
  map.set(SPACE, {
    code: "Space",
    modifier: "none",
    finger: "thumb",
    modifierFinger: null,
    modifierCode: null,
  });
  return map;
})();

/** Characters that only arrive as dead keys. Never allowed in lesson text. */
export const DEAD_CHARS: ReadonlySet<string> = new Set(
  KEYS.flatMap((k) => (k.dead ?? []).map((l) => layerChar(k, l)).filter((c): c is string => !!c)),
);

export function isTypeable(ch: string): boolean {
  return CHAR_MAP.has(ch);
}

export function placementOf(ch: string): CharPlacement | undefined {
  return CHAR_MAP.get(ch);
}

export function fingerOf(ch: string): Finger | undefined {
  return CHAR_MAP.get(ch)?.finger;
}

export const FINGERS: readonly Finger[] = [
  "leftPinky",
  "leftRing",
  "leftMiddle",
  "leftIndex",
  "rightIndex",
  "rightMiddle",
  "rightRing",
  "rightPinky",
  "thumb",
];

export const FINGER_LABEL: Record<Finger, string> = {
  leftPinky: "left pinky",
  leftRing: "left ring",
  leftMiddle: "left middle",
  leftIndex: "left index",
  rightIndex: "right index",
  rightMiddle: "right middle",
  rightRing: "right ring",
  rightPinky: "right pinky",
  thumb: "thumb",
};
