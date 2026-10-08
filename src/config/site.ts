/** Single source for everything that needs the public URL or name. Do not hardcode the domain elsewhere. */
const DEFAULT_URL = "https://speed.nohelll.com";

export const SITE = {
  name: "i am speed",
  slug: "i-am-speed",
  tagline: "learn touch typing on the austrian keyboard",
  description:
    "i am speed is a calm touch-typing trainer for the Austrian QWERTZ keyboard. Structured lessons for all ten fingers, in German or English, with honest stats. Free, private, no account.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_URL).replace(/\/+$/, ""),
  repository: "https://github.com/FIEF-nohell/i-am-speed",
  locale: "en_US",
} as const;

export function absoluteUrl(pathname = "/"): string {
  return `${SITE.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
