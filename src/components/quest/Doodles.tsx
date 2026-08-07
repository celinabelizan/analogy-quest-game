import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Simple hand-drawn flower doodles: loose ink outlines, round center,
 * a few oval petals, a wobbly stem and leaf — the sketchbook kind.
 */
const VARIANTS = [
  // poppy on a long wispy stem
  (
    <g key="a">
      <path d="M50 96V44" />
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={i}
          d="M50 40c7-2 12-8 12-15-1-6-7-9-12-6-5-3-11 0-12 6 0 7 5 13 12 15z"
          transform={`rotate(${i * 60} 50 40)`}
        />
      ))}
      <circle cx="50" cy="40" r="4" />
      <path d="M50 66c-8-1-13-6-14-12 7-1 13 4 14 12z" />
    </g>
  ),
  // hanging eucalyptus sprig
  (
    <g key="b">
      <path d="M50 2c2 26-3 52-6 92" />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i} transform={`translate(0 ${14 + i * 10})`}>
          <ellipse cx="38" cy="0" rx="8" ry="5" transform="rotate(-24 38 0)" />
          <ellipse cx="62" cy="5" rx="8" ry="5" transform="rotate(24 62 5)" />
        </g>
      ))}
    </g>
  ),
  // daisy with thin petals and grass
  (
    <g key="c">
      {Array.from({ length: 12 }).map((_, i) => (
        <ellipse key={i} cx="50" cy="24" rx="3.5" ry="12" transform={`rotate(${i * 30} 50 46)`} />
      ))}
      <circle cx="50" cy="46" r="5" />
      <path d="M50 58v38M50 78c-7-2-11-7-12-13 7-1 12 4 12 13z" />
      <path d="M28 96c3-8 6-12 10-15M72 96c-3-8-6-12-10-15" />
    </g>
  ),
  // berry sprig / lavender
  (
    <g key="d">
      <path d="M50 98V20" />
      {Array.from({ length: 7 }).map((_, i) => (
        <g key={i}>
          <circle cx={50 - 11 + (i % 2) * 22} cy={26 + i * 9} r="4" />
          <path d={`M50 ${30 + i * 9}L${50 - 9 + (i % 2) * 18} ${27 + i * 9}`} />
        </g>
      ))}
      <circle cx="50" cy="16" r="4.5" />
    </g>
  ),
];

export function Flower({
  className = "",
  size = 90,
  rotate = 0,
  opacity = 0.5,
  variant = 0,
  stroke = 3,
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
      <Flower className="-left-4 top-6" size={110} rotate={-14} opacity={0.32} variant={0} />
      <Flower className="right-5 top-14" size={78} rotate={18} opacity={0.26} variant={1} />
      <Flower className="bottom-10 left-8" size={88} rotate={-6} opacity={0.24} variant={2} />
      <Flower className="-right-4 bottom-14" size={118} rotate={24} opacity={0.28} variant={3} />
      <Flower className="left-1/2 top-1" size={56} rotate={38} opacity={0.14} variant={1} />
      <Flower className="left-1/3 bottom-2" size={52} rotate={-30} opacity={0.12} variant={0} />
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
