import { EXTRA_QUESTIONS } from "./questions-extra";
import { LESSON3_QUESTIONS } from "./questions-lesson3";

export type Family =
  | "synonym"
  | "antonym"
  | "kind-category"
  | "part-whole"
  | "tool-function"
  | "worker-tool"
  | "worker-subject"
  | "characteristic"
  | "degree"
  | "cause-effect"
  | "young-adult"
  | "thing-place";

export const FAMILIES: Record<Family, { label: string; color: string }> = {
  synonym: { label: "Synonym — same meaning", color: "#EF4444" },
  antonym: { label: "Antonym — opposite meaning", color: "#F97316" },
  "kind-category": { label: "Kind / Category", color: "#F59E0B" },
  "part-whole": { label: "Part / Whole", color: "#FACC15" },
  "tool-function": { label: "Tool / What it does", color: "#22C55E" },
  "worker-tool": { label: "Worker / Their tool", color: "#10B981" },
  "worker-subject": { label: "Person / Who or what they work on", color: "#06B6D4" },
  characteristic: { label: "Thing / Its defining trait", color: "#3B82F6" },
  degree: { label: "Degree — same idea, stronger", color: "#A855F7" },
  "cause-effect": { label: "Cause / Effect", color: "#8B5CF6" },
  "young-adult": { label: "Young / Adult", color: "#EC4899" },
  "thing-place": { label: "Thing / Where it belongs", color: "#64748B" },
};

/* ----------------------------------------------------------------------------
 * FOUNDATION SIX — the foolproof picker + lesson grouping (Content Contract).
 * The 12 fine-grained families above stay on each question (for analytics and
 * later Tier-2 lessons). But kids only ever choose from SIX friendly buttons,
 * each phrased as a self-question. Each group maps to one or more families.
 * A question is "foundation" if its family belongs to one of these six groups.
 * -------------------------------------------------------------------------- */
export type FoundationGroup = "kind" | "part" | "used" | "degree" | "same" | "opposite";

export const FOUNDATION_SIX: Record<
  FoundationGroup,
  { label: string; ask: string; frame: string; hint: string; color: string; families: Family[] }
> = {
  kind: {
    label: "Kind of",
    ask: "Is one a type of the other?",
    frame: "A {a} is a kind of {b}.",
    hint: "one is a type / example of the other",
    color: "#F59E0B",
    families: ["kind-category"],
  },
  part: {
    label: "Part of",
    ask: "Is one a piece of the other?",
    frame: "A {a} is the part of a {b} that ___.",
    hint: "one is a piece of the whole — add what it does",
    color: "#FACC15",
    families: ["part-whole"],
  },
  used: {
    label: "Used for / a tool",
    ask: "Is one a tool used to do the other?",
    frame: "A {a} is a tool used to {b}.",
    hint: "one is a tool; the other is its job",
    color: "#22C55E",
    families: ["tool-function", "worker-tool"],
  },
  degree: {
    label: "More or less",
    ask: "Is one a stronger version of the other?",
    frame: "{a} is a stronger version of {b}.",
    hint: "same idea, but one is turned up (or down)",
    color: "#A855F7",
    families: ["degree"],
  },
  same: {
    label: "Same",
    ask: "Do they mean the same?",
    frame: "{a} is another word for {b}.",
    hint: "two words for one idea (synonyms)",
    color: "#EF4444",
    families: ["synonym"],
  },
  opposite: {
    label: "Opposite",
    ask: "Do they mean the opposite?",
    frame: "{a} is the opposite of {b}.",
    hint: "they point opposite ways (antonyms)",
    color: "#F97316",
    families: ["antonym"],
  },
};

/** Fill a family's bridge frame with the stem's two words as a starting sentence.
 *  Words go in lowercase; the first letter of the whole sentence is capitalized. */
