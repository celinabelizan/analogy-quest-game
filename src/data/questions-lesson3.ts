import type { Question } from "./questions";

// Lesson 3 — SAME (synonym) & OPPOSITE (antonym): the last two Foundation-Six bridges.
// Authored + verified against the Content Contract (45 questions, 23 synonym / 22 antonym).
export const LESSON3_QUESTIONS: Question[] = [
  {
    id: "S3-01",
    family: "synonym",
    stem: "HAPPY : JOYFUL",
    bridge: "HAPPY is another word for JOYFUL.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "HAPPY : SAD",
        why: "Trap: Flipped/Opposite bridge — SAD is the opposite of HAPPY, not the same.",
      },
      {
        label: "B",
        pair: "GLAD : PLEASED",
        why: "Fit: GLAD is another word for PLEASED, matching the synonym bridge.",
      },
      {
        label: "C",
        pair: "HAPPY : SMILE",
        why: "Trap: Same topic wrong bridge — a SMILE is a sign of being happy, not a synonym for it.",
      },
      {
        label: "D",
        pair: "CONTENT : FURIOUS",
        why: "Trap: Flipped pair — these are opposite feelings, not synonyms.",
      },
      {
        label: "E",
        pair: "HAPPY : EMOTION",
        why: "Trap: Part instead of whole — happiness is a kind of emotion, not a synonym for it.",
      },
    ],
  },
  {
    id: "S3-02",
    family: "synonym",
    stem: "BIG : LARGE",
    bridge: "BIG is another word for LARGE.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "BIG : TINY",
        why: "Trap: Flipped/Opposite bridge — TINY is the opposite of BIG.",
      },
      {
        label: "B",
        pair: "BIG : SIZE",
        why: "Trap: Same topic wrong bridge — SIZE is what big describes, not a synonym.",
      },
      {
        label: "C",
        pair: "GIANT : SMALL",
        why: "Trap: Flipped pair — these are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "HUGE : ENORMOUS",
        why: "Fit: HUGE is another word for ENORMOUS, matching the synonym bridge.",
      },
      {
        label: "E",
        pair: "BIG : ELEPHANT",
        why: "Trap: Part instead of whole — an elephant is one big thing, not a synonym for big.",
      },
    ],
  },
  {
    id: "S3-03",
    family: "synonym",
    stem: "FAST : QUICK",
    bridge: "FAST is another word for QUICK.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "RAPID : SWIFT",
        why: "Fit: RAPID is another word for SWIFT, matching the synonym bridge.",
      },
      {
        label: "B",
        pair: "FAST : SLOW",
        why: "Trap: Flipped/Opposite bridge — SLOW is the opposite of FAST.",
      },
      {
        label: "C",
        pair: "FAST : RACE",
        why: "Trap: Same topic wrong bridge — a RACE is where speed matters, not a synonym for fast.",
      },
      {
        label: "D",
        pair: "SPEEDY : LAZY",
        why: "Trap: Flipped pair — SPEEDY and LAZY are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "FAST : MOTION",
        why: "Trap: Part instead of whole — fast describes motion but isn't a synonym for it.",
      },
    ],
  },
  {
    id: "S3-04",
    family: "synonym",
    stem: "SMART : CLEVER",
    bridge: "SMART is another word for CLEVER.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "SMART : FOOLISH",
        why: "Trap: Flipped/Opposite bridge — FOOLISH is the opposite of SMART.",
      },
      {
        label: "B",
        pair: "SMART : BRAIN",
        why: "Trap: Part instead of whole — the brain is where thinking happens, not a synonym for smart.",
      },
      {
        label: "C",
        pair: "INTELLIGENT : BRIGHT",
        why: "Fit: INTELLIGENT is another word for BRIGHT, matching the synonym bridge.",
      },
      {
        label: "D",
        pair: "WISE : SILLY",
        why: "Trap: Flipped pair — WISE and SILLY are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "SMART : SCHOOL",
        why: "Trap: Same topic wrong bridge — school is a place, not a synonym for smart.",
      },
    ],
  },
  {
    id: "S3-05",
    family: "synonym",
    stem: "ANGRY : MAD",
    bridge: "ANGRY is another word for MAD.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "ANGRY : CALM",
        why: "Trap: Flipped/Opposite bridge — CALM is the opposite of ANGRY.",
      },
      {
        label: "B",
        pair: "ANGRY : SHOUT",
        why: "Trap: Same topic wrong bridge — shouting is what an angry person may do, not a synonym.",
      },
      {
        label: "C",
        pair: "PEACEFUL : ENRAGED",
        why: "Trap: Flipped pair — these are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "ANGRY : MOOD",
        why: "Trap: Part instead of whole — anger is a kind of mood, not a synonym for mood.",
      },
      {
        label: "E",
        pair: "FURIOUS : IRATE",
        why: "Fit: FURIOUS is another word for IRATE, matching the synonym bridge.",
      },
    ],
  },
  {
    id: "S3-06",
    family: "synonym",
    stem: "TIRED : WEARY",
    bridge: "TIRED is another word for WEARY.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "TIRED : ENERGETIC",
        why: "Trap: Flipped/Opposite bridge — ENERGETIC is the opposite of TIRED.",
      },
      {
        label: "B",
        pair: "EXHAUSTED : FATIGUED",
        why: "Fit: EXHAUSTED is another word for FATIGUED, matching the synonym bridge.",
      },
      {
        label: "C",
        pair: "TIRED : SLEEP",
        why: "Trap: Same topic wrong bridge — sleep is the cure for being tired, not a synonym.",
      },
      {
        label: "D",
        pair: "RESTED : DRAINED",
        why: "Trap: Flipped pair — RESTED and DRAINED are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "TIRED : BODY",
        why: "Trap: Part instead of whole — the body feels tired but isn't a synonym for tired.",
      },
    ],
  },
  {
    id: "S3-07",
    family: "synonym",
    stem: "STRANGE : ODD",
    bridge: "STRANGE is another word for ODD.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "STRANGE : NORMAL",
        why: "Trap: Flipped/Opposite bridge — NORMAL is the opposite of STRANGE.",
      },
      {
        label: "B",
        pair: "STRANGE : STRANGER",
        why: "Trap: Same topic wrong bridge — a stranger is an unfamiliar person, not a synonym for strange.",
      },
      {
        label: "C",
        pair: "USUAL : BIZARRE",
        why: "Trap: Flipped pair — USUAL and BIZARRE are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "PECULIAR : UNUSUAL",
        why: "Fit: PECULIAR is another word for UNUSUAL, matching the synonym bridge.",
      },
      {
        label: "E",
        pair: "STRANGE : FEELING",
        why: "Trap: Part instead of whole — strange can describe a feeling but isn't a synonym for feeling.",
      },
    ],
  },
  {
    id: "S3-08",
    family: "synonym",
    stem: "RICH : WEALTHY",
    bridge: "RICH is another word for WEALTHY.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "AFFLUENT : PROSPEROUS",
        why: "Fit: AFFLUENT is another word for PROSPEROUS, matching the synonym bridge.",
      },
      {
        label: "B",
        pair: "RICH : POOR",
        why: "Trap: Flipped/Opposite bridge — POOR is the opposite of RICH.",
      },
      {
        label: "C",
        pair: "RICH : MONEY",
        why: "Trap: Same topic wrong bridge — money is what makes one rich, not a synonym.",
      },
      {
        label: "D",
        pair: "NEEDY : LOADED",
        why: "Trap: Flipped pair — NEEDY and LOADED are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "RICH : FORTUNE",
        why: "Trap: Part instead of whole — a fortune is what a rich person has, not a synonym for rich.",
      },
    ],
  },
  {
    id: "S3-09",
    family: "synonym",
    stem: "QUIET : SILENT",
    bridge: "QUIET is another word for SILENT.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "QUIET : LOUD",
        why: "Trap: Flipped/Opposite bridge — LOUD is the opposite of QUIET.",
      },
      {
        label: "B",
        pair: "QUIET : LIBRARY",
        why: "Trap: Same topic wrong bridge — a library is a quiet place, not a synonym for quiet.",
      },
      {
        label: "C",
        pair: "HUSHED : NOISELESS",
        why: "Fit: HUSHED is another word for NOISELESS, matching the synonym bridge.",
      },
      {
        label: "D",
        pair: "NOISY : MUTE",
        why: "Trap: Flipped pair — NOISY and MUTE are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "QUIET : SOUND",
        why: "Trap: Part instead of whole — quiet is the absence of sound, not a synonym for sound.",
      },
    ],
  },
  {
    id: "S3-10",
    family: "synonym",
    stem: "BEGIN : START",
    bridge: "BEGIN is another word for START.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "BEGIN : END",
        why: "Trap: Flipped/Opposite bridge — END is the opposite of BEGIN.",
      },
      {
        label: "B",
        pair: "BEGIN : BEGINNER",
        why: "Trap: Same topic wrong bridge — a beginner is one who is starting, not a synonym for begin.",
      },
      {
        label: "C",
        pair: "FINISH : LAUNCH",
        why: "Trap: Flipped pair — FINISH and LAUNCH are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "BEGIN : STEP",
        why: "Trap: Part instead of whole — a step is one part of a process, not a synonym for begin.",
      },
      {
        label: "E",
        pair: "COMMENCE : INITIATE",
        why: "Fit: COMMENCE is another word for INITIATE, matching the synonym bridge.",
      },
    ],
  },
  {
    id: "S3-11",
    family: "synonym",
    stem: "HONEST : TRUTHFUL",
    bridge: "HONEST is another word for TRUTHFUL.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "HONEST : LYING",
        why: "Trap: Flipped/Opposite bridge — LYING is the opposite of HONEST.",
      },
      {
        label: "B",
        pair: "SINCERE : GENUINE",
        why: "Fit: SINCERE is another word for GENUINE, matching the synonym bridge.",
      },
      {
        label: "C",
        pair: "HONEST : TESTIMONY",
        why: "Trap: Same topic wrong bridge — testimony is a statement, not a synonym for honest.",
      },
      {
        label: "D",
        pair: "FRANK : DECEITFUL",
        why: "Trap: Flipped pair — FRANK and DECEITFUL are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "HONEST : VIRTUE",
        why: "Trap: Part instead of whole — honesty is one virtue, not a synonym for virtue.",
      },
    ],
  },
  {
    id: "S3-12",
    family: "synonym",
    stem: "AFRAID : FEARFUL",
    bridge: "AFRAID is another word for FEARFUL.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "AFRAID : BOLD",
        why: "Trap: Flipped/Opposite bridge — BOLD is the opposite of AFRAID.",
      },
      {
        label: "B",
        pair: "AFRAID : DARKNESS",
        why: "Trap: Same topic wrong bridge — darkness is one thing that scares people, not a synonym.",
      },
      {
        label: "C",
        pair: "FEARLESS : ANXIOUS",
        why: "Trap: Flipped pair — FEARLESS and ANXIOUS are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "FRIGHTENED : TERRIFIED",
        why: "Fit: FRIGHTENED is another word for TERRIFIED, matching the synonym bridge.",
      },
      {
        label: "E",
        pair: "AFRAID : NERVE",
        why: "Trap: Part instead of whole — nerves are involved in fear but not a synonym for afraid.",
      },
    ],
  },
  {
    id: "S3-13",
    family: "synonym",
    stem: "STUBBORN : OBSTINATE",
    bridge: "STUBBORN is another word for OBSTINATE.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "INFLEXIBLE : UNYIELDING",
        why: "Fit: INFLEXIBLE is another word for UNYIELDING, matching the synonym bridge.",
      },
      {
        label: "B",
        pair: "STUBBORN : AGREEABLE",
        why: "Trap: Flipped/Opposite bridge — AGREEABLE is the opposite of STUBBORN.",
      },
      {
        label: "C",
        pair: "STUBBORN : MULE",
        why: "Trap: Same topic wrong bridge — a mule is famously stubborn, but it isn't a synonym for stubborn.",
      },
      {
        label: "D",
        pair: "COMPLIANT : DEFIANT",
        why: "Trap: Flipped pair — COMPLIANT and DEFIANT are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "STUBBORN : TRAIT",
        why: "Trap: Part instead of whole — stubbornness is one trait, not a synonym for trait.",
      },
    ],
  },
  {
    id: "S3-14",
    family: "synonym",
    stem: "ENORMOUS : IMMENSE",
    bridge: "ENORMOUS is another word for IMMENSE.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "ENORMOUS : MINUSCULE",
        why: "Trap: Flipped/Opposite bridge — MINUSCULE is the opposite of ENORMOUS.",
      },
      {
        label: "B",
        pair: "ENORMOUS : BIG",
        why: "Trap: Too weak — BIG is a milder degree; the pair should match ENORMOUS's extreme intensity, not soften it.",
      },
      {
        label: "C",
        pair: "GIGANTIC : COLOSSAL",
        why: "Fit: GIGANTIC is another word for COLOSSAL, both at the same extreme scale as the stem.",
      },
      {
        label: "D",
        pair: "TINY : VAST",
        why: "Trap: Flipped pair — TINY and VAST are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "ENORMOUS : VOLUME",
        why: "Trap: Part instead of whole — volume is a measure of size, not a synonym for enormous.",
      },
    ],
  },
  {
    id: "S3-15",
    family: "synonym",
    stem: "TIMID : SHY",
    bridge: "TIMID is another word for SHY.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "TIMID : ASSERTIVE",
        why: "Trap: Flipped/Opposite bridge — ASSERTIVE is the opposite of TIMID.",
      },
      {
        label: "B",
        pair: "TIMID : TERRIFIED",
        why: "Trap: Too strong — TERRIFIED is intense fear, far beyond mild timidity.",
      },
      {
        label: "C",
        pair: "TIMID : CROWD",
        why: "Trap: Same topic wrong bridge — a crowd may make one timid, but it isn't a synonym.",
      },
      {
        label: "D",
        pair: "OUTGOING : BASHFUL",
        why: "Trap: Flipped pair — OUTGOING and BASHFUL are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "MEEK : RESERVED",
        why: "Fit: MEEK is another word for RESERVED, matching the mild degree of the synonym bridge.",
      },
    ],
  },
  {
    id: "S3-16",
    family: "synonym",
    stem: "GRATEFUL : THANKFUL",
    bridge: "GRATEFUL is another word for THANKFUL.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "GRATEFUL : RESENTFUL",
        why: "Trap: Flipped/Opposite bridge — RESENTFUL is the opposite of GRATEFUL.",
      },
      {
        label: "B",
        pair: "DELIGHTED : PLEASED",
        why: "Fit: DELIGHTED is another word for PLEASED, matching the synonym bridge.",
      },
      {
        label: "C",
        pair: "GRATEFUL : GIFT",
        why: "Trap: Same topic wrong bridge — a gift may make one grateful, but it isn't a synonym.",
      },
      {
        label: "D",
        pair: "UNGRATEFUL : CONTENT",
        why: "Trap: Flipped pair — UNGRATEFUL and CONTENT sit on opposite sides, not synonyms.",
      },
      {
        label: "E",
        pair: "GRATEFUL : FEELING",
        why: "Trap: Part instead of whole — gratitude is one feeling, not a synonym for feeling.",
      },
    ],
  },
  {
    id: "S3-17",
    family: "synonym",
    stem: "CAUTIOUS : CAREFUL",
    bridge: "CAUTIOUS is another word for CAREFUL.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "CAUTIOUS : RECKLESS",
        why: "Trap: Flipped/Opposite bridge — RECKLESS is the opposite of CAUTIOUS.",
      },
      {
        label: "B",
        pair: "CAUTIOUS : PARANOID",
        why: "Trap: Too strong — PARANOID is extreme, irrational fear, well beyond ordinary caution.",
      },
      {
        label: "C",
        pair: "CAUTIOUS : WARNING",
        why: "Trap: Same topic wrong bridge — a warning prompts caution but isn't a synonym.",
      },
      {
        label: "D",
        pair: "PRUDENT : WARY",
        why: "Fit: PRUDENT is another word for WARY, matching the sensible degree of the synonym bridge.",
      },
      {
        label: "E",
        pair: "HEEDLESS : ALERT",
        why: "Trap: Flipped pair — HEEDLESS and ALERT are opposites, not synonyms.",
      },
    ],
  },
  {
    id: "S3-18",
    family: "synonym",
    stem: "PLENTIFUL : ABUNDANT",
    bridge: "PLENTIFUL is another word for ABUNDANT.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "AMPLE : COPIOUS",
        why: "Fit: AMPLE is another word for COPIOUS, matching the synonym bridge.",
      },
      {
        label: "B",
        pair: "PLENTIFUL : MEAGER",
        why: "Trap: Flipped/Opposite bridge — MEAGER is the opposite of PLENTIFUL.",
      },
      {
        label: "C",
        pair: "PLENTIFUL : HARVEST",
        why: "Trap: Same topic wrong bridge — a harvest may be plentiful, but it isn't a synonym.",
      },
      {
        label: "D",
        pair: "SPARSE : LAVISH",
        why: "Trap: Flipped pair — SPARSE and LAVISH are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "PLENTIFUL : QUANTITY",
        why: "Trap: Part instead of whole — quantity is what plentiful describes, not a synonym.",
      },
    ],
  },
  {
    id: "S3-19",
    family: "synonym",
    stem: "TRANQUIL : SERENE",
    bridge: "TRANQUIL is another word for SERENE.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "TRANQUIL : TURBULENT",
        why: "Trap: Flipped/Opposite bridge — TURBULENT is the opposite of TRANQUIL.",
      },
      {
        label: "B",
        pair: "TRANQUIL : LAKE",
        why: "Trap: Same topic wrong bridge — a lake may be tranquil, but it isn't a synonym for tranquil.",
      },
      {
        label: "C",
        pair: "PLACID : CALM",
        why: "Fit: PLACID is another word for CALM, matching the synonym bridge.",
      },
      {
        label: "D",
        pair: "CHAOTIC : PEACEFUL",
        why: "Trap: Flipped pair — CHAOTIC and PEACEFUL are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "TRANQUIL : STATE",
        why: "Trap: Part instead of whole — tranquility is one state, not a synonym for state.",
      },
    ],
  },
  {
    id: "S3-20",
    family: "synonym",
    stem: "CANDID : FRANK",
    bridge: "CANDID is another word for FRANK.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "CANDID : EVASIVE",
        why: "Trap: Flipped/Opposite bridge — EVASIVE is the opposite of CANDID.",
      },
      {
        label: "B",
        pair: "CANDID : PHOTOGRAPH",
        why: "Trap: Same topic wrong bridge — a candid photograph is unposed, but that isn't the meaning being tested here.",
      },
      {
        label: "C",
        pair: "GUARDED : OPEN",
        why: "Trap: Flipped pair — GUARDED and OPEN are opposites, not synonyms.",
      },
      {
        label: "D",
        pair: "CANDID : REMARK",
        why: "Trap: Part instead of whole — a remark may be candid, but it isn't a synonym for candid.",
      },
      {
        label: "E",
        pair: "FORTHRIGHT : DIRECT",
        why: "Fit: FORTHRIGHT is another word for DIRECT, matching the synonym bridge.",
      },
    ],
  },
  {
    id: "S3-21",
    family: "synonym",
    stem: "BENEVOLENT : KIND",
    bridge: "BENEVOLENT is another word for KIND.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "BENEVOLENT : MALICIOUS",
        why: "Trap: Flipped/Opposite bridge — MALICIOUS is the opposite of BENEVOLENT.",
      },
      {
        label: "B",
        pair: "COMPASSIONATE : CHARITABLE",
        why: "Fit: COMPASSIONATE is another word for CHARITABLE, matching the synonym bridge.",
      },
      {
        label: "C",
        pair: "BENEVOLENT : DONATION",
        why: "Trap: Same topic wrong bridge — a donation is a kind act, not a synonym for benevolent.",
      },
      {
        label: "D",
        pair: "CRUEL : GENEROUS",
        why: "Trap: Flipped pair — CRUEL and GENEROUS are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "BENEVOLENT : DEED",
        why: "Trap: Part instead of whole — a deed may be benevolent, but it isn't a synonym for benevolent.",
      },
    ],
  },
  {
    id: "S3-22",
    family: "synonym",
    stem: "METICULOUS : THOROUGH",
    bridge: "METICULOUS is another word for THOROUGH.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "METICULOUS : SLOPPY",
        why: "Trap: Flipped/Opposite bridge — SLOPPY is the opposite of METICULOUS.",
      },
      {
        label: "B",
        pair: "METICULOUS : CASUAL",
        why: "Trap: Too weak — CASUAL suggests relaxed indifference, the wrong direction from careful precision.",
      },
      {
        label: "C",
        pair: "METICULOUS : DETAIL",
        why: "Trap: Part instead of whole — a detail is what a meticulous person attends to, not a synonym.",
      },
      {
        label: "D",
        pair: "PAINSTAKING : SCRUPULOUS",
        why: "Fit: PAINSTAKING is another word for SCRUPULOUS, matching the exacting degree of the synonym bridge.",
      },
      {
        label: "E",
        pair: "CARELESS : DILIGENT",
        why: "Trap: Flipped pair — CARELESS and DILIGENT are opposites, not synonyms.",
      },
    ],
  },
  {
    id: "S3-23",
    family: "synonym",
    stem: "OBSCURE : VAGUE",
    bridge: "OBSCURE is another word for VAGUE.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "AMBIGUOUS : UNCLEAR",
        why: "Fit: AMBIGUOUS is another word for UNCLEAR, matching the synonym bridge.",
      },
      {
        label: "B",
        pair: "OBSCURE : EVIDENT",
        why: "Trap: Flipped/Opposite bridge — EVIDENT is the opposite of OBSCURE.",
      },
      {
        label: "C",
        pair: "OBSCURE : FOG",
        why: "Trap: Same topic wrong bridge — fog obscures things but isn't a synonym for obscure.",
      },
      {
        label: "D",
        pair: "TRANSPARENT : MURKY",
        why: "Trap: Flipped pair — TRANSPARENT and MURKY are opposites, not synonyms.",
      },
      {
        label: "E",
        pair: "OBSCURE : MEANING",
        why: "Trap: Part instead of whole — a meaning may be obscure, but it isn't a synonym for obscure.",
      },
    ],
  },
  {
    id: "S3-24",
    family: "antonym",
    stem: "HOT : COLD",
    bridge: "HOT is the opposite of COLD.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "HOT : WARM",
        why: "Trap: Same topic wrong bridge — WARM is a milder version of hot, a synonym direction, not an opposite.",
      },
      {
        label: "B",
        pair: "HOT : FIRE",
        why: "Trap: Same topic wrong bridge — fire is hot, but that's a source, not an opposite.",
      },
      {
        label: "C",
        pair: "WET : DRY",
        why: "Fit: WET is the opposite of DRY, matching the antonym bridge.",
      },
      {
        label: "D",
        pair: "FREEZING : ICY",
        why: "Trap: Two choices same bridge — FREEZING and ICY are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "HOT : TEMPERATURE",
        why: "Trap: Part instead of whole — hot is one point on the temperature scale, not its opposite.",
      },
    ],
  },
  {
    id: "S3-25",
    family: "antonym",
    stem: "UP : DOWN",
    bridge: "UP is the opposite of DOWN.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "IN : OUT",
        why: "Fit: IN is the opposite of OUT, matching the antonym bridge.",
      },
      {
        label: "B",
        pair: "UP : HIGH",
        why: "Trap: Same topic wrong bridge — HIGH means the same direction as up, not its opposite.",
      },
      {
        label: "C",
        pair: "UP : STAIRS",
        why: "Trap: Same topic wrong bridge — you go up the stairs, but stairs aren't the opposite of up.",
      },
      {
        label: "D",
        pair: "ABOVE : OVER",
        why: "Trap: Two choices same bridge — ABOVE and OVER are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "UP : DIRECTION",
        why: "Trap: Part instead of whole — up is one direction, not the opposite of direction.",
      },
    ],
  },
  {
    id: "S3-26",
    family: "antonym",
    stem: "OPEN : CLOSED",
    bridge: "OPEN is the opposite of CLOSED.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "OPEN : DOOR",
        why: "Trap: Same topic wrong bridge — a door can be open, but a door isn't the opposite of open.",
      },
      {
        label: "B",
        pair: "OPEN : AJAR",
        why: "Trap: Two choices same bridge — AJAR means slightly open, a synonym, not an opposite.",
      },
      {
        label: "C",
        pair: "SHUT : SEALED",
        why: "Trap: Two choices same bridge — SHUT and SEALED are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "EMPTY : FULL",
        why: "Fit: EMPTY is the opposite of FULL, matching the antonym bridge.",
      },
      {
        label: "E",
        pair: "OPEN : KEY",
        why: "Trap: Same topic wrong bridge — a key opens things, but it isn't the opposite of open.",
      },
    ],
  },
  {
    id: "S3-27",
    family: "antonym",
    stem: "DAY : NIGHT",
    bridge: "DAY is the opposite of NIGHT.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "DAY : MORNING",
        why: "Trap: Part instead of whole — morning is one part of the day, not its opposite.",
      },
      {
        label: "B",
        pair: "LIGHT : DARK",
        why: "Fit: LIGHT is the opposite of DARK, matching the antonym bridge.",
      },
      {
        label: "C",
        pair: "DAY : SUN",
        why: "Trap: Same topic wrong bridge — the sun lights the day, but it isn't the opposite of day.",
      },
      {
        label: "D",
        pair: "NIGHT : EVENING",
        why: "Trap: Two choices same bridge — EVENING and NIGHT are close in meaning, not opposites.",
      },
      {
        label: "E",
        pair: "DAY : WEEK",
        why: "Trap: Part instead of whole — a day is part of a week, not its opposite.",
      },
    ],
  },
  {
    id: "S3-28",
    family: "antonym",
    stem: "WIN : LOSE",
    bridge: "WIN is the opposite of LOSE.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "WIN : TROPHY",
        why: "Trap: Same topic wrong bridge — a trophy is a prize for winning, not the opposite of win.",
      },
      {
        label: "B",
        pair: "WIN : VICTORY",
        why: "Trap: Two choices same bridge — VICTORY means winning, a synonym, not an opposite.",
      },
      {
        label: "C",
        pair: "WIN : GAME",
        why: "Trap: Same topic wrong bridge — you win a game, but a game isn't the opposite of win.",
      },
      {
        label: "D",
        pair: "DEFEAT : LOSS",
        why: "Trap: Two choices same bridge — DEFEAT and LOSS are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "SUCCEED : FAIL",
        why: "Fit: SUCCEED is the opposite of FAIL, matching the antonym bridge.",
      },
    ],
  },
  {
    id: "S3-29",
    family: "antonym",
    stem: "STRONG : WEAK",
    bridge: "STRONG is the opposite of WEAK.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "STRONG : MUSCLE",
        why: "Trap: Part instead of whole — muscles make one strong, but a muscle isn't the opposite of strong.",
      },
      {
        label: "B",
        pair: "STRONG : POWERFUL",
        why: "Trap: Two choices same bridge — POWERFUL is another word for strong, not its opposite.",
      },
      {
        label: "C",
        pair: "BRAVE : COWARDLY",
        why: "Fit: BRAVE is the opposite of COWARDLY, matching the antonym bridge.",
      },
      {
        label: "D",
        pair: "STRONG : IRON",
        why: "Trap: Same topic wrong bridge — iron is a strong material, but it isn't the opposite of strong.",
      },
      {
        label: "E",
        pair: "MIGHTY : STURDY",
        why: "Trap: Two choices same bridge — MIGHTY and STURDY are synonyms, not opposites.",
      },
    ],
  },
  {
    id: "S3-30",
    family: "antonym",
    stem: "HAPPY : SAD",
    bridge: "HAPPY is the opposite of SAD.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "LOVE : HATE",
        why: "Fit: LOVE is the opposite of HATE, matching the antonym bridge.",
      },
      {
        label: "B",
        pair: "HAPPY : JOYFUL",
        why: "Trap: Two choices same bridge — JOYFUL is another word for happy, not its opposite.",
      },
      {
        label: "C",
        pair: "HAPPY : TEARS",
        why: "Trap: Same topic wrong bridge — tears can come from sadness, but they aren't the opposite of happy.",
      },
      {
        label: "D",
        pair: "GLAD : PLEASED",
        why: "Trap: Two choices same bridge — GLAD and PLEASED are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "HAPPY : MOOD",
        why: "Trap: Part instead of whole — happiness is one mood, not the opposite of mood.",
      },
    ],
  },
  {
    id: "S3-31",
    family: "antonym",
    stem: "BRAVE : COWARDLY",
    bridge: "BRAVE is the opposite of COWARDLY.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "BRAVE : HERO",
        why: "Trap: Same topic wrong bridge — a hero is brave, but a hero isn't the opposite of brave.",
      },
      {
        label: "B",
        pair: "BRAVE : BOLD",
        why: "Trap: Two choices same bridge — BOLD is another word for brave, not its opposite.",
      },
      {
        label: "C",
        pair: "FEARLESS : DARING",
        why: "Trap: Two choices same bridge — FEARLESS and DARING are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "GENTLE : HARSH",
        why: "Fit: GENTLE is the opposite of HARSH, matching the antonym bridge.",
      },
      {
        label: "E",
        pair: "BRAVE : COURAGE",
        why: "Trap: Part instead of whole — courage is the quality a brave person has, not its opposite.",
      },
    ],
  },
  {
    id: "S3-32",
    family: "antonym",
    stem: "EXPAND : SHRINK",
    bridge: "EXPAND is the opposite of SHRINK.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "EXPAND : GROW",
        why: "Trap: Two choices same bridge — GROW is another word for expand, not its opposite.",
      },
      {
        label: "B",
        pair: "RISE : FALL",
        why: "Fit: RISE is the opposite of FALL, matching the antonym bridge.",
      },
      {
        label: "C",
        pair: "EXPAND : BALLOON",
        why: "Trap: Same topic wrong bridge — a balloon expands, but it isn't the opposite of expand.",
      },
      {
        label: "D",
        pair: "STRETCH : ENLARGE",
        why: "Trap: Two choices same bridge — STRETCH and ENLARGE are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "EXPAND : SIZE",
        why: "Trap: Part instead of whole — expanding changes size, but size isn't the opposite of expand.",
      },
    ],
  },
  {
    id: "S3-33",
    family: "antonym",
    stem: "ACCEPT : REJECT",
    bridge: "ACCEPT is the opposite of REJECT.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "ACCEPT : AGREE",
        why: "Trap: Two choices same bridge — AGREE means much the same as accept, not its opposite.",
      },
      {
        label: "B",
        pair: "ACCEPT : OFFER",
        why: "Trap: Same topic wrong bridge — you accept an offer, but offer isn't the opposite of accept.",
      },
      {
        label: "C",
        pair: "REFUSE : DECLINE",
        why: "Trap: Two choices same bridge — REFUSE and DECLINE are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "ACCEPT : INVITATION",
        why: "Trap: Same topic wrong bridge — an invitation is accepted, but it isn't the opposite of accept.",
      },
      {
        label: "E",
        pair: "APPROVE : CONDEMN",
        why: "Fit: APPROVE is the opposite of CONDEMN, matching the antonym bridge.",
      },
    ],
  },
  {
    id: "S3-34",
    family: "antonym",
    stem: "PERMANENT : TEMPORARY",
    bridge: "PERMANENT is the opposite of TEMPORARY.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "PERMANENT : LASTING",
        why: "Trap: Two choices same bridge — LASTING is another word for permanent, not its opposite.",
      },
      {
        label: "B",
        pair: "PERMANENT : MARKER",
        why: "Trap: Same topic wrong bridge — a permanent marker is a thing, not the opposite of permanent.",
      },
      {
        label: "C",
        pair: "ETERNAL : FLEETING",
        why: "Fit: ETERNAL is the opposite of FLEETING, matching the antonym bridge.",
      },
      {
        label: "D",
        pair: "BRIEF : SHORT",
        why: "Trap: Two choices same bridge — BRIEF and SHORT are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "PERMANENT : TIME",
        why: "Trap: Part instead of whole — permanence relates to time, but time isn't its opposite.",
      },
    ],
  },
  {
    id: "S3-35",
    family: "antonym",
    stem: "HUMBLE : ARROGANT",
    bridge: "HUMBLE is the opposite of ARROGANT.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "MODEST : BOASTFUL",
        why: "Fit: MODEST is the opposite of BOASTFUL, matching the antonym bridge.",
      },
      {
        label: "B",
        pair: "HUMBLE : MEEK",
        why: "Trap: Two choices same bridge — MEEK means much the same as humble, not its opposite.",
      },
      {
        label: "C",
        pair: "PROUD : CONCEITED",
        why: "Trap: Two choices same bridge — PROUD and CONCEITED are near-synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "HUMBLE : PERSON",
        why: "Trap: Same topic wrong bridge — a person can be humble, but 'person' isn't the opposite of humble.",
      },
      {
        label: "E",
        pair: "HUMBLE : ATTITUDE",
        why: "Trap: Same topic wrong bridge — humility is one attitude, not the opposite of attitude.",
      },
    ],
  },
  {
    id: "S3-36",
    family: "antonym",
    stem: "ASCEND : DESCEND",
    bridge: "ASCEND is the opposite of DESCEND.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "ASCEND : CLIMB",
        why: "Trap: Two choices same bridge — CLIMB is another word for ascend, not its opposite.",
      },
      {
        label: "B",
        pair: "ASCEND : MOUNTAIN",
        why: "Trap: Same topic wrong bridge — you ascend a mountain, but a mountain isn't the opposite of ascend.",
      },
      {
        label: "C",
        pair: "RISE : SOAR",
        why: "Trap: Two choices same bridge — RISE and SOAR are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "ADVANCE : RETREAT",
        why: "Fit: ADVANCE is the opposite of RETREAT, matching the antonym bridge.",
      },
      {
        label: "E",
        pair: "ASCEND : LADDER",
        why: "Trap: Same topic wrong bridge — you ascend a ladder, but a ladder isn't the opposite of ascend.",
      },
    ],
  },
  {
    id: "S3-37",
    family: "antonym",
    stem: "TRANSPARENT : OPAQUE",
    bridge: "TRANSPARENT is the opposite of OPAQUE.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "TRANSPARENT : GLASS",
        why: "Trap: Same topic wrong bridge — glass is transparent, but glass isn't the opposite of transparent.",
      },
      {
        label: "B",
        pair: "VISIBLE : HIDDEN",
        why: "Fit: VISIBLE is the opposite of HIDDEN, matching the antonym bridge.",
      },
      {
        label: "C",
        pair: "TRANSPARENT : CLEAR",
        why: "Trap: Two choices same bridge — CLEAR is another word for transparent, not its opposite.",
      },
      {
        label: "D",
        pair: "MURKY : CLOUDY",
        why: "Trap: Two choices same bridge — MURKY and CLOUDY are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "TRANSPARENT : WINDOW",
        why: "Trap: Same topic wrong bridge — a window is transparent, but it isn't the opposite of transparent.",
      },
    ],
  },
  {
    id: "S3-38",
    family: "antonym",
    stem: "FERTILE : BARREN",
    bridge: "FERTILE is the opposite of BARREN.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "FERTILE : SOIL",
        why: "Trap: Same topic wrong bridge — soil can be fertile, but soil isn't the opposite of fertile.",
      },
      {
        label: "B",
        pair: "FERTILE : PRODUCTIVE",
        why: "Trap: Two choices same bridge — PRODUCTIVE means much the same as fertile, not its opposite.",
      },
      {
        label: "C",
        pair: "FERTILE : CROP",
        why: "Trap: Part instead of whole — a crop grows in fertile land, but a crop isn't the opposite of fertile.",
      },
      {
        label: "D",
        pair: "LUSH : FRUITFUL",
        why: "Trap: Two choices same bridge — LUSH and FRUITFUL are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "ABUNDANT : SCARCE",
        why: "Fit: ABUNDANT is the opposite of SCARCE, matching the antonym bridge.",
      },
    ],
  },
  {
    id: "S3-39",
    family: "antonym",
    stem: "GENUINE : COUNTERFEIT",
    bridge: "GENUINE is the opposite of COUNTERFEIT.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "GENUINE : AUTHENTIC",
        why: "Trap: Two choices same bridge — AUTHENTIC is another word for genuine, not its opposite.",
      },
      {
        label: "B",
        pair: "GENUINE : MONEY",
        why: "Trap: Same topic wrong bridge — money can be counterfeit, but money isn't the opposite of genuine.",
      },
      {
        label: "C",
        pair: "REAL : FAKE",
        why: "Fit: REAL is the opposite of FAKE, matching the antonym bridge.",
      },
      {
        label: "D",
        pair: "FORGED : IMITATION",
        why: "Trap: Two choices same bridge — FORGED and IMITATION are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "GENUINE : QUALITY",
        why: "Trap: Part instead of whole — genuineness is one quality, not the opposite of quality.",
      },
    ],
  },
  {
    id: "S3-40",
    family: "antonym",
    stem: "LENIENT : STRICT",
    bridge: "LENIENT is the opposite of STRICT.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "FLEXIBLE : RIGID",
        why: "Fit: FLEXIBLE is the opposite of RIGID, matching the antonym bridge.",
      },
      {
        label: "B",
        pair: "LENIENT : EASYGOING",
        why: "Trap: Two choices same bridge — EASYGOING means much the same as lenient, not its opposite.",
      },
      {
        label: "C",
        pair: "STRICT : STERN",
        why: "Trap: Two choices same bridge — STRICT and STERN are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "LENIENT : RULE",
        why: "Trap: Same topic wrong bridge — rules can be lenient, but a rule isn't the opposite of lenient.",
      },
      {
        label: "E",
        pair: "LENIENT : TEACHER",
        why: "Trap: Same topic wrong bridge — a teacher may be lenient, but a teacher isn't the opposite of lenient.",
      },
    ],
  },
  {
    id: "S3-41",
    family: "antonym",
    stem: "PROVOKE : PACIFY",
    bridge: "PROVOKE is the opposite of PACIFY.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "PROVOKE : IRRITATE",
        why: "Trap: Two choices same bridge — IRRITATE means much the same as provoke, not its opposite.",
      },
      {
        label: "B",
        pair: "PROVOKE : ANGER",
        why: "Trap: Same topic wrong bridge — provoking causes anger, but anger isn't the opposite of provoke.",
      },
      {
        label: "C",
        pair: "SOOTHE : CALM",
        why: "Trap: Two choices same bridge — SOOTHE and CALM are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "AGITATE : SETTLE",
        why: "Fit: AGITATE is the opposite of SETTLE, matching the antonym bridge.",
      },
      {
        label: "E",
        pair: "PROVOKE : REACTION",
        why: "Trap: Part instead of whole — provoking draws a reaction, but a reaction isn't the opposite of provoke.",
      },
    ],
  },
  {
    id: "S3-42",
    family: "antonym",
    stem: "FRUGAL : EXTRAVAGANT",
    bridge: "FRUGAL is the opposite of EXTRAVAGANT.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "FRUGAL : THRIFTY",
        why: "Trap: Two choices same bridge — THRIFTY is another word for frugal, not its opposite.",
      },
      {
        label: "B",
        pair: "ECONOMICAL : WASTEFUL",
        why: "Fit: ECONOMICAL is the opposite of WASTEFUL, matching the antonym bridge.",
      },
      {
        label: "C",
        pair: "FRUGAL : BUDGET",
        why: "Trap: Same topic wrong bridge — a frugal person keeps a budget, but a budget isn't the opposite of frugal.",
      },
      {
        label: "D",
        pair: "LAVISH : OPULENT",
        why: "Trap: Two choices same bridge — LAVISH and OPULENT are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "FRUGAL : MONEY",
        why: "Trap: Same topic wrong bridge — frugality concerns money, but money isn't the opposite of frugal.",
      },
    ],
  },
  {
    id: "S3-43",
    family: "antonym",
    stem: "CONCEAL : REVEAL",
    bridge: "CONCEAL is the opposite of REVEAL.",
    correct: "E",
    choices: [
      {
        label: "A",
        pair: "CONCEAL : HIDE",
        why: "Trap: Two choices same bridge — HIDE is another word for conceal, not its opposite.",
      },
      {
        label: "B",
        pair: "CONCEAL : SECRET",
        why: "Trap: Same topic wrong bridge — you conceal a secret, but a secret isn't the opposite of conceal.",
      },
      {
        label: "C",
        pair: "MASK : COVER",
        why: "Trap: Two choices same bridge — MASK and COVER are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "CONCEAL : DISGUISE",
        why: "Trap: Two choices same bridge — DISGUISE means much the same as conceal, not its opposite.",
      },
      {
        label: "E",
        pair: "EXPOSE : BURY",
        why: "Fit: EXPOSE is the opposite of BURY, matching the antonym bridge.",
      },
    ],
  },
  {
    id: "S3-44",
    family: "antonym",
    stem: "AMATEUR : EXPERT",
    bridge: "AMATEUR is the opposite of EXPERT.",
    correct: "C",
    choices: [
      {
        label: "A",
        pair: "AMATEUR : BEGINNER",
        why: "Trap: Two choices same bridge — BEGINNER means much the same as amateur, not its opposite.",
      },
      {
        label: "B",
        pair: "EXPERT : SKILL",
        why: "Trap: Part instead of whole — an expert has skill, but skill isn't the opposite of expert.",
      },
      {
        label: "C",
        pair: "NOVICE : VETERAN",
        why: "Fit: NOVICE is the opposite of VETERAN, matching the antonym bridge.",
      },
      {
        label: "D",
        pair: "MASTER : PROFESSIONAL",
        why: "Trap: Two choices same bridge — MASTER and PROFESSIONAL are synonyms, not opposites.",
      },
      {
        label: "E",
        pair: "AMATEUR : HOBBY",
        why: "Trap: Same topic wrong bridge — an amateur may pursue a hobby, but a hobby isn't the opposite of amateur.",
      },
    ],
  },
  {
    id: "S3-45",
    family: "antonym",
    stem: "SCATTER : GATHER",
    bridge: "SCATTER is the opposite of GATHER.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "DISPERSE : ASSEMBLE",
        why: "Fit: DISPERSE is the opposite of ASSEMBLE, matching the antonym bridge.",
      },
      {
        label: "B",
        pair: "SCATTER : SPREAD",
        why: "Trap: Two choices same bridge — SPREAD is another word for scatter, not its opposite.",
      },
      {
        label: "C",
        pair: "GATHER : COLLECT",
        why: "Trap: Two choices same bridge — GATHER and COLLECT are synonyms, not opposites.",
      },
      {
        label: "D",
        pair: "SCATTER : SEEDS",
        why: "Trap: Same topic wrong bridge — you scatter seeds, but seeds aren't the opposite of scatter.",
      },
      {
        label: "E",
        pair: "SCATTER : CROWD",
        why: "Trap: Same topic wrong bridge — a crowd can scatter, but a crowd isn't the opposite of scatter.",
      },
    ],
  },
];
