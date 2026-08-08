# Analogy Bridge Builders

Build "SSAT Quest" — a polished, iPad-first React web app (PWA-ready) for Middle Level SSAT analogy practice for two students, Bianca (12) and Calista (10). This is a family app their mother built; it must feel like a beautiful game, not homework. Analogies only (no synonyms). No backend — use LocalStorage for all state.

==========================================

1. AESTHETIC & THEME (non-negotiable)

==========================================

- Background: deep sophisticated dark navy #0A0F24.

- Decoration: hand-drawn hot-pink flower doodles (#FF2E93) scattered lightly in viewport corners, around card borders, and behind headings — playful, not busy.

- All interactive elements: large, rounded, bouncy spring animations on tap (Framer Motion). Minimum 48x48px tap targets.

- Text scale for iPad legibility: stem pairs 48px+ bold serif; answer choices 34px+ bold; locked bridge sentences 30px; body text 18px+.

- A cute pixel-art study mascot (a small round owl or fox with a notebook) sits on the dashboard. It unlocks accessories at lifetime XP milestones: 500 XP = pink bow, 1,000 XP = round glasses, 2,000 XP = gold crown. Show the next unlock on its card.

- RAINBOW FAMILY BADGES — every question carries a relationship-family badge, color-coded:

  * Red #EF4444 "Synonym / Antonym"

  * Orange #F97316 "Kind / Category"

  * Yellow #FACC15 "Part / Whole"

  * Green #22C55E "Tool / Function"

  * Blue #3B82F6 "Characteristic"

  * Purple #A855F7 "Action / Degree / Cause"

  * Slate #64748B "People / Places / Roles"

- Version stamp "SSAT Quest v8" in small text at the bottom of the dashboard.

==========================================

2. PROFILES & STORAGE

==========================================

- Landing screen: two large profile cards, "Bianca" (coral accent) and "Calista" (lavender accent), each showing: lifetime XP, available XP, current streak, active reward progress ring.

- Profiles are fully separate. All state in LocalStorage, namespaced per profile. Never show one girl's totals next to the other's on the same card; no leaderboards, no winner language.

- Session never expires; the app resumes where she left off.

==========================================

3. THE ANALOGY DRILL LOOP (the core ritual)

==========================================

Every question follows these exact states in order. The ritual never changes regardless of difficulty.

STATE 1 — STEM ONLY:

Show only the stem pair (e.g., "GLOVE : HAND ::") in 48px+ with its family badge. All five choices are hidden. A text box invites: "Write your bridge sentence — how do these two words connect?" iPad dictation hint: "Tap the mic on the keyboard to dictate."

STATE 2 — BRIDGE LOCK:

She types or dictates a sentence. "Lock My Bridge" button is disabled until at least 5 words. On lock: the sentence displays in 30px with a lock icon and can no longer be edited. Award +5 XP (once per question).

STATE 3 — THE MONKEY TEST (one choice at a time):

Choices slide in ONE AT A TIME. For each choice, display her own sentence with the choice's two words substituted in (e.g., her bridge "A glove is worn on a hand" + choice SOCK : FOOT renders as "A sock is worn on a foot") plus the raw pair. She taps one of three buttons per choice: [Works] [Kind of] [Doesn't work]. Each judgment awards +1 XP (once per choice). No choice may be skipped.

STATE 4 — SURVIVOR VERDICT (after all five judged):

Count the "Works" marks:

- Exactly 1 Works -> "One clean survivor!" — proceed to final answer.

- Zero Works -> "REWRITE — none of the choices fit your sentence. Return to the stem and repair your bridge." Unlock editing, let her revise (revised bridge re-locks; no extra XP for the re-lock).

- Two or more Works (count "Kind of" as survivors too) -> "TOO LOOSE — your bridge let more than one answer through. Find the broad word and tighten it." Unlock editing for a revision.

STATE 5 — FINAL ANSWER:

All five choices shown together. She taps her final answer, or taps "Leave blank." Award +3 XP for a correct first answer OR for completing the correction after a miss (see feedback). Streak counter increments on correct; resets on incorrect or blank. Every 5-correct streak awards a one-time +5 XP streak bonus (then the streak count continues; bonus repeats at every multiple of 5).

