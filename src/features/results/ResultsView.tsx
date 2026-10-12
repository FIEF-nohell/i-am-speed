"use client";

import { ListChecks, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyCap } from "@/components/ui/KeyCap";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { slowestKeys } from "@/features/engine/metrics";
import { KeyboardGuide } from "@/features/keyboard/KeyboardGuide";
import { nextLesson } from "@/features/lessons/curriculum";
import { retryHref, sourceKind } from "@/features/storage/source";
import { useData, useHydrated } from "@/features/storage/store";
import { heatByCode } from "./heat";
import { ResultsHero } from "./ResultsHero";
import { WpmChart } from "./WpmChart";
import styles from "./ResultsView.module.css";

export function ResultsView() {
  const { lastResult: result } = useData();
  const hydrated = useHydrated();
  const router = useRouter();
  const heat = useMemo(() => (result ? heatByCode(result.perKey) : {}), [result]);

  const sourceId = result?.attempt.source;
  const nextId =
    sourceId && sourceKind(sourceId) === "lesson" ? nextLesson(sourceId)?.id : undefined;
  const retryTo = sourceId ? retryHref(sourceId) : "/test/";

  // Enter continues (next lesson, or the same thing again); Tab or Escape retries.
  useEffect(() => {
    if (!sourceId) return;
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(t.tagName)
      )
        return;
      if (e.key === "Enter") router.push(nextId ? `/lesson/${nextId}/` : retryTo);
      else if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        router.push(retryTo);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourceId, nextId, retryTo, router]);

  if (!hydrated) return <div className={styles.placeholder} />;
  if (!result) {
    return (
      <div className={styles.page}>
        <PageHeader title="no result yet" />
        <Panel as="div">
          <EmptyState
            icon={<Timer />}
            title="nothing to show yet"
            actions={
              <>
                <ButtonLink href="/" variant="primary" icon={<ListChecks />}>
                  pick a lesson
                </ButtonLink>
                <ButtonLink href="/test/" variant="secondary" icon={<Timer />}>
                  take a test
                </ButtonLink>
              </>
            }
          >
            Finish a lesson or a test and the details will show up here.
          </EmptyState>
        </Panel>
      </div>
    );
  }

  // Zen is free type: nothing is wrong, so there is no error map and no per-key timing.
  const free = sourceKind(result.attempt.source) === "zen";
  const slow = free ? [] : slowestKeys(result.perKey, 5);
  const hasErrors = Object.keys(heat).length > 0;

  return (
    <div className={styles.page}>
      <ResultsHero result={result} />

      <Panel as="div" index={1}>
        <WpmChart series={result.series} />
      </Panel>

      {!free && (
        <Panel
          index={2}
          title="where it went wrong"
          description={
            hasErrors
              ? "Darker red means a higher error rate on that key."
              : "No errors. Nothing to show."
          }
        >
          {hasErrors && (
            <KeyboardGuide colorByFinger={false} heat={heat} label="keyboard error heatmap" />
          )}
        </Panel>
      )}

      {slow.length > 0 && (
        <Panel
          index={3}
          title="slowest keys"
          description="Average time between the previous key and this one."
        >
          <ul className={styles.slow}>
            {slow.map((s) => (
              <li key={s.key}>
                <KeyCap>{s.key}</KeyCap>
                <span className="mono">{Math.round(s.ms)} ms</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
