import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Fine-liner wildflowers, bullet-journal style: tall slender stems, tiny
 * open blooms, seed dots and airy sprigs. Every stem is drawn on a narrow
 * 40x140 canvas so they can be planted in loose meadow bands along the
 * margins of a page.
 */
const STEMS = [
  // 0 — cosmos daisy on a bending stem
  (
    <g key="s0">
      <path d="M20 140c-1-28 1-52 2-70 1-9 0-14-1-20" strokeWidth={0.9} />
      <path d="M20 92c-7-3-10-8-9-14 6 2 9 8 9 14z" strokeWidth={0.8} />
      <path d="M22 112c6-2 9-6 8-11-5 1-8 5-8 11z" strokeWidth={0.8} />
      <g strokeWidth={0.9}>
        <path d="M20 46c-1-6-5-10-10-11 1 6 5 10 10 11z" />
        <path d="M20 44c-3-6-2-13 2-17 3 5 2 12-2 17z" />
        <path d="M22 44c3-5 9-8 14-6-2 5-8 8-14 6z" />
        <path d="M23 48c6-1 11 2 13 6-5 2-11 0-13-6z" />
        <path d="M21 51c3 5 2 12-2 15-3-4-2-11 2-15z" />
        <path d="M18 50c-5 2-10 1-13-2 4-3 10-2 13 2z" />
      </g>
      <circle cx="20.5" cy="47.5" r="2" strokeWidth={0.8} />
    </g>
  ),
  // 1 — lavender spike
  (
    <g key="s1">
      <path d="M21 140c-2-30-2-56-1-74" strokeWidth={0.9} />
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} strokeWidth={0.75}>
          <path d={`M20 ${52 + i * 5}c-4-1-6-3-6-6 4 0 6 2 6 6z`} />
          <path d={`M21 ${55 + i * 5}c4-1 6-3 6-6-4 0-6 2-6 6z`} />
        </g>
      ))}
      <path d="M20 50c-2-5-1-9 1-12 2 4 2 9-1 12z" strokeWidth={0.8} />
      <path d="M20 118c-6-2-9-6-9-11 6 1 9 5 9 11z" strokeWidth={0.8} />
    </g>
  ),
  // 2 — tiny bud sprig with seed dots
  (
    <g key="s2">
      <path d="M19 140c1-26 3-46 3-62" strokeWidth={0.85} />
      <path d="M22 92c8-3 12-8 12-14-8 1-12 6-12 14z" strokeWidth={0.75} />
      <path d="M20 106c-8-2-12-7-12-13 8 1 12 6 12 13z" strokeWidth={0.75} />
      <g strokeWidth={0.8}>
        <path d="M22 78c-3 0-5-2-5-5s2-6 5-6 5 3 5 6-2 5-5 5z" />
        <path d="M27 62c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z" />
        <path d="M15 60c-2 0-3-2-3-4s1-3 3-3 3 1 3 3-1 4-3 4z" />
        <path d="M22 46c-2 0-3-2-3-4s1-4 3-4 3 2 3 4-1 4-3 4z" />
      </g>
      <path d="M22 68c1-4 3-7 5-9M21 68c-1-3-3-5-6-6M22 60c0-5 0-9 0-13" strokeWidth={0.6} />
    </g>
  ),
  // 3 — airy fern frond
  (
    <g key="s3">
      <path d="M20 140c0-30 3-56 6-78" strokeWidth={0.85} />
      {Array.from({ length: 11 }).map((_, i) => {
        const y = 56 + i * 7;
        const len = 4 + i * 0.9;
        return (
          <g key={i} strokeWidth={0.7}>
            <path d={`M${21 + (10 - i) * 0.25} ${y}c-${len} 0-${len + 2} 3-${len + 2} 5 ${len} 0 ${len + 1}-2 ${len + 1}-5z`} />
            <path d={`M${22 + (10 - i) * 0.25} ${y + 2}c${len} 0 ${len + 2} 3 ${len + 2} 5-${len} 0-${len + 1}-2-${len + 1}-5z`} />
          </g>
        );
      })}
      <path d="M26 58c1-5 3-8 5-10" strokeWidth={0.7} />
    </g>
  ),
  // 4 — poppy bud, drooping head
  (
    <g key="s4">
      <path d="M20 140c-1-26 1-46 4-58 2-8 4-12 4-18" strokeWidth={0.95} />
      <path d="M28 62c-2-9 1-17 7-21 4 7 2 16-7 21z" strokeWidth={0.95} />
      <path d="M30 56c1-6 3-11 6-14" strokeWidth={0.6} />
      <path d="M22 100c-8-3-11-8-10-14 7 2 11 8 10 14z" strokeWidth={0.8} />
    </g>
  ),
  // 5 — five-petal bloom with grass blades
  (
    <g key="s5">
      <path d="M20 140c0-26 1-46 1-62" strokeWidth={0.9} />
      <path d="M8 140c3-16 7-25 12-31M32 140c-2-14-5-22-9-27" strokeWidth={0.7} />
      <g strokeWidth={0.85}>
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d="M21 78c-4-4-5-10-2-14 4 2 6 9 2 14z" transform={`rotate(${a} 21 78)`} />
        ))}
      </g>
      <circle cx="21" cy="78" r="1.8" strokeWidth={0.7} />
      <path d="M21 104c6-2 9-6 8-11-5 1-8 5-8 11z" strokeWidth={0.75} />
    </g>
  ),
];

