"use client";

import { BarChart3, BookOpen, Settings, Timer, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/icons/Mark";
import { SyncBadge } from "@/features/auth/SyncBadge";
import styles from "./Header.module.css";

const NAV = [
  { href: "/", label: "lessons", Icon: BookOpen },
  { href: "/test/", label: "test", Icon: Timer },
  { href: "/stats/", label: "stats", Icon: BarChart3 },
  { href: "/settings/", label: "settings", Icon: Settings },
  { href: "/account/", label: "account", Icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/lesson");
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="i am speed, home">
        <Mark size={22} />
        <span>i am speed</span>
      </Link>
      <nav aria-label="main">
        <ul className={styles.nav}>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
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
