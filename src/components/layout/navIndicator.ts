/** State machine for the gliding accent bar under the current tab. */

export interface IndicatorState {
  x: number;
  w: number;
  visible: boolean;
  glide: boolean;
}

export type IndicatorCause = "init" | "route" | "resize";

export const INITIAL_INDICATOR: IndicatorState = { x: 0, w: 0, visible: false, glide: false };

/** Next state for a measured box (null when no tab is current). Returns `prev` when unchanged. */
export function nextIndicator(
  prev: IndicatorState,
  box: { x: number; w: number } | null,
  cause: IndicatorCause,
): IndicatorState {
  let next: IndicatorState;
  if (box === null) next = { ...prev, visible: false, glide: false };
  else if (cause === "route" && prev.visible)
    next = { x: box.x, w: box.w, visible: true, glide: true };
  else next = { x: box.x, w: box.w, visible: true, glide: false };
  const same =
    next.x === prev.x &&
    next.w === prev.w &&
    next.visible === prev.visible &&
    next.glide === prev.glide;
  return same ? prev : next;
}