export function bridgeFrameFor(group: FoundationGroup, stem: string): string {
  const parts = stem.split(":").map((w) => w.trim().toLowerCase());
  const a = parts[0] ?? "";
  const b = parts[1] ?? "";
  const filled = FOUNDATION_SIX[group].frame.replace("{a}", a).replace("{b}", b);
  return filled ? filled[0]!.toUpperCase() + filled.slice(1) : filled;
}

export const FOUNDATION_ORDER: FoundationGroup[] = [
  "kind",
  "part",
  "used",
  "degree",
  "same",
  "opposite",
];

/** Which Foundation-Six group a fine-grained family belongs to (or null = Tier-2). */
export function groupOfFamily(family: Family): FoundationGroup | null {
  for (const g of FOUNDATION_ORDER) {
    if (FOUNDATION_SIX[g].families.includes(family)) return g;
  }
  return null;
}

/** True if a question belongs to the Foundation Six (safe to drill in foundation mode). */
export function isFoundation(family: Family): boolean {
  return groupOfFamily(family) !== null;
}

export type Choice = { label: string; pair: string; why: string };
export type Question = {
  id: string;
  family: Family;
  stem: string;
  bridge: string;
  correct: string;
  choices: Choice[];
};

const BASE_QUESTIONS: Question[] = [
  {
    id: "P1",
    family: "tool-function",
    stem: "COMPASS : DIRECTION",
    bridge: "A compass is an instrument used to determine direction.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "MAP : JOURNEY",
        why: "A map may guide a journey, but it does not determine it as a measured property.",
      },
      {
        label: "B",
        pair: "THERMOMETER : TEMPERATURE",
        why: "A thermometer is an instrument used to determine temperature.",
      },
      {
        label: "C",
        pair: "NEEDLE : COMPASS",
        why: "A needle is a part of a compass — this changes to part-to-whole.",
      },
      {
        label: "D",
        pair: "NORTH : SOUTH",
        why: "North and south are opposites, not an instrument and what it determines.",
      },
      {
        label: "E",
        pair: "TRAVELER : ROUTE",
        why: "A traveler is a person who follows a route, not an instrument.",
      },
    ],
  },
  {
    id: "P2",
    family: "degree",
    stem: "SCURRY : MOVE",
    bridge: "To scurry is to move in a very quick, hurried manner.",
    correct: "D",
    choices: [
      {
        label: "A",
        pair: "RUNNER : RACE",
        why: "A runner participates in a race — person to event.",
      },
      {
        label: "B",
        pair: "HURRY : LATE",
        why: "Hurrying can be a response to being late — not manner to general action.",
      },
      {
        label: "C",
        pair: "CRAWL : SLOW",
        why: "This is an action followed by a description; the structure differs.",
      },
      {
        label: "D",
        pair: "GOBBLE : EAT",
        why: "To gobble is to eat in a very quick, hurried manner.",
      },
      {
        label: "E",
        pair: "MOTION : SPEED",
        why: "Speed is a property of motion, not its general action.",
      },
    ],
  },
  {
    id: "P3",
    family: "worker-subject",
    stem: "PATIENT : DOCTOR",
    bridge: "A patient receives medical treatment from a doctor.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "VETERINARIAN : ANIMAL",
        why: "The professional and the recipient are reversed.",
      },
      {
        label: "B",
        pair: "ANIMAL : VETERINARIAN",
        why: "An animal receives medical treatment from a veterinarian.",
      },
      { label: "C", pair: "TEACHER : CLASSROOM", why: "This is a worker and a workplace." },
      {
        label: "D",
        pair: "MEDICINE : PHARMACIST",
        why: "Medicine is dispensed by a pharmacist; it is not a care recipient.",
      },
      {
        label: "E",
        pair: "STUDENT : BOOK",
        why: "A student uses a book; a book is not a treating professional.",
      },
    ],
  },
  {
    id: "M1",
    family: "tool-function",
    stem: "GLOVE : HAND",
    bridge: "A glove is worn on a hand.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "HAT : COAT",
        why: "These are two clothing items; a hat is not worn on a coat.",
      },
      { label: "B", pair: "SOCK : FOOT", why: "A sock is worn on a foot." },
      {
        label: "C",
        pair: "SHOE : WALK",
        why: "A shoe is an item and WALK is an action, not a body part.",
      },
      { label: "D", pair: "FINGER : RING", why: "The body part and the worn item are reversed." },
      {
        label: "E",
        pair: "HAND : WRIST",
        why: "These are adjacent body parts, not a worn item and a body part.",
      },
    ],
  },
  {
    id: "M2",
    family: "tool-function",
    stem: "BROOM : SWEEP",
    bridge: "A broom is a tool used to sweep.",
    correct: "B",
    choices: [
      { label: "A", pair: "SOAP : WATER", why: "Soap is used with water; WATER is not an action." },
      { label: "B", pair: "PEN : WRITE", why: "A pen is a tool used to write." },
      { label: "C", pair: "PAPER : DRAW", why: "Paper is a surface for drawing, not the tool." },
      { label: "D", pair: "SWEEP : DUST", why: "This changes to action-to-object." },
      { label: "E", pair: "BRUSH : BRISTLE", why: "A bristle is part of a brush — whole to part." },
    ],
  },
  {
    id: "G1",
    family: "part-whole",
    stem: "ROOF : HOUSE",
    bridge: "A roof is the top covering part of a house.",
    correct: "B",
    choices: [
      {
        label: "A",
        pair: "ROOM : HOUSE",
        why: "A room is a part, but it is not the top covering.",
      },
      { label: "B", pair: "LID : JAR", why: "A lid is the top covering part of a jar." },
      { label: "C", pair: "JAR : LID", why: "The whole and its covering are reversed." },
      { label: "D", pair: "WINDOW : GLASS", why: "This is an object and its material." },
      {
        label: "E",
        pair: "GARAGE : CAR",
        why: "A garage shelters a car but is not its top covering part.",
      },
    ],
  },
  {
    id: "G2",
    family: "young-adult",
    stem: "PUPPY : DOG",
    bridge: "A puppy is a young dog.",
    correct: "B",
    choices: [
      { label: "A", pair: "KITTEN : FUR", why: "Fur is a body covering, not the animal species." },
      { label: "B", pair: "FOAL : HORSE", why: "A foal is a young horse." },
      { label: "C", pair: "HORSE : FOAL", why: "The animal and its young form are reversed." },
      { label: "D", pair: "DOG : KENNEL", why: "This is animal-to-dwelling." },
      {
        label: "E",
        pair: "CHICKEN : EGG",
        why: "This is an animal and an earlier reproductive stage.",
      },
    ],
  },
  {
    id: "G3",
    family: "worker-subject",
    stem: "DENTIST : TEETH",
    bridge: "A dentist is a specialist who professionally cares for teeth.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "OPTOMETRIST : EYES",
        why: "An optometrist professionally cares for eyes and vision.",
      },
      {
        label: "B",
        pair: "EYES : OPTOMETRIST",
        why: "The body area and the specialist are reversed.",
      },
      { label: "C", pair: "NURSE : HOSPITAL", why: "This is professional-to-workplace." },
      { label: "D", pair: "TEETH : TOOTHBRUSH", why: "This is body area-to-tool." },
      { label: "E", pair: "CHEF : KITCHEN", why: "This is worker-to-workplace." },
    ],
  },
  {
    id: "G4",
    family: "antonym",
    stem: "GENEROUS : SELFISH",
    bridge: "Generous and selfish describe opposite traits.",
    correct: "A",
    choices: [
      { label: "A", pair: "ANCIENT : MODERN", why: "Ancient and modern are opposites." },
      { label: "B", pair: "WARM : SUMMER", why: "This is description-to-season." },
      { label: "C", pair: "JOYFUL : SMILE", why: "This is emotion-to-expression." },
      {
        label: "D",
        pair: "SELFISH : GREEDY",
        why: "These are related negative traits, not opposites.",
      },
      { label: "E", pair: "KIND : FRIEND", why: "This is trait-to-person." },
    ],
  },
  {
    id: "C1",
    family: "thing-place",
    stem: "BEE : HIVE",
    bridge: "A bee lives in a hive.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "RABBIT : BURROW",
        why: "A rabbit lives in a burrow.",
      },
      { label: "B", pair: "HIVE : BEE", why: "The dwelling and the animal are reversed." },
      { label: "C", pair: "HONEY : BEE", why: "This is product-to-producer." },
      { label: "D", pair: "FLOWER : NECTAR", why: "This is a source and a substance." },
      { label: "E", pair: "WING : INSECT", why: "This is part-to-whole." },
    ],
  },
  {
    id: "C2",
    family: "tool-function",
    stem: "WHISK : MIX",
    bridge: "A whisk is a tool used to mix.",
    correct: "B",
    choices: [
      { label: "A", pair: "BOWL : BATTER", why: "This is container-to-contents." },
      { label: "B", pair: "BRUSH : PAINT", why: "A brush is a tool used to paint." },
      { label: "C", pair: "MIX : WHISK", why: "The action and the tool are reversed." },
      { label: "D", pair: "OVEN : HOT", why: "This is object-to-description." },
      { label: "E", pair: "FLOUR : BAKE", why: "This is ingredient-to-action." },
    ],
  },
  {
    id: "C3",
    family: "young-adult",
    stem: "CALF : COW",
    bridge: "A calf is a young cow.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "CHICK : HEN",
        why: "A chick is a young chicken and a hen is the corresponding adult.",
      },
      { label: "B", pair: "COW : CALF", why: "The adult and the young are reversed." },
      { label: "C", pair: "LAMB : WOOL", why: "This is young animal-to-covering or product." },
      { label: "D", pair: "PONY : SADDLE", why: "This is animal-to-equipment." },
      { label: "E", pair: "HEN : EGG", why: "This is adult animal-to-product." },
    ],
  },
  {
    id: "C4",
    family: "part-whole",
    stem: "PAGE : BOOK",
    bridge: "A page is one unit that makes up a book.",
    correct: "A",
    choices: [
      { label: "A", pair: "BRICK : WALL", why: "A brick is one unit that makes up a wall." },
      { label: "B", pair: "WALL : BRICK", why: "The whole and its unit are reversed." },
      { label: "C", pair: "INK : PEN", why: "This is substance-to-container." },
      { label: "D", pair: "AUTHOR : BOOK", why: "This is creator-to-creation." },
      { label: "E", pair: "COVER : TITLE", why: "This is location-to-content." },
    ],
  },
  {
    id: "C5",
    family: "antonym",
    stem: "FREEZE : MELT",
    bridge: "To freeze is the opposite of to melt.",
    correct: "A",
    choices: [
      { label: "A", pair: "ASCEND : DESCEND", why: "To ascend is the opposite of to descend." },
      { label: "B", pair: "HEAT : OVEN", why: "This is effect-to-source." },
      { label: "C", pair: "ICE : WATER", why: "This is a state or form relationship." },
      {
        label: "D",
        pair: "MELT : LIQUID",
        why: "This is action-to-resulting state, not opposite actions.",
      },
      { label: "E", pair: "COLD : SHIVER", why: "This is cause-to-response." },
    ],
  },
  {
    id: "C6",
    family: "worker-tool",
    stem: "CARPENTER : HAMMER",
    bridge: "A carpenter uses a hammer.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "SURGEON : SCALPEL",
        why: "A surgeon uses a scalpel.",
      },
      {
        label: "B",
        pair: "HAMMER : CARPENTER",
        why: "The tool and the professional are reversed.",
      },
      { label: "C", pair: "BUILDER : HOUSE", why: "This is creator-to-product." },
      { label: "D", pair: "WOOD : SAW", why: "This is material-to-tool." },
      { label: "E", pair: "CHEF : MEAL", why: "This is creator-to-product." },
    ],
  },
  {
    id: "H1",
    family: "characteristic",
    stem: "OASIS : DESERT",
    bridge:
      "An oasis is a smaller area with contrasting physical conditions located within a desert.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "ISLAND : OCEAN",
        why: "An island is a smaller land area that contrasts with and lies within the surrounding ocean.",
      },
      { label: "B", pair: "OCEAN : ISLAND", why: "The environment and the feature are reversed." },
      { label: "C", pair: "WATER : OASIS", why: "This is component-to-place." },
      { label: "D", pair: "SAND : BEACH", why: "This is material-to-place." },
      { label: "E", pair: "FOREST : TREE", why: "This is containing environment-to-member." },
    ],
  },
  {
    id: "H2",
    family: "degree",
    stem: "FRUGAL : MISERLY",
    bridge: "Miserly is an excessive, negatively judged extreme of being frugal.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "CONFIDENT : ARROGANT",
        why: "Arrogance is a negatively judged excess of confidence.",
      },
      {
        label: "B",
        pair: "CAREFUL : RECKLESS",
        why: "These are opposites, not moderate-to-excessive degree.",
      },
      {
        label: "C",
        pair: "MISERLY : FRUGAL",
        why: "The excessive-to-moderate direction is reversed.",
      },
      { label: "D", pair: "WEALTHY : GENEROUS", why: "There is no necessary relationship." },
      { label: "E", pair: "THRIFTY : SAVE", why: "This is trait-to-associated action." },
    ],
  },
  {
    id: "H3",
    family: "cause-effect",
    stem: "BLUEPRINT : BUILDING",
    bridge: "A blueprint is a plan used to create a building.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "RECIPE : DISH",
        why: "A recipe is a set of instructions used to create a dish.",
      },
      { label: "B", pair: "DISH : RECIPE", why: "The product and the instructions are reversed." },
      { label: "C", pair: "ARCHITECT : BLUEPRINT", why: "This is creator-to-plan." },
      { label: "D", pair: "BRICK : BUILDING", why: "This is material-to-whole." },
      {
        label: "E",
        pair: "MAP : ROAD",
        why: "A map represents a road; it is not a plan used to create it.",
      },
    ],
  },
  {
    id: "H4",
    family: "degree",
    stem: "MUMBLE : SPEAK",
    bridge: "To mumble is to speak indistinctly so the words are hard to understand.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "SCRIBBLE : WRITE",
        why: "To scribble is to write unclearly so the words are hard to read.",
      },
      { label: "B", pair: "LISTEN : HEAR", why: "This is intentional-to-passive perception." },
      {
        label: "C",
        pair: "SPEAK : MUMBLE",
        why: "The general action and its specific manner are reversed.",
      },
      { label: "D", pair: "VOICE : SOUND", why: "This is source-to-output." },
      {
        label: "E",
        pair: "QUIET : SILENCE",
        why: "These are related states, not manner-to-action.",
      },
    ],
  },
  {
    id: "H5",
    family: "worker-subject",
    stem: "ARCHAEOLOGIST : ARTIFACT",
    bridge: "An archaeologist is a specialist who studies artifacts.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "ASTRONOMER : STAR",
        why: "An astronomer is a specialist who studies stars.",
      },
      {
        label: "B",
        pair: "FOSSIL : PALEONTOLOGIST",
        why: "The object and the specialist are reversed.",
      },
      { label: "C", pair: "ARTIST : PAINTING", why: "This is creator-to-creation." },
      {
        label: "D",
        pair: "LIBRARIAN : BOOK",
        why: "A librarian organizes books rather than defining a field by studying them.",
      },
      { label: "E", pair: "MUSEUM : ARTIFACT", why: "This is place-to-contained object." },
    ],
  },
  {
    id: "H6",
    family: "cause-effect",
    stem: "VERDICT : TRIAL",
    bridge: "A verdict is a conclusion reached through a trial.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "DIAGNOSIS : EXAMINATION",
        why: "A diagnosis is a conclusion reached through an examination.",
      },
      { label: "B", pair: "TRIAL : VERDICT", why: "The process and the conclusion are reversed." },
      { label: "C", pair: "JUDGE : COURT", why: "This is person-to-workplace." },
      { label: "D", pair: "QUESTION : ANSWER", why: "This is prompt-to-response." },
      { label: "E", pair: "EVIDENCE : DECISION", why: "This is input-to-conclusion." },
    ],
  },
  {
    id: "F1",
    family: "tool-function",
    stem: "BAROMETER : PRESSURE",
    bridge: "A barometer is an instrument used to measure air pressure.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "THERMOMETER : TEMPERATURE",
        why: "A thermometer is an instrument used to measure temperature.",
      },
      {
        label: "B",
        pair: "CLOCK : APPOINTMENT",
        why: "A clock measures time, not an appointment.",
      },
      {
        label: "C",
        pair: "PRESSURE : BAROMETER",
        why: "The quantity and the instrument are reversed.",
      },
      { label: "D", pair: "RAIN : CLOUD", why: "This is result-to-source." },
      { label: "E", pair: "WEATHER : FORECAST", why: "This is subject-to-prediction." },
    ],
  },
  {
    id: "F2",
    family: "degree",
    stem: "SPRINT : RUN",
    bridge: "To sprint is to run very fast.",
    correct: "A",
    choices: [
      { label: "A", pair: "GOBBLE : EAT", why: "To gobble is to eat very fast." },
      {
        label: "B",
        pair: "WALK : MOVE",
        why: "Walking is movement, but the very-fast degree is missing.",
      },
      {
        label: "C",
        pair: "RUN : SPRINT",
        why: "The general action and the specific fast manner are reversed.",
      },
      { label: "D", pair: "RACE : TROPHY", why: "This is event-to-award." },
      { label: "E", pair: "QUICK : SPEED", why: "This is adjective-to-property noun." },
    ],
  },
  {
    id: "F3",
    family: "worker-subject",
    stem: "DEFENDANT : ATTORNEY",
    bridge: "A defendant is represented by an attorney.",
    correct: "A",
    choices: [
      {
        label: "A",
        pair: "NATION : AMBASSADOR",
        why: "A nation may be officially represented by an ambassador.",
      },
      {
        label: "B",
        pair: "AMBASSADOR : NATION",
        why: "The representative and the represented party are reversed.",
      },
      { label: "C", pair: "JUDGE : DEFENDANT", why: "This is decision-maker-to-party." },
      { label: "D", pair: "CLIENT : PAYMENT", why: "This is payer-to-object transferred." },
      {
        label: "E",
        pair: "LAW : COURT",
        why: "This is a rule or system and a place of application.",
      },
    ],
  },
];

