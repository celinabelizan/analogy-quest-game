import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import parser from "pgsql-parser";
import { describe, expect, it } from "vitest";
import { QUESTIONS, difficultyOf, groupOfFamily } from "../../src/data/questions";
import { VOCAB_QUESTIONS } from "../../src/data/vocab-system";

const migrationDirectory = resolve(process.cwd(), "supabase/migrations");
const migrations = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

describe("review-gated database migrations", () => {
  it.each(migrations)("parses %s with PostgreSQL's libpg_query grammar", async (file) => {
    const sql = readFileSync(resolve(migrationDirectory, file), "utf8");
    await expect(parser.parse(sql)).resolves.toBeDefined();
  });

  it("seeds every current analogy and Vocabulary V1 content ID", () => {
    const catalog = readFileSync(
      resolve(migrationDirectory, "202608120008_phase1_content_catalog.sql"),
      "utf8",
    );
    const phase1Analogies = QUESTIONS.filter((question) => groupOfFamily(question.family) !== null);
    for (const question of phase1Analogies) {
      expect(catalog).toContain(
        `('${question.id}',1,'analogy',${difficultyOf(question.id)},'${question.correct}'`,
      );
      expect(catalog).toContain(`"foundationGroup":"${groupOfFamily(question.family)}"`);
    }
    for (const question of VOCAB_QUESTIONS) {
      expect(catalog).toContain(`('${question.id}',1,'vocab',null,'${question.correctChoiceId}'`);
    }
    expect((catalog.match(/^\('/gm) ?? []).length).toBe(
      phase1Analogies.length + VOCAB_QUESTIONS.length,
    );
  });
});