STATE 6 — FEEDBACK:

Reveal: the exact target bridge sentence, the correct letter and pair, and a one-line explanation for ALL five choices (correct one highlighted green, tempting distractor flagged). If she missed: require one tap — "What my bridge needed:" with the corrected bridge shown — before "Next question" enables. A repeated question (seen before) may award only +1 XP total, and only if she has completed at least 5 different questions since she last saw it.

STATE 7 — NEXT:

Buttons: [Keep practicing] (next random question) and [Stop for now] (returns to dashboard). No session time limit. After ~20 minutes of continuous practice, show a gentle non-blocking banner: "Nice work! Stretch break?" that dismisses with one tap.

QUESTION ENGINE:

- Draw randomly from the embedded bank (below). Never repeat a question back-to-back. When all 24 have been seen, reshuffle and continue.

==========================================

4. REWARDS — THE WISHLIST LEDGER

==========================================

- Each profile has: available XP (spendable), lifetime XP (never decreases), and one ACTIVE reward target.

- The dashboard shows a circular progress ring toward the active reward ("Concert tickets: 240 / 200 XP" — when reached, the ring glows and a [Redeem] button appears).

- Redemption flow: she taps [Redeem] -> status becomes "Waiting for Mom" (visible on her card) -> Mom approves in the parent panel -> available XP decreases by the cost, lifetime XP unchanged, a "Redeemed!" celebration animation plays, and the item appears in her redemption history.

