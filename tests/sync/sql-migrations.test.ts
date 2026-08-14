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

  it("keeps captured migration handoff locked, bounded, and exactly replayable", () => {
    const schema = readFileSync(
      resolve(migrationDirectory, "202608120001_phase1_schema.sql"),
      "utf8",
    );
    const security = readFileSync(
      resolve(migrationDirectory, "202608120002_phase1_security.sql"),
      "utf8",
    );
    const migration = readFileSync(
      resolve(migrationDirectory, "202608120005_phase1_migration.sql"),
      "utf8",
    );
    expect(schema).toContain("where status in ('requested','captured')");
    expect(security).not.toContain("assignment_id = (private.require_active_assignment()).id");
    expect(migration).toContain("captured migration may only replay its existing exact envelope");
    expect(migration).toContain("invalid_datetime_format");
    expect(migration).toContain("'migration_staging_cancelled'");
    expect(migration).toContain("cancel_migration_capture_request");
    expect(migration).toContain("'migration_capture_cancelled'");
  });

  it("requires AAL2 for sensitive parent mutations and reports actual reward versions", () => {
    const xp = readFileSync(
      resolve(migrationDirectory, "202608120003_phase1_enrollment_and_xp.sql"),
      "utf8",
    );
    const rewards = readFileSync(
      resolve(migrationDirectory, "202608120004_phase1_rewards.sql"),
      "utf8",
    );
    expect(
      rewards.match(/create or replace function public\.parent_edit_reward\(/g) ?? [],
    ).toHaveLength(1);
    expect(rewards).toContain("'version',v_item.version+1");
    expect(rewards).toContain("perform private.require_parent(v_item.family_id,true)");
    expect(rewards).toContain("perform private.require_parent(v_req.family_id,true)");
    expect(xp).toContain("perform private.require_parent(v_family, true)");
    expect(xp).toContain("rejection reason does not match server state");
  });

  it("keeps the forward-only staging remediation explicit and least-privileged", () => {
    const remediation = readFileSync(
      resolve(migrationDirectory, "202608120009_phase1_staging_test_remediation.sql"),
      "utf8",
    );
    const adversarial = readFileSync(
      resolve(process.cwd(), "supabase/tests/secure_sync_adversarial.test.sql"),
      "utf8",
    );
    expect(remediation).toContain("'approved'::public.reward_revision_status");
    expect(remediation).toContain("'declined'::public.redemption_status");
    expect(remediation).toContain(
      "public.reward_items, public.reward_image_assets to service_role",
    );
    expect(remediation).not.toContain("grant all");
    expect(adversarial).toContain(
      "select test_support.as_user('90000000-0000-4000-8000-000000000005'::uuid);",
    );
    expect(adversarial).toContain("where auth_user_id=auth.uid() and status='active'");
    expect(adversarial).toContain("perform public.request_device_migration_capture(");
    expect(adversarial).toContain("select public.acknowledge_migration_backup_export(");
  });
});
