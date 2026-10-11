import type { SoundPack } from "@/features/settings/settings";
import { PACKS } from "./packs";
import { hashSeed } from "./rng";
import { renderRecipe } from "./synth";
import type { KeySoundKind } from "./types";
import { VARIANTS_PER_RECIPE } from "./variation";

/** Deterministically renders every variant of one pack and kind. */
export function renderVariants(pack: SoundPack, kind: KeySoundKind): Float32Array[] {
  const recipe = PACKS[pack][kind];
  const out: Float32Array[] = [];
  for (let i = 0; i < VARIANTS_PER_RECIPE; i++) {
    out.push(renderRecipe(recipe, hashSeed(`${pack}:${kind}:${i}`)));
  }
  return out;
}
