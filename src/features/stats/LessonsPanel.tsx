import { Panel } from "@/components/ui/Panel";
import type { Lesson } from "@/features/lessons/types";
import type { LessonProgress } from "@/features/storage/schema";
import styles from "./StatsView.module.css";

interface Props {
  lessons: readonly Lesson[];
  progress: Record<string, LessonProgress>;
  index?: number;
}

export function LessonsPanel({ lessons, progress, index }: Props) {
  return (
    <Panel bare index={index} title="lessons" description="Best speed counts only passed attempts.">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">lesson</th>
              <th scope="col">best</th>
              <th scope="col">last</th>
              <th scope="col">accuracy</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const p = progress[l.id];
              return (
                <tr key={l.id}>
                  <th scope="row">{l.title}</th>
                  <td className="mono">{p.completed ? `${Math.round(p.bestWpm)} wpm` : "-"}</td>
                  <td className="mono">{Math.round(p.lastWpm)} wpm</td>
                  <td className="mono">{p.lastAccuracy.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