export function Flower({
  className = "",
  size = 90,
  rotate = 0,
  opacity = 0.5,
  variant = 0,
  stroke = 1,
}: {
  className?: string;
  size?: number;
  rotate?: number;
  opacity?: number;
  variant?: number;
  stroke?: number;
}) {
  const skew = ((variant * 37) % 9) - 4;
  return (
    <svg
      className={`pointer-events-none absolute select-none ${className}`}
      width={size * 0.42}
      height={size * 1.45}
      viewBox="0 0 40 140"
      fill="none"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <InkDefs seed={variant} />
      <InkedStem variant={variant} stroke={stroke} skew={skew} seed={variant} />
    </svg>
  );
}

/**
 * Per-instance ink filters: a slow turbulence displaces the vector paths so
 * lines waver like a nib on paper, and a fine fractal noise stipples the
 * stroke with faint grain.
 */
function InkDefs({ seed }: { seed: number }) {
  const s = seed % 8;
  return (
    <defs>
      <filter id={`ink-${s}`} x="-25%" y="-15%" width="150%" height="130%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.028"
          numOctaves={2}
          seed={s * 13 + 3}
          result="warp"
        />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id={`grain-${s}`} x="-25%" y="-15%" width="150%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={s * 7 + 1} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" result="g" />
        <feComposite in="g" in2="SourceGraphic" operator="in" />
      </filter>
    </defs>
  );
}

/**
 * One stem, inked in three passes: a wavering main line, a lighter ghost
 * pass offset by a hair (the way a pen doubles back), and a grain pass that
 * breaks the stroke up so it never reads as a clean vector.
 */
function InkedStem({
  variant,
  stroke,
  skew,
  seed,
}: {
  variant: number;
  stroke: number;
  skew: number;
  seed: number;
}) {
  const s = seed % 8;
  const art = STEMS[variant % STEMS.length];
  const base = {
    stroke: "var(--doodle)",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <g transform={`rotate(${skew} 20 140)`}>
      <g {...base} strokeWidth={stroke} opacity={0.92} filter={`url(#ink-${s})`}>
        {art}
      </g>
      <g
        {...base}
        strokeWidth={stroke * 0.7}
        opacity={0.35}
        filter={`url(#ink-${s})`}
        transform={`translate(${(s % 3) * 0.3 - 0.3} ${(s % 2) * 0.4 - 0.2})`}
      >
        {art}
      </g>
      <g {...base} strokeWidth={stroke * 2.1} opacity={0.5} filter={`url(#grain-${s})`}>
        {art}
      </g>
    </g>
  );
}

type Stalk = { x: number; s: number; r: number; o: number; v: number };

