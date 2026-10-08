import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import styles from "./Button.module.css";

type Variant = "primary" | "quiet";

interface Common {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "quiet",
  icon,
  children,
  className = "",
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function ButtonLink({ variant = "quiet", icon, children, href }: Common & { href: string }) {
  return (
    <Link href={href} className={`${styles.button} ${styles[variant]}`}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
