"use client";

import { useMemo, useState } from "react";
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
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { dayKey } from "@/features/storage/record";
import type { Attempt, DayTotals } from "@/features/storage/schema";
import { activitySeries, type DayRange } from "./aggregate";
import styles from "./StatsView.module.css";

type Metric = "minutes" | "chars";

const METRICS = [
  { value: "minutes", label: "time" },
  { value: "chars", label: "characters" },
] as const;
const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "all" },
] as const;

const COPY: Record<Metric, { title: string; unit: string }> = {
  minutes: { title: "practice time per day", unit: "min" },
  chars: { title: "characters per day", unit: "chars" },
};

export function ActivityChart({
  days,
  attempts,
  now,
  index,
}: {
  days: Record<string, DayTotals>;
  attempts: readonly Attempt[];
  now: number;
  index?: number;
}) {
  const [metric, setMetric] = useState<Metric>("minutes");
  const [range, setRange] = useState<DayRange>("30d");
  const today = dayKey(now);
  const series = useMemo(
    () => activitySeries(days, attempts, range, today),
    [days, attempts, range, today],
  );
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
    <Panel as="div" index={index}>
      <ChartFrame
        title={title}
        height={220}
        empty={empty}
        summary={summary}
        aside={
          <div className={styles.switches}>
            <Segmented
              variant="pill"
              label="metric"
              value={metric}
              options={METRICS}
              onChange={setMetric}
            />
            <Segmented
              variant="pill"
              label="range"
              value={range}
              options={RANGES}
              onChange={setRange}
            />
          </div>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
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
    </Panel>
  );
}
