"use client";

import { useMemo, useState } from "react";
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
  LEGEND,
  LINE_PRIMARY,
  STROKE_WIDTH,
  TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { ChartFrame, type LegendItem } from "@/components/ui/ChartFrame";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { dayKey } from "@/features/storage/record";
import { filterDays, type DayPoint, type DayRange } from "./aggregate";
import styles from "./StatsView.module.css";

type Metric = "wpm" | "accuracy";

const METRICS = [
  { value: "wpm", label: "speed" },
  { value: "accuracy", label: "accuracy" },
] as const;
const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "all" },
] as const;

const COPY: Record<Metric, { title: string; unit: string; legend: LegendItem }> = {
  wpm: { title: "average speed per day", unit: "wpm", legend: LEGEND.net },
  accuracy: { title: "average accuracy per day", unit: "%", legend: LEGEND.accuracy },
};

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

export function ProgressCharts({
  days,
  now,
  index,
}: {
  days: DayPoint[];
  now: number;
  index?: number;
}) {
  const [metric, setMetric] = useState<Metric>("wpm");
  const [range, setRange] = useState<DayRange>("30d");
  const today = dayKey(now);
  const visible = useMemo(() => filterDays(days, range, today), [days, range, today]);
  const { title, unit, legend } = COPY[metric];
  const data = visible.map((d) => ({
    date: d.date.slice(5),
    value: Math.round(d[metric] * 10) / 10,
  }));
  const lastIndex = data.length - 1;
  const empty = data.length < 2;
  const summary = empty
    ? days.length < 2
      ? "Practise on two different days to see a trend."
      : "Fewer than two days in this range. Try a longer one."
    : `Latest ${data[lastIndex].value} ${unit} over ${data.length} days.`;

  return (
    <Panel bare as="div" index={index}>
      <ChartFrame
        title={title}
        height={220}
        empty={empty}
        summary={summary}
        legend={[legend]}
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
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
            <XAxis dataKey="date" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={44}
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
              stroke={LINE_PRIMARY}
              strokeWidth={STROKE_WIDTH}
              isAnimationActive={false}
              dot={({ cx, cy, index }: DotProps) => (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={index === lastIndex ? LAST_DOT_RADIUS : 2}
                  fill={LINE_PRIMARY}
                />
              )}
              activeDot={{ r: LAST_DOT_RADIUS, fill: LINE_PRIMARY, stroke: "none" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </Panel>
  );
}
