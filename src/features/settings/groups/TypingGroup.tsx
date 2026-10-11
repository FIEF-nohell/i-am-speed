"use client";

import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { LANG_LABEL, LANGS, type Lang } from "@/features/content/types";
import type { BackspaceMode, OnError } from "@/features/engine/types";
import { updateSettings } from "@/features/storage/store";
import type { Settings } from "../settings";
import styles from "./groups.module.css";

const ON_ERROR: { value: OnError; label: string }[] = [
  { value: "continue", label: "continue" },
  { value: "block", label: "block" },
  { value: "stopAtWordEnd", label: "stop at word end" },
  { value: "restartAfterN", label: "restart after n" },
];
const ON_ERROR_HINT: Record<OnError, string> = {
  block: "A wrong key counts as a mistake and the caret waits for the right one.",
  continue: "A wrong key is marked red and the caret moves on. Erase it to correct.",
  stopAtWordEnd: "You can type on within a word, but cannot leave it until it is correct.",
  restartAfterN: "The lesson restarts after the chosen number of mistakes.",
};
const BACKSPACE: { value: BackspaceMode; label: string }[] = [
  { value: "word", label: "within the word" },
  { value: "full", label: "anywhere" },
  { value: "off", label: "disabled" },
];

export function TypingGroup({ s }: { s: Settings }) {
  return (
    <Panel id="typing" title="typing" className={styles.panel}>
      <Row
        label="text language"
        hint="Language of the words and sentences you type."
        stack="narrow"
      >
        <Segmented<Lang>
          variant="pill"
          label="text language"
          value={s.lang}
          options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
          onChange={(lang) => updateSettings({ lang })}
        />
      </Row>
      <Row label="on error" hint={ON_ERROR_HINT[s.onError]}>
        <Select<OnError>
          label="on error"
          value={s.onError}
          options={ON_ERROR}
          onChange={(onError) => updateSettings({ onError })}
        />
      </Row>
      {s.onError === "restartAfterN" && (
        <Row label="mistakes before restart" stack="narrow">
          <Slider
            label="mistakes before restart"
            min={1}
            max={10}
            value={s.restartAfter}
            onChange={(restartAfter) => updateSettings({ restartAfter })}
          />
        </Row>
      )}
      <Row label="backspace">
        <Select<BackspaceMode>
          label="backspace"
          value={s.backspace}
          options={BACKSPACE}
          onChange={(backspace) => updateSettings({ backspace })}
        />
      </Row>
    </Panel>
  );
}
