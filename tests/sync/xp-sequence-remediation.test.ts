import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { terminalXpRejectionCode } from "../../src/lib/sync/client";
import { reconciledSequenceHighWater } from "../../src/lib/sync/indexed-db";
import type { OutboxRecord } from "../../src/lib/sync/types";

const xpRecord = (eventId: string, sequence: number): OutboxRecord => ({
  eventId,
  command: {
    kind: "xp_evidence",
    eventId,
    attemptId: crypto.randomUUID(),
    deviceSequence: sequence,
    evidenceKind: "vocab_answer",
    contentId: "vocab-1",
    contentVersion: 1,
    ruleVersion: 1,
    payload: { choice: "a" },
    occurredAt: "2026-08-12T20:00:00.000Z",
  },
  status: "pending",
  createdAt: "2026-08-12T20:00:00.000Z",
  attempts: 0,
  nextAttemptAt: "2026-08-12T20:00:00.000Z",
});

describe("XP sequence remediation", () => {
  it("reconciles IndexedDB, write-ahead journal, and shadow high-water values", () => {
    expect(reconciledSequenceHighWater(7, "9", [xpRecord(crypto.randomUUID(), 8)])).toBe(9);
    expect(reconciledSequenceHighWater(12, "9", [xpRecord(crypto.randomUUID(), 15)])).toBe(15);
    expect(reconciledSequenceHighWater(3, "4", [], "19")).toBe(19);
    expect(reconciledSequenceHighWater(Number.NaN, "corrupt", [])).toBe(0);
  });

  it("classifies only deterministic semantic failures for durable zero-XP rejection", () => {
    expect(terminalXpRejectionCode("attempt already completed")).toBe("attempt_already_completed");
    expect(terminalXpRejectionCode("unknown or inactive content")).toBe("unknown_content");
    expect(terminalXpRejectionCode("device sequence gap or stale sequence")).toBeUndefined();
    expect(terminalXpRejectionCode("database connection lost")).toBeUndefined();
    expect(terminalXpRejectionCode("device revoked")).toBeUndefined();
  });

  it("keeps enrollment verification behind independently committed UID and IP limits", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202608120003_phase1_enrollment_and_xp.sql"),
      "utf8",
    );
    const edge = readFileSync(
      resolve(process.cwd(), "supabase/functions/consume-enrollment-invite/index.ts"),
      "utf8",
    );
    expect(sql).toContain("internal_register_enrollment_gateway_attempt");
    expect(sql).toContain("v_uid_attempts <= 5 and v_ip_attempts <= 20");
    expect(sql).toContain("to service_role");
    expect(edge).toContain("ENROLLMENT_IP_HASH_SECRET");
    expect(edge.indexOf("internal_register_enrollment_gateway_attempt")).toBeLessThan(
      edge.indexOf("consume_enrollment_invitation_gateway"),
    );
  });

  it("compares the complete immutable parent-adjustment payload on replay", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202608120003_phase1_enrollment_and_xp.sql"),
      "utf8",
    );
    for (const check of [
      "v_ledger.kind <> 'parent_adjustment'",
      "v_ledger.lifetime_delta <> p_lifetime_delta",
      "v_ledger.available_delta <> p_available_delta",
      "v_ledger.reason is distinct from p_reason",
      "v_ledger.actor_user_id is distinct from auth.uid()",
      "v_ledger.metadata <> '{}'::jsonb",
    ]) {
      expect(sql).toContain(check);
    }
  });

  it("durably records only a contiguous zero-XP terminal rejection", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202608120003_phase1_enrollment_and_xp.sql"),
      "utf8",
    );
    expect(sql).toContain("create or replace function public.record_terminal_xp_rejection");
    expect(sql).toContain("p_device_sequence <> v_assignment.last_device_sequence + 1");
    expect(sql).toContain("p_occurred_at,v_local_date,'rejected',0");
    expect(sql).toContain("earlier evidence awaits parent review");
    expect(sql).toContain("late_missing_authorization");
    expect(sql).toContain("a.consumed_at is null");
    expect(sql).toContain("if v_award>0 and v_daily_xp + v_award > 3000");
    expect(sql).toContain("expectedBalanceVersion");
    expect(sql).toContain("idempotency key reused with different reversal payload");
  });

  it("defers reviewed analogy transitions and serializes completion behind pending final", () => {
    const submitSql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202608120003_phase1_enrollment_and_xp.sql"),
      "utf8",
    );
    const reviewSql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202608120004_phase1_rewards.sql"),
      "utf8",
    );
    const reviewGate = submitSql.indexOf("if v_award>0 and v_daily_xp + v_award > 3000");
    for (const transition of [
      "if v_status='accepted' and p_evidence_kind='analogy_type_correct'",
      "elsif v_status='accepted' and p_evidence_kind='analogy_bridge_lock'",
      "elsif v_status='accepted' and p_evidence_kind='analogy_discard'",
      "elsif v_status='accepted' and p_evidence_kind='analogy_final'",
    ]) {
      expect(submitSql.indexOf(transition)).toBeGreaterThan(reviewGate);
    }
    expect(submitSql).toContain("e.attempt_id=p_attempt_id");
    expect(submitSql).toContain("earlier evidence awaits parent review");
    expect(reviewSql).toContain("perform private.require_parent(v_family,true)");
    expect(reviewSql).toContain(
      "'analogy_type_correct','analogy_bridge_lock','analogy_discard','analogy_final'",
    );
    expect(reviewSql).toContain("set final_awarded=true,correct=v_correct");
    expect(reviewSql).toContain(
      "if p_decision='approve' and v_event.evidence_kind='analogy_complete'",
    );
  });
});
