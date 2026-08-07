import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Simple hand-drawn flower doodles: loose ink outlines, round center,
 * a few oval petals, a wobbly stem and leaf — the sketchbook kind.
 */
const VARIANTS = [
  // daisy, 8 petals
  (
    <g key="a">
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse
          key={i}
          cx="50"
          cy="27"
          rx="8"
          ry="16"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7.5" />
    </g>
  ),
  // five round petals + curved stem and leaf
  (
    <g key="b">
      {Array.from({ length: 5 }).map((_, i) => (
        <circle key={i} cx="50" cy="28" r="11" transform={`rotate(${i * 72} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="6" />
      <path d="M50 62c1 12-2 20-6 30" />
      <path d="M47 80c-8-3-12-9-11-14 6 0 11 5 11 14z" />
    </g>
  ),
  // tulip-ish bud on a stem
  (
    <g key="c">
      <path d="M50 20c9 6 14 15 12 24-2 8-8 12-12 12s-10-4-12-12c-2-9 3-18 12-24z" />
      <path d="M50 24v32" />
      <path d="M50 56v30" />
      <path d="M50 72c9-2 14-8 14-14-7-1-13 5-14 14z" />
    </g>
  ),
  // tiny sprig of three buds
  (
    <g key="d">
      <path d="M50 88V32" />
      <circle cx="50" cy="26" r="8" />
      <circle cx="34" cy="46" r="6.5" />
      <circle cx="66" cy="54" r="6.5" />
      <path d="M50 52l-11-4M50 60l11-4" />
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
