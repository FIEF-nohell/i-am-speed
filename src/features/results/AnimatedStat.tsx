"use client";

import { Stat } from "@/components/ui/Stat";
import { useCountUp } from "@/lib/useCountUp";

interface Props {
  label: string;
  target: number;
  decimals?: number;
  unit?: string;
  size?: "lead" | "normal";
  accent?: boolean;
  delayMs?: number;
}

/** A Stat whose number counts up once. Tabular figures keep the width steady while it runs. */
export function AnimatedStat({ target, decimals = 1, delayMs = 0, ...rest }: Props) {
  const value = useCountUp(target, delayMs);
  return <Stat {...rest} value={value.toFixed(decimals)} />;
}
