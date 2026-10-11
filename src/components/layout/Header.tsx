"use client";

import { BarChart3, BookOpen, Feather, Settings, Timer, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/lesson");
  return pathname.startsWith(href.replace(/\/$/, ""));
}

interface RailProps {
  items: readonly NavItem[];
  pathname: string;
}

function Rail({ items, pathname }: RailProps) {
  return (
    <ul className={styles.rail}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <item.Icon aria-hidden="true" />
            <span>{item.label}</span>
            {item.href === "/account/" && <SyncBadge className={styles.badge} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className={`site-chrome ${styles.header}`}>
      <Link href="/" className={styles.brand} aria-label="i am speed, home">
        <Mark size={22} />
        <span>i am speed</span>
      </Link>
      <nav aria-label="main" className={styles.rails}>
        <Rail items={PRACTISE} pathname={pathname} />
        <Rail items={UTILITY} pathname={pathname} />
      </nav>
    </header>
  );
}
