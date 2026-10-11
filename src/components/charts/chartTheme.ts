import type { CSSProperties } from "react";
import type { LegendItem } from "@/components/ui/ChartFrame";

/** One look for every chart: thin lines, faint horizontal grid only, panel tooltip. */
export const AXIS_TICK: { fill: string; fontSize: number } = { fill: "var(--muted)", fontSize: 11 };
export const AXIS_LINE = { stroke: "var(--line)" } as const;
export const GRID_STROKE = "var(--line)";
/** Gridlines are drawn at this opacity, horizontal only (`<CartesianGrid vertical={false} />`). */
export const GRID_OPACITY = 0.35;
export const LINE_PRIMARY = "var(--accent)";
export const LINE_SECONDARY = "var(--dim)";
export const ERROR_COLOR = "var(--error)";
export const STROKE_WIDTH = 1.75;
/** Optional flat fill under the speed line: 8% accent, no gradient. */
export const AREA_FILL = "color-mix(in srgb, var(--accent) 8%, transparent)";
/** Radius of the small dot that marks the last point of a line. */
export const LAST_DOT_RADIUS = 3.5;

export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-control)",
  fontSize: 12,
  color: "var(--text)",
  padding: "6px 10px",
};

/** Legend entries for the charts, so every chart names its series the same way. */
export const LEGEND = {
  net: { label: "net wpm", color: LINE_PRIMARY, kind: "line" },
  raw: { label: "raw wpm", color: LINE_SECONDARY, kind: "line" },
  errors: { label: "errors", color: ERROR_COLOR, kind: "dot" },
  accuracy: { label: "accuracy", color: LINE_PRIMARY, kind: "line" },
} as const satisfies Record<string, LegendItem>;
