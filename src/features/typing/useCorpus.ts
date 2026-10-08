"use client";

import { useEffect, useState } from "react";
import { loadCorpus } from "@/features/content/load";
import type { Corpus, Lang } from "@/features/content/types";

/** Loads the language chunk on demand. Returns null while loading. */
export function useCorpus(lang: Lang): Corpus | null {
  const [loaded, setLoaded] = useState<{ lang: Lang; corpus: Corpus } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCorpus(lang).then((corpus) => {
      if (!cancelled) setLoaded({ lang, corpus });
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);
  return loaded?.lang === lang ? loaded.corpus : null;
}
