import { SoundPlayer } from "./player";

let player: SoundPlayer | null = null;

function schedule(task: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(task, { timeout: 1000 });
  else setTimeout(task, 50);
}

/** The shared player, created on first use in the browser. */
export function getPlayer(): SoundPlayer {
  player ??= new SoundPlayer({
    createContext: () =>
      typeof AudioContext === "function" ? new AudioContext({ latencyHint: "interactive" }) : null,
    now: () => performance.now(),
    random: Math.random,
    schedule,
  });
  return player;
}

/**
 * Unlocks audio on user gestures (capture phase, so it runs before the app's key handlers) and
 * suspends while the tab is hidden. Returns a cleanup function.
 */
export function attachAudioUnlock(): () => void {
  const p = getPlayer();
  const unlock = () => p.unlock();
  const visibility = () => p.setHidden(document.visibilityState === "hidden");
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    document.removeEventListener("visibilitychange", visibility);
  };
}
