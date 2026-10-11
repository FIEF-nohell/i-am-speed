"use client";

import { useCallback, useEffect } from "react";
import type { Settings } from "@/features/settings/settings";
import { attachAudioUnlock, getPlayer } from "./audio";
import type { KeySoundHandler, KeySoundKind } from "./types";

/**
 * Key sound handler for the active settings, or undefined when sound is off. The handler is
 * stable; the pack is rendered in idle time and the audio context unlocks on the first gesture.
 */
export function useKeySound(
  settings: Pick<Settings, "sound" | "soundPack" | "soundVolume" | "soundErrors">,
): KeySoundHandler | undefined {
  const { sound, soundPack, soundVolume, soundErrors } = settings;

  useEffect(() => {
    if (!sound) return;
    getPlayer().configure({ pack: soundPack, volume: soundVolume, errors: soundErrors });
  }, [sound, soundPack, soundVolume, soundErrors]);

  useEffect(() => {
    if (!sound) return;
    return attachAudioUnlock();
  }, [sound]);

  const handler = useCallback<KeySoundHandler>((kind: KeySoundKind) => {
    try {
      getPlayer().play(kind);
    } catch {
      /* audio is a nicety, never an error */
    }
  }, []);

  return sound ? handler : undefined;
}