export const QUESTIONS: Question[] = [...BASE_QUESTIONS, ...EXTRA_QUESTIONS, ...LESSON3_QUESTIONS];

// Difficulty per question (1=easy, 2=medium, 3=hard). VOCAB-FIRST rubric (word rarity;
// traps are secondary since every analogy has a flip-trap). See Content Contract §5.
export const DIFFICULTY: Record<string, 1 | 2 | 3> = {
  C1: 2,
  C2: 1,
  C3: 1,
  C4: 1,
  C5: 2,
  C6: 2,
  F1: 2,
  F2: 1,
  F3: 2,
  G1: 1,
  G2: 1,
  G3: 2,
  G4: 2,
  H1: 2,
  H2: 3,
  H3: 2,
  H4: 2,
  H5: 3,
  H6: 3,
  M1: 1,
  M2: 1,
  P1: 2,
  P2: 2,
  P3: 2,
  X1: 1,
  X2: 1,
  X3: 1,
  X4: 2,
  X5: 1,
  X6: 2,
  X7: 1,
  X8: 2,
  X9: 1,
  X10: 2,
  X11: 1,
  X12: 2,
  X13: 2,
  X14: 2,
  X15: 2,
  X16: 2,
  X17: 1,
  X18: 2,
  X19: 1,
  X20: 1,
  X21: 2,
  X22: 2,
  X23: 2,
  X24: 2,
  X25: 2,
  X26: 2,
  X27: 2,
  X28: 1,
  X29: 2,
  X30: 2,
  X31: 1,
  X32: 1,
  X33: 2,
  X34: 2,
  X35: 2,
  X36: 2,
  "S3-01": 1,
  "S3-02": 1,
  "S3-03": 1,
  "S3-04": 1,
  "S3-05": 2,
  "S3-06": 2,
  "S3-07": 2,
  "S3-08": 2,
  "S3-09": 2,
  "S3-10": 2,
  "S3-11": 2,
  "S3-12": 1,
  "S3-13": 3,
  "S3-14": 2,
  "S3-15": 2,
  "S3-16": 2,
  "S3-17": 3,
  "S3-18": 3,
  "S3-19": 3,
  "S3-20": 3,
  "S3-21": 3,
  "S3-22": 3,
  "S3-23": 3,
  "S3-24": 1,
  "S3-25": 1,
  "S3-26": 2,
  "S3-27": 1,
  "S3-28": 1,
  "S3-29": 1,
  "S3-30": 1,
  "S3-31": 1,
  "S3-32": 1,
  "S3-33": 2,
  "S3-34": 2,
  "S3-35": 2,
  "S3-36": 2,
  "S3-37": 2,
  "S3-38": 2,
  "S3-39": 2,
  "S3-40": 2,
  "S3-41": 3,
  "S3-42": 3,
  "S3-43": 2,
  "S3-44": 2,
  "S3-45": 2,
};

