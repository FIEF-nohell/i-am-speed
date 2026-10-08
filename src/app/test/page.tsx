import type { Metadata } from "next";
import { TestRunner } from "@/features/typing/TestRunner";

export const metadata: Metadata = { title: "free test", alternates: { canonical: "/test/" } };

export default function TestPage() {
  return <TestRunner />;
}
