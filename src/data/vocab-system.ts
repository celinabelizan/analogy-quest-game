import { taughtVocabItems, type VocabItem } from "@/data/vocab-items";

export type VocabQuestionType = "definition" | "synonym" | "context";

export type VocabWord = {
  id: string;
  word: string;
  partOfSpeech: "noun" | "verb" | "adjective";
  definition: string;
  kidDefinition: string;
  synonyms: string[];
  antonyms: string[];
  exampleSentence: string;
  wordFamily: string[];
  root: string;
  rootMeaning: string;
  commonConfusions: string[];
  memoryHook: string;
  tier: 1 | 2 | 3 | 4;
  unit: string;
  difficulty: 1 | 2 | 3;
  priority: "high" | "medium" | "low";
  tags: string[];
  sources: string[];
};

export type VocabChoice = { id: string; text: string; why: string };
export type VocabQuestion = {
  id: string;
  vocabId: string;
  type: VocabQuestionType;
  ask: string;
  choices: VocabChoice[];
  correctChoiceId: string;
};

type Supplement = Pick<
  VocabWord,
  "partOfSpeech" | "synonyms" | "antonyms" | "exampleSentence" | "wordFamily" | "commonConfusions"
>;

const SUPPLEMENTS: Record<string, Supplement> = {
  "RT-01": { partOfSpeech: "noun", synonyms: ["observer", "watcher"], antonyms: ["participant"], exampleSentence: "The ___ cheered from the stands while the teams played.", wordFamily: ["spectate"], commonConfusions: ["participant"] },
  "RT-02": { partOfSpeech: "verb", synonyms: ["examine", "check"], antonyms: ["ignore"], exampleSentence: "Before takeoff, the mechanic will ___ every part of the airplane.", wordFamily: ["inspection", "inspector"], commonConfusions: ["repair"] },
  "RT-03": { partOfSpeech: "noun", synonyms: ["reflection", "reconsideration"], antonyms: ["foresight"], exampleSentence: "In ___, choosing the shorter route would have saved us an hour.", wordFamily: ["retrospective"], commonConfusions: ["prospect"] },
  "RT-04": { partOfSpeech: "adjective", synonyms: ["cautious", "careful"], antonyms: ["reckless"], exampleSentence: "The ___ climber checked every rope before leaving the ground.", wordFamily: ["circumspection"], commonConfusions: ["circular"] },
  "RT-05": { partOfSpeech: "noun", synonyms: ["plant", "workshop"], antonyms: [], exampleSentence: "The ___ produces hundreds of bicycles each day.", wordFamily: ["manufacture"], commonConfusions: ["warehouse"] },
  "RT-06": { partOfSpeech: "noun", synonyms: ["relic", "object"], antonyms: [], exampleSentence: "The museum displayed an ancient ___ made by human hands.", wordFamily: ["artifactual"], commonConfusions: ["fossil"] },
  "RT-07": { partOfSpeech: "adjective", synonyms: ["skilled", "capable"], antonyms: ["inept"], exampleSentence: "After years of practice, Nina became ___ at playing the violin.", wordFamily: ["proficiency"], commonConfusions: ["professional"] },
  "RT-08": { partOfSpeech: "verb", synonyms: ["invent", "manufacture"], antonyms: ["verify"], exampleSentence: "The witness admitted that he had tried to ___ an excuse.", wordFamily: ["fabrication"], commonConfusions: ["repair"] },
  "RT-09": { partOfSpeech: "adjective", synonyms: ["outspoken", "expressive"], antonyms: ["silent"], exampleSentence: "She was ___ about her support for the new school rule.", wordFamily: ["vocalize"], commonConfusions: ["musical"] },
  "RT-10": { partOfSpeech: "verb", synonyms: ["support", "champion"], antonyms: ["oppose"], exampleSentence: "The students ___ for a longer lunch period at the council meeting.", wordFamily: ["advocacy", "advocate"], commonConfusions: ["advertise"] },
  "RT-11": { partOfSpeech: "verb", synonyms: ["cancel", "withdraw"], antonyms: ["grant"], exampleSentence: "The agency may ___ the permit if the rules are broken.", wordFamily: ["revocation"], commonConfusions: ["revise"] },
  "RT-12": { partOfSpeech: "adjective", synonyms: ["loud", "clamorous"], antonyms: ["quiet"], exampleSentence: "A ___ crowd demanded that the referee review the call.", wordFamily: ["vociferously"], commonConfusions: ["ferocious"] },
  "RT-13": { partOfSpeech: "verb", synonyms: ["lead", "perform"], antonyms: ["abandon"], exampleSentence: "The scientist will ___ an experiment to test the idea.", wordFamily: ["conductor", "conduct"], commonConfusions: ["behave"] },
  "RT-14": { partOfSpeech: "noun", synonyms: ["waterway", "conduit"], antonyms: [], exampleSentence: "The Roman ___ carried fresh water into the city.", wordFamily: ["aqueduct"], commonConfusions: ["aquarium"] },
  "RT-15": { partOfSpeech: "adjective", synonyms: ["favorable", "helpful"], antonyms: ["harmful"], exampleSentence: "A quiet room is ___ to careful studying.", wordFamily: ["conduce"], commonConfusions: ["conductive"] },
  "RT-16": { partOfSpeech: "adjective", synonyms: ["movable", "transportable"], antonyms: ["fixed"], exampleSentence: "The small, ___ speaker was easy to carry to the beach.", wordFamily: ["portability"], commonConfusions: ["potable"] },
  "RT-17": { partOfSpeech: "verb", synonyms: ["ship", "send"], antonyms: ["import"], exampleSentence: "The country will ___ coffee to markets around the world.", wordFamily: ["exporter", "exportation"], commonConfusions: ["import"] },
  "RT-18": { partOfSpeech: "verb", synonyms: ["expel", "remove"], antonyms: ["admit"], exampleSentence: "A government may ___ someone who has no legal right to remain.", wordFamily: ["deportation"], commonConfusions: ["transport"] },
};