- SEED REWARD CATALOG (load these as both girls' starting catalog; each girl picks her own active reward):

  [

    { "name": "Concert tickets — any show", "xp": 200 },

    { "name": "Gold hoop earrings (Amazon)", "xp": 150 },

    { "name": "The rhode kit", "xp": 300 },

    { "name": "Sephora item under $25", "xp": 100 },

    { "name": "Book of her choice (up to $15)", "xp": 50 },

    { "name": "White Fox 'Don't Need Anyone' tank", "xp": 350 },

    { "name": "Below the Blue — The Lila Ring", "xp": 550 },

    { "name": "Below the Blue — Trident Pearl Bracelet", "xp": 1350 },

    { "name": "Below the Blue — Islay Necklace 003", "xp": 1450 },

    { "name": "Extra phone time (1 hour)", "xp": 25 },

    { "name": "Pick family dinner", "xp": 25 }

  ]

- When adding a new reward from a price, the parent panel auto-suggests XP = price in dollars x 10 (editable).

==========================================

5. PARENT PANEL (PIN-gated)

==========================================

- A small "Parent" link on the dashboard opens a PIN entry. Default PIN: 1701. First thing shown inside: "Change PIN" option. The PIN is stored in LocalStorage; nothing in the kid view reveals it.

- Parent panel contents:

  1. Both girls' totals at a glance (lifetime XP, available XP, questions done today, streak).

  2. Reward manager: full catalog list with edit/delete; "Add reward" form with fields: name, XP cost (auto-suggest = price x 10 when a price is entered), optional photo URL. New rewards appear for both girls immediately.

  3. Redemption approvals: any "Waiting for Mom" redemption gets [Approve] / [Not yet] buttons.

  4. Exit-ticket stars: two big buttons — "Bianca said her bridge out loud (+20)" and "Calista said her bridge out loud (+20)" — each usable once per calendar day per girl.

  5. Day-complete bonus: automatic +25 when a girl reaches 8 completed questions AND her exit-ticket star has been awarded that day.

- Parent panel must be fully usable on a phone.

==========================================

6. QUESTION BANK (embed exactly — all 24)

==========================================

All questions are original and reviewed. Each has exactly 5 choices and one defensible answer. "family" maps to the badge colors in section 1.

[

{"id":"P1","family":"tool-function","stem":"COMPASS : DIRECTION","bridge":"A compass is an instrument used to determine direction.","correct":"B","choices":[

 {"label":"A","pair":"MAP : JOURNEY","why":"A map may guide a journey, but it does not determine it as a measured property."},

 {"label":"B","pair":"THERMOMETER : TEMPERATURE","why":"A thermometer is an instrument used to determine temperature."},

 {"label":"C","pair":"NEEDLE : COMPASS","why":"A needle is a part of a compass — this changes to part-to-whole."},

 {"label":"D","pair":"NORTH : SOUTH","why":"North and south are opposites, not an instrument and what it determines."},

 {"label":"E","pair":"TRAVELER : ROUTE","why":"A traveler is a person who follows a route, not an instrument."}]},

{"id":"P2","family":"action-degree","stem":"SCURRY : MOVE","bridge":"To scurry is to move in a very quick, hurried manner.","correct":"D","choices":[

 {"label":"A","pair":"RUNNER : RACE","why":"A runner participates in a race — person to event."},

 {"label":"B","pair":"HURRY : LATE","why":"Hurrying can be a response to being late — not manner to general action."},

 {"label":"C","pair":"CRAWL : SLOW","why":"This is an action followed by a description; the structure differs."},

 {"label":"D","pair":"GOBBLE : EAT","why":"To gobble is to eat in a very quick, hurried manner."},

 {"label":"E","pair":"MOTION : SPEED","why":"Speed is a property of motion, not its general action."}]},

{"id":"P3","family":"people-places","stem":"PATIENT : DOCTOR","bridge":"A patient receives medical treatment from a doctor.","correct":"B","choices":[

 {"label":"A","pair":"VETERINARIAN : ANIMAL","why":"The professional and the recipient are reversed."},

 {"label":"B","pair":"ANIMAL : VETERINARIAN","why":"An animal receives medical treatment from a veterinarian."},

 {"label":"C","pair":"TEACHER : CLASSROOM","why":"This is a worker and a workplace."},

 {"label":"D","pair":"MEDICINE : PHARMACIST","why":"Medicine is dispensed by a pharmacist; it is not a care recipient."},

 {"label":"E","pair":"STUDENT : BOOK","why":"A student uses a book; a book is not a treating professional."}]},

{"id":"M1","family":"characteristic","stem":"GLOVE : HAND","bridge":"A glove is worn on a hand.","correct":"B","choices":[

 {"label":"A","pair":"HAT : COAT","why":"These are two clothing items; a hat is not worn on a coat."},

 {"label":"B","pair":"SOCK : FOOT","why":"A sock is worn on a foot."},

 {"label":"C","pair":"SHOE : WALK","why":"A shoe is an item and WALK is an action, not a body part."},

 {"label":"D","pair":"FINGER : RING","why":"The body part and the worn item are reversed."},

 {"label":"E","pair":"HAND : WRIST","why":"These are adjacent body parts, not a worn item and a body part."}]},

{"id":"M2","family":"tool-function","stem":"BROOM : SWEEP","bridge":"A broom is a tool used to sweep.","correct":"B","choices":[

 {"label":"A","pair":"SOAP : WATER","why":"Soap is used with water; WATER is not an action."},

 {"label":"B","pair":"PEN : WRITE","why":"A pen is a tool used to write."},

 {"label":"C","pair":"PAPER : DRAW","why":"Paper is a surface for drawing, not the tool."},

 {"label":"D","pair":"SWEEP : DUST","why":"This changes to action-to-object."},

 {"label":"E","pair":"BRUSH : BRISTLE","why":"A bristle is part of a brush — whole to part."}]},

{"id":"G1","family":"part-whole","stem":"ROOF : HOUSE","bridge":"A roof is the top covering part of a house.","correct":"B","choices":[

 {"label":"A","pair":"ROOM : HOUSE","why":"A room is a part, but it is not the top covering."},

 {"label":"B","pair":"LID : JAR","why":"A lid is the top covering part of a jar."},

 {"label":"C","pair":"JAR : LID","why":"The whole and its covering are reversed."},

 {"label":"D","pair":"WINDOW : GLASS","why":"This is an object and its material."},

 {"label":"E","pair":"GARAGE : CAR","why":"A garage shelters a car but is not its top covering part."}]},

{"id":"G2","family":"kind-category","stem":"PUPPY : DOG","bridge":"A puppy is a young dog.","correct":"B","choices":[

 {"label":"A","pair":"KITTEN : FUR","why":"Fur is a body covering, not the animal species."},

 {"label":"B","pair":"FOAL : HORSE","why":"A foal is a young horse."},

 {"label":"C","pair":"HORSE : FOAL","why":"The animal and its young form are reversed."},

 {"label":"D","pair":"DOG : KENNEL","why":"This is animal-to-dwelling."},

 {"label":"E","pair":"CHICKEN : EGG","why":"This is an animal and an earlier reproductive stage."}]},

{"id":"G3","family":"kind-category","stem":"DENTIST : TEETH","bridge":"A dentist is a specialist who professionally cares for teeth.","correct":"A","choices":[

 {"label":"A","pair":"OPTOMETRIST : EYES","why":"An optometrist professionally cares for eyes and vision."},

 {"label":"B","pair":"EYES : OPTOMETRIST","why":"The body area and the specialist are reversed."},

 {"label":"C","pair":"NURSE : HOSPITAL","why":"This is professional-to-workplace."},

 {"label":"D","pair":"TEETH : TOOTHBRUSH","why":"This is body area-to-tool."},

 {"label":"E","pair":"CHEF : KITCHEN","why":"This is worker-to-workplace."}]},

{"id":"G4","family":"synonym-antonym","stem":"GENEROUS : SELFISH","bridge":"Generous and selfish describe opposite traits.","correct":"A","choices":[

 {"label":"A","pair":"ANCIENT : MODERN","why":"Ancient and modern are opposites."},

 {"label":"B","pair":"WARM : SUMMER","why":"This is description-to-season."},

 {"label":"C","pair":"JOYFUL : SMILE","why":"This is emotion-to-expression."},

 {"label":"D","pair":"SELFISH : GREEDY","why":"These are related negative traits, not opposites."},

 {"label":"E","pair":"KIND : FRIEND","why":"This is trait-to-person."}]},

{"id":"C1","family":"people-places","stem":"BEE : HIVE","bridge":"A bee characteristically lives in a hive.","correct":"A","choices":[

 {"label":"A","pair":"RABBIT : BURROW","why":"A rabbit characteristically lives in a burrow."},

 {"label":"B","pair":"HIVE : BEE","why":"The dwelling and the animal are reversed."},

 {"label":"C","pair":"HONEY : BEE","why":"This is product-to-producer."},

 {"label":"D","pair":"FLOWER : NECTAR","why":"This is a source and a substance."},

 {"label":"E","pair":"WING : INSECT","why":"This is part-to-whole."}]},

{"id":"C2","family":"tool-function","stem":"WHISK : MIX","bridge":"A whisk is a tool used to mix.","correct":"B","choices":[

 {"label":"A","pair":"BOWL : BATTER","why":"This is container-to-contents."},

 {"label":"B","pair":"BRUSH : PAINT","why":"A brush is a tool used to paint."},

 {"label":"C","pair":"MIX : WHISK","why":"The action and the tool are reversed."},

 {"label":"D","pair":"OVEN : HOT","why":"This is object-to-description."},

 {"label":"E","pair":"FLOUR : BAKE","why":"This is ingredient-to-action."}]},

{"id":"C3","family":"kind-category","stem":"CALF : COW","bridge":"A calf is a young cow.","correct":"A","choices":[

 {"label":"A","pair":"CHICK : HEN","why":"A chick is a young chicken and a hen is the corresponding adult."},

 {"label":"B","pair":"COW : CALF","why":"The adult and the young are reversed."},

 {"label":"C","pair":"LAMB : WOOL","why":"This is young animal-to-covering or product."},

 {"label":"D","pair":"PONY : SADDLE","why":"This is animal-to-equipment."},

 {"label":"E","pair":"HEN : EGG","why":"This is adult animal-to-product."}]},

{"id":"C4","family":"part-whole","stem":"PAGE : BOOK","bridge":"A page is one unit that makes up a book.","correct":"A","choices":[

 {"label":"A","pair":"BRICK : WALL","why":"A brick is one unit that makes up a wall."},

 {"label":"B","pair":"WALL : BRICK","why":"The whole and its unit are reversed."},

 {"label":"C","pair":"INK : PEN","why":"This is substance-to-container."},

 {"label":"D","pair":"AUTHOR : BOOK","why":"This is creator-to-creation."},

 {"label":"E","pair":"COVER : TITLE","why":"This is location-to-content."}]},

{"id":"C5","family":"synonym-antonym","stem":"FREEZE : MELT","bridge":"To freeze is the opposite of to melt.","correct":"A","choices":[

 {"label":"A","pair":"ASCEND : DESCEND","why":"To ascend is the opposite of to descend."},

 {"label":"B","pair":"HEAT : OVEN","why":"This is effect-to-source."},

 {"label":"C","pair":"ICE : WATER","why":"This is a state or form relationship."},

 {"label":"D","pair":"MELT : LIQUID","why":"This is action-to-resulting state, not opposite actions."},

 {"label":"E","pair":"COLD : SHIVER","why":"This is cause-to-response."}]},

{"id":"C6","family":"tool-function","stem":"CARPENTER : HAMMER","bridge":"A carpenter characteristically uses a hammer as a tool.","correct":"A","choices":[

 {"label":"A","pair":"SURGEON : SCALPEL","why":"A surgeon characteristically uses a scalpel as a tool."},

 {"label":"B","pair":"HAMMER : CARPENTER","why":"The tool and the professional are reversed."},

 {"label":"C","pair":"BUILDER : HOUSE","why":"This is creator-to-product."},

 {"label":"D","pair":"WOOD : SAW","why":"This is material-to-tool."},

 {"label":"E","pair":"CHEF : MEAL","why":"This is creator-to-product."}]},

{"id":"H1","family":"characteristic","stem":"OASIS : DESERT","bridge":"An oasis is a smaller area with contrasting physical conditions located within a desert.","correct":"A","choices":[

 {"label":"A","pair":"ISLAND : OCEAN","why":"An island is a smaller land area that contrasts with and lies within the surrounding ocean."},

 {"label":"B","pair":"OCEAN : ISLAND","why":"The environment and the feature are reversed."},

 {"label":"C","pair":"WATER : OASIS","why":"This is component-to-place."},

 {"label":"D","pair":"SAND : BEACH","why":"This is material-to-place."},

 {"label":"E","pair":"FOREST : TREE","why":"This is containing environment-to-member."}]},

{"id":"H2","family":"action-degree","stem":"FRUGAL : MISERLY","bridge":"Miserly is an excessive, negatively judged extreme of being frugal.","correct":"A","choices":[

 {"label":"A","pair":"CONFIDENT : ARROGANT","why":"Arrogance is a negatively judged excess of confidence."},

 {"label":"B","pair":"CAREFUL : RECKLESS","why":"These are opposites, not moderate-to-excessive degree."},

 {"label":"C","pair":"MISERLY : FRUGAL","why":"The excessive-to-moderate direction is reversed."},

 {"label":"D","pair":"WEALTHY : GENEROUS","why":"There is no necessary relationship."},

 {"label":"E","pair":"THRIFTY : SAVE","why":"This is trait-to-associated action."}]},

{"id":"H3","family":"action-degree","stem":"BLUEPRINT : BUILDING","bridge":"A blueprint is a plan used to create a building.","correct":"A","choices":[

 {"label":"A","pair":"RECIPE : DISH","why":"A recipe is a set of instructions used to create a dish."},

 {"label":"B","pair":"DISH : RECIPE","why":"The product and the instructions are reversed."},

 {"label":"C","pair":"ARCHITECT : BLUEPRINT","why":"This is creator-to-plan."},

 {"label":"D","pair":"BRICK : BUILDING","why":"This is material-to-whole."},

 {"label":"E","pair":"MAP : ROAD","why":"A map represents a road; it is not a plan used to create it."}]},

{"id":"H4","family":"action-degree","stem":"MUMBLE : SPEAK","bridge":"To mumble is to speak indistinctly so the words are hard to understand.","correct":"A","choices":[

 {"label":"A","pair":"SCRIBBLE : WRITE","why":"To scribble is to write unclearly so the words are hard to read."},

 {"label":"B","pair":"LISTEN : HEAR","why":"This is intentional-to-passive perception."},

 {"label":"C","pair":"SPEAK : MUMBLE","why":"The general action and its specific manner are reversed."},

 {"label":"D","pair":"VOICE : SOUND","why":"This is source-to-output."},

 {"label":"E","pair":"QUIET : SILENCE","why":"These are related states, not manner-to-action."}]},

{"id":"H5","family":"people-places","stem":"ARCHAEOLOGIST : ARTIFACT","bridge":"An archaeologist is a specialist who studies artifacts.","correct":"A","choices":[

 {"label":"A","pair":"ASTRONOMER : STAR","why":"An astronomer is a specialist who studies stars."},

 {"label":"B","pair":"FOSSIL : PALEONTOLOGIST","why":"The object and the specialist are reversed."},

 {"label":"C","pair":"ARTIST : PAINTING","why":"This is creator-to-creation."},

 {"label":"D","pair":"LIBRARIAN : BOOK","why":"A librarian organizes books rather than defining a field by studying them."},

 {"label":"E","pair":"MUSEUM : ARTIFACT","why":"This is place-to-contained object."}]},

{"id":"H6","family":"action-degree","stem":"VERDICT : TRIAL","bridge":"A verdict is a conclusion reached through a trial.","correct":"A","choices":[

 {"label":"A","pair":"DIAGNOSIS : EXAMINATION","why":"A diagnosis is a conclusion reached through an examination."},

 {"label":"B","pair":"TRIAL : VERDICT","why":"The process and the conclusion are reversed."},

 {"label":"C","pair":"JUDGE : COURT","why":"This is person-to-workplace."},

 {"label":"D","pair":"QUESTION : ANSWER","why":"This is prompt-to-response."},

 {"label":"E","pair":"EVIDENCE : DECISION","why":"This is input-to-conclusion."}]},

{"id":"F1","family":"tool-function","stem":"BAROMETER : PRESSURE","bridge":"A barometer is an instrument used to measure air pressure.","correct":"A","choices":[

 {"label":"A","pair":"THERMOMETER : TEMPERATURE","why":"A thermometer is an instrument used to measure temperature."},

 {"label":"B","pair":"CLOCK : APPOINTMENT","why":"A clock measures time, not an appointment."},

 {"label":"C","pair":"PRESSURE : BAROMETER","why":"The quantity and the instrument are reversed."},

 {"label":"D","pair":"RAIN : CLOUD","why":"This is result-to-source."},

 {"label":"E","pair":"WEATHER : FORECAST","why":"This is subject-to-prediction."}]},

{"id":"F2","family":"action-degree","stem":"SPRINT : RUN","bridge":"To sprint is to run very fast.","correct":"A","choices":[

 {"label":"A","pair":"GOBBLE : EAT","why":"To gobble is to eat very fast."},

 {"label":"B","pair":"WALK : MOVE","why":"Walking is movement, but the very-fast degree is missing."},

 {"label":"C","pair":"RUN : SPRINT","why":"The general action and the specific fast manner are reversed."},

 {"label":"D","pair":"RACE : TROPHY","why":"This is event-to-award."},

 {"label":"E","pair":"QUICK : SPEED","why":"This is adjective-to-property noun."}]},

{"id":"F3","family":"people-places","stem":"DEFENDANT : ATTORNEY","bridge":"A defendant is a party that may be legally represented by an attorney.","correct":"A","choices":[

 {"label":"A","pair":"NATION : AMBASSADOR","why":"A nation may be officially represented by an ambassador."},

 {"label":"B","pair":"AMBASSADOR : NATION","why":"The representative and the represented party are reversed."},

 {"label":"C","pair":"JUDGE : DEFENDANT","why":"This is decision-maker-to-party."},

 {"label":"D","pair":"CLIENT : PAYMENT","why":"This is payer-to-object transferred."},

 {"label":"E","pair":"LAW : COURT","why":"This is a rule or system and a place of application."}]}

]

==========================================

7. ACCEPTANCE CHECKLIST (verify before done)

==========================================

1. Both profiles earn and spend XP completely independently.

2. No answer choice is ever visible before the bridge is locked.

3. Monkey substitution renders her actual sentence with each choice's words swapped in.

4. Survivor verdicts trigger correctly for 0, 1, and 2+ survivors.

5. XP awards exactly once per action; refreshing the page never duplicates XP.

6. Parent panel is unreachable without the PIN; PIN can be changed.

7. Adding a reward in the parent panel makes it instantly visible to both girls.

8. App is fully usable on an iPad in portrait and landscape, installed via Add to Home Screen.

```

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://analogy-quest-game.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac4f4853-c1a1-412c-920c-116f5b629084).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
