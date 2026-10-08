import type { SVGProps } from "react";

/** Logo mark: an "i" whose stem is the caret. Dot follows the text colour, stem the accent. */
export function Mark({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <circle cx="16" cy="6.5" r="3.2" fill="currentColor" />
      <rect
        className="mark-caret"
        x="13"
        y="13"
        width="6"
        height="16"
        rx="3"
        fill="var(--accent)"
      />
    </svg>
  );
}
