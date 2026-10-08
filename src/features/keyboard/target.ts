import { FINGER_LABEL, placementOf } from "./layout/atQwertz";
import type { Finger, Modifier } from "./layout/types";

export interface KeyTarget {
  codes: string[];
  finger: Finger;
  modifier: Modifier;
  /** Plain-language hint such as "right index, with left shift". */
  hint: string;
}

/** Which keys (and which finger) produce `char`. Null for untypeable characters. */
export function targetFor(char: string | null | undefined): KeyTarget | null {
  if (!char) return null;
  const p = placementOf(char);
  if (!p) return null;
  const codes = p.modifierCode ? [p.code, p.modifierCode] : [p.code];
  const extra =
    p.modifier === "shift"
      ? `, with ${p.modifierFinger?.startsWith("left") ? "left" : "right"} shift`
      : p.modifier === "altgr"
        ? ", with altgr"
        : "";
  return {
    codes,
    finger: p.finger,
    modifier: p.modifier,
    hint: `${FINGER_LABEL[p.finger]}${extra}`,
  };
}
