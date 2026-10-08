import type { Metadata } from "next";
import { StatsView } from "@/features/stats/StatsView";

export const metadata: Metadata = { title: "stats", alternates: { canonical: "/stats/" } };

export default function StatsPage() {
  return <StatsView />;
}
