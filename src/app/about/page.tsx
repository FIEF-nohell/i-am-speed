import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import sources from "@/content/sources.json";
import { SITE } from "@/config/site";
import styles from "./About.module.css";

export const metadata: Metadata = {
  title: "about and sources",
  alternates: { canonical: "/about/" },
};

interface Shortcut {
  keys: string[];
  action: string;
}

const SHORTCUTS: readonly Shortcut[] = [
  { keys: ["tab"], action: "restart the current text" },
  { keys: ["esc"], action: "restart the current text (in zen: finish and save)" },
  { keys: ["enter"], action: "next lesson, on the results page after a pass" },
  { keys: ["tab"], action: "retry, on the results page" },
];

function Block({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} className={styles.block}>
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title="about"
        lede="i am speed teaches touch typing on the Austrian QWERTZ keyboard. It runs entirely in your browser and stores everything in local storage. Without an account it makes no network requests while you use it."
      />

      <Block>
        <Section title="how it counts">
          <p>
            Speed is net words per minute: correct characters divided by five, per minute. Accuracy
            is the share of keystrokes that were right, including wrong ones you corrected. A lesson
            counts as passed at 95% accuracy. Keys are judged by the character they produce, so any
            operating-system layout works, but the lessons assume Austrian key positions.
          </p>
        </Section>
      </Block>

      <Block>
        <Section title="keyboard shortcuts">
          <dl className={styles.shortcuts}>
            {SHORTCUTS.map((s) => (
              <div key={s.action} className={styles.shortcut}>
                <dt>
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dt>
                <dd>{s.action}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </Block>

      <Block id="privacy">
        <Section title="privacy and accounts">
          <p>
            Without an account nothing leaves your browser. Signing in is optional and only needed
            to use your progress on more than one device. With an account, your settings, attempt
            history and stats are stored in Google Firebase (Firestore) under your user id, and only
            you can read them. The full detail of your latest result is not synced and stays on the
            device. You can delete your account and its cloud data at any time on the{" "}
            <Link href="/account/">account page</Link>. Your local copy stays on the device until
            you reset it in settings.
          </p>
        </Section>
      </Block>

      <Block>
        <Panel
          title="text sources"
          description="The code is MIT licensed. Text content keeps its own licence."
        >
          <dl className={styles.sources}>
            {sources.sources.map((s) => (
              <div key={s.id} className={styles.source}>
                <dt>
                  <a href={s.url} rel="noreferrer">
                    {s.name}
                  </a>
                </dt>
                <dd>
                  {s.licence}. {s.attribution}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </Block>

      <Block>
        <Section title="books">
          <ul className={styles.books}>
            {sources.books.map((b) => (
              <li key={b.id}>
                {b.title}, {b.author} ({b.lang}), Project Gutenberg #{b.id}
              </li>
            ))}
          </ul>
        </Section>
      </Block>

      <Block>
        <Section title="fonts">
          <p className={styles.small}>
            Geist and Geist Mono, SIL Open Font License 1.1, The Geist Project Authors.
          </p>
        </Section>
      </Block>

      <Block>
        <Section title="sounds">
          <p className={styles.small}>
            Key sounds are synthesised in your browser. There are no sound files and no third-party
            samples.
          </p>
        </Section>
      </Block>

      <Block>
        <Section title="source code">
          <p>
            <a href={SITE.repository} rel="noreferrer">
              {SITE.repository.replace("https://", "")}
            </a>
          </p>
        </Section>
      </Block>
    </div>
  );
}
