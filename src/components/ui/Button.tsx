import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import styles from "./Button.module.css";

/** `secondary` is the default action look; `ghost` is the quiet text button for tertiary actions. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface Base {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Danger only: filled error colour, for the final confirm step. */
  solid?: boolean;
  className?: string;
}

interface WithLabel {
  icon?: ReactNode;
  iconOnly?: false;
  children: ReactNode;
}

/** An icon-only control has no visible text, so it must carry an accessible name. */
interface IconOnly {
  icon: ReactNode;
  iconOnly: true;
  "aria-label": string;
  children?: never;
}

type Content = WithLabel | IconOnly;

function classes({ variant, size, solid, className, iconOnly }: Base & { iconOnly?: boolean }) {
  const kind = variant ?? "secondary";
  return {
    className: [styles.button, styles[kind], iconOnly ? styles.icon : "", className ?? ""]
      .filter(Boolean)
      .join(" "),
    size: size ?? "md",
    solid: (kind === "danger" && solid) || undefined,
  };
}

function Inner({
  icon,
  iconOnly,
  children,
}: { icon?: ReactNode } & Pick<Content, "iconOnly"> & {
    children?: ReactNode;
  }) {
  return (
    <>
      {icon}
      {!iconOnly && <span>{children}</span>}
    </>
  );
}

export function Button({
  variant,
  size,
  solid,
  className,
  icon,
  iconOnly,
  children,
  ...rest
}: Base & Content & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const c = classes({ variant, size, solid, className, iconOnly });
  return (
    <button type="button" className={c.className} data-size={c.size} data-solid={c.solid} {...rest}>
      <Inner icon={icon} iconOnly={iconOnly}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  solid,
  className,
  icon,
  iconOnly,
  children,
  href,
  ...rest
}: Base &
  Content & { href: string } & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-current">) {
  const c = classes({ variant, size, solid, className, iconOnly });
  return (
    <Link href={href} className={c.className} data-size={c.size} data-solid={c.solid} {...rest}>
      <Inner icon={icon} iconOnly={iconOnly}>
        {children}
      </Inner>
    </Link>
  );
}
