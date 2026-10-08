"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Entrance only (App Router has no exit hook): content fades up when the route changes. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
