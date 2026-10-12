"use client";

import { BarChart3, BookOpen, Feather, Settings, Timer, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Mark } from "@/components/icons/Mark";
import { SyncBadge } from "@/features/auth/SyncBadge";
import styles from "./Header.module.css";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const PRACTISE: readonly NavItem[] = [
  { href: "/", label: "lessons", Icon: BookOpen },
  { href: "/test/", label: "test", Icon: Timer },
  { href: "/zen/", label: "zen", Icon: Feather },
  { href: "/stats/", label: "stats", Icon: BarChart3 },
];

const UTILITY: readonly NavItem[] = [
  { href: "/settings/", label: "settings", Icon: Settings },
  { href: "/account/", label: "account", Icon: User },
];

const ITEMS: readonly NavItem[] = [...PRACTISE, ...UTILITY];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/lesson");
  return pathname.startsWith(href.replace(/\/$/, ""));
}

interface Thumb {
  x: number;
  w: number;
}

/** Position of the active tab inside the bar, or null when no tab is current. */
function useThumb(activeHref: string | undefined) {
  const barRef = useRef<HTMLUListElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const link = activeHref
        ? bar.querySelector<HTMLElement>(`[data-href="${activeHref}"]`)
        : null;
      setThumb((prev) => {
        if (!link) return prev === null ? prev : null;
        const next = { x: link.offsetLeft, w: link.offsetWidth };
        return prev && prev.x === next.x && prev.w === next.w ? prev : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [activeHref]);

  // Enable the slide only after the first placement, so the bar never animates in from the left.
  useLayoutEffect(() => {
    if (thumb && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [thumb, ready]);

  return { barRef, thumb, ready };
}

export function Header() {
  const pathname = usePathname();
  const active = ITEMS.find((item) => isActive(pathname, item.href));
  const { barRef, thumb, ready } = useThumb(active?.href);

  return (
    <header className={`site-chrome ${styles.header}`}>
      <Link href="/" className={styles.brand} aria-label="i am speed, home">
        <Mark size={22} />
        <span>i am speed</span>
      </Link>
      <nav aria-label="main">
        <ul className={styles.bar} ref={barRef}>
          <li
            className={styles.thumb}
            aria-hidden="true"
            data-ready={ready || undefined}
            style={{
              width: thumb?.w ?? 0,
              opacity: thumb ? 1 : 0,
              transform: `translateX(${thumb?.x ?? 0}px)`,
            }}
          />
          {ITEMS.map((item) => (
            <li
              key={item.href}
              className={item.href === UTILITY[0].href ? styles.split : undefined}
            >
              <Link
                href={item.href}
                data-href={item.href}
                aria-label={item.label}
                aria-current={active?.href === item.href ? "page" : undefined}
              >
                <item.Icon aria-hidden="true" />
                <span>{item.label}</span>
                {item.href === "/account/" && <SyncBadge className={styles.badge} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
