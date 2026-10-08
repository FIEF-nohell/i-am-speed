"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_LINE,
  AXIS_TICK,
  ERROR_COLOR,
  GRID_STROKE,
  LINE_PRIMARY,
  LINE_SECONDARY,
  STROKE_WIDTH,
  TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { ChartFrame } from "@/components/ui/ChartFrame";
import type { WpmPoint } from "@/features/engine/metrics";

export function WpmChart({ series }: { series: WpmPoint[] }) {
  const data = series.map((p) => ({
    ...p,
    wpm: Math.round(p.wpm * 10) / 10,
    raw: Math.round(p.raw * 10) / 10,
    miss: p.errors > 0 ? p.errors : null,
  }));
  const peak = Math.round(Math.max(0, ...series.map((p) => p.wpm)));
  return (
    <ChartFrame
      title="speed over time"
      summary={`Peak ${peak} words per minute across ${series.length} seconds.`}
      empty={series.length < 2}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.5} />
          <XAxis dataKey="second" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} unit="s" />
          <YAxis yAxisId="wpm" tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
          <YAxis
            yAxisId="err"
            orientation="right"
            hide
            domain={[0, (max: number) => Math.max(4, max)]}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: "var(--line)" }}
            labelFormatter={(s) => `${s}s`}
          />
          <Line
            yAxisId="wpm"
            type="monotone"
            dataKey="raw"
            name="raw wpm"
            stroke={LINE_SECONDARY}
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="wpm"
            type="monotone"
            dataKey="wpm"
            name="wpm"
            stroke={LINE_PRIMARY}
            strokeWidth={STROKE_WIDTH}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="err"
            dataKey="miss"
            name="errors"
            stroke="none"
            dot={{ r: 3, fill: ERROR_COLOR, stroke: "none" }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
