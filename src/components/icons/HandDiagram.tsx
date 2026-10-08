import type { Finger } from "@/features/keyboard/layout/types";

const FINGER_SHAPES: Record<Finger, { x: number; y: number; w: number; h: number }> = {
  leftPinky: { x: 4, y: 26, w: 18, h: 52 },
  leftRing: { x: 26, y: 12, w: 18, h: 66 },
  leftMiddle: { x: 48, y: 4, w: 18, h: 74 },
  leftIndex: { x: 70, y: 14, w: 18, h: 64 },
  thumb: { x: 84, y: 82, w: 52, h: 14 },
  rightIndex: { x: 132, y: 14, w: 18, h: 64 },
  rightMiddle: { x: 154, y: 4, w: 18, h: 74 },
  rightRing: { x: 176, y: 12, w: 18, h: 66 },
  rightPinky: { x: 198, y: 26, w: 18, h: 52 },
};

/** Two stylised hands as ten bars. The active finger takes the accent colour. */
export function HandDiagram({ active, label }: { active: Finger | null; label: string }) {
  return (
    <svg viewBox="0 0 220 100" role="img" aria-label={label} width="100%" style={{ maxWidth: 220 }}>
      {(Object.keys(FINGER_SHAPES) as Finger[]).map((f) => {
        const s = FINGER_SHAPES[f];
        return (
          <rect
            key={f}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx={s.w > s.h ? s.h / 2 : 9}
            fill={f === active ? "var(--accent)" : "currentColor"}
            opacity={f === active ? 1 : 0.22}
          />
        );
      })}
    </svg>
  );
}
