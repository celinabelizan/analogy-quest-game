export function pairWords(pair: string): [string, string] {
  const parts = pair.split(":").map((s) => s.trim());
  return [parts[0] ?? "", parts[1] ?? ""];
}

function fixArticles(text: string) {
  return text.replace(/\b([Aa]n?)\s+([A-Za-z])/g, (_m: string, art: string, letter: string) => {
    const vowel = /[aeiou]/i.test(letter);
    const base = vowel ? "an" : "a";
    const cased = art.startsWith("A") ? base.charAt(0).toUpperCase() + base.slice(1) : base;
    return `${cased} ${letter}`;
  });
}

function applySuffix(base: string, suffix: string) {
  const s = suffix.toLowerCase();
  const b = base.toLowerCase();
  if (!s) return b;
  if (s === "ly") {
    if (b.endsWith("ly")) return b;
    if (b.endsWith("y")) return b.slice(0, -1) + "ily";
    if (b.endsWith("le")) return b.slice(0, -1) + "y";
    return b + "ly";
  }
  if (s === "ies") return b.endsWith("y") ? b.slice(0, -1) + "ies" : b + "s";
  if (s === "s" || s === "es") {
    if (/(s|x|z|ch|sh)$/.test(b)) return b + "es";
    if (b.endsWith("y") && !/[aeiou]y$/.test(b)) return b.slice(0, -1) + "ies";
    return b + "s";
  }
  if (s === "ing") return b.endsWith("e") ? b.slice(0, -1) + "ing" : b + "ing";
  if (s === "ed") {
    if (b.endsWith("e")) return b + "d";
    if (b.endsWith("y") && !/[aeiou]y$/.test(b)) return b.slice(0, -1) + "ied";
    return b + "ed";
  }
  if (s === "er" || s === "est") {
    if (b.endsWith("e")) return b + s.slice(1);
    if (b.endsWith("y") && !/[aeiou]y$/.test(b)) return b.slice(0, -1) + "i" + s;
    return b + s;
  }
  return b + s;
}

function replaceWord(text: string, from: string, to: string) {
  const raw = from.toLowerCase();
  // allow the bridge to use an inflected form of the stem word (slow -> slowly)
  const stems = [raw];
  if (raw.endsWith("e")) stems.push(raw.slice(0, -1));
  if (raw.endsWith("y")) stems.push(raw.slice(0, -1) + "i");
  const esc = stems.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (!esc.length) return text;
  const re = new RegExp(`\\b(?:${esc.join("|")})(ly|ies|ing|ed|est|er|es|s)?\\b`, "gi");
  return text.replace(re, (match: string, suffix?: string) => {
    const isUpper = match === match.toUpperCase() && match.length > 1;
    const cap = /^[A-Z]/.test(match);
    const out = applySuffix(to, suffix ?? "");
    if (isUpper) return out.toUpperCase();
    if (cap) return out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  });
}

/** Swap the stem's two words for the choice's two words inside her own sentence. */
export function monkeySwap(bridge: string, stem: string, choicePair: string) {
  const [s1, s2] = pairWords(stem);
  const [c1, c2] = pairWords(choicePair);
  let out = replaceWord(bridge, s1, "\u0001");
  out = replaceWord(out, s2, "\u0002");
  // restore placeholders, preserving any inflection suffix the swap produced
  out = out.replace(/\u0001(ly|ies|ing|ed|est|er|es|s)?/gi, (_m, suf?: string) =>
    applySuffix(c1, suf ?? ""),
  );
  out = out.replace(/\u0002(ly|ies|ing|ed|est|er|es|s)?/gi, (_m, suf?: string) =>
    applySuffix(c2, suf ?? ""),
  );
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return fixArticles(out);
}


export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const lower = (w: string) => w.toLowerCase();

/** Escalating, stem-specific coaching when more than one choice survives. */
export function looseHint(stem: string, familyLabel: string, standing: number, attempt: number) {
  const [a, b] = pairWords(stem).map(lower);
  if (attempt === 0)
    return `Say what makes ${a} special: how, why, or how much does it connect to ${b}? Right now your sentence would also be true of ${standing - 1} other pair${standing - 1 === 1 ? "" : "s"}.`;
  if (attempt === 1)
    return `Try this shape: "A ${a} is the one thing that ____ a ${b}." Put the word "only", "always", or "in order to" in it — that's what a ${familyLabel.toLowerCase()} bridge needs.`;
  return `Look at the pairs still standing and ask: what is true of ${a} and ${b} that is NOT true of those? Put exactly that word into your sentence.`;
}

/** Stem-specific coaching when she discarded everything. */
export function strictHint(stem: string) {
  const [a, b] = pairWords(stem).map(lower);
  return `Your sentence is doing too much. Keep only the part that a ${a} and a ${b} must have, and drop the extra detail — then test again.`;
}

/** Help for when she doesn't know one of the stem words. */
export function unknownWordSteps(stem: string) {
  const [a, b] = pairWords(stem).map(lower);
  return [
    `Say "${a}" and "${b}" out loud. Do you know a piece of either word — a root, a smaller word inside it, or a word it sounds like?`,
    `Use the word you DO know. Write a sentence about ${b} first, then guess what ${a} must be for the sentence to work.`,
    `Work backwards: build a bridge for each answer choice. Two choices with the SAME bridge can both be crossed off — the answer is never a tie.`,
    `Still stuck? Peek at the model sentence, read it, then say it back in your own words. Peeking still teaches you the bridge.`,
  ];
}

