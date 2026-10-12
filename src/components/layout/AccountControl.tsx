"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { signOut, useAuth } from "@/features/auth/session";
import { useHydrated } from "@/features/storage/store";
import { useSyncState } from "@/features/sync/state";
import { isPath } from "./headerModel";
import { UserMenu } from "./UserMenu";
import styles from "./Header.module.css";

/** Right end of the bar: `sign in` for visitors, the avatar menu once signed in. */
export function AccountControl() {
  const hydrated = useHydrated();
  const auth = useAuth();
  const sync = useSyncState();
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusSignIn = useRef(false);

  // After a sign-out started from the menu, focus lands on `sign in` instead of <body>.
  useEffect(() => {
    if (focusSignIn.current && auth.status === "signed-out") {
      focusSignIn.current = false;
      wrapperRef.current?.querySelector("a")?.focus();
    }
  }, [auth.status]);

  const known = hydrated && auth.status !== "unknown";

  return (
    <div className={styles.account} ref={wrapperRef} aria-hidden={known ? undefined : true}>
      {known && auth.status === "signed-out" && (
        <ButtonLink
          href="/login/"
          variant="secondary"
          size="sm"
          className={styles.signIn}
          aria-current={isPath(pathname, "/login") ? "page" : undefined}
        >
          sign in
        </ButtonLink>
      )}
      {known && auth.status === "signed-in" && auth.user && (
        <UserMenu
          user={auth.user}
          sync={sync}
          current={isPath(pathname, "/account")}
          onSignOut={() => {
            focusSignIn.current = true;
            void signOut();
          }}
        />
      )}
    </div>
  );
}
