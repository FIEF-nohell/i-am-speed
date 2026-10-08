export type Finger =
  | "leftPinky"
  | "leftRing"
  | "leftMiddle"
  | "leftIndex"
  | "rightIndex"
  | "rightMiddle"
  | "rightRing"
  | "rightPinky"
  | "thumb";

export type Modifier = "none" | "shift" | "altgr";

/** Where a key sits on the drawn board, in key units (1 = one standard key). */
export interface KeyRect {
  x: number;
  y: number;
  w: number;
}

export interface KeyDef {
  /** Physical key (KeyboardEvent.code). Only used for highlighting, never for judging input. */
  code: string;
  /** Characters produced per layer. A dead key produces no direct character. */
  base?: string;
  shift?: string;
  altgr?: string;
  /** Layers that are dead keys (arrive as event.key === "Dead"). */
  dead?: Modifier[];
  /** Label shown on the cap for modifier or function keys. */
  label?: string;
  finger: Finger;
  rect: KeyRect;
}

export interface CharPlacement {
  code: string;
  modifier: Modifier;
  finger: Finger;
  /** Finger that presses the modifier key, if any (opposite hand to the key). */
  modifierFinger: Finger | null;
  modifierCode: string | null;
}
