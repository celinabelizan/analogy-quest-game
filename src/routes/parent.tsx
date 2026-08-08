import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DoodleField, BouncyTap } from "@/components/quest/Doodles";
import {
  PROFILES,
  dayOf,
  maybeDayBonus,
  setDay,
  addXp,
  todayKey,
  useProfile,
  useShared,
  type ProfileId,
} from "@/lib/quest-store";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Panel — SSAT Quest" },
      { name: "description", content: "Manage rewards, approve redemptions, and award exit-ticket stars." },
      { property: "og:title", content: "Parent Panel — SSAT Quest" },
      { property: "og:description", content: "Rewards, approvals, and daily stars for SSAT Quest." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParentPanel,
});

function ParentPanel() {
  const [shared, updateShared] = useShared();
  const [unlocked, setUnlocked] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  if (!unlocked) {
    return (
      <main className="relative grid min-h-screen place-items-center px-6">
        <DoodleField seed={2} />
        <div className="quest-card relative z-10 w-full max-w-sm space-y-4 p-8 text-center">
          <h1 className="script-type text-4xl">Parent PIN</h1>
          <input
            type="password"
            inputMode="numeric"
            value={entry}
            onChange={(e) => {
              setEntry(e.target.value);
              setError(false);
            }}
            className="w-full rounded-2xl border border-border bg-secondary/50 p-4 text-center text-3xl tracking-[0.5em] outline-none focus:border-primary"
          />
          {error && <p className="text-destructive">Wrong PIN</p>}
          <BouncyTap
            onClick={() => (entry === shared.pin ? setUnlocked(true) : setError(true))}
            className="w-full bg-primary py-4 text-xl text-primary-foreground"
          >
            Enter
          </BouncyTap>
          <Link to="/" className="block pt-2 text-muted-foreground">
            ← Back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 py-8 sm:px-8">
      <DoodleField seed={2} />
      <div className="relative z-10 mx-auto max-w-3xl space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="script-type text-5xl text-primary">Parent panel</h1>
          <Link to="/" className="rounded-full border border-border px-5 py-3">
            Done
          </Link>
        </div>

        <ChangePin pin={shared.pin} onSave={(pin) => updateShared((s) => ({ ...s, pin }))} />

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILES.map((p) => (
            <GirlCard key={p.id} id={p.id} name={p.name} accent={p.accent} />
          ))}
        </div>

        <RewardManager />

        <section className="quest-card p-6">
          <h2 className="text-xl font-extrabold">Exit-ticket stars</h2>
          <p className="text-sm text-muted-foreground">Once per girl, per day.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROFILES.map((p) => (
              <ExitTicket key={p.id} id={p.id} name={p.name} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ChangePin({ pin, onSave }: { pin: string; onSave: (pin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  return (
    <section className="quest-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Change PIN</h2>
        <BouncyTap onClick={() => setOpen((o) => !o)} className="border border-border px-5 py-3">
          {open ? "Cancel" : "Change"}
        </BouncyTap>
      </div>
      {open && (
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="numeric"
            placeholder="New PIN"
            className="min-h-[48px] flex-1 rounded-2xl border border-border bg-secondary/50 px-4 text-xl outline-none focus:border-primary"
          />
          <BouncyTap
            disabled={value.trim().length < 4}
            onClick={() => {
              onSave(value.trim());
              setValue("");
              setOpen(false);
            }}
            className="bg-primary px-6 py-3 text-primary-foreground"
          >
            Save
          </BouncyTap>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Current PIN is {pin.replace(/./g, "•")}</p>
    </section>
  );
}

function GirlCard({ id, name, accent }: { id: ProfileId; name: string; accent: string }) {
  const [p, update] = useProfile(id);
  const today = dayOf(p);
  const pending = p.redemptions.filter((r) => r.status === "pending");

  const approve = (rid: string) =>
    update((prev) => {
      const red = prev.redemptions.find((r) => r.id === rid);
      if (!red) return prev;
      return {
        ...prev,
        availableXp: Math.max(0, prev.availableXp - red.cost),
        redemptions: prev.redemptions.map((r) =>
          r.id === rid ? { ...r, status: "approved" as const, resolvedAt: new Date().toISOString() } : r,
        ),
      };
    });

  const decline = (rid: string) =>
    update((prev) => ({
      ...prev,
      redemptions: prev.redemptions.map((r) =>
        r.id === rid ? { ...r, status: "declined" as const, resolvedAt: new Date().toISOString() } : r,
      ),
    }));

  return (
    <section className="quest-card p-6">
      <h2 className="script-type text-4xl" style={{ color: accent }}>
        {name}
      </h2>
      <dl className="mt-3 space-y-1 text-base">
        <Row label="Lifetime XP" value={p.lifetimeXp} />
        <Row label="Available XP" value={p.availableXp} />
        <Row label="Questions today" value={today.completed} />
        <Row label="Streak" value={p.streak} />
      </dl>
      {pending.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-extrabold text-primary">Waiting for Mom</h3>
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-3">
              <p className="font-bold">
                {r.name} — {r.cost} XP
              </p>
              <div className="mt-2 flex gap-2">
                <BouncyTap onClick={() => approve(r.id)} className="bg-primary px-5 py-3 text-primary-foreground">
                  Approve
                </BouncyTap>
                <BouncyTap onClick={() => decline(r.id)} className="border border-border px-5 py-3">
                  Not yet
                </BouncyTap>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-extrabold">{value}</dd>
    </div>
  );
}

function ExitTicket({ id, name }: { id: ProfileId; name: string }) {
  const [p, update] = useProfile(id);
  const given = dayOf(p).exitTicket;
  return (
    <BouncyTap
      disabled={given}
      onClick={() =>
        update((prev) => {
          if (dayOf(prev).exitTicket) return prev;
          let next = setDay(addXp(prev, 20), { exitTicket: true }, todayKey());
          next = maybeDayBonus(next);
          return next;
        })
      }
      className="bg-primary px-5 py-5 text-lg text-primary-foreground"
    >
      {given ? `${name} — star given today ⭐` : `${name} said her bridge out loud (+20)`}
    </BouncyTap>
  );
}

function RewardManager() {
  const [shared, updateShared] = useShared();
  const [who, setWho] = useState<ProfileId>("bianca");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [xp, setXp] = useState("");
  const [photo, setPhoto] = useState("");

  const list = shared.rewards[who] ?? [];
  const setList = (fn: (l: typeof list) => typeof list) =>
    updateShared((s) => ({ ...s, rewards: { ...s.rewards, [who]: fn(s.rewards[who] ?? []) } }));

  const add = () => {
    if (!name.trim()) return;
    const cost = Number(xp) || Math.round((Number(price) || 0) * 10);
    if (cost <= 0) return;
    setList((l) => [
      ...l,
      { id: `r-${Date.now()}`, name: name.trim(), xp: cost, ...(photo.trim() ? { photo: photo.trim() } : {}) },
    ]);
    setName("");
    setPrice("");
    setXp("");
    setPhoto("");
  };


  return (
    <section className="quest-card space-y-4 p-6">
      <h2 className="text-xl font-extrabold">Reward manager</h2>
      <ul className="space-y-2">
        {shared.rewards.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-3">
            <input
              value={r.name}
              onChange={(e) =>
                updateShared((s) => ({
                  ...s,
                  rewards: s.rewards.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)),
                }))
              }
              className="min-h-[48px] flex-1 rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              value={r.xp}
              onChange={(e) =>
                updateShared((s) => ({
                  ...s,
                  rewards: s.rewards.map((x) => (x.id === r.id ? { ...x, xp: Number(e.target.value) } : x)),
                }))
              }
              className="min-h-[48px] w-24 rounded-xl bg-secondary/40 px-3 text-right outline-none focus:ring-1 focus:ring-primary"
            />
            <BouncyTap
              onClick={() => updateShared((s) => ({ ...s, rewards: s.rewards.filter((x) => x.id !== r.id) }))}
              className="border border-border px-4 py-2 text-destructive"
            >
              Delete
            </BouncyTap>
          </li>
        ))}
      </ul>

      <div className="space-y-3 rounded-2xl border border-border p-4">
        <h3 className="font-extrabold">Add reward</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Reward name"
          className="min-h-[48px] w-full rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex flex-wrap gap-3">
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setXp(String(Math.round((Number(e.target.value) || 0) * 10)));
            }}
            inputMode="decimal"
            placeholder="Price $"
            className="min-h-[48px] w-32 rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            inputMode="numeric"
            placeholder="XP cost"
            className="min-h-[48px] w-32 rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            placeholder="Photo URL (optional)"
            className="min-h-[48px] flex-1 rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <BouncyTap onClick={add} className="bg-primary px-6 py-3 text-primary-foreground">
          Add reward
        </BouncyTap>
      </div>
    </section>
  );
}