// Questions whose vocabulary is too basic for a 95th-percentile target — kept as
// EASY TEACHING EXAMPLES only, excluded from the real drill pool (not for 1000 reps).
export const TOO_EASY: ReadonlySet<string> = new Set([
  "C2",
  "C3",
  "C4",
  "F2",
  "G1",
  "G2",
  "M1",
  "M2",
  "X1",
  "X2",
  "X3",
  "X5",
  "X7",
  "X9",
  "X11",
  "X17",
  "X19",
  "X20",
  "X28",
  "X31",
  "X32",
  "S3-01",
  "S3-02",
  "S3-03",
  "S3-04",
  "S3-12",
  "S3-24",
  "S3-25",
  "S3-27",
  "S3-28",
  "S3-29",
  "S3-30",
  "S3-31",
  "S3-32",
]);

/** Difficulty for a question id (defaults to 2/medium if untagged). */
export function difficultyOf(qid: string): 1 | 2 | 3 {
  return DIFFICULTY[qid] ?? 2;
}

/** True if the question is only a teaching example, not for real drilling. */
export function isTooEasy(qid: string): boolean {
  return TOO_EASY.has(qid);
}

// Per-girl reward wishlists. ONLY items the parent has actually specified.
// Calista's confirmed items (from her screenshots). Bianca's list is empty until
// the parent adds hers in the parent panel — no made-up rewards.
export const CALISTA_REWARDS = [
  { name: "White Fox 'Don't Need Anyone' tank", xp: 350 },
  { name: "Below the Blue — The Lila Ring", xp: 550 },
  { name: "Below the Blue — Trident Pearl Bracelet", xp: 1350 },
  { name: "Below the Blue — Islay Necklace 003", xp: 1450 },
];

export const BIANCA_REWARDS: { name: string; xp: number }[] = [];

export const REWARDS_BY_GIRL: Record<"bianca" | "calista", { name: string; xp: number }[]> = {
  bianca: BIANCA_REWARDS,
  calista: CALISTA_REWARDS,
};

const UNKNOWN_FAMILY = { label: "Relationship", color: "#94A3B8" };
export function famInfo(family: string | null | undefined) {
  return (family && FAMILIES[family as Family]) || UNKNOWN_FAMILY;
}
