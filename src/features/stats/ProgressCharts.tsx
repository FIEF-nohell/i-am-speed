"use client";

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
  GRID_STROKE,
  LINE_PRIMARY,
  STROKE_WIDTH,
  TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { ChartFrame } from "@/components/ui/ChartFrame";
import type { DayPoint } from "./aggregate";

function DayLine({
  data,
  field,
  title,
  unit,
  domain,
}: {
  data: DayPoint[];
  field: "wpm" | "accuracy";
  title: string;
  unit: string;
  domain?: [number, number];
}) {
  const rounded = data.map((d) => ({
    date: d.date.slice(5),
    value: Math.round(d[field] * 10) / 10,
  }));
  const last = rounded.at(-1)?.value;
  return (
    <ChartFrame
      title={title}
      height={180}
      empty={data.length < 2}
      summary={
        data.length < 2
          ? "Practise on two different days to see a trend."
          : `Latest ${last} ${unit} over ${data.length} days.`
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rounded} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.5} />
          <XAxis dataKey="date" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={domain ?? ["auto", "auto"]}
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
            dot={{ r: 2.5, fill: LINE_PRIMARY, stroke: "none" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ProgressCharts({ days }: { days: DayPoint[] }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      <DayLine data={days} field="wpm" title="speed per day (average wpm)" unit="wpm" />
      <DayLine
        data={days}
        field="accuracy"
        title="accuracy per day (average %)"
        unit="%"
        domain={[80, 100]}
      />
    </div>
  );
}
