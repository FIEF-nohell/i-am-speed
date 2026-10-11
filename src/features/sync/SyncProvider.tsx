"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { bootAuth } from "@/features/auth/session";
import { notifyRouteChange, startSync } from "./controller";

/**
 * Starts auth and, for signed-in browsers only, cloud sync. Renders nothing. Anonymous browsers
 * never load Firebase: bootAuth() only imports it when the auth hint says a session exists.
 */
export function SyncProvider() {
  const pathname = usePathname();

  useEffect(() => {
    bootAuth();
    return startSync();
  }, []);

  useEffect(() => {
    notifyRouteChange();
  }, [pathname]);

  return null;
}
