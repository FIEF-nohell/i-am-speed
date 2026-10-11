"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/session";
import { useHydrated, useSettings } from "@/features/storage/store";
import { AccountCard } from "./groups/AccountCard";
import { AppearanceGroup } from "./groups/AppearanceGroup";
import { DataGroup } from "./groups/DataGroup";
import { GuideGroup } from "./groups/GuideGroup";
import { SoundGroup } from "./groups/SoundGroup";
import { TypingGroup } from "./groups/TypingGroup";
import { SettingsNav, type NavSection } from "./SettingsNav";
import styles from "./SettingsView.module.css";

const SECTIONS: readonly NavSection[] = [
  { id: "typing", label: "typing" },
  { id: "sound", label: "sound" },
  { id: "appearance", label: "appearance" },
  { id: "keyboard-guide", label: "keyboard guide" },
  { id: "data", label: "data" },
];

export function SettingsView() {
  const s = useSettings();
  const hydrated = useHydrated();
  const signedIn = useAuth().status === "signed-in";

  return (
    <div className="page-wide">
      <PageHeader title="settings" lede="Saved on this device as you change them." />
      {hydrated ? (
        <div className={styles.layout}>
          <SettingsNav sections={SECTIONS} />
          <div className={styles.column}>
            <AccountCard />
            <TypingGroup s={s} />
            <SoundGroup s={s} />
            <AppearanceGroup s={s} />
            <GuideGroup s={s} />
            <DataGroup signedIn={signedIn} />
          </div>
        </div>
      ) : (
        <div className={styles.placeholder} />
      )}
    </div>
  );
}
