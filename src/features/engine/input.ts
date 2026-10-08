import type { Modifier } from "@/features/keyboard/layout/types";

/** The subset of KeyboardEvent we read, so the resolver is testable without a DOM. */
export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altGraph: boolean;
}

export type ResolvedKey =
  | { kind: "char"; char: string; modifier: Modifier }
  | { kind: "dead"; modifier: Modifier }
  | { kind: "backspace" }
  | { kind: "ignore" };

export function keyLikeFromEvent(e: KeyboardEvent): KeyLike {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    altGraph: e.getModifierState("AltGraph"),
  };
}

/**
 * Decide what a key event means for typing. Judges by the produced character (`key`), never by
 * `code`, so it works under any OS layout. Windows reports AltGr as Ctrl+Alt, so that combo is
 * treated as AltGr and not as a shortcut.
 */
export function resolveKey(k: KeyLike): ResolvedKey {
  const winAltGr = k.ctrlKey && k.altKey;
  const altGr = k.altGraph || k.altKey;
  const modifier: Modifier = altGr ? "altgr" : k.shiftKey ? "shift" : "none";

  if (k.key === "Backspace")
    return k.ctrlKey || k.metaKey || k.altKey ? { kind: "ignore" } : { kind: "backspace" };
  if (k.key === "Dead") return { kind: "dead", modifier };
  // Real shortcuts (Ctrl+R, Cmd+C) must not be typed. macOS Option+key is a normal AltGr-like layer.
  if ((k.ctrlKey && !winAltGr) || k.metaKey) return { kind: "ignore" };
  // Alt+letter on Windows/Linux is a browser menu shortcut. macOS Option produces symbols, never plain letters.
  if (k.altKey && !k.ctrlKey && !k.altGraph && /^[a-z0-9]$/i.test(k.key)) return { kind: "ignore" };
  // Named keys (Shift, Tab, F5, Enter ...) have multi-character names. One code point = a char.
  if ([...k.key].length !== 1) return { kind: "ignore" };
  return { kind: "char", char: k.key, modifier };
}
