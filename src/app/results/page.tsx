import type { Metadata } from "next";
import { ResultsView } from "@/features/results/ResultsView";

export const metadata: Metadata = {
  title: "results",
  robots: { index: false },
  alternates: { canonical: "/results/" },
};

export default function ResultsPage() {
  return <ResultsView />;
}
