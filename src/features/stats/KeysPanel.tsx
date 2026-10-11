import { Check } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyCap } from "@/components/ui/KeyCap";
import { Panel } from "@/components/ui/Panel";
import { KeyboardGuide } from "@/features/keyboard/KeyboardGuide";
import type { WeakKey } from "./aggregate";
import styles from "./StatsView.module.css";

interface Props {
  weak: WeakKey[];
  heat: Readonly<Record<string, number>>;
}

export function KeysPanel({ weak, heat }: Props) {
  return (
    <Panel
      title="keys"
      description={weak.length ? "Highest error rate over all attempts." : undefined}
    >
      {weak.length === 0 ? (
        <EmptyState icon={<Check />} title="no weak keys yet">
          A key shows up here once it has a few attempts and some errors.
        </EmptyState>
      ) : (
        <>
          <ul className={styles.weak}>
            {weak.map((w) => (
              <li key={w.key}>
                <KeyCap>{w.key}</KeyCap>
                <span className="mono">{(w.errorRate * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          <KeyboardGuide
            colorByFinger={false}
            heat={heat}
            label="keyboard error heatmap, all time"
          />
        </>
      )}
    </Panel>
  );
}
