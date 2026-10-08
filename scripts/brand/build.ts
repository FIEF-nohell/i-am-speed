/** `npm run brand`: regenerates every file derived from brand/ sources. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderImages } from "./images";
import { renderThemesCss } from "./themes";

const root = path.resolve(import.meta.dirname, "../..");

async function main(): Promise<void> {
  mkdirSync(path.join(root, "src/styles"), { recursive: true });
  writeFileSync(path.join(root, "src/styles/themes.css"), renderThemesCss());
  console.log("wrote src/styles/themes.css");
  await renderImages();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
