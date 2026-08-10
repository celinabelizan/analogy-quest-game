// Vocab drill bank — root-decode items (RT-*) from Roots Mini-Lesson 1 +
// Lesson 3 word-bank items (VB-*). Generated from SSAT Prep sources; supervisor-validated.
export type VocabChoice = { label: string; text: string; why: string };
export type VocabItem = {
  id: string;
  word: string;
  root: string;
  rootMeaning: string;
  /** Teachable chunk this word belongs to (gates Word Lab by what's been covered). */
  unit: string;
  ask: string;
  correct: string;
  choices: VocabChoice[];
};

export const VOCAB_ITEMS: VocabItem[] = [
  {
    id: "RT-01",
    word: "spectator",
    unit: "roots-mini-1",
    root: "spect",
    rootMeaning: "look",
    ask: "What does SPECTATOR probably mean? (root: spect (look))",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "a person who plays in the game",
        why: "Nope — spect means LOOK. A spectator looks; the players play.",
      },
      {
        label: "B",
        text: "a person who watches",
        why: "Yes! Spect = look. A spectator is literally 'one who looks.' This is your doorway word — remember it and you own the root.",
      },
      {
        label: "C",
        text: "a person who sells tickets",
        why: "Tickets get you in, but there's no 'selling' in this word — just spect, looking.",
      },
      {
        label: "D",
        text: "a person who keeps score",
        why: "Scorekeeping is counting, not looking. Spect = look.",
      },
    ],
  },
  {
    id: "RT-02",
    word: "inspect",
    unit: "roots-mini-1",
    root: "spect",
    rootMeaning: "look",
    ask: "What does INSPECT probably mean? (root: spect (look))",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to throw something away",
        why: "There's no throwing here. In + spect = look INTO.",
      },
      {
        label: "B",
        text: "to fix something broken",
        why: "An inspector might FIND what's broken, but the word itself only means looking, not repairing.",
      },
      {
        label: "C",
        text: "to look at something closely",
        why: "Right! In ('into') + spect ('look') = to look into something carefully. An inspector looks close.",
      },
      {
        label: "D",
        text: "to hide something",
        why: "Opposite direction — inspecting brings things into view, it doesn't hide them.",
      },
    ],
  },
  {
    id: "RT-03",
    word: "retrospect",
    unit: "roots-mini-1",
    root: "spect",
    rootMeaning: "look",
    ask: "What does RETROSPECT probably mean? (root: spect (look))",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "looking back at the past",
        why: "Yes! Retro ('backward' — like retro clothes from the past) + spect ('look') = looking backward. 'In retrospect, that was a bad idea.'",
      },
      {
        label: "B",
        text: "looking forward to the future",
        why: "That's PROspect — pro means forward. Retro means backward. The prefix flips the direction!",
      },
      {
        label: "C",
        text: "showing respect to elders",
        why: "Sounds a bit like 'respect,' but check the parts: retro + spect is about looking backward in TIME, not manners.",
      },
      {
        label: "D",
        text: "a repeated mistake",
        why: "Nothing in retro + spect means mistake — it just means the look is aimed at the past.",
      },
    ],
  },
  {
    id: "RT-04",
    word: "circumspect",
    unit: "roots-mini-1",
    root: "spect",
    rootMeaning: "look",
    ask: "What does CIRCUMSPECT probably mean? (root: spect (look))",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "round or circular in shape",
        why: "Tempting — circum does mean 'around' (like circumference). But the SPECT part means the LOOKING goes around, not the shape.",
      },
      {
        label: "B",
        text: "famous and easily recognized",
        why: "That's closer to conspicuous. Circumspect people actually try NOT to leap into the spotlight.",
      },
      {
        label: "C",
        text: "confused and lost",
        why: "A circumspect person is the opposite of lost — they've checked everything before moving.",
      },
      {
        label: "D",
        text: "careful — checking all around before acting",
        why: "Exactly! Circum ('around') + spect ('look') = looking all around before you act. That's what being cautious literally IS. You just decoded a word most adults can't define.",
      },
    ],
  },
  {
    id: "RT-05",
    word: "factory",
    unit: "roots-mini-1",
    root: "fac/fic",
    rootMeaning: "make, do",
    ask: "What does FACTORY probably mean? (root: fac/fic (make, do))",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "a place where things are stored",
        why: "Storing is a warehouse's job. Fac = MAKE — a factory makes things.",
      },
      {
        label: "B",
        text: "a place where things are made",
        why: "Yes! Fac = make. Factory = the making place. Doorway word — every fac/fic word traces back here.",
      },
      {
        label: "C",
        text: "a place where things are sold",
        why: "Selling happens at a store. The root fac is about making, not selling.",
      },
      {
        label: "D",
        text: "a place where things are tested",
        why: "Testing might happen there, but the word itself says one thing: making.",
      },
    ],
  },
  {
    id: "RT-06",
    word: "artifact",
    unit: "roots-mini-1",
    root: "fac/fic",
    rootMeaning: "make, do",
    ask: "What does ARTIFACT probably mean? (root: fac/fic (make, do))",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "an object made by human skill",
        why: "Right! Art ('skill') + fact ('made') = a thing somebody made. That's why museums call old tools and pottery artifacts.",
      },
      {
        label: "B",
        text: "a natural rock or fossil",
        why: "Careful — fossils formed naturally. The FACT part tells you a person MADE it.",
      },
      {
        label: "C",
        text: "a fake or forgery",
        why: "An artifact is real! Made-by-hand doesn't mean fake — check RT-08 for the fac word that DOES mean faking.",
      },
      {
        label: "D",
        text: "a piece of artwork hanging in a gallery",
        why: "Close, because art is in there — but artifact covers ANY made object: tools, coins, pots. The fact part just means 'made.'",
      },
    ],
  },
  {
    id: "RT-07",
    word: "proficient",
    unit: "roots-mini-1",
    root: "fac/fic",
    rootMeaning: "make, do",
    ask: "What does PROFICIENT probably mean? (root: fac/fic (make, do))",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "professional — doing it for money",
        why: "Pro here means 'forward,' not 'professional.' You can be proficient at piano without ever being paid.",
      },
      {
        label: "B",
        text: "lacking ability",
        why: "Backwards! That's DEficient — de drags it down, pro pushes it forward. Same root, opposite prefixes.",
      },
      {
        label: "C",
        text: "skilled — able to do something well",
        why: "Yes! Pro ('forward') + fic ('do') = doing so well you move forward. Proficient = skilled.",
      },
      {
        label: "D",
        text: "very fast",
        why: "Speed isn't in the word. Fic = do; proficient is about doing it WELL, fast or slow.",
      },
    ],
  },
  {
    id: "RT-08",
    word: "fabricate",
    unit: "roots-mini-1",
    root: "fac/fic",
    rootMeaning: "make, do",
    ask: "What does FABRICATE probably mean? (root: fac/fic (make, do))",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to buy cloth or fabric",
        why: "Fabric IS in this family (cloth = a made material), but fabricate is a verb about MAKING, not shopping.",
      },
      {
        label: "B",
        text: "to tell the truth",
        why: "Opposite! When someone fabricates a story, the story is made — not found in reality.",
      },
      {
        label: "C",
        text: "to destroy completely",
        why: "Fac words build things up — making, not wrecking.",
      },
      {
        label: "D",
        text: "to make something up — usually a lie",
        why: "Got it! Fabric ('make') + ate = to manufacture something... including a story that never happened. 'He fabricated an excuse' = he built a lie from scratch. The root told you making was involved — the sneaky part is WHAT gets made.",
      },
    ],
  },
  {
    id: "RT-09",
    word: "vocal",
    unit: "roots-mini-1",
    root: "voc/vok",
    rootMeaning: "voice, call",
    ask: "What does VOCAL probably mean? (root: voc/vok (voice, call))",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "quiet and shy",
        why: "Opposite! Voc = voice. A vocal person USES their voice, loudly and often.",
      },
      {
        label: "B",
        text: "speaking up, using your voice openly",
        why: "Yes! Voc = voice. Vocal = voice-y. 'She was vocal about the unfair rule' = she said it out loud.",
      },
      {
        label: "C",
        text: "related to your job",
        why: "That's VOCATION — a 'calling.' Cousin word, same root, different meaning.",
      },
      {
        label: "D",
        text: "musical",
        why: "Half-credit thought — vocals in a song ARE the voice part! But as an adjective for a person, vocal means outspoken.",
      },
    ],
  },
  {
    id: "RT-10",
    word: "advocate",
    unit: "roots-mini-1",
    root: "voc/vok",
    rootMeaning: "voice, call",
    ask: "What does ADVOCATE probably mean? (root: voc/vok (voice, call))",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to speak up in support of someone or something",
        why: "Right! Ad ('toward') + voc ('call') = to call out FOR someone. An advocate lends their voice to your side.",
      },
      {
        label: "B",
        text: "to argue against something",
        why: "Direction's wrong — ad means TOWARD. An advocate calls toward your cause, not against it.",
      },
      {
        label: "C",
        text: "to avoid a difficult topic",
        why: "Advocates do the opposite of avoiding — they raise their voice on purpose.",
      },
      {
        label: "D",
        text: "to give someone advice",
        why: "Sounds a little like 'advice,' but the voc tells you: this is about VOICING support, not offering tips.",
      },
    ],
  },
  {
    id: "RT-11",
    word: "revoke",
    unit: "roots-mini-1",
    root: "voc/vok",
    rootMeaning: "voice, call",
    ask: "What does REVOKE probably mean? (root: voc/vok (voice, call))",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to say something again",
        why: "Re CAN mean again, but here it means BACK: revoke = call BACK. (Compare: return, rewind.)",
      },
      {
        label: "B",
        text: "to remember an old memory",
        why: "That's closer to EVOKE — calling a feeling OUT. Revoke calls a thing BACK to cancel it.",
      },
      {
        label: "C",
        text: "to call back, cancel — take away something that was given",
        why: "Yes! Re ('back') + vok ('call') = call it back. Break the driving rules and your license gets revoked — called back by the state.",
      },
      {
        label: "D",
        text: "to shout loudly",
        why: "Volume isn't the point. The call in revoke is official: 'we take it back.'",
      },
    ],
  },
  {
    id: "RT-12",
    word: "vociferous",
    unit: "roots-mini-1",
    root: "voc/vok",
    rootMeaning: "voice, call",
    ask: "What does VOCIFEROUS probably mean? (root: voc/vok (voice, call))",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "ferocious and violent",
        why: "It SOUNDS like ferocious, and that's the trap. Find the real root: VOC. This word is about voice, not violence.",
      },
      {
        label: "B",
        text: "loud, forceful, refusing to be quiet",
        why: "Yes! Voc ('voice') + fer ('carry') = carrying your voice hard. A vociferous crowd shouts until it's heard. You've never studied this word — the root just decoded it for you.",
      },
      {
        label: "C",
        text: "eating everything in sight",
        why: "That's voRacious — vor means eat (like carnivore). One letter, totally different root. Read carefully!",
      },
      {
        label: "D",
        text: "silent and sulky",
        why: "Dead opposite. A voc word can't mean silent — the voice is baked into it.",
      },
    ],
  },
  {
    id: "RT-13",
    word: "conduct",
    unit: "roots-mini-1",
    root: "duc/duct",
    rootMeaning: "lead",
    ask: "What does CONDUCT probably mean? (root: duc/duct (lead))",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to follow instructions",
        why: "Flip it — duc means LEAD, not follow. The conductor is out front.",
      },
      {
        label: "B",
        text: "to build a structure",
        why: "That's conSTRUCT — struct means build. Conduct's root is duct: lead.",
      },
      {
        label: "C",
        text: "to interrupt something",
        why: "No interrupting here. Con + duct = lead it all the way through, together.",
      },
      {
        label: "D",
        text: "to lead or carry out",
        why: "Yes! Con ('together') + duct ('lead') = to lead. A conductor leads the orchestra; a scientist conducts (leads) an experiment. Doorway word for duc/duct.",
      },
    ],
  },
  {
    id: "RT-14",
    word: "aqueduct",
    unit: "roots-mini-1",
    root: "duc/duct",
    rootMeaning: "lead",
    ask: "What does AQUEDUCT probably mean? (root: duc/duct (lead))",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "a channel that carries water from one place to another",
        why: "Perfect! Aqua ('water' — like aquarium) + duct ('lead') = a water-leader. The Romans built stone aqueducts that still stand today.",
      },
      {
        label: "B",
        text: "an underwater cave",
        why: "Aqua fooled you halfway — but the DUCT part means it LEADS water somewhere. A cave just sits there.",
      },
      {
        label: "C",
        text: "a type of duck that swims",
        why: "Ha — nice try! Duct = lead, not duck. Though both like water.",
      },
      {
        label: "D",
        text: "a water-purifying machine",
        why: "No cleaning in the word. Just aqua + duct: water gets LED from here to there.",
      },
    ],
  },
  {
    id: "RT-15",
    word: "conducive",
    unit: "roots-mini-1",
    root: "duc/duct",
    rootMeaning: "lead",
    ask: "What does CONDUCIVE probably mean? (root: duc/duct (lead))",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "electrically charged",
        why: "You're thinking of a conductor of electricity — good instinct, same root (metal LEADS electricity)! But conducive describes conditions, not wires.",
      },
      {
        label: "B",
        text: "strict and controlling",
        why: "Conducive doesn't boss anything around — it gently LEADS toward a result.",
      },
      {
        label: "C",
        text: "helping to lead toward a result",
        why: "Yes! Con + duc ('lead') = leading toward. 'A quiet room is conducive to studying' = it LEADS you to good studying. Hard word, easy root.",
      },
      {
        label: "D",
        text: "confusing and complicated",
        why: "Nothing tangled here — duc words move in a clear direction: they lead.",
      },
    ],
  },
  {
    id: "RT-16",
    word: "portable",
    unit: "roots-mini-1",
    root: "port",
    rootMeaning: "carry",
    ask: "What does PORTABLE probably mean? (root: port (carry))",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "waterproof",
        why: "No water in the word. Port = carry; -able = able to be. Carry-able.",
      },
      {
        label: "B",
        text: "able to be carried around",
        why: "Yes! Port ('carry') + able = carry-able. A portable speaker travels with you. Doorway logic: airport, transport, portable — port is always carrying something.",
      },
      {
        label: "C",
        text: "small and cute",
        why: "Portable things are OFTEN small, but the word only promises one thing: you can carry it.",
      },
      {
        label: "D",
        text: "expensive",
        why: "Price isn't in the roots. Port + able = carryable, whether it costs $5 or $500.",
      },
    ],
  },
  {
    id: "RT-17",
    word: "export",
    unit: "roots-mini-1",
    root: "port",
    rootMeaning: "carry",
    ask: "What does EXPORT probably mean? (root: port (carry))",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to bring goods into a country",
        why: "That's IMport — im means IN. Ex means OUT. The prefix is the steering wheel; the root is the engine.",
      },
      {
        label: "B",
        text: "to destroy old products",
        why: "Nothing gets destroyed — ex + port just carries things OUT.",
      },
      {
        label: "C",
        text: "to copy a computer file",
        why: "Fun fact: computers borrowed this word! 'Export a file' = carry it out of the app. But the original meaning is goods leaving a country.",
      },
      {
        label: "D",
        text: "to carry goods out of a country to sell elsewhere",
        why: "Yes! Ex ('out') + port ('carry') = carry out. Brazil exports coffee; Japan exports cars. Import and export are mirror twins — the prefix flips the direction.",
      },
    ],
  },
  {
    id: "RT-18",
    word: "deport",
    unit: "roots-mini-1",
    root: "port",
    rootMeaning: "carry",
    ask: "What does DEPORT probably mean? (root: port (carry))",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to force someone to leave a country",
        why: "Yes! De ('away') + port ('carry') = to carry someone away. When a government deports a person, it removes them from the country. You may never have studied this word — but port + a direction prefix told you everything.",
      },
      {
        label: "B",
        text: "to welcome new visitors",
        why: "Opposite — de points AWAY. Deporting removes; it never welcomes.",
      },
      {
        label: "C",
        text: "to report a crime",
        why: "Rhymes with report, but check the parts: de + port = carry away, no 'telling' involved.",
      },
      {
        label: "D",
        text: "to dock a ship at a port",
        why: "Sneaky — seaports ARE where ships dock, and it's the same root (ships carry cargo there). But the verb deport is about carrying a PERSON away.",
      },
    ],
  },
  {
    id: "VB-01",
    word: "outspoken",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does OUTSPOKEN probably mean?",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to hide, cloud over",
        why: "That's what OBSCURE means — different family.",
      },
      {
        label: "B",
        text: "a speech to yourself",
        why: "That's what SOLILOQUY means — different family (root soli = alone).",
      },
      {
        label: "C",
        text: "says what others only think",
        why: "Yes — outspoken = says what others only think. (No root key on this one — that's why the gloss matters.)",
      },
      {
        label: "D",
        text: "the decision handed down",
        why: "That's what VERDICT means — different family (root ver = truth).",
      },
    ],
  },
  {
    id: "VB-02",
    word: "provoke",
    unit: "l3-bank",
    root: "pro",
    rootMeaning: "forth",
    ask: "What does PROVOKE probably mean? (spot the root: pro = forth)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to stir up anger",
        why: "Yes! pro (forth) + vok (call) — the root pro (forth) does the work. Provoke = to stir up anger.",
      },
      { label: "B", text: "calm, composed", why: "That's what SEDATE means — different family." },
      {
        label: "C",
        text: "desire to harm",
        why: "That's what MALICE means — different family (root mal = bad).",
      },
      {
        label: "D",
        text: "a supporter who funds",
        why: "That's what PATRON means — different family.",
      },
    ],
  },
  {
    id: "VB-03",
    word: "evoke",
    unit: "l3-bank",
    root: "e",
    rootMeaning: "out",
    ask: "What does EVOKE probably mean? (spot the root: e = out)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to call out a feeling or memory",
        why: "Yes! e (out) + vok (call) — the root e (out) does the work. Evoke = to call out a feeling or memory.",
      },
      {
        label: "B",
        text: "to speak evil of (verb)",
        why: "That's what MALIGN means — different family (root mal = bad).",
      },
      {
        label: "C",
        text: "rowdy and loud",
        why: "That's what BOISTEROUS means — different family.",
      },
      {
        label: "D",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
    ],
  },
  {
    id: "VB-04",
    word: "predict",
    unit: "l3-bank",
    root: "pre",
    rootMeaning: "before",
    ask: "What does PREDICT probably mean? (spot the root: pre = before)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "one who does good for others",
        why: "That's what BENEFACTOR means — different family (root bene = good).",
      },
      {
        label: "B",
        text: "to hide, cloud over",
        why: "That's what OBSCURE means — different family.",
      },
      {
        label: "C",
        text: "to say what will happen",
        why: "Yes! pre (before) + dict (say) — the root pre (before) does the work. Predict = to say what will happen.",
      },
      {
        label: "D",
        text: "rowdy and loud",
        why: "That's what BOISTEROUS means — different family.",
      },
    ],
  },
  {
    id: "VB-05",
    word: "foretell",
    unit: "l3-bank",
    root: "fore",
    rootMeaning: "before",
    ask: "What does FORETELL probably mean? (spot the root: fore = before)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "same word, built in plain English",
        why: "Yes! fore (before) + tell — the root fore (before) does the work. Foretell = same word, built in plain English.",
      },
      {
        label: "B",
        text: "to call out a feeling or memory",
        why: "That's what EVOKE means — different family (root e = out).",
      },
      {
        label: "C",
        text: "kind, wishing good",
        why: "That's what BENEVOLENT means — different family (root bene = good).",
      },
      {
        label: "D",
        text: "your word-choosing style",
        why: "That's what DICTION means — different family (root dict = say).",
      },
    ],
  },
  {
    id: "VB-06",
    word: "contradict",
    unit: "l3-bank",
    root: "contra",
    rootMeaning: "against",
    ask: "What does CONTRADICT probably mean? (spot the root: contra = against)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to call out a feeling or memory",
        why: "That's what EVOKE means — different family (root e = out).",
      },
      {
        label: "B",
        text: "your word-choosing style",
        why: "That's what DICTION means — different family (root dict = say).",
      },
      {
        label: "C",
        text: "to say the opposite",
        why: "Yes! contra (against) + dict (say) — the root contra (against) does the work. Contradict = to say the opposite.",
      },
      {
        label: "D",
        text: "to make clear",
        why: "That's what CLARIFY means — different family (root clar = clear).",
      },
    ],
  },
  {
    id: "VB-07",
    word: "verdict",
    unit: "l3-bank",
    root: "ver",
    rootMeaning: "truth",
    ask: "What does VERDICT probably mean? (spot the root: ver = truth)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "wishing harm",
        why: "That's what MALEVOLENT means — different family (root male = bad).",
      },
      {
        label: "B",
        text: "a wrongdoer",
        why: "That's what MALEFACTOR means — different family (root male = bad).",
      },
      {
        label: "C",
        text: "the decision handed down",
        why: "Yes! ver (truth) + dict (say) — the root ver (truth) does the work. Verdict = the decision handed down.",
      },
      {
        label: "D",
        text: "to speak evil of (verb)",
        why: "That's what MALIGN means — different family (root mal = bad).",
      },
    ],
  },
  {
    id: "VB-08",
    word: "dictate",
    unit: "l3-bank",
    root: "dict",
    rootMeaning: "say",
    ask: "What does DICTATE probably mean? (spot the root: dict = say)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "a wrongdoer",
        why: "That's what MALEFACTOR means — different family (root male = bad).",
      },
      {
        label: "B",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
      {
        label: "C",
        text: "to command aloud",
        why: "Yes! dict (say) + -ate (verb) — the root dict (say) does the work. Dictate = to command aloud.",
      },
      {
        label: "D",
        text: "fluent, expressive",
        why: "That's what ELOQUENT means — different family (root e = out).",
      },
    ],
  },
  {
    id: "VB-09",
    word: "diction",
    unit: "l3-bank",
    root: "dict",
    rootMeaning: "say",
    ask: "What does DICTION probably mean? (spot the root: dict = say)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "fluent, expressive",
        why: "That's what ELOQUENT means — different family (root e = out).",
      },
      {
        label: "B",
        text: "the one who receives the good",
        why: "That's what BENEFICIARY means — different family (root bene = good).",
      },
      {
        label: "C",
        text: "your word-choosing style",
        why: "Yes! dict (say) + -tion (noun) — the root dict (say) does the work. Diction = your word-choosing style.",
      },
      {
        label: "D",
        text: "very talkative",
        why: "That's what LOQUACIOUS means — different family (root loqu = talk).",
      },
    ],
  },
  {
    id: "VB-10",
    word: "edict",
    unit: "l3-bank",
    root: "e",
    rootMeaning: "out",
    ask: "What does EDICT probably mean? (spot the root: e = out)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "trimmed to exactly enough words",
        why: "That's what CONCISE means — different family (root cis = cut).",
      },
      {
        label: "B",
        text: "barely talks",
        why: "That's what TACITURN means — different family (root tacit = silent).",
      },
      {
        label: "C",
        text: "very talkative",
        why: "That's what LOQUACIOUS means — different family (root loqu = talk).",
      },
      {
        label: "D",
        text: "an official order",
        why: "Yes! e (out) + dict (say) — the root e (out) does the work. Edict = an official order.",
      },
    ],
  },
  {
    id: "VB-11",
    word: "eloquent",
    unit: "l3-bank",
    root: "e",
    rootMeaning: "out",
    ask: "What does ELOQUENT probably mean? (spot the root: e = out)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to make clear",
        why: "That's what CLARIFY means — different family (root clar = clear).",
      },
      {
        label: "B",
        text: "talking in circles",
        why: "That's what CIRCUMLOCUTION means — different family (root circum = around).",
      },
      {
        label: "C",
        text: "a future possibility",
        why: "That's what PROSPECT means — different family (root pro = forward).",
      },
      {
        label: "D",
        text: "fluent, expressive",
        why: "Yes! e (out) + loqu (talk) — the root e (out) does the work. Eloquent = fluent, expressive.",
      },
    ],
  },
  {
    id: "VB-12",
    word: "articulate",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does ARTICULATE probably mean?",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "trimmed to exactly enough words",
        why: "That's what CONCISE means — different family (root cis = cut).",
      },
      {
        label: "B",
        text: "shortness in words",
        why: "That's what BREVITY means — different family (root brev = short).",
      },
      {
        label: "C",
        text: "speaking clearly and effectively",
        why: "Yes — articulate = speaking clearly and effectively. (No root key on this one — that's why the gloss matters.)",
      },
      {
        label: "D",
        text: "meaning harm (describer)",
        why: "That's what MALICIOUS means — different family (root mal = bad).",
      },
    ],
  },
  {
    id: "VB-13",
    word: "loquacious",
    unit: "l3-bank",
    root: "loqu",
    rootMeaning: "talk",
    ask: "What does LOQUACIOUS probably mean? (spot the root: loqu = talk)",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "a blessing — a good-saying",
        why: "That's what BENEDICTION means — different family (root bene = good).",
      },
      {
        label: "B",
        text: "very talkative",
        why: "Yes! loqu (talk) + -acious (full of) — the root loqu (talk) does the work. Loquacious = very talkative.",
      },
      {
        label: "C",
        text: "to speak evil of (verb)",
        why: "That's what MALIGN means — different family (root mal = bad).",
      },
      {
        label: "D",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
    ],
  },
  {
    id: "VB-14",
    word: "soliloquy",
    unit: "l3-bank",
    root: "soli",
    rootMeaning: "alone",
    ask: "What does SOLILOQUY probably mean? (spot the root: soli = alone)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "a speech to yourself",
        why: "Yes! soli (alone) + loqu (talk) — the root soli (alone) does the work. Soliloquy = a speech to yourself.",
      },
      {
        label: "B",
        text: "to say the opposite",
        why: "That's what CONTRADICT means — different family (root contra = against).",
      },
      {
        label: "C",
        text: "barely talks",
        why: "That's what TACITURN means — different family (root tacit = silent).",
      },
      {
        label: "D",
        text: "to stir up anger",
        why: "That's what PROVOKE means — different family (root pro = forth).",
      },
    ],
  },
  {
    id: "VB-15",
    word: "circumlocution",
    unit: "l3-bank",
    root: "circum",
    rootMeaning: "around",
    ask: "What does CIRCUMLOCUTION probably mean? (spot the root: circum = around)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "rowdy and loud",
        why: "That's what BOISTEROUS means — different family.",
      },
      {
        label: "B",
        text: "the one who receives the good",
        why: "That's what BENEFICIARY means — different family (root bene = good).",
      },
      {
        label: "C",
        text: "an illness",
        why: "That's what MALADY means — different family (root mal = bad).",
      },
      {
        label: "D",
        text: "talking in circles",
        why: "Yes! circum (around) + locut (talk) — the root circum (around) does the work. Circumlocution = talking in circles.",
      },
    ],
  },
  {
    id: "VB-16",
    word: "taciturn",
    unit: "l3-bank",
    root: "tacit",
    rootMeaning: "silent",
    ask: "What does TACITURN probably mean? (spot the root: tacit = silent)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "barely talks",
        why: "Yes! tacit (silent) — the root tacit (silent) does the work. Taciturn = barely talks.",
      },
      {
        label: "B",
        text: "the decision handed down",
        why: "That's what VERDICT means — different family (root ver = truth).",
      },
      {
        label: "C",
        text: "says what others only think",
        why: "That's what OUTSPOKEN means — different family.",
      },
      {
        label: "D",
        text: "your word-choosing style",
        why: "That's what DICTION means — different family (root dict = say).",
      },
    ],
  },
  {
    id: "VB-17",
    word: "concise",
    unit: "l3-bank",
    root: "cis",
    rootMeaning: "cut",
    ask: "What does CONCISE probably mean? (spot the root: cis = cut)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "a blessing — a good-saying",
        why: "That's what BENEDICTION means — different family (root bene = good).",
      },
      {
        label: "B",
        text: "to speak evil of (verb)",
        why: "That's what MALIGN means — different family (root mal = bad).",
      },
      {
        label: "C",
        text: "trimmed to exactly enough words",
        why: "Yes! cis (cut) — the root cis (cut) does the work. Concise = trimmed to exactly enough words.",
      },
      { label: "D", text: "calm, composed", why: "That's what SEDATE means — different family." },
    ],
  },
  {
    id: "VB-18",
    word: "brevity",
    unit: "l3-bank",
    root: "brev",
    rootMeaning: "short",
    ask: "What does BREVITY probably mean? (spot the root: brev = short)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "wishing harm",
        why: "That's what MALEVOLENT means — different family (root male = bad).",
      },
      {
        label: "B",
        text: "a blessing — a good-saying",
        why: "That's what BENEDICTION means — different family (root bene = good).",
      },
      {
        label: "C",
        text: "shortness in words",
        why: "Yes! brev (short) + -ity (noun) — the root brev (short) does the work. Brevity = shortness in words.",
      },
      {
        label: "D",
        text: "a supporter who funds",
        why: "That's what PATRON means — different family.",
      },
    ],
  },
  {
    id: "VB-19",
    word: "boisterous",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does BOISTEROUS probably mean?",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "helpful, doing good",
        why: "That's what BENEFICIAL means — different family (root bene = good).",
      },
      {
        label: "B",
        text: "a wrongdoer",
        why: "That's what MALEFACTOR means — different family (root male = bad).",
      },
      {
        label: "C",
        text: "one who does good for others",
        why: "That's what BENEFACTOR means — different family (root bene = good).",
      },
      {
        label: "D",
        text: "rowdy and loud",
        why: "Yes — boisterous = rowdy and loud. (No root key on this one — that's why the gloss matters.)",
      },
    ],
  },
  {
    id: "VB-20",
    word: "sedate",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does SEDATE probably mean?",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to stir up anger",
        why: "That's what PROVOKE means — different family (root pro = forth).",
      },
      {
        label: "B",
        text: "the one who receives the good",
        why: "That's what BENEFICIARY means — different family (root bene = good).",
      },
      {
        label: "C",
        text: "a future possibility",
        why: "That's what PROSPECT means — different family (root pro = forward).",
      },
      {
        label: "D",
        text: "calm, composed",
        why: "Yes — sedate = calm, composed. (No root key on this one — that's why the gloss matters.)",
      },
    ],
  },
  {
    id: "VB-21",
    word: "clarify",
    unit: "l3-bank",
    root: "clar",
    rootMeaning: "clear",
    ask: "What does CLARIFY probably mean? (spot the root: clar = clear)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to make clear",
        why: "Yes! clar (clear) + -ify (make) — the root clar (clear) does the work. Clarify = to make clear.",
      },
      {
        label: "B",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
      {
        label: "C",
        text: "same word, built in plain English",
        why: "That's what FORETELL means — different family (root fore = before).",
      },
      {
        label: "D",
        text: "very talkative",
        why: "That's what LOQUACIOUS means — different family (root loqu = talk).",
      },
    ],
  },
  {
    id: "VB-22",
    word: "obscure",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does OBSCURE probably mean?",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "says what others only think",
        why: "That's what OUTSPOKEN means — different family.",
      },
      {
        label: "B",
        text: "to hide, cloud over",
        why: "Yes — obscure = to hide, cloud over. (No root key on this one — that's why the gloss matters.)",
      },
      {
        label: "C",
        text: "the one who receives the good",
        why: "That's what BENEFICIARY means — different family (root bene = good).",
      },
      {
        label: "D",
        text: "an illness",
        why: "That's what MALADY means — different family (root mal = bad).",
      },
    ],
  },
  {
    id: "VB-23",
    word: "benevolent",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEVOLENT probably mean? (spot the root: bene = good)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to call out a feeling or memory",
        why: "That's what EVOKE means — different family (root e = out).",
      },
      {
        label: "B",
        text: "a wrongdoer",
        why: "That's what MALEFACTOR means — different family (root male = bad).",
      },
      {
        label: "C",
        text: "desire to harm",
        why: "That's what MALICE means — different family (root mal = bad).",
      },
      {
        label: "D",
        text: "kind, wishing good",
        why: "Yes! bene (good) + vol (wish) — the root bene (good) does the work. Benevolent = kind, wishing good.",
      },
    ],
  },
  {
    id: "VB-24",
    word: "malevolent",
    unit: "l3-bank",
    root: "male",
    rootMeaning: "bad",
    ask: "What does MALEVOLENT probably mean? (spot the root: male = bad)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "wishing harm",
        why: "Yes! male (bad) + vol (wish) — the root male (bad) does the work. Malevolent = wishing harm.",
      },
      {
        label: "B",
        text: "speaking clearly and effectively",
        why: "That's what ARTICULATE means — different family.",
      },
      {
        label: "C",
        text: "fluent, expressive",
        why: "That's what ELOQUENT means — different family (root e = out).",
      },
      {
        label: "D",
        text: "a supporter who funds",
        why: "That's what PATRON means — different family.",
      },
    ],
  },
  {
    id: "VB-25",
    word: "benefactor",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEFACTOR probably mean? (spot the root: bene = good)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "wishing harm",
        why: "That's what MALEVOLENT means — different family (root male = bad).",
      },
      {
        label: "B",
        text: "barely talks",
        why: "That's what TACITURN means — different family (root tacit = silent).",
      },
      {
        label: "C",
        text: "one who does good for others",
        why: "Yes! bene (good) + fact (do) — the root bene (good) does the work. Benefactor = one who does good for others.",
      },
      {
        label: "D",
        text: "very talkative",
        why: "That's what LOQUACIOUS means — different family (root loqu = talk).",
      },
    ],
  },
  {
    id: "VB-26",
    word: "beneficiary",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEFICIARY probably mean? (spot the root: bene = good)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "speaking clearly and effectively",
        why: "That's what ARTICULATE means — different family.",
      },
      {
        label: "B",
        text: "talking in circles",
        why: "That's what CIRCUMLOCUTION means — different family (root circum = around).",
      },
      {
        label: "C",
        text: "shortness in words",
        why: "That's what BREVITY means — different family (root brev = short).",
      },
      {
        label: "D",
        text: "the one who receives the good",
        why: "Yes! bene (good) + -ary (receiver) — the root bene (good) does the work. Beneficiary = the one who receives the good.",
      },
    ],
  },
  {
    id: "VB-27",
    word: "malefactor",
    unit: "l3-bank",
    root: "male",
    rootMeaning: "bad",
    ask: "What does MALEFACTOR probably mean? (spot the root: male = bad)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to make clear",
        why: "That's what CLARIFY means — different family (root clar = clear).",
      },
      {
        label: "B",
        text: "speaking clearly and effectively",
        why: "That's what ARTICULATE means — different family.",
      },
      {
        label: "C",
        text: "a wrongdoer",
        why: "Yes! male (bad) + fact (do) — the root male (bad) does the work. Malefactor = a wrongdoer.",
      },
      {
        label: "D",
        text: "barely talks",
        why: "That's what TACITURN means — different family (root tacit = silent).",
      },
    ],
  },
  {
    id: "VB-28",
    word: "benign",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENIGN probably mean? (spot the root: bene = good)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "gentle, harmless",
        why: "Yes! bene (good) — the root bene (good) does the work. Benign = gentle, harmless.",
      },
      {
        label: "B",
        text: "to make clear",
        why: "That's what CLARIFY means — different family (root clar = clear).",
      },
      {
        label: "C",
        text: "trimmed to exactly enough words",
        why: "That's what CONCISE means — different family (root cis = cut).",
      },
      {
        label: "D",
        text: "desire to harm",
        why: "That's what MALICE means — different family (root mal = bad).",
      },
    ],
  },
  {
    id: "VB-29",
    word: "beneficial",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEFICIAL probably mean? (spot the root: bene = good)",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "to stir up anger",
        why: "That's what PROVOKE means — different family (root pro = forth).",
      },
      {
        label: "B",
        text: "helpful, doing good",
        why: "Yes! bene (good) — the root bene (good) does the work. Beneficial = helpful, doing good.",
      },
      {
        label: "C",
        text: "wishing harm",
        why: "That's what MALEVOLENT means — different family (root male = bad).",
      },
      {
        label: "D",
        text: "a speech to yourself",
        why: "That's what SOLILOQUY means — different family (root soli = alone).",
      },
    ],
  },
  {
    id: "VB-30",
    word: "malign",
    unit: "l3-bank",
    root: "mal",
    rootMeaning: "bad",
    ask: "What does MALIGN probably mean? (spot the root: mal = bad)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to speak evil of (verb)",
        why: "Yes! mal (bad) + lign — the root mal (bad) does the work. Malign = to speak evil of (verb).",
      },
      {
        label: "B",
        text: "to command aloud",
        why: "That's what DICTATE means — different family (root dict = say).",
      },
      {
        label: "C",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
      { label: "D", text: "calm, composed", why: "That's what SEDATE means — different family." },
    ],
  },
  {
    id: "VB-31",
    word: "malicious",
    unit: "l3-bank",
    root: "mal",
    rootMeaning: "bad",
    ask: "What does MALICIOUS probably mean? (spot the root: mal = bad)",
    correct: "B",
    choices: [
      { label: "A", text: "calm, composed", why: "That's what SEDATE means — different family." },
      {
        label: "B",
        text: "meaning harm (describer)",
        why: "Yes! mal (bad) + -ous — the root mal (bad) does the work. Malicious = meaning harm (describer).",
      },
      {
        label: "C",
        text: "a curse — a bad-saying",
        why: "That's what MALEDICTION means — different family (root male = bad).",
      },
      {
        label: "D",
        text: "to command aloud",
        why: "That's what DICTATE means — different family (root dict = say).",
      },
    ],
  },
  {
    id: "VB-32",
    word: "malice",
    unit: "l3-bank",
    root: "mal",
    rootMeaning: "bad",
    ask: "What does MALICE probably mean? (spot the root: mal = bad)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "fluent, expressive",
        why: "That's what ELOQUENT means — different family (root e = out).",
      },
      {
        label: "B",
        text: "gentle, harmless",
        why: "That's what BENIGN means — different family (root bene = good).",
      },
      {
        label: "C",
        text: "barely talks",
        why: "That's what TACITURN means — different family (root tacit = silent).",
      },
      {
        label: "D",
        text: "desire to harm",
        why: "Yes! mal (bad) + -ice (noun) — the root mal (bad) does the work. Malice = desire to harm.",
      },
    ],
  },
  {
    id: "VB-33",
    word: "malady",
    unit: "l3-bank",
    root: "mal",
    rootMeaning: "bad",
    ask: "What does MALADY probably mean? (spot the root: mal = bad)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "an illness",
        why: "Yes! mal (bad) — the root mal (bad) does the work. Malady = an illness.",
      },
      {
        label: "B",
        text: "talking in circles",
        why: "That's what CIRCUMLOCUTION means — different family (root circum = around).",
      },
      {
        label: "C",
        text: "to hide, cloud over",
        why: "That's what OBSCURE means — different family.",
      },
      {
        label: "D",
        text: "fluent, expressive",
        why: "That's what ELOQUENT means — different family (root e = out).",
      },
    ],
  },
  {
    id: "VB-34",
    word: "malediction",
    unit: "l3-bank",
    root: "male",
    rootMeaning: "bad",
    ask: "What does MALEDICTION probably mean? (spot the root: male = bad)",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "a speech to yourself",
        why: "That's what SOLILOQUY means — different family (root soli = alone).",
      },
      {
        label: "B",
        text: "a curse — a bad-saying",
        why: "Yes! male (bad) + dict (say) — the root male (bad) does the work. Malediction = a curse — a bad-saying.",
      },
      {
        label: "C",
        text: "an official order",
        why: "That's what EDICT means — different family (root e = out).",
      },
      { label: "D", text: "calm, composed", why: "That's what SEDATE means — different family." },
    ],
  },
  {
    id: "VB-35",
    word: "benediction",
    unit: "l3-bank",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEDICTION probably mean? (spot the root: bene = good)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to draw out",
        why: "That's what ELICIT means — different family (root e = out).",
      },
      {
        label: "B",
        text: "an illness",
        why: "That's what MALADY means — different family (root mal = bad).",
      },
      {
        label: "C",
        text: "a blessing — a good-saying",
        why: "Yes! bene (good) + dict (say) — the root bene (good) does the work. Benediction = a blessing — a good-saying.",
      },
      {
        label: "D",
        text: "talking in circles",
        why: "That's what CIRCUMLOCUTION means — different family (root circum = around).",
      },
    ],
  },
  {
    id: "VB-36",
    word: "patron",
    unit: "l3-bank",
    root: "",
    rootMeaning: "",
    ask: "What does PATRON probably mean?",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to draw out",
        why: "That's what ELICIT means — different family (root e = out).",
      },
      {
        label: "B",
        text: "same word, built in plain English",
        why: "That's what FORETELL means — different family (root fore = before).",
      },
      {
        label: "C",
        text: "a supporter who funds",
        why: "Yes — patron = a supporter who funds. (No root key on this one — that's why the gloss matters.)",
      },
      {
        label: "D",
        text: "rowdy and loud",
        why: "That's what BOISTEROUS means — different family.",
      },
    ],
  },
  {
    id: "VB-37",
    word: "elicit",
    unit: "l3-bank",
    root: "e",
    rootMeaning: "out",
    ask: "What does ELICIT probably mean? (spot the root: e = out)",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "rowdy and loud",
        why: "That's what BOISTEROUS means — different family.",
      },
      {
        label: "B",
        text: "to draw out",
        why: "Yes! e (out) — the root e (out) does the work. Elicit = to draw out.",
      },
      {
        label: "C",
        text: "the one who receives the good",
        why: "That's what BENEFICIARY means — different family (root bene = good).",
      },
      {
        label: "D",
        text: "to say what will happen",
        why: "That's what PREDICT means — different family (root pre = before).",
      },
    ],
  },
  {
    id: "VB-38",
    word: "prospect",
    unit: "l3-bank",
    root: "pro",
    rootMeaning: "forward",
    ask: "What does PROSPECT probably mean? (spot the root: pro = forward)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "a future possibility",
        why: "Yes! pro (forward) + spect (look) — the root pro (forward) does the work. Prospect = a future possibility.",
      },
      {
        label: "B",
        text: "meaning harm (describer)",
        why: "That's what MALICIOUS means — different family (root mal = bad).",
      },
      {
        label: "C",
        text: "to draw out",
        why: "That's what ELICIT means — different family (root e = out).",
      },
      {
        label: "D",
        text: "a supporter who funds",
        why: "That's what PATRON means — different family.",
      },
    ],
  },
  {
    id: "LD-01",
    word: "Evoke",
    unit: "l3-voc",
    root: "vok",
    rootMeaning: "call",
    ask: "What does EVOKE mean? (root: vok = call)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "using far too many words",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "a roundabout way of saying it",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to dodge by being deliberately unclear",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "to call out a feeling or memory",
        why: "Yes! Root vok = call. Evoke = to call out a feeling or memory.",
      },
    ],
  },
  {
    id: "LD-02",
    word: "Irrevocable",
    unit: "l3-voc",
    root: "voc",
    rootMeaning: "call",
    ask: "What does IRREVOCABLE mean? (root: voc = call)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "pompous, high-flown in speech",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "impossible to take back",
        why: "Yes! Root voc = call. Irrevocable = impossible to take back.",
      },
      {
        label: "D",
        text: "to formally accuse",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-03",
    word: "Vociferous",
    unit: "l3-voc",
    root: "voc",
    rootMeaning: "voice",
    ask: "What does VOCIFEROUS mean? (root: voc = voice)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "using far too many words",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "to call out a feeling or memory",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "loud and forceful in speech",
        why: "Yes! Root voc = voice (🇪🇸 fer = carry, like *transferir*). Vociferous = loud and forceful in speech.",
      },
      {
        label: "D",
        text: "gentle, harmless",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-04",
    word: "Equivocate",
    unit: "l3-voc",
    root: "voc",
    rootMeaning: "voice",
    ask: "What does EQUIVOCATE mean? (root: voc = voice)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to dodge by being deliberately unclear",
        why: "Yes! Root voc = voice (🇪🇸 equi = equal, like *igual*). Equivocate = to dodge by being deliberately unclear.",
      },
      {
        label: "B",
        text: "using far too many words",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to fake illness to dodge work",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "a curse — a bad-saying",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-05",
    word: "Verdict",
    unit: "l3-dict",
    root: "dict",
    rootMeaning: "say",
    ask: "What does VERDICT mean? (root: dict = say)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "fluent and expressive",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "very talkative",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "the decision handed down",
        why: "Yes! Root dict = say (🇪🇸 ver = truth, like *verdad*). Verdict = the decision handed down.",
      },
      {
        label: "D",
        text: "pompous, high-flown in speech",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-06",
    word: "Edict",
    unit: "l3-dict",
    root: "dict",
    rootMeaning: "say",
    ask: "What does EDICT mean? (root: dict = say)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "an official order",
        why: "Yes! Root dict = say. Edict = an official order.",
      },
      {
        label: "B",
        text: "to formally accuse",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to call out a feeling or memory",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "fluent and expressive",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-07",
    word: "Indict",
    unit: "l3-dict",
    root: "dict",
    rootMeaning: "say",
    ask: "What does INDICT mean? (root: dict = say)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "to formally accuse",
        why: "Yes! Root dict = say. Indict = to formally accuse.",
      },
      {
        label: "B",
        text: "fluent and expressive",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "very talkative",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-08",
    word: "Interdict",
    unit: "l3-dict",
    root: "dict",
    rootMeaning: "say",
    ask: "What does INTERDICT mean? (root: dict = say)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "loud and forceful in speech",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "gentle, harmless",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "to officially forbid",
        why: "Yes! Root dict = say (🇪🇸 justicia*) + dict = *where the law gets to speak). Interdict = to officially forbid.",
      },
    ],
  },
  {
    id: "LD-09",
    word: "Jurisdiction",
    unit: "l3-dict",
    root: "dict",
    rootMeaning: "say",
    ask: "What does JURISDICTION mean? (root: dict = say)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "the territory or scope of legal power",
        why: "Yes! Root dict = say (🇪🇸 juris = law — *justicia, jurado). Jurisdiction = the territory or scope of legal power.",
      },
      {
        label: "B",
        text: "a roundabout way of saying it",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to formally accuse",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "one who does good for others",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-10",
    word: "Eloquent",
    unit: "l3-loqu",
    root: "loqu",
    rootMeaning: "talk",
    ask: "What does ELOQUENT mean? (root: loqu = talk)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "fluent and expressive",
        why: "Yes! Root loqu = talk (🇪🇸 elocuente — this one IS the Spanish word). Eloquent = fluent and expressive.",
      },
      {
        label: "B",
        text: "to formally accuse",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to call out a feeling or memory",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "a roundabout way of saying it",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-11",
    word: "Loquacious",
    unit: "l3-loqu",
    root: "loqu",
    rootMeaning: "talk",
    ask: "What does LOQUACIOUS mean? (root: loqu = talk)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "one who does good for others",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "to dodge by being deliberately unclear",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "very talkative",
        why: "Yes! Root loqu = talk. Loquacious = very talkative.",
      },
      {
        label: "D",
        text: "gentle, harmless",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-12",
    word: "Soliloquy",
    unit: "l3-loqu",
    root: "loqu",
    rootMeaning: "talk",
    ask: "What does SOLILOQUY mean? (root: loqu = talk)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to fake illness to dodge work",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "a curse — a bad-saying",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "a speech to yourself",
        why: "Yes! Root loqu = talk (🇪🇸 soli = alone, like *solo*). Soliloquy = a speech to yourself.",
      },
      {
        label: "D",
        text: "impossible to take back",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-13",
    word: "Circumlocution",
    unit: "l3-loqu",
    root: "locut",
    rootMeaning: "talk",
    ask: "What does CIRCUMLOCUTION mean? (root: locut = talk)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to fake illness to dodge work",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "loud and forceful in speech",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "a roundabout way of saying it",
        why: "Yes! Root locut = talk (🇪🇸 circum = around, like *círculo*). Circumlocution = a roundabout way of saying it.",
      },
      {
        label: "D",
        text: "impossible to take back",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-14",
    word: "Grandiloquent",
    unit: "l3-loqu",
    root: "loqu",
    rootMeaning: "talk",
    ask: "What does GRANDILOQUENT mean? (root: loqu = talk)",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "to officially forbid",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "the territory or scope of legal power",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "pompous, high-flown in speech",
        why: "Yes! Root loqu = talk (🇪🇸 grandi = grand — *grande). Grandiloquent = pompous, high-flown in speech.",
      },
      {
        label: "D",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-15",
    word: "Malinger",
    unit: "l3-ladders-misc",
    root: "",
    rootMeaning: "",
    ask: "What does MALINGER mean?",
    correct: "C",
    choices: [
      {
        label: "A",
        text: "the territory or scope of legal power",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to fake illness to dodge work",
        why: "Yes — Malinger = to fake illness to dodge work.",
      },
      {
        label: "D",
        text: "very talkative",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-16",
    word: "Malfeasance",
    unit: "l3-ladders-misc",
    root: "",
    rootMeaning: "",
    ask: "What does MALFEASANCE mean?",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "to dodge by being deliberately unclear",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "fluent and expressive",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "a speech to yourself",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "wrongdoing by someone in power",
        why: "Yes — Malfeasance = wrongdoing by someone in power.",
      },
    ],
  },
  {
    id: "LD-17",
    word: "Benign",
    unit: "l3-charge",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENIGN mean? (root: bene = good)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "gentle, harmless",
        why: "Yes! Root bene = good (🇪🇸 bueno). Benign = gentle, harmless.",
      },
      {
        label: "B",
        text: "pompous, high-flown in speech",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "a speech to yourself",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-18",
    word: "Benefactor",
    unit: "l3-charge",
    root: "bene",
    rootMeaning: "good",
    ask: "What does BENEFACTOR mean? (root: bene = good)",
    correct: "A",
    choices: [
      {
        label: "A",
        text: "one who does good for others",
        why: "Yes! Root bene = good (🇪🇸 bueno). Benefactor = one who does good for others.",
      },
      {
        label: "B",
        text: "a speech to yourself",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "the decision handed down",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "an official order",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-19",
    word: "Malediction",
    unit: "l3-charge",
    root: "male",
    rootMeaning: "bad",
    ask: "What does MALEDICTION mean? (root: male = bad)",
    correct: "B",
    choices: [
      {
        label: "A",
        text: "the territory or scope of legal power",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "a curse — a bad-saying",
        why: "Yes! Root male = bad (🇪🇸 malo). Malediction = a curse — a bad-saying.",
      },
      {
        label: "C",
        text: "to call out a feeling or memory",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "to fake illness to dodge work",
        why: "Different word's meaning — decode the root before you pick.",
      },
    ],
  },
  {
    id: "LD-20",
    word: "Verbose",
    unit: "l3-ladders-misc",
    root: "verb",
    rootMeaning: "word",
    ask: "What does VERBOSE mean? (root: verb = word)",
    correct: "D",
    choices: [
      {
        label: "A",
        text: "one who does good for others",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "B",
        text: "impossible to take back",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "C",
        text: "to dodge by being deliberately unclear",
        why: "Different word's meaning — decode the root before you pick.",
      },
      {
        label: "D",
        text: "using far too many words",
        why: "Yes! Root verb = word. Verbose = using far too many words.",
      },
    ],
  },
];

/** All teachable units in the vocab bank, with human labels for the parent panel. */
export const VOCAB_UNITS: { id: string; label: string }[] = [
  {
    id: "roots-mini-1",
    label: "Roots Mini-Lesson 1 (spect · fac · voc · duc · port decode drills)",
  },
  { id: "l3-voc", label: "Lesson 3 — VOC ladder (advocate → equivocate)" },
  { id: "l3-dict", label: "Lesson 3 — DICT ladder (verdict → jurisdiction)" },
  { id: "l3-loqu", label: "Lesson 3 — LOQU ladder (eloquent → grandiloquent)" },
  { id: "l3-charge", label: "Lesson 3 — BENE/MALE charge (benign → malfeasance)" },
  { id: "l3-ladders-misc", label: "Lesson 3 — extra ladder words" },
  { id: "l3-bank", label: "Lesson 3 — full word bank (synonyms/antonyms)" },
];

/**
 * TAUGHT gate — the single source of truth for what Word Lab serves.
 * Only words whose `unit` is in this list appear in the daily drill.
 * PROCESS: after a class, the parent says what was covered and this list is updated.
 * Starts with ONLY what the girls have genuinely seen (Roots Mini-Lesson 1 was staged;
 * Lesson 3 has NOT been taught in class yet — its units stay off until it is).
 */
export const TAUGHT_UNITS: string[] = ["roots-mini-1"];

/** The vocab items the girls are allowed to drill today (taught units only). */
export function taughtVocabItems(): VocabItem[] {
  const on = new Set(TAUGHT_UNITS);
  return VOCAB_ITEMS.filter((v) => on.has(v.unit));
}
