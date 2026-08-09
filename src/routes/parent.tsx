import { createFileRoute, Link } from "@tanstack/react-router";
import { famInfo, FOUNDATION_SIX, FOUNDATION_ORDER, type FoundationGroup } from "@/data/questions";
import { useState } from "react";
import { DoodleField, BouncyTap } from "@/components/quest/Doodles";
import {
  PROFILES,
  dayOf,
  maybeDayBonus,
  setDay,
  addXp,
  STRUGGLE_LABEL,
  todayKey,
  useProfile,
  useShared,
  type ProfileId,
} from "@/lib/quest-store";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Panel — SSAT Quest" },
      {
        name: "description",
        content: "Manage rewards, approve redemptions, and award exit-ticket stars.",
      },
      { property: "og:title", content: "Parent Panel — SSAT Quest" },
      {
        property: "og:description",
        content: "Rewards, approvals, and daily stars for SSAT Quest.",
      },
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

        <LessonSections
          enabled={shared.enabledGroups}
          onChange={(groups) => updateShared((s) => ({ ...s, enabledGroups: groups }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILES.map((p) => (
            <GirlCard key={p.id} id={p.id} name={p.name} accent={p.accent} />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILES.map((p) => (
            <ProgressReport key={p.id} id={p.id} name={p.name} />
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

function LessonSections({
  enabled,
  onChange,
}: {
  enabled: string[] | undefined;
  onChange: (groups: string[]) => void;
}) {
  // undefined/empty means "all six on"
  const allOn = !enabled || enabled.length === 0;
  const isOn = (g: FoundationGroup) => allOn || enabled!.includes(g);

  const toggle = (g: FoundationGroup) => {
    const current = allOn ? [...FOUNDATION_ORDER] : [...enabled!];
    const next = current.includes(g) ? current.filter((x) => x !== g) : [...current, g];
    // never allow zero sections — fall back to all-on
    onChange(next.length === 0 ? [...FOUNDATION_ORDER] : next);
  };

  const onCount = FOUNDATION_ORDER.filter(isOn).length;

  return (
    <section className="quest-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">What they practice</h2>
        <BouncyTap
          onClick={() => onChange([...FOUNDATION_ORDER])}
          className="border border-border px-4 py-2 text-sm"
        >
          Turn all on
        </BouncyTap>
      </div>
      <p className="text-sm text-muted-foreground">
        Turn on only the bridges you&rsquo;ve taught. Practice draws from these only — so the girls
        drill exactly what they just learned. ({onCount} of 6 on)
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {FOUNDATION_ORDER.map((g) => {
          const on = isOn(g);
          return (
            <BouncyTap
              key={g}
              onClick={() => toggle(g)}
              className={`flex items-center justify-between gap-3 border px-4 py-3 text-left ${
                on ? "border-primary bg-primary/10" : "border-border opacity-60"
              }`}
            >
              <span>
                <span className="block text-lg font-extrabold">{FOUNDATION_SIX[g].label}</span>
                <span className="block text-xs text-muted-foreground">{FOUNDATION_SIX[g].ask}</span>
              </span>
              <span
                className={`text-sm font-bold ${on ? "text-primary" : "text-muted-foreground"}`}
              >
                {on ? "ON" : "off"}
              </span>
            </BouncyTap>
          );
        })}
      </div>
    </section>
  );
}

function ManualPoints({ id, name }: { id: ProfileId; name: string }) {
  const [, update] = useProfile(id);
  const [custom, setCustom] = useState("");
  const give = (amount: number) => {
    if (amount === 0) return;
    update((prev) => addXp(prev, amount));
  };
  const giveCustom = () => {
    const n = Math.round(Number(custom));
    if (!n) return;
    give(n);
    setCustom("");
  };
  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-border p-3">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
        Add session points
      </h3>
      <div className="flex flex-wrap gap-2">
        {[10, 25, 50].map((n) => (
          <BouncyTap
            key={n}
            onClick={() => give(n)}
            className="bg-primary px-4 py-2 text-primary-foreground"
          >
            +{n}
          </BouncyTap>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          inputMode="numeric"
          placeholder="#"
          className="min-h-[44px] w-20 rounded-xl bg-secondary/40 px-3 text-center outline-none focus:ring-1 focus:ring-primary"
        />
        <BouncyTap onClick={giveCustom} className="border border-border px-4 py-2">
          Give {name.split(" ")[0]}
        </BouncyTap>
      </div>
    </div>
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
          r.id === rid
            ? { ...r, status: "approved" as const, resolvedAt: new Date().toISOString() }
            : r,
        ),
      };
    });

  const decline = (rid: string) =>
    update((prev) => ({
      ...prev,
      redemptions: prev.redemptions.map((r) =>
        r.id === rid
          ? { ...r, status: "declined" as const, resolvedAt: new Date().toISOString() }
          : r,
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

      <ManualPoints id={id} name={name} />
      {pending.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-extrabold text-primary">Waiting for Mom</h3>
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-3">
              <p className="font-bold">
                {r.name} — {r.cost} XP
              </p>
              <div className="mt-2 flex gap-2">
                <BouncyTap
                  onClick={() => approve(r.id)}
                  className="bg-primary px-5 py-3 text-primary-foreground"
                >
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
      {
        id: `r-${Date.now()}`,
        name: name.trim(),
        xp: cost,
        ...(photo.trim() ? { photo: photo.trim() } : {}),
      },
    ]);
    setName("");
    setPrice("");
    setXp("");
    setPhoto("");
  };

  return (
    <section className="quest-card space-y-4 p-6">
      <h2 className="text-xl font-extrabold">Reward manager</h2>
      <p className="text-sm text-muted-foreground">Each girl has her own private wishlist.</p>
      <div className="flex gap-2">
        {PROFILES.map((pr) => (
          <BouncyTap
            key={pr.id}
            onClick={() => setWho(pr.id)}
            className={
              who === pr.id
                ? "bg-primary px-5 py-2 text-primary-foreground"
                : "border border-border px-5 py-2"
            }
          >
            {pr.name}
          </BouncyTap>
        ))}
      </div>
      <ul className="space-y-2">
        {list.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-3"
          >
            <input
              value={r.name}
              onChange={(e) =>
                setList((l) => l.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))
              }
              className="min-h-[48px] flex-1 rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              value={r.xp}
              onChange={(e) =>
                setList((l) =>
                  l.map((x) => (x.id === r.id ? { ...x, xp: Number(e.target.value) } : x)),
                )
              }
              className="min-h-[48px] w-24 rounded-xl bg-secondary/40 px-3 text-right outline-none focus:ring-1 focus:ring-primary"
            />
            <BouncyTap
              onClick={() => setList((l) => l.filter((x) => x.id !== r.id))}
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

/** What each girl actually did: questions finished, right/wrong, and weak categories. */
function ProgressReport({ id, name }: { id: ProfileId; name: string }) {
  const [p] = useProfile(id);
  const all = p.history ?? [];
  const history = all.filter((h) => !h.skipped);
  const skipped = all.length - history.length;
  const total = history.length;
  const right = history.filter((h) => h.correct).length;
  const catRight = history.filter((h) => h.familyRight).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const byFamily = new Map<string, { total: number; wrong: number }>();
  for (const h of history) {
    const row = byFamily.get(h.family) ?? { total: 0, wrong: 0 };
    row.total += 1;
    if (!h.correct) row.wrong += 1;
    byFamily.set(h.family, row);
  }
  const weak = [...byFamily.entries()]
    .filter(([, r]) => r.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 3);

  const coachHelped = history.filter((h) => h.coachUsed).length;
  const selfSolved = history.length - coachHelped;
  const trips = new Map<string, number>();
  for (const h of all) {
    const k = h.struggle ?? "none";
    if (k === "none") continue;
    trips.set(k, (trips.get(k) ?? 0) + 1);
  }
  const tripped = [...trips.entries()].sort((a, b) => b[1] - a[1]);

  const recent = [...all].reverse().slice(0, 8);

  return (
    <section className="quest-card space-y-3 p-6">
      <h2 className="text-xl font-extrabold">{name}&rsquo;s progress</h2>
      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No finished questions yet. XP can be earned mid-question, but a question only counts once
          she taps through to the end.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Answered" value={String(total)} />
            <Stat label="Correct" value={`${pct(right)}%`} />
            <Stat label="Category right" value={`${pct(catRight)}%`} />
            <Stat label="Skipped" value={String(skipped)} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat label="Solved solo" value={String(selfSolved)} />
            <Stat label="Coach helped" value={String(coachHelped)} />
          </div>

          {tripped.length > 0 && (
            <div className="rounded-2xl border border-border p-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
                What tripped her up
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {tripped.map(([k, n]) => (
                  <li key={k}>
                    {STRUGGLE_LABEL[k as keyof typeof STRUGGLE_LABEL] ?? k} — {n} question
                    {n === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weak.length > 0 && (
            <div className="rounded-2xl border border-border p-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
                Needs work
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {weak.map(([fam, r]) => (
                  <li key={fam}>
                    {famInfo(fam).label} — missed {r.wrong} of {r.total}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="space-y-1 text-sm">
            {recent.map((h, i) => (
              <li key={`${h.qid}-${h.at}-${i}`} className="flex items-center justify-between gap-2">
                <span className="font-bold">{h.stem}</span>
                <span className="shrink-0 text-muted-foreground">
                  {h.skipped
                    ? `skipped → ${h.correctChoice}`
                    : h.correct
                      ? "✓"
                      : `✗ ${h.choice ?? "—"} → ${h.correctChoice}`}
                  {h.skipped || h.familyRight ? "" : " · category off"}
                  {h.peeked ? " · peeked" : ""}
                  {h.coachUsed ? ` · coach ×${h.coachSteps ?? 1}` : ""}
                  {h.struggle && h.struggle !== "none"
                    ? ` · ${STRUGGLE_LABEL[h.struggle].toLowerCase()}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="text-2xl font-extrabold text-primary">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
