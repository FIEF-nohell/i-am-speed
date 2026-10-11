"use client";

import { useEffect, useState } from "react";
import styles from "./SettingsNav.module.css";

export interface NavSection {
  id: string;
  label: string;
}

/** Sticky section index (wide screens only). The section in view gets the accent caret bar. */
export function SettingsNav({ sections }: { sections: readonly NavSection[] }) {
  const [current, setCurrent] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // The first section in page order that is inside the reading band wins.
        const first = sections.find((s) => visible.has(s.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={styles.nav} aria-label="settings sections">
      <ul className={styles.list}>
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={styles.link}
              aria-current={current === s.id ? "location" : undefined}
              onClick={() => setCurrent(s.id)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
