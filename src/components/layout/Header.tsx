"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/icons/Mark";
import styles from "./Header.module.css";

const NAV = [
  { href: "/", label: "lessons" },
  { href: "/test/", label: "test" },
  { href: "/stats/", label: "stats" },
  { href: "/settings/", label: "settings" },
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
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
