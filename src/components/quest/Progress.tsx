import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export const STEPS = ["Bridge", "Test", "Verdict", "Answer", "Learn"] as const;

/** One-thing-at-a-time trail: past steps become checkmarks, the current one pulses. */
export function StepTrail({ active }: { active: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Drill progress">
      {STEPS.map((label, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <motion.div
              animate={
                now
                  ? { scale: [1, 1.06, 1] }
                  : { scale: 1 }
              }
              transition={now ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.2 }}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold",
                done
                  ? "bg-success/15 text-success"
                  : now
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-muted-foreground",
              ].join(" ")}
            >
              <span aria-hidden="true">{done ? "✓" : i + 1}</span>
              <span>{label}</span>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}

/** Little dots showing how many choices have been monkey-tested. */
export function ChoiceChecks({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={i < done ? { scale: [0.6, 1.25, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 16 }}
          className={[
            "grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold",
            i < done ? "bg-success text-primary-foreground" : "bg-secondary text-muted-foreground",
          ].join(" ")}
        >
          {i < done ? "✓" : i + 1}
        </motion.span>
      ))}
    </div>
  );
}

/** Slim daily goal bar — visible progress every single question. */
export function GoalBar({ done, goal }: { done: number; goal: number }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, goal)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span>Today</span>
        <span>
          {done} / {goal}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["var(--pink)", "var(--success)", "var(--warn)", "var(--lavender)", "var(--coral)"];

/** Cheap, cheerful burst of petals for every win. */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<number[]>([]);
  useEffect(() => {
    if (!fire) return;
    setPieces(Array.from({ length: 18 }, (_, i) => i));
    const t = setTimeout(() => setPieces([]), 1400);
    return () => clearTimeout(t);
  }, [fire]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {pieces.map((i) => {
          const angle = (i / 18) * Math.PI * 2;
          return (
            <motion.span
              key={`${fire}-${i}`}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: Math.cos(angle) * (140 + (i % 5) * 40),
                y: Math.sin(angle) * (120 + (i % 4) * 50) + 90,
                opacity: 0,
                scale: 1.1,
                rotate: i * 40,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
              className="absolute left-1/2 top-1/3 h-3 w-3 rounded-full"
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
