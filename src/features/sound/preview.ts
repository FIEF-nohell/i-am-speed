import type { SoundPack } from "@/features/settings/settings";

/**
 * Plays a short typing phrase in the given pack at the given volume (0 to 100), optionally ending
 * with an error sound. Must be called from a user gesture. Stub: no sound until the system lands.
 */
export function playPreview(pack: SoundPack, volume: number, withError?: boolean): void {
  void pack;
  void volume;
  void withError;
}
