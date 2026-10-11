import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import sources from "@/content/sources.json";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "about and sources",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">about</h1>
      <p className="page-lede">
        i am speed teaches touch typing on the Austrian QWERTZ keyboard. It runs entirely in your
        browser and stores everything in local storage. Without an account it makes no network
        requests while you use it.
      </p>

      <Section title="how it counts">
        <p>
          Speed is net words per minute: correct characters divided by five, per minute. Accuracy is
          the share of keystrokes that were right, including wrong ones you corrected. A lesson
          counts as passed at 95% accuracy. Keys are judged by the character they produce, so any
          operating-system layout works, but the lessons assume Austrian key positions.
        </p>
      </Section>

      <Section title="privacy and accounts">
        <p>
          Without an account nothing leaves your browser. Signing in is optional and only needed to
          use your progress on more than one device. With an account, your settings, attempt history
          and stats are stored in Google Firebase (Firestore) under your user id, and only you can
          read them. The full detail of your latest result is not synced and stays on the device.
          You can delete your account and its cloud data at any time on the{" "}
          <Link href="/account/">account page</Link>. Your local copy stays on the device until you
          reset it in settings.
        </p>
      </Section>

      <Section
        title="text sources"
        description="The code is MIT licensed. Text content keeps its own licence."
      >
        <ul style={{ display: "grid", gap: "var(--space-4)" }}>
          {sources.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} rel="noreferrer">
                {s.name}
              </a>
              <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                {s.licence}. {s.attribution}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="books">
        <ul
          style={{
            display: "grid",
            gap: "var(--space-1)",
            color: "var(--muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          {sources.books.map((b) => (
            <li key={b.id}>
              {b.title}, {b.author} ({b.lang}), Project Gutenberg #{b.id}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="fonts">
        <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          Geist and Geist Mono, SIL Open Font License 1.1, The Geist Project Authors.
        </p>
      </Section>

      <Section title="source code">
        <p>
          <a href={SITE.repository} rel="noreferrer">
            {SITE.repository.replace("https://", "")}
          </a>
        </p>
      </Section>
    </div>
  );
}
