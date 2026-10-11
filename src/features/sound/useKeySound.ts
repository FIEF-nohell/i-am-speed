import type { Settings } from "@/features/settings/settings";
import type { KeySoundHandler } from "./types";

/**
 * Key sound handler for the active settings, or undefined when sound is off.
 * Stub: the synthesised implementation lands with the sound system.
 */
export function useKeySound(
  settings: Pick<Settings, "sound" | "soundPack" | "soundVolume" | "soundErrors">,
): KeySoundHandler | undefined {
  void settings;
  return undefined;
}
