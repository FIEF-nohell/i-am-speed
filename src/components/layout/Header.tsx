"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Mark } from "@/components/icons/Mark";
import { AccountControl } from "./AccountControl";
import { currentNav, NAV_ITEMS } from "./headerModel";
import { useNavIndicator } from "./useNavIndicator";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();
  const current = currentNav(pathname);
  const trackRef = useRef<HTMLDivElement>(null);
  const { state, ready, measured } = useNavIndicator(trackRef, current?.href ?? null);

  return (
    <header className={`site-chrome ${styles.header}`}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label="i am speed, home">
          <Mark size={22} />
          <span>i am speed</span>
        </Link>
        <nav aria-label="main" className={styles.nav}>
          <div className={styles.track} ref={trackRef} data-glide-on={measured || undefined}>
            <ul className={styles.links}>
              {NAV_ITEMS.map((item) => (
                <li key={item.href} className={item.end ? styles.end : undefined}>
                  <Link
                    href={item.href}
                    className={styles.link}
                    data-href={item.href}
                    aria-current={current?.href === item.href ? current.current : undefined}
                  >
                    <span className={styles.label} data-label>
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <span
              className={styles.indicator}
              data-nav-indicator
              data-visible={state.visible || undefined}
              data-ready={ready || undefined}
              data-glide={state.glide || undefined}
              style={{ transform: `translateX(${state.x}px) scaleX(${state.w})` }}
              aria-hidden="true"
            />
          </div>
        </nav>
        <AccountControl />
      </div>
    </header>
  );
}
