import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Hand-inked botanicals. Every line is an asymmetric bezier — petals are
 * closed tapered shapes, stems bend and thin out, and interior detail is
 * drawn with a lighter nib. Nothing is mirrored or evenly spaced.
 */
const VARIANTS = [
  // 1. fan poppy — wide ruffled bloom, long bending stem
  (
    <g key="a">
      <path d="M52 132c-1-17 2-31 0-44-1-9-4-14-3-21" strokeWidth={1.5} />
      <path d="M49 96c-9-3-14-10-15-19 9 1 15 8 15 19z" strokeWidth={1.2} />
      <path
        d="M21 62c-3-13 3-25 11-31 3 8 3 15 1 20 5-11 14-18 23-19 1 8-2 15-6 20 8-8 18-11 26-8-2 9-9 16-17 19 8-1 15 2 19 7-7 6-18 8-28 6-11-2-25-5-29-14z"
        strokeWidth={1.6}
      />
      <path d="M30 55c6 5 12 8 19 9M41 40c2 8 3 15 4 22M55 41c-3 8-6 15-8 21M63 51c-6 5-11 9-15 13" strokeWidth={0.9} />
      <path d="M46 70c1 4 3 6 6 7" strokeWidth={1.1} />
    </g>
  ),
  // 2. hanging eucalyptus sprig — alternating leaves down an arcing stem
  (
    <g key="b">
      <path d="M46 2c8 20 11 42 8 62-2 14-6 25-13 34" strokeWidth={1.5} />
      <path d="M50 16c11-4 19-1 22 6-9 5-18 3-22-6z" strokeWidth={1.2} />
      <path d="M49 30c-12-2-19 3-20 10 10 3 18-2 20-10z" strokeWidth={1.2} />
      <path d="M54 44c11-3 18 2 19 9-9 3-17-1-19-9z" strokeWidth={1.2} />
      <path d="M53 60c-12-1-18 5-18 12 10 2 17-4 18-12z" strokeWidth={1.2} />
      <path d="M52 76c9-2 15 3 16 9-8 2-14-2-16-9z" strokeWidth={1.2} />
      <path d="M47 92c-9 0-14 5-14 11 8 1 13-4 14-11z" strokeWidth={1.2} />
      <path d="M41 108c6-1 10 2 11 7-6 1-10-2-11-7z" strokeWidth={1.1} />
    </g>
  ),
  // 3. daisy pair — one open, one turned away
  (
    <g key="c">
      <path d="M44 134c2-24 4-42 3-58" strokeWidth={1.5} />
      <path d="M64 134c-3-19-6-33-6-45" strokeWidth={1.3} />
      <path d="M44 100c-11-3-16-10-16-19 10 1 16 8 16 19z" strokeWidth={1.1} />
      <path d="M62 108c9-3 13-9 13-16-8 1-13 7-13 16z" strokeWidth={1.1} />
      <g strokeWidth={1.3}>
        <path d="M46 74c-4-6-11-8-17-6 3 6 10 8 17 6z" />
        <path d="M45 71c-6-4-9-12-7-19 6 4 9 12 7 19z" />
        <path d="M47 69c-2-8 2-16 8-19 2 7-1 15-8 19z" />
        <path d="M50 71c3-7 11-11 18-9-2 7-10 11-18 9z" />
        <path d="M50 76c8-2 15 2 18 8-7 3-15 0-18-8z" />
        <path d="M47 79c4 7 3 15-2 20-4-6-3-14 2-20z" />
        <path d="M44 78c-6 3-13 2-17-3 5-4 13-3 17 3z" />
      </g>
      <path d="M44 72c4-1 6 1 7 4 0 3-2 5-5 5s-5-2-5-5 1-4 3-4z" strokeWidth={1.1} />
      <path d="M58 63c-5-4-6-11-3-15 4 3 6 10 3 15zM58 63c5-3 11-2 14 2-4 4-11 3-14-2z" strokeWidth={1.2} />
    </g>
  ),
  // 4. lavender / berry sprig — loose scattered buds
  (
    <g key="d">
      <path d="M56 134c-4-22-6-40-4-56 1-11 3-19 2-28" strokeWidth={1.4} />
      <path d="M53 40c-2-7 0-13 4-17 2 6 1 13-4 17z" strokeWidth={1.2} />
      <g strokeWidth={1.1}>
        <path d="M52 52c-6-3-9-8-8-13 6 2 9 7 8 13z" />
        <path d="M55 58c6-3 11-2 13 2-5 3-11 2-13-2z" />
        <path d="M52 68c-7-2-11-6-11-11 7 1 11 5 11 11z" />
        <path d="M55 76c6-3 12-3 14 1-5 4-11 3-14-1z" />
        <path d="M53 88c-8-1-12-5-12-10 7 0 12 4 12 10z" />
        <path d="M56 98c6-2 11-1 13 2-5 3-11 2-13-2z" />
      </g>
      <path d="M54 112c-10-2-16-8-17-16 10 1 17 7 17 16z" strokeWidth={1.2} />
    </g>
  ),
  // 5. drooping bud on a slender stem
  (
    <g key="e">
      <path d="M50 134c0-20 2-36 6-49 3-9 7-14 6-22" strokeWidth={1.4} />
      <path d="M62 60c-2-11 2-22 9-28 5 8 3 21-9 28z" strokeWidth={1.5} />
      <path d="M64 52c1-8 4-15 8-19" strokeWidth={0.9} />
      <path d="M57 92c-10-4-14-11-13-19 9 3 14 10 13 19z" strokeWidth={1.1} />
      <path d="M53 110c7-3 13-1 15 4-6 3-13 1-15-4z" strokeWidth={1.1} />
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
  const skew = ((variant * 37) % 7) - 3;
  return (
    <svg
      className={`pointer-events-none absolute select-none ${className}`}
      width={size}
      height={size * 1.4}
      viewBox="0 0 100 140"
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
        transform={`rotate(${skew} 50 100)`}
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
