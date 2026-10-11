import type { SoundPack } from "@/features/settings/settings";
import { getPlayer } from "./audio";
import type { KeySoundKind } from "./types";

export interface PreviewStep {
  /** Milliseconds after the preview starts. */
  at: number;
  kind: KeySoundKind;
}

/** Five keys with human timing, a space, and optionally a final error. */
export function previewPhrase(withError = false): PreviewStep[] {
  const steps: PreviewStep[] = [
    { at: 70, kind: "key" },
    { at: 190, kind: "key" },
    { at: 290, kind: "key" },
    { at: 430, kind: "key" },
    { at: 530, kind: "key" },
    { at: 700, kind: "space" },
  ];
  if (withError) steps.push({ at: 900, kind: "error" });
  return steps;
}

/**
 * Plays a short typing phrase in the given pack at the given volume (0 to 100), optionally ending
 * with an error sound. Must be called from a user gesture: it unlocks audio itself.
 */
export function playPreview(pack: SoundPack, volume: number, withError?: boolean): void {
  try {
    const player = getPlayer();
    player.unlock();
    player.prepareNow(pack);
    for (const step of previewPhrase(withError)) {
      setTimeout(() => player.playOnce(pack, step.kind, volume), step.at);
    }
  } catch {
    /* audio is a nicety, never an error */
  }
}
