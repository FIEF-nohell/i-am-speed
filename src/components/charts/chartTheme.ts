import type { CSSProperties } from "react";

/** One look for every chart: thin lines, faint axes, no gridlines to speak of. */
export const AXIS_TICK: { fill: string; fontSize: number } = { fill: "var(--dim)", fontSize: 11 };
export const AXIS_LINE = { stroke: "var(--line)" } as const;
export const GRID_STROKE = "var(--line)";
export const LINE_PRIMARY = "var(--accent)";
export const LINE_SECONDARY = "var(--dim)";
export const ERROR_COLOR = "var(--error)";
export const STROKE_WIDTH = 1.75;

export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--canvas)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--text)",
  padding: "6px 10px",
};
