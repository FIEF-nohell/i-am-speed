"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Row } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { LANG_LABEL, LANGS, type Lang } from "@/features/content/types";
import type { BackspaceMode, OnError } from "@/features/engine/types";
import {
  exportJson,
  importJson,
  resetAll,
  updateSettings,
  useHydrated,
  useSettings,
} from "@/features/storage/store";
import {
  THEMES,
  type CaretStyle,
  type FontSize,
  type KeyboardVisibility,
  type ThemeId,
} from "./settings";

const ON_ERROR: { value: OnError; label: string }[] = [
  { value: "block", label: "block" },
  { value: "continue", label: "continue" },
  { value: "stopAtWordEnd", label: "stop at word end" },
  { value: "restartAfterN", label: "restart after n" },
];
const ON_ERROR_HINT: Record<OnError, string> = {
  block: "A wrong key counts as a mistake and the caret waits for the right one.",
  continue: "A wrong key is marked red and the caret moves on.",
  stopAtWordEnd: "You can type on within a word, but cannot leave it until it is correct.",
  restartAfterN: "The lesson restarts after the chosen number of mistakes.",
};

export function SettingsView() {
  const s = useSettings();
  const hydrated = useHydrated();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) return <div style={{ minHeight: "40rem" }} />;

  const download = (): void => {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `i-am-speed-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const err = importJson(await file.text());
    setMessage(err ? { text: err, error: true } : { text: "Imported. Your data was replaced." });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="page-narrow">
      <h1 className="page-title">settings</h1>
      <p className="page-lede">Saved in this browser as you change them.</p>

      <Section title="typing">
        <Row label="text language" hint="Language of the words and sentences you type.">
          <Segmented<Lang>
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
          <Row label="mistakes before restart">
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
            options={[
              { value: "word", label: "within the word" },
              { value: "full", label: "anywhere" },
              { value: "off", label: "disabled" },
            ]}
            onChange={(backspace) => updateSettings({ backspace })}
          />
        </Row>
      </Section>

      <Section title="appearance">
        <Row label="theme">
          <Segmented<ThemeId>
            label="theme"
            value={s.theme}
            options={THEMES.map((t) => ({ value: t, label: t }))}
            onChange={(theme) => updateSettings({ theme })}
          />
        </Row>
        <Row label="font size">
          <Segmented<FontSize>
            label="font size"
            value={s.fontSize}
            options={[
              { value: "sm", label: "small" },
              { value: "md", label: "medium" },
              { value: "lg", label: "large" },
              { value: "xl", label: "xl" },
            ]}
            onChange={(fontSize) => updateSettings({ fontSize })}
          />
        </Row>
        <Row label="caret">
          <Segmented<CaretStyle>
            label="caret"
            value={s.caret}
            options={[
              { value: "line", label: "line" },
              { value: "block", label: "block" },
              { value: "underline", label: "underline" },
            ]}
            onChange={(caret) => updateSettings({ caret })}
          />
        </Row>
        <Row label="reduce motion" hint="Also follows your system setting.">
          <Toggle
            label="reduce motion"
            checked={s.reduceMotion}
            onChange={(reduceMotion) => updateSettings({ reduceMotion })}
          />
        </Row>
      </Section>

      <Section title="keyboard guide">
        <Row label="show keyboard">
          <Select<KeyboardVisibility>
            label="show keyboard"
            value={s.keyboard}
            options={[
              { value: "phases1to8", label: "phases 1 to 8" },
              { value: "always", label: "always" },
              { value: "never", label: "never" },
            ]}
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
        <Row label="key sounds" hint="A soft tick per key. Off by default.">
          <Toggle
            label="key sounds"
            checked={s.sound}
            onChange={(sound) => updateSettings({ sound })}
          />
        </Row>
      </Section>

      <Section
        title="your data"
        description="Nothing leaves your browser. Export it to move to another device."
      >
        <Row label="export">
          <Button icon={<Download />} onClick={download}>
            download json
          </Button>
        </Row>
        <Row label="import" hint="Replaces everything currently stored.">
          <Button icon={<Upload />} onClick={() => fileRef.current?.click()}>
            choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="import data file"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </Row>
        <Row label="reset" hint="Deletes lessons progress, stats and settings.">
          {confirming ? (
            <span style={{ display: "inline-flex", gap: "var(--space-2)" }}>
              <Button
                variant="primary"
                icon={<Trash2 />}
                onClick={() => {
                  resetAll();
                  setConfirming(false);
                  setMessage({ text: "All data deleted." });
                }}
              >
                yes, delete everything
              </Button>
              <Button onClick={() => setConfirming(false)}>cancel</Button>
            </span>
          ) : (
            <Button icon={<Trash2 />} onClick={() => setConfirming(true)}>
              reset all data
            </Button>
          )}
        </Row>
        {message && <Notice tone={message.error ? "error" : "neutral"}>{message.text}</Notice>}
      </Section>
    </div>
  );
}
