import { famInfo, type Family } from "@/data/questions";

export function FamilyBadge({ family, small }: { family: Family; small?: boolean }) {
  const f = famInfo(family);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold uppercase tracking-wide ${
        small ? "px-3 py-1 text-[12px]" : "px-4 py-2 text-[15px]"
      }`}
      style={{
        color: f.color,
        borderColor: `${f.color}66`,
        backgroundColor: `${f.color}1f`,
      }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: f.color }}
        aria-hidden="true"
      />
      {f.label}
    </span>
  );
}

export function ProgressRing({
  value,
  max,
  size = 132,
  color,
  glow,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  color: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      className="relative grid place-items-center"
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 14px ${color})` : undefined,
      }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.34,1.56,.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
