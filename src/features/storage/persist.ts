import { parseStored } from "./migrate";
import { STORAGE_KEY, type StoredData } from "./schema";

/** Every localStorage access is wrapped: private windows and blocked storage must not break the app. */
export function readStored(): { data: StoredData; recovered: boolean } {
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseStored(null);
  }
}

export function writeStored(data: StoredData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
