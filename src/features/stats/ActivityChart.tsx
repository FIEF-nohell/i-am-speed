"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_OPACITY,
  GRID_STROKE,
  LINE_PRIMARY,
  TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Segmented } from "@/components/ui/Segmented";
import type { ActivityDay } from "./aggregate";
import { CHART_HEIGHT, CHART_MARGIN, X_TICK_GAP, Y_AXIS_WIDTH } from "./chartLayout";

type Metric = "minutes" | "chars";

const METRICS = [
  { value: "minutes", label: "time" },
  { value: "chars", label: "characters" },
] as const;

const COPY: Record<Metric, { title: string; unit: string }> = {
  minutes: { title: "minutes per day", unit: "min" },
  chars: { title: "characters per day", unit: "chars" },
};

/** Practice per calendar day. `series` spans the selected range, quiet days included. */
export function ActivityChart({ series }: { series: readonly ActivityDay[] }) {
  const [metric, setMetric] = useState<Metric>("minutes");
  const { title, unit } = COPY[metric];
  const data = series.map((d) => ({
    date: d.date.slice(5),
    value: d[metric] === null ? null : Math.round(d[metric] * 10) / 10,
  }));
  const total = data.reduce((a, d) => a + (d.value ?? 0), 0);
  const activeDays = data.filter((d) => (d.value ?? 0) > 0).length;
  const empty = activeDays === 0;
  const summary = empty
    ? "Nothing practised in this range."
    : `${Math.round(total).toLocaleString("en")} ${unit} over ${activeDays} active days.`;

  return (
    <ChartFrame
      title={title}
      height={CHART_HEIGHT}
      empty={empty}
      summary={summary}
      aside={<Segmented label="metric" value={metric} options={METRICS} onChange={setMetric} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            minTickGap={X_TICK_GAP}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "var(--line)", fillOpacity: 0.3 }}
            formatter={(v) => [`${v} ${unit}`, title]}
          />
          <Bar
            dataKey="value"
            fill={LINE_PRIMARY}
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
