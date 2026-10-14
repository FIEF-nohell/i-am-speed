"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_OPACITY,
  GRID_STROKE,
  LAST_DOT_RADIUS,
  LINE_PRIMARY,
  STROKE_WIDTH,
  TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Segmented } from "@/components/ui/Segmented";
import type { DayPoint } from "./aggregate";
import { CHART_HEIGHT, CHART_MARGIN, X_TICK_GAP, Y_AXIS_WIDTH } from "./chartLayout";

type Metric = "wpm" | "accuracy";

const METRICS = [
  { value: "wpm", label: "speed" },
  { value: "accuracy", label: "accuracy" },
] as const;

const COPY: Record<Metric, { title: string; unit: string }> = {
  wpm: { title: "average wpm per day", unit: "wpm" },
  accuracy: { title: "average accuracy per day", unit: "%" },
};

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number | null;
}

/**
 * Daily averages on the same calendar `dates` as the activity chart beside it, so both x axes
 * match. Days without a scored attempt are gaps the line bridges.
 */
export function ProgressCharts({
  days,
  dates,
}: {
  days: readonly DayPoint[];
  dates: readonly string[];
}) {
  const [metric, setMetric] = useState<Metric>("wpm");
  const { title, unit } = COPY[metric];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const data = dates.map((date) => {
    const d = byDate.get(date);
    return { date: date.slice(5), value: d ? Math.round(d[metric] * 10) / 10 : null };
  });
  const scored = data.filter((d) => d.value !== null);
  const lastIndex = data.findLastIndex((d) => d.value !== null);
  const empty = scored.length < 2;
  const summary = empty
    ? days.length < 2
      ? "Practise on two different days to see a trend."
      : "Fewer than two days in this range. Try a longer one."
    : `Latest ${data[lastIndex].value} ${unit} over ${scored.length} days.`;

  return (
    <ChartFrame
      title={title}
      height={CHART_HEIGHT}
      empty={empty}
      summary={summary}
      aside={<Segmented label="metric" value={metric} options={METRICS} onChange={setMetric} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
          <XAxis
            dataKey="date"
            scale="band"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            minTickGap={X_TICK_GAP}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={Y_AXIS_WIDTH}
            domain={metric === "accuracy" ? [80, 100] : ["auto", "auto"]}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: "var(--line)" }}
            formatter={(v) => [`${v} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            connectNulls
            stroke={LINE_PRIMARY}
            strokeWidth={STROKE_WIDTH}
            isAnimationActive={false}
            dot={({ cx, cy, index, value }: DotProps) =>
              value === null || value === undefined || cx === undefined || cy === undefined ? (
                <g key={index} />
              ) : (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={index === lastIndex ? LAST_DOT_RADIUS : 2}
                  fill={LINE_PRIMARY}
                />
              )
            }
            activeDot={{ r: LAST_DOT_RADIUS, fill: LINE_PRIMARY, stroke: "none" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
