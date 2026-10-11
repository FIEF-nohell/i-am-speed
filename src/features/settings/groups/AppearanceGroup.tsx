"use client";

import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { updateSettings } from "@/features/storage/store";
import { CaretPreview } from "../CaretPreview";
import type { CaretStyle, FontSize, Settings } from "../settings";
import { ThemePicker } from "../ThemePicker";
import styles from "./groups.module.css";

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "sm", label: "small" },
  { value: "md", label: "medium" },
  { value: "lg", label: "large" },
  { value: "xl", label: "xl" },
];
const CARETS: { value: CaretStyle; label: string }[] = [
  { value: "line", label: "line" },
  { value: "block", label: "block" },
  { value: "underline", label: "underline" },
];

export function AppearanceGroup({ s }: { s: Settings }) {
  return (
    <Panel id="appearance" title="appearance" className={styles.panel}>
      <Row label="theme" stack="narrow">
        <ThemePicker value={s.theme} onChange={(theme) => updateSettings({ theme })} />
      </Row>
      <Row label="font size" stack="narrow">
        <Segmented<FontSize>
          variant="pill"
          label="font size"
          value={s.fontSize}
          options={FONT_SIZES}
          onChange={(fontSize) => updateSettings({ fontSize })}
        />
      </Row>
      <Row label="caret" stack="narrow">
        <Segmented<CaretStyle>
          variant="pill"
          label="caret"
          value={s.caret}
          options={CARETS}
          onChange={(caret) => updateSettings({ caret })}
        />
      </Row>
      <div className={styles.sub}>
        <CaretPreview caret={s.caret} size={s.fontSize} />
      </div>
      <Row label="reduce motion" hint="Also follows your system setting.">
        <Toggle
          label="reduce motion"
          checked={s.reduceMotion}
          onChange={(reduceMotion) => updateSettings({ reduceMotion })}
        />
      </Row>
    </Panel>
  );
}
