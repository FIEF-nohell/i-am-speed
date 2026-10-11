/** Quiet time after the last local commit before a push starts. */
export const PUSH_DEBOUNCE_MS = 2000;

/** Retry delays after consecutive failures: 5 s, 15 s, 60 s, then 5 min for every further failure. */
export const BACKOFF_MS: readonly number[] = [5_000, 15_000, 60_000, 300_000];

/** `failures` is the number of consecutive failures so far (at least 1). */
export function backoffDelay(failures: number): number {
  const i = Math.min(Math.max(failures, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[i];
}

/** Typing routes never receive a remote merge while the user is on them. */
export function isTypingPath(pathname: string): boolean {
  return /^\/(lesson|test)(\/|$)/.test(pathname);
}
