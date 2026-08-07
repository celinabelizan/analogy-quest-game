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

export function DoodleField() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* top hanging sprigs */}
      <Flower className="-left-2 -top-8" size={150} rotate={182} opacity={0.85} variant={1} />
      <Flower className="left-[9%] -top-12" size={112} rotate={179} opacity={0.6} variant={0} />
      <Flower className="left-[18%] -top-10" size={124} rotate={178} opacity={0.75} variant={3} />
      <Flower className="left-[30%] -top-6" size={94} rotate={183} opacity={0.5} variant={1} />
      <Flower className="left-[42%] -top-11" size={116} rotate={180} opacity={0.62} variant={0} />
      <Flower className="right-[30%] -top-7" size={100} rotate={181} opacity={0.5} variant={1} />
      <Flower className="right-[17%] -top-10" size={132} rotate={177} opacity={0.75} variant={3} />
      <Flower className="right-[7%] -top-12" size={108} rotate={182} opacity={0.55} variant={0} />
      <Flower className="-right-3 -top-6" size={144} rotate={185} opacity={0.85} variant={1} />
      {/* bottom meadow */}
      <Flower className="-left-3 -bottom-6" size={144} rotate={-4} opacity={0.85} variant={0} />
      <Flower className="left-[12%] -bottom-9" size={118} rotate={3} opacity={0.6} variant={3} />
      <Flower className="left-[24%] -bottom-7" size={128} rotate={-5} opacity={0.7} variant={2} />
      <Flower className="left-[40%] -bottom-9" size={102} rotate={4} opacity={0.5} variant={0} />
      <Flower className="right-[34%] -bottom-8" size={96} rotate={-3} opacity={0.45} variant={3} />
      <Flower className="right-[18%] -bottom-9" size={126} rotate={4} opacity={0.7} variant={0} />
      <Flower className="right-[6%] -bottom-7" size={112} rotate={-6} opacity={0.55} variant={2} />
      <Flower className="-right-2 -bottom-5" size={148} rotate={-6} opacity={0.85} variant={2} />
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
