import { motion } from "motion/react";
import base from "@/assets/mascot-base.png";
import bow from "@/assets/mascot-bow.png";
import glasses from "@/assets/mascot-glasses.png";
import crown from "@/assets/mascot-crown.png";
import { MASCOT_TIERS } from "@/lib/quest-store";

export function Mascot({ lifetimeXp, size = 150 }: { lifetimeXp: number; size?: number }) {
  const src = lifetimeXp >= 2000 ? crown : lifetimeXp >= 1000 ? glasses : lifetimeXp >= 500 ? bow : base;
  return (
    <motion.img
      src={src}
      alt="Study buddy owl mascot"
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size, objectFit: "contain" }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function nextUnlock(lifetimeXp: number) {
  const next = MASCOT_TIERS.find((t) => lifetimeXp < t.xp);
  return next ? { ...next, remaining: next.xp - lifetimeXp } : null;
}
