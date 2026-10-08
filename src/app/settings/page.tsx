import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/SettingsView";

export const metadata: Metadata = { title: "settings", alternates: { canonical: "/settings/" } };

export default function SettingsPage() {
  return <SettingsView />;
}
