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

function replaceWord(text: string, from: string, to: string) {
  const f = from.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!f) return text;
  const re = new RegExp(`\\b${f}(s|es)?\\b`, "gi");
  return text.replace(re, (match: string, suffix?: string) => {
    const isUpper = match === match.toUpperCase() && match.length > 1;
    const cap = /^[A-Z]/.test(match);
    let out = to.toLowerCase();
    if (suffix) out += suffix.toLowerCase();
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
  out = out.replace(/\u0001/g, c1.toLowerCase()).replace(/\u0002/g, c2.toLowerCase());
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