/** Method two: match the grammar shape of the stem pair. */
export function partsOfSpeechHint(stem: string) {
  const [a, b] = pairWords(stem).map(lower);
  return `Method two — grammar match. Decide what "${a}" is (noun? verb? adjective?) and what "${b}" is, then check each pair left. If a pair's words aren't the same kinds of words in the same order as ${a} : ${b}, cross it off even if it feels related.`;
}

/** The traps SSAT writers reuse on almost every analogy. */
export const TRAPS: { name: string; tell: string }[] = [
  { name: "Same topic, wrong bridge", tell: "It's about the same subject as the stem, so it feels right — but the connection is different. Topic never counts." },
  { name: "Flipped pair", tell: "The right relationship, but backwards. Read your sentence in the same order both times." },
  { name: "Part instead of whole", tell: "It swaps one word for a piece of it (needle/compass), quietly changing the bridge." },
  { name: "Too weak or too strong", tell: "The idea is right but the degree is off — 'damp' is not 'flooded'." },
  { name: "Two choices with the same bridge", tell: "If two pairs share one bridge, neither can be the answer. Cross off both." },
];

/** A choice whose explanation says the relationship runs backwards. */
export function isReversedTrap(why: string) {
  return /revers|backward|flipped|wrong order|other order/i.test(why);
}

/** Live coaching ladder for the discard screen — one step at a time, on demand. */
export function coachLadder(
  stem: string,
  familyLabel: string,
  standingPairs: string[],
  step: number,
): { title: string; tip: string; action: "rewrite" | "reread" } {
  const [a, b] = pairWords(stem).map(lower);
  const fam = familyLabel.toLowerCase();
  const steps: { title: string; tip: string; action: "rewrite" | "reread" }[] = [
    {
      title: "Start with the one word that matters",
      tip: `Finish this out loud: "A ${a} is the thing that ____ a ${b}." The blank should be a verb, not "is related to". That verb is your whole sentence.`,
      action: "rewrite",
    },
    {
      title: "Add a limiter",
      tip: `Drop "only", "always", "must", or "in order to" into your sentence — that is what a ${fam} bridge needs. "A ${a} is ALWAYS used to ____ a ${b}."`,
      action: "rewrite",
    },
    {
      title: "Compare survivors head to head",
      tip: standingPairs.length
        ? `Read your sentence with ${standingPairs.join(" and then with ")}. The moment one sounds even a little bit "sort of true", cross it out — "sort of" is a no.`
        : `Read your sentence with each pair left. "Sort of true" is a no.`,
      action: "reread",
    },
    {
      title: "Check the order",
      tip: `Say it both ways: "${a} to ${b}" and "${b} to ${a}". They are different sentences. A pair that only works backwards is out.`,
      action: "reread",
    },
    {
      title: "Grammar match",
      tip: partsOfSpeechHint(stem),
      action: "reread",
    },
  ];
  return steps[Math.min(step, steps.length - 1)]!;
}

/** Nudge when a backwards pair is still standing (or was chosen). */
export function reversalPrompt(stem: string, pair?: string) {
  const [a, b] = pairWords(stem).map(lower);
  if (pair) {
    const [x, y] = pairWords(pair).map(lower);
    return `"${x} : ${y}" is the right idea running backwards. Your bridge goes ${a} → ${b}, so the answer has to go the same way — "${y} : ${x}" would have worked.`;
  }
  return `Order check: one pair still standing has the right relationship, but backwards. Read your sentence in the same direction every time — ${a} first, ${b} second.`;
}


/* ---------------- Parts of speech: heuristic grammar check ---------------- */

export type Pos = "noun" | "verb" | "adjective" | "adverb";

/** Confident guesses only — returns null when the ending gives nothing away. */
export function guessPos(word: string): Pos | null {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  if (/ly$/.test(w) && w.length > 4) return "adverb";
  if (/(tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ist|ology|ure|age)$/.test(w)) return "noun";
  if (/(ous|ful|less|ive|able|ible|ish|ic|al)$/.test(w) && w.length > 4) return "adjective";
  if (/(ate|ify|ize|ise)$/.test(w) && w.length > 4) return "verb";
  return null;
}

/** Grammar shape of a "X : Y" pair, with nulls where we can't tell. */
export function posShape(pair: string): [Pos | null, Pos | null] {
  const [a, b] = pairWords(pair);
  return [guessPos(a), guessPos(b)];
}

/**
 * Choices whose grammar shape clearly disagrees with the stem's.
 * Only reports when BOTH sides are confident guesses, so it never bluffs.
 */
export function posMismatches(
  stem: string,
  pairs: { label: string; pair: string }[],
): { label: string; pair: string; reason: string }[] {
  const [sa, sb] = posShape(stem);
  const [s1, s2] = pairWords(stem).map((w) => w.toLowerCase());
  const out: { label: string; pair: string; reason: string }[] = [];
  for (const c of pairs) {
    const [ca, cb] = posShape(c.pair);
    const [c1, c2] = pairWords(c.pair).map((w) => w.toLowerCase());
    if (sa && ca && sa !== ca) {
      out.push({
        label: c.label,
        pair: c.pair,
        reason: `"${s1}" is ${article(sa)} ${sa}, but "${c1}" is ${article(ca)} ${ca}. Different kinds of words in the first slot — cross it off.`,
      });
      continue;
    }
    if (sb && cb && sb !== cb) {
      out.push({
        label: c.label,
        pair: c.pair,
        reason: `"${s2}" is ${article(sb)} ${sb}, but "${c2}" is ${article(cb)} ${cb}. Different kinds of words in the second slot — cross it off.`,
      });
    }
  }
  return out;
}

function article(p: Pos) {
  return p === "adjective" || p === "adverb" ? "an" : "a";
}
