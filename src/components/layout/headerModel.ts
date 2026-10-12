/** Pure header logic: routes to current tab, avatar initial, account menu key decisions. */

export interface NavItem {
  href: string;
  label: string;
  /** Pushed to the right end of the tab row on desktop. */
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "lessons" },
  { href: "/test/", label: "test" },
  { href: "/zen/", label: "zen" },
  { href: "/stats/", label: "stats" },
  { href: "/settings/", label: "settings", end: true },
];

/** Strips one trailing slash, except for the root. */
export function normalisePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** True when `pathname` is `base` or lies below it (segment boundary, so /statsx is not /stats). */
export function isPath(pathname: string, base: string): boolean {
  const p = normalisePath(pathname);
  const b = normalisePath(base);
  return p === b || p.startsWith(`${b}/`);
}

export interface CurrentNav {
  href: string;
  current: "page" | "true";
}

/** The tab that is current for a pathname, or null on pages without a tab. */
export function currentNav(pathname: string): CurrentNav | null {
  const p = normalisePath(pathname);
  if (p === "/") return { href: "/", current: "page" };
  if (isPath(p, "/lesson")) return { href: "/", current: "true" };
  for (const item of NAV_ITEMS) {
    if (item.href !== "/" && p === normalisePath(item.href)) {
      return { href: item.href, current: "page" };
    }
  }
  return null;
}

/** Lowercase first character of the display name, else of the email, else null. */
export function initialFor(user: {
  displayName: string | null;
  email: string | null;
}): string | null {
  for (const source of [user.displayName, user.email]) {
    const first = source?.trim().charAt(0);
    if (first) return first.toLowerCase();
  }
  return null;
}

export type MenuKeyAction = "close-and-focus" | "move" | "stop" | "close-and-pass" | "pass";

const MOVE_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

/** What the account wrapper does with a key, so typing screens never see menu keys. */
export function menuKeyAction(
  key: string,
  mods: { ctrl: boolean; alt: boolean; meta: boolean },
  open: boolean,
): MenuKeyAction {
  if (key === "Escape") return open ? "close-and-focus" : "pass";
  if (key === "Tab" || key === "Enter" || key === " ") return "stop";
  if (MOVE_KEYS.has(key)) return open ? "move" : "pass";
  if (open && key.length === 1 && !mods.ctrl && !mods.alt && !mods.meta) return "close-and-pass";
  return "pass";
}
