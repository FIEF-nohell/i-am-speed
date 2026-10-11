"use client";

import { Volume2 } from "lucide-react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { playPreview } from "@/features/sound/preview";
import { getData, updateSettings } from "@/features/storage/store";
import { SOUND_PACKS, type Settings, type SoundPack } from "../settings";
import styles from "./groups.module.css";

/** Audible feedback for the chosen volume, read from the store so it is never one change behind. */
function previewCurrent(withError: boolean): void {
  const { soundPack, soundVolume } = getData().settings;
  playPreview(soundPack, soundVolume, withError);
}

/** Preview once a drag or a key press on the slider ends. */
const onSliderRelease = (e: KeyboardEvent<HTMLElement> | PointerEvent<HTMLElement>): void => {
  if ("key" in e && !e.key.startsWith("Arrow")) return;
  previewCurrent(false);
};

export function SoundGroup({ s }: { s: Settings }) {
  const off = !s.sound;
  return (
    <Panel
      id="sound"
      title="sound"
      description="Synthesised in your browser. No files are downloaded."
      className={styles.panel}
    >
      <Row label="key sounds" hint="A short sound per key. Off by default.">
        <Toggle
          label="key sounds"
          checked={s.sound}
          onChange={(sound) => updateSettings({ sound })}
        />
      </Row>
      <div className={styles.dep} data-off={off} aria-disabled={off} inert={off}>
        <Row label="sound pack" stack="narrow">
          <span className={styles.inline}>
            <Segmented<SoundPack>
              variant="pill"
              label="sound pack"
              value={s.soundPack}
              options={SOUND_PACKS.map((p) => ({ value: p, label: p }))}
              onChange={(soundPack) => {
                updateSettings({ soundPack });
                playPreview(soundPack, s.soundVolume);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              icon={<Volume2 />}
              aria-label="preview sound"
              onClick={() => previewCurrent(s.soundErrors)}
            />
          </span>
        </Row>
        <Row label="volume" stack="narrow">
          {/* pointerup and keyup bubble from the native range input inside the slider. */}
          <span onPointerUp={onSliderRelease} onKeyUp={onSliderRelease}>
            <Slider
              label="volume"
              min={0}
              max={100}
              step={5}
              value={s.soundVolume}
              format={(v) => `${v}%`}
              onChange={(soundVolume) => updateSettings({ soundVolume })}
            />
          </span>
        </Row>
        <Row label="error sound" hint="A softer, lower sound for a wrong key.">
          <Toggle
            label="error sound"
            checked={s.soundErrors}
            onChange={(soundErrors) => updateSettings({ soundErrors })}
          />
        </Row>
      </div>
    </Panel>
  );
}