const correctChoice = (item: VocabItem) => item.choices.find((choice) => choice.label === item.correct)!;

export function canonicalWords(): VocabWord[] {
  return taughtVocabItems().map((item) => {
    const supplement = SUPPLEMENTS[item.id];
    if (!supplement) throw new Error(`Missing canonical vocab supplement for ${item.id}`);
    const correct = correctChoice(item);
    return {
      id: item.id,
      word: item.word.toLowerCase(),
      definition: correct.text,
      kidDefinition: correct.text,
      root: item.root,
      rootMeaning: item.rootMeaning,
      memoryHook: correct.why,
      tier: 1,
      unit: item.unit,
      difficulty: item.id === "RT-04" || item.id === "RT-12" || item.id === "RT-15" ? 3 : 2,
      priority: "high",
      tags: ["ssat-middle", "taught", "roots-mini-1"],
      sources: ["existing-word-lab", "roots-mini-lesson-1"],
      ...supplement,
    };
  });
}

const choiceId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function distractors(words: VocabWord[], target: VocabWord, field: "definition" | "synonym" | "word") {
  return words
    .filter((word) => word.id !== target.id && word.partOfSpeech === target.partOfSpeech)
    .map((word) => ({
      id: choiceId(field === "definition" ? word.kidDefinition : field === "synonym" ? word.synonyms[0]! : word.word),
      text: field === "definition" ? word.kidDefinition : field === "synonym" ? word.synonyms[0]! : word.word,
      why: `No — that describes ${word.word}, not ${target.word}.`,
    }))
    .filter((choice, index, all) => all.findIndex((other) => other.id === choice.id) === index)
    .slice(0, 3);
}

export function generateQuestions(words = canonicalWords()): VocabQuestion[] {
  return words.flatMap((word) => {
    const defId = "definition";
    const synonym = word.synonyms[0]!;
    const synonymId = choiceId(synonym);
    const contextId = choiceId(word.word);
    return [
      {
        id: `${word.id}-DEF-01`, vocabId: word.id, type: "definition" as const,
        ask: `What does ${word.word.toUpperCase()} mean?`,
        correctChoiceId: defId,
        choices: [{ id: defId, text: word.kidDefinition, why: word.memoryHook }, ...distractors(words, word, "definition")],
      },
      {
        id: `${word.id}-SYN-01`, vocabId: word.id, type: "synonym" as const,
        ask: `Which word is closest in meaning to ${word.word.toUpperCase()}?`,
        correctChoiceId: synonymId,
        choices: [{ id: synonymId, text: synonym, why: `Yes — ${synonym} is a synonym for ${word.word}.` }, ...distractors(words, word, "synonym")],
      },
      {
        id: `${word.id}-CTX-01`, vocabId: word.id, type: "context" as const,
        ask: word.exampleSentence,
        correctChoiceId: contextId,
        choices: [{ id: contextId, text: word.word, why: `Yes — ${word.word} makes the sentence accurate.` }, ...distractors(words, word, "word")],
      },
    ];
  });
}

export function validateVocabBank(words = canonicalWords(), questions = generateQuestions(words)): string[] {
  const errors: string[] = [];
  if (new Set(words.map((word) => word.id)).size !== words.length) errors.push("Duplicate vocab word ids");
  if (new Set(questions.map((question) => question.id)).size !== questions.length) errors.push("Duplicate question ids");
  for (const question of questions) {
    if (question.choices.length !== 4) errors.push(`${question.id}: expected 4 choices`);
    if (question.choices.filter((choice) => choice.id === question.correctChoiceId).length !== 1) errors.push(`${question.id}: expected exactly one correct choice`);
    if (new Set(question.choices.map((choice) => choice.id)).size !== question.choices.length) errors.push(`${question.id}: duplicate choices`);
    if (question.choices.some((choice) => !choice.why.trim())) errors.push(`${question.id}: missing why`);
  }
  return errors;
}

export const VOCAB_WORDS = canonicalWords();
export const VOCAB_QUESTIONS = generateQuestions(VOCAB_WORDS);
