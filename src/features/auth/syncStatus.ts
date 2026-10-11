import type { SyncState } from "@/features/sync/types";

export type StatusTone = "ok" | "idle" | "error";

export function describeSync(state: SyncState, now: number = Date.now()): string {
  switch (state.kind) {
    case "local":
      return "Not syncing.";
    case "starting":
      return "Connecting to your account.";
    case "confirm-link":
      return "Waiting for your decision about this device's data.";
    case "syncing":
      return "Syncing.";
    case "synced": {
      const secs = Math.max(0, Math.round((now - state.at) / 1000));
      if (secs < 60) return "Synced just now.";
      const mins = Math.round(secs / 60);
      if (mins < 60) return `Synced ${mins} min ago.`;
      return "Synced.";
    }
    case "offline":
      return state.pending > 0
        ? `Offline. ${state.pending} change${state.pending === 1 ? "" : "s"} will sync when you are back.`
        : "Offline. Changes will sync when you are back.";
    case "error":
      return state.message;
  }
}

export function toneFor(state: SyncState): StatusTone {
  if (state.kind === "synced") return "ok";
  if (state.kind === "error") return "error";
  return "idle";
}
