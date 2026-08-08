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
