import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Simple hand-drawn flower doodles: loose ink outlines, round center,
 * a few oval petals, a wobbly stem and leaf — the sketchbook kind.
 */
const VARIANTS = [
  // boho fan poppy on a long thin stem
  (
    <g key="a">
      <path d="M50 98c2-22 0-38-2-52" />
      <path d="M20 34c4-14 16-22 28-22s24 8 28 22c-8 8-18 12-28 12s-20-4-28-12z" />
      {[28, 36, 44, 52, 60, 68].map((x, i) => (
        <path key={i} d={`M${x} 45c-1-12 1-22 ${(i - 2.5) * 1.6} -31`} />
      ))}
    </g>
  ),
  // hanging wildflower stem with paired leaves
  (
    <g key="b">
      <path d="M50 0c3 24-2 48-5 74" />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i} transform={`translate(0 ${16 + i * 11})`}>
          <path d="M50 0c-8 1-14-3-16-9 8-2 14 2 16 9z" />
          <path d="M49 5c8 2 14 8 15 15-8 1-14-5-15-15z" />
        </g>
      ))}
      <circle cx="45" cy="80" r="4" />
    </g>
  ),
  // thin-petal daisy with grass
  (
    <g key="c">
      {Array.from({ length: 11 }).map((_, i) => (
        <ellipse key={i} cx="50" cy="24" rx="3.2" ry="12" transform={`rotate(${i * 32.7} 50 46)`} />
      ))}
      <circle cx="50" cy="46" r="4.5" />
      <path d="M50 58c1 16 0 26-1 40" />
      <path d="M50 76c-7-2-11-7-12-13 7-1 12 4 12 13z" />
      <path d="M30 98c2-9 5-14 9-18M70 98c-2-9-5-14-9-18" />
    </g>
  ),
  // lavender / berry sprig
  (
    <g key="d">
      <path d="M50 98c-1-26 0-52 0-78" />
      {Array.from({ length: 7 }).map((_, i) => (
        <g key={i}>
          <circle cx={50 - 10 + (i % 2) * 20} cy={26 + i * 9} r="3.6" />
          <path d={`M50 ${30 + i * 9}L${50 - 8 + (i % 2) * 16} ${27 + i * 9}`} />
        </g>
      ))}
      <circle cx="50" cy="16" r="4" />
    </g>
  ),
];

export function Flower({
  className = "",
  size = 90,
  rotate = 0,
  opacity = 0.5,
  variant = 0,
  stroke = 1.6,
}: {
  className?: string;
  size?: number;
  rotate?: number;
  opacity?: number;
  variant?: number;
  stroke?: number;
}) {
  return (
    <svg
      className={`pointer-events-none absolute select-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <g
        stroke="var(--doodle)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {VARIANTS[variant % VARIANTS.length]}
      </g>
    </svg>
  );
}

/**
 * Scarce margin doodles — a few sketched stems tucked into corners and edges,
 * the way flowers wander the margins of a notebook. Each page uses a different
 * arrangement so the garden seems to continue from page to page.
 */
const FIELDS: Array<Array<{ c: string; s: number; r: number; o: number; v: number }>> = [
  [
    { c: "-left-6 -top-10", s: 122, r: 178, o: 0.3, v: 1 },
    { c: "right-[6%] -top-12", s: 104, r: 183, o: 0.22, v: 3 },
    { c: "-right-8 top-1/3", s: 112, r: 16, o: 0.16, v: 0 },
    { c: "-left-5 -bottom-8", s: 128, r: -5, o: 0.26, v: 2 },
    { c: "right-[10%] -bottom-10", s: 110, r: 4, o: 0.2, v: 0 },
  ],
  [
    { c: "-right-6 -top-9", s: 116, r: 181, o: 0.26, v: 3 },
    { c: "left-[7%] -top-12", s: 96, r: 179, o: 0.18, v: 1 },
    { c: "-left-8 top-[45%]", s: 104, r: -18, o: 0.15, v: 2 },
    { c: "right-[8%] -bottom-9", s: 124, r: 5, o: 0.24, v: 0 },
    { c: "-left-6 -bottom-7", s: 100, r: -6, o: 0.18, v: 3 },
  ],
  [
    { c: "-left-7 -top-8", s: 110, r: 177, o: 0.24, v: 3 },
    { c: "-right-7 -bottom-8", s: 126, r: -4, o: 0.22, v: 2 },
    { c: "left-[12%] -bottom-10", s: 96, r: 6, o: 0.16, v: 0 },
  ],
  [
    { c: "-left-8 -top-10", s: 108, r: 180, o: 0.2, v: 1 },
    { c: "-right-6 -top-8", s: 98, r: 184, o: 0.16, v: 0 },
    { c: "-right-8 -bottom-9", s: 118, r: -5, o: 0.2, v: 3 },
    { c: "left-[6%] -bottom-8", s: 104, r: 4, o: 0.14, v: 2 },
  ],
];

export function DoodleField({ seed = 0 }: { seed?: number }) {
  const field = FIELDS[seed % FIELDS.length] ?? FIELDS[0]!;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {field.map((f, i) => (
        <Flower key={i} className={f.c} size={f.s} rotate={f.r} opacity={f.o} variant={f.v} stroke={1.4} />
      ))}
    </div>
  );
}

export function BouncyTap({
  children,
  className = "",
  onClick,
  disabled = false,
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? {} : { scale: 0.94 }}
      whileHover={disabled ? {} : { scale: 1.03 }}
      transition={{ type: "spring", stiffness: 520, damping: 18 }}
      className={`min-h-[48px] min-w-[48px] rounded-3xl font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </motion.button>
  );
}
