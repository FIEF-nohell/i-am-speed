import type { Metadata } from "next";
import { ZenRunner } from "@/features/typing/ZenRunner";

export const metadata: Metadata = { title: "zen", alternates: { canonical: "/zen/" } };

export default function ZenPage() {
  return <ZenRunner />;
}
