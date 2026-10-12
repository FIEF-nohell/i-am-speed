"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { nextIndex } from "@/components/ui/segmentedNav";
import dotStyles from "@/features/auth/AccountView.module.css";
import { describeSync, toneFor } from "@/features/auth/syncStatus";
import type { AuthUser } from "@/features/auth/types";
import type { SyncState } from "@/features/sync/types";
import { initialFor, menuKeyAction } from "./headerModel";
import styles from "./UserMenu.module.css";

interface Props {
  user: AuthUser;
  sync: SyncState;
  /** True on /account/. */
  current: boolean;
  onSignOut: () => void;
}

/** Avatar disclosure: identity, sync status, account, sign out. Keys never reach typing screens. */
export function UserMenu({ user, sync, current, onSignOut }: Props) {
  const pathname = usePathname();
  // Open for one pathname only, so any navigation closes the panel.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const initial = initialFor(user);
  const status = describeSync(sync);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !wrapRef.current?.contains(e.target)) setOpenAt(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const items = () =>
    Array.from(wrapRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const action = menuKeyAction(e.key, { ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey }, open);
    if (action === "pass") return;
    if (action === "close-and-pass") {
      setOpenAt(null);
      return;
    }
    e.stopPropagation();
    if (action === "close-and-focus") {
      e.preventDefault();
      setOpenAt(null);
      buttonRef.current?.focus();
    } else if (action === "move") {
      e.preventDefault();
      const list = items();
      if (list.length === 0) return;
      const from = list.indexOf(document.activeElement as HTMLElement);
      const down = e.key === "ArrowDown" || e.key === "Home";
      const to = from === -1 ? (down ? 0 : list.length - 1) : nextIndex(e.key, from, list.length);
      if (to !== null) list[to].focus();
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (open && next instanceof Node && !wrapRef.current?.contains(next)) setOpenAt(null);
  };

  return (
    <div ref={wrapRef} className={styles.wrap} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label="account menu"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-describedby="account-sync"
        data-current={current || undefined}
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        <span className={styles.avatar}>{initial ?? <User size={16} aria-hidden="true" />}</span>
        <span
          aria-hidden="true"
          className={`${dotStyles.dot} ${styles.dot}`}
          data-tone={toneFor(sync)}
        />
      </button>
      <span id="account-sync" className="sr-only">
        {status}
      </span>
      <div id="account-menu" className={styles.menu} hidden={!open}>
        <div className={styles.identity}>
          {user.displayName && <p className={styles.name}>{user.displayName}</p>}
          {user.email && <p className={styles.email}>{user.email}</p>}
          <p className={styles.status}>
            <span aria-hidden="true" className={dotStyles.dot} data-tone={toneFor(sync)} />
            {status}
          </p>
        </div>
        <ul className={styles.items}>
          <li>
            <Link
              href="/account/"
              className={styles.item}
              data-menu-item
              aria-current={current ? "page" : undefined}
              onClick={() => setOpenAt(null)}
            >
              account
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              data-menu-item
              onClick={() => {
                setOpenAt(null);
                onSignOut();
              }}
            >
              sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
