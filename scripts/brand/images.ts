import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";
import { parse, type Font } from "opentype.js";
import palette from "../../brand/palette.json";

const root = path.resolve(import.meta.dirname, "../..");
const brand = (f: string): string => path.join(root, "brand", f);
const t = palette.themes.dark;

function loadFont(file: string): Font {
  const buf = readFileSync(brand(`fonts/${file}`));
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

/** Text as an SVG path, so the render never depends on system fonts. Returns the path and its width. */
function textPath(
  font: Font,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
): { svg: string; width: number } {
  // Glyph by glyph: kerning and GPOS lookups on these woff files yield NaN offsets.
  const scale = size / font.unitsPerEm;
  let cursor = x;
  const paths: string[] = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const p = glyph.getPath(cursor, y, size);
    p.fill = fill;
    paths.push(p.toSVG(2));
    cursor += (glyph.advanceWidth ?? 0) * scale;
  }
  return { svg: paths.join(""), width: cursor - x };
}

function render(svg: string, width: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: "width", value: width }, background: undefined })
    .render()
    .asPng();
}

function ogSvg(width: number, height: number): string {
  const sans600 = loadFont("geist-latin-600-normal.woff");
  const sans400 = loadFont("geist-latin-400-normal.woff");
  const mono = loadFont("geist-mono-latin-400-normal.woff");
  const name = textPath(sans600, "i am speed", 0, 0, 96, t.text);
  const tag = textPath(sans400, "learn touch typing on the austrian keyboard", 0, 0, 36, "#8d949a");
  const typedText = "fjfj dkdk slsl";
  const typed = textPath(mono, typedText, 0, 0, 44, t.text);
  const dim = textPath(mono, " aöaö gh", typed.width, 0, 44, "#7b838a");
  const left = 96;
  const unit = 112 / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${t.canvas}"/>
  <g transform="translate(${left} ${height * 0.2}) scale(${unit})"><circle cx="16" cy="6.5" r="3.2" fill="${t.text}"/><rect x="13" y="13" width="6" height="16" rx="3" fill="${t.accent}"/></g>
  <g transform="translate(${left + 150} ${height * 0.2 + 100})">${name.svg}</g>
  <g transform="translate(${left} ${height * 0.2 + 190})">${tag.svg}</g>
  <g transform="translate(${left} ${height - 110})">${typed.svg}${dim.svg}
    <rect x="${typed.width - 1}" y="-40" width="3" height="52" rx="1.5" fill="${t.accent}"/></g>
</svg>`;
}

export async function renderImages(): Promise<void> {
  const publicDir = path.join(root, "public");
  const appDir = path.join(root, "src/app");
  mkdirSync(publicDir, { recursive: true });

  const iconDark = readFileSync(brand("icon-dark.svg"), "utf8");
  const maskable = readFileSync(brand("icon-maskable.svg"), "utf8");

  // Vector favicon with prefers-color-scheme support.
  writeFileSync(path.join(appDir, "icon.svg"), readFileSync(brand("mark.svg")));
  const icon16 = render(iconDark, 16);
  const icon32 = render(iconDark, 32);
  const icon48 = render(iconDark, 48);
  writeFileSync(path.join(appDir, "favicon.ico"), await pngToIco([icon16, icon32, icon48]));
  writeFileSync(path.join(appDir, "apple-icon.png"), render(maskable, 180));
  writeFileSync(path.join(publicDir, "icon-192.png"), render(iconDark, 192));
  writeFileSync(path.join(publicDir, "icon-512.png"), render(iconDark, 512));
  writeFileSync(path.join(publicDir, "icon-maskable-512.png"), render(maskable, 512));

  writeFileSync(path.join(publicDir, "og.png"), render(ogSvg(1200, 630), 1200));
  writeFileSync(path.join(publicDir, "twitter.png"), render(ogSvg(1200, 600), 1200));
  writeFileSync(brand("og.svg"), ogSvg(1200, 630));
  console.log("rendered favicon set, apple icon, pwa icons, og.png, twitter.png");
}
