"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Lang } from "@/features/content/types";
import { computeMetrics } from "@/features/engine/metrics";
import type { EngineState } from "@/features/engine/types";
import { commitAttempt } from "@/features/storage/store";

interface Options {
  state: EngineState;
  source: string;
  lang: Lang;
}

/** When an attempt finishes: store it once, then show the results page. */
export function useFinish({ state, source, lang }: Options): void {
  const router = useRouter();
  const doneFor = useRef<EngineState["entries"] | null>(null);

  useEffect(() => {
    if (state.status !== "finished" || doneFor.current === state.keystrokes) return;
    doneFor.current = state.keystrokes;
    commitAttempt({
      source,
      lang,
      text: state.target,
      metrics: computeMetrics(state),
      at: Date.now(),
    });
    router.push("/results/");
  }, [state, source, lang, router]);
}