/** A loose row of wildflower stems — uneven heights, tilts and spacing. */
function Meadow({ stalks, hanging = false }: { stalks: Stalk[]; hanging?: boolean }) {
  return (
    <div
      className={`absolute inset-x-0 ${hanging ? "top-0" : "bottom-0"} h-0`}
      style={hanging ? { transform: "scaleY(-1) scaleX(-1)" } : undefined}
    >
      {stalks.map((f, i) => (
        <svg
          key={i}
          className="pointer-events-none absolute bottom-0 select-none"
          style={{
            left: `${f.x}%`,
            width: f.s * 0.42,
            height: f.s * 1.45,
            transform: `translateY(6px) rotate(${f.r}deg)`,
            transformOrigin: "bottom center",
            opacity: Math.min(0.85, f.o * 1.6),
          }}
          viewBox="0 0 40 140"
          fill="none"
          aria-hidden="true"
        >
          <InkDefs seed={f.v * 3 + i} />
          <InkedStem variant={f.v} stroke={1.15} skew={((i * 5) % 7) - 3} seed={f.v * 3 + i} />
        </svg>
      ))}
    </div>
  );
}


/**
 * Each page gets its own sparse arrangement: a small cluster of wildflowers
 * growing from one bottom corner, a few hanging from the opposite top edge,
 * so the garden reads as continuing page to page.
 */
const FIELDS: Array<{ bottom: Stalk[]; top: Stalk[] }> = [
  {
    bottom: [
      { x: 1, s: 96, r: -6, o: 0.5, v: 3 },
      { x: 5, s: 128, r: 2, o: 0.55, v: 0 },
      { x: 10, s: 78, r: -9, o: 0.4, v: 2 },
      { x: 14, s: 110, r: 4, o: 0.45, v: 1 },
      { x: 19, s: 70, r: -3, o: 0.32, v: 5 },
      { x: 88, s: 104, r: 5, o: 0.35, v: 4 },
      { x: 94, s: 82, r: -4, o: 0.3, v: 2 },
    ],
    top: [
      { x: 78, s: 92, r: -5, o: 0.3, v: 1 },
      { x: 85, s: 116, r: 3, o: 0.34, v: 3 },
      { x: 92, s: 76, r: -8, o: 0.26, v: 2 },
    ],
  },
  {
    bottom: [
      { x: 82, s: 118, r: 4, o: 0.48, v: 0 },
      { x: 88, s: 88, r: -6, o: 0.4, v: 3 },
      { x: 93, s: 104, r: 2, o: 0.44, v: 1 },
      { x: 3, s: 84, r: -5, o: 0.3, v: 5 },
    ],
    top: [
      { x: 4, s: 100, r: 4, o: 0.28, v: 2 },
      { x: 11, s: 78, r: -6, o: 0.24, v: 4 },
      { x: 60, s: 66, r: 3, o: 0.18, v: 1 },
    ],
  },
  {
    bottom: [
      { x: 2, s: 108, r: -4, o: 0.42, v: 1 },
      { x: 8, s: 84, r: 5, o: 0.34, v: 4 },
      { x: 90, s: 96, r: -3, o: 0.34, v: 0 },
      { x: 95, s: 72, r: 6, o: 0.26, v: 2 },
    ],
    top: [{ x: 47, s: 88, r: 2, o: 0.2, v: 3 }],
  },
  {
    bottom: [
      { x: 1, s: 92, r: -7, o: 0.34, v: 2 },
      { x: 6, s: 116, r: 3, o: 0.4, v: 3 },
      { x: 91, s: 100, r: 4, o: 0.32, v: 5 },
      { x: 96, s: 80, r: -5, o: 0.26, v: 0 },
    ],
    top: [
      { x: 88, s: 84, r: -4, o: 0.22, v: 1 },
      { x: 95, s: 66, r: 5, o: 0.18, v: 4 },
    ],
  },
];

export function DoodleField({ seed = 0 }: { seed?: number }) {
  const field = FIELDS[seed % FIELDS.length] ?? FIELDS[0]!;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <Meadow stalks={field.bottom} />
      <Meadow stalks={field.top} hanging />
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
