import type { Metadata } from "next";
import { RainGame } from "@/features/rain/RainGame";

export const metadata: Metadata = { title: "rain", alternates: { canonical: "/rain/" } };

export default function RainPage() {
  return <RainGame />;
}
