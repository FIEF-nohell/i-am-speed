import { CHAR_MAP } from "@/features/keyboard/layout/atQwertz";

export const LOWER = "abcdefghijklmnopqrstuvwxyzäöüß";
export const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ";
export const DIGITS = "0123456789";
/** Every character the app can ask for: the whole typeable layout, dead keys excluded. */
export const ALL_TYPEABLE = [...CHAR_MAP.keys()].join("");

export const withSpace = (chars: string): string => chars + " ";

export const unique = (chars: string): string => [...new Set(chars)].join("");
