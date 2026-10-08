/** Verifies the static export carries the brand assets and that the HTML head references them. */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SITE } from "../src/config/site";

const out = path.resolve(import.meta.dirname, "../out");
const errors: string[] = [];
const need = (cond: boolean, msg: string): void => {
  if (!cond) errors.push(msg);
};

for (const f of [
  "favicon.ico",
  "icon.svg",
  "apple-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "og.png",
  "twitter.png",
  "manifest.webmanifest",
  "robots.txt",
  "sitemap.xml",
]) {
  const p = path.join(out, f);
  need(existsSync(p) && statSync(p).size > 0, `out/${f} is missing or empty`);
}

if (existsSync(path.join(out, "index.html"))) {
  const html = readFileSync(path.join(out, "index.html"), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  const has = (re: RegExp, what: string): void =>
    need(re.test(head), `index.html head lacks ${what}`);
  has(new RegExp(`property="og:image" content="${SITE.url}/og\\.png"`), "og:image");
  has(/name="twitter:card" content="summary_large_image"/, "twitter:card summary_large_image");
  has(new RegExp(`name="twitter:image" content="${SITE.url}/twitter\\.png"`), "twitter:image");
  has(new RegExp(`rel="canonical" href="${SITE.url}/"`), "canonical");
  has(/rel="manifest" href="\/manifest\.webmanifest"/, "manifest link");
  has(/rel="icon"[^>]*href="\/icon\.svg/, "svg icon link");
  has(/rel="icon"[^>]*href="\/favicon\.ico/, "ico link");
  has(/rel="apple-touch-icon"/, "apple touch icon");
  has(/name="theme-color"/, "theme-color");
  has(/property="og:title"/, "og:title");
} else errors.push("out/index.html missing");

const manifest = path.join(out, "manifest.webmanifest");
if (existsSync(manifest)) {
  const m = JSON.parse(readFileSync(manifest, "utf8")) as {
    name?: string;
    theme_color?: string;
    icons?: unknown[];
  };
  need(m.name === "i am speed", "manifest name must be 'i am speed'");
  need(!!m.theme_color && (m.icons?.length ?? 0) >= 3, "manifest needs theme_color and icons");
}
const sitemap = path.join(out, "sitemap.xml");
if (existsSync(sitemap))
  need(readFileSync(sitemap, "utf8").includes(`${SITE.url}/`), "sitemap must use the site url");

if (errors.length) {
  console.error("Brand check failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  "Brand check OK: favicon set, manifest, OG/Twitter images, robots, sitemap, head tags.",
);
