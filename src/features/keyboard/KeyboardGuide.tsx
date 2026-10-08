import { memo } from "react";
import { KEYS } from "./layout/atQwertz";
import type { KeyDef } from "./layout/types";
import styles from "./KeyboardGuide.module.css";

const U = 44;
const GAP = 3;

interface Props {
  /** Physical codes to highlight as "next". */
  next?: readonly string[];
  /** Codes currently held down. */
  pressed?: ReadonlySet<string>;
  colorByFinger: boolean;
  /** Per-code error intensity, 0 to 1 (results heatmap). */
  heat?: Readonly<Record<string, number>>;
  label: string;
}

function keyLabel(k: KeyDef): { main: string; shift?: string; altgr?: string } {
  if (k.label !== undefined) return { main: k.label };
  const isLetter = !!k.base && k.shift === k.base.toUpperCase() && /\p{L}/u.test(k.base);
  if (isLetter) return { main: k.shift ?? "", altgr: k.altgr };
  return { main: k.base ?? "", shift: k.shift, altgr: k.altgr };
}

/** ISO Enter is an L shape: one unit tall on row 1, narrower on row 2. */
function enterPath(k: KeyDef): string {
  const x = k.rect.x * U + GAP / 2;
  const y = k.rect.y * U + GAP / 2;
  const right = (k.rect.x + 1.5) * U - GAP / 2;
  const notch = (k.rect.x + 0.25) * U + GAP / 2;
  const bottom = (k.rect.y + 2) * U - GAP / 2;
  const mid = (k.rect.y + 1) * U - GAP / 2;
  return `M${x} ${y}H${right}V${bottom}H${notch}V${mid}H${x}Z`;
}

function KeyShape({
  k,
  hot,
  down,
  heat,
  tint,
}: {
  k: KeyDef;
  hot: boolean;
  down: boolean;
  heat: number;
  tint: boolean;
}) {
  const x = k.rect.x * U + GAP / 2;
  const y = k.rect.y * U + GAP / 2;
  const w = k.rect.w * U - GAP;
  const h = U - GAP;
  const text = keyLabel(k);
  const common = {
    className: styles.cap,
    "data-hot": hot || undefined,
    "data-down": down || undefined,
    style: {
      "--tint": tint ? `var(--finger-${k.finger})` : "var(--dim)",
      "--heat": heat,
    } as React.CSSProperties,
  };
  return (
    <g>
      {k.code === "Enter" ? (
        <path d={enterPath(k)} {...common} />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={6} {...common} />
      )}
      {heat > 0 && (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={6}
          className={styles.heat}
          style={
            {
              "--o": Math.min(0.75, heat * 0.85),
              "--delay": `${Math.round(k.rect.x * 22 + k.rect.y * 40)}ms`,
            } as React.CSSProperties
          }
        />
      )}
      <text
        x={x + w / 2}
        y={y + h / 2 + (text.shift ? 6 : 1)}
        className={styles.main}
        data-small={text.main.length > 1 || undefined}
      >
        {text.main}
      </text>
      {text.shift && (
        <text x={x + w / 2} y={y + 12} className={styles.shift}>
          {text.shift}
        </text>
      )}
      {text.altgr && (
        <text x={x + w - 6} y={y + 12} className={styles.altgr} textAnchor="end">
          {text.altgr}
        </text>
      )}
    </g>
  );
}

function KeyboardGuideImpl({ next = [], pressed, colorByFinger, heat, label }: Props) {
  const hot = new Set(next);
  return (
    <svg viewBox={`0 0 ${15 * U} ${5 * U}`} className={styles.board} role="img" aria-label={label}>
      {KEYS.map((k) => (
        <KeyShape
          key={k.code}
          k={k}
          hot={hot.has(k.code)}
          down={pressed?.has(k.code) ?? false}
          heat={heat?.[k.code] ?? 0}
          tint={colorByFinger}
        />
      ))}
    </svg>
  );
}

export const KeyboardGuide = memo(KeyboardGuideImpl);
