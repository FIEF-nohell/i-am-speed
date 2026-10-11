"use client";

import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { updateSettings } from "@/features/storage/store";
import type { KeyboardVisibility, Settings } from "../settings";
import styles from "./groups.module.css";

const VISIBILITY: { value: KeyboardVisibility; label: string }[] = [
  { value: "phases1to8", label: "phases 1 to 8" },
  { value: "always", label: "always" },
  { value: "never", label: "never" },
];

export function GuideGroup({ s }: { s: Settings }) {
  return (
    <Panel id="keyboard-guide" title="keyboard guide" className={styles.panel}>
      <Row label="show keyboard">
        <Select<KeyboardVisibility>
          label="show keyboard"
          value={s.keyboard}
          options={VISIBILITY}
          onChange={(keyboard) => updateSettings({ keyboard })}
        />
      </Row>
      <Row label="colour by finger">
        <Toggle
          label="colour by finger"
          checked={s.colorByFinger}
          onChange={(colorByFinger) => updateSettings({ colorByFinger })}
        />
      </Row>
      <Row label="highlight next key">
        <Toggle
          label="highlight next key"
          checked={s.highlightNext}
          onChange={(highlightNext) => updateSettings({ highlightNext })}
        />
      </Row>
      <Row label="finger hint" hint="Shows which finger to use under the keyboard.">
        <Toggle
          label="finger hint"
          checked={s.fingerHint}
          onChange={(fingerHint) => updateSettings({ fingerHint })}
        />
      </Row>
    </Panel>
  );
}
