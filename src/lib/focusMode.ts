export type FocusMode = "zen";

/**
 * Marks the document as being in a focus mode (`html[data-focus="zen"]`), which fades the site
 * chrome. Pass null to leave it. Safe to call on the server, where it does nothing.
 */
export function setFocusMode(mode: FocusMode | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === null) delete root.dataset.focus;
  else root.dataset.focus = mode;
}
