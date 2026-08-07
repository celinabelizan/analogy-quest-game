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
