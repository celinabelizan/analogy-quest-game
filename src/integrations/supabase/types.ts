export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row = Record<string, unknown>;
type Table = { Row: Row; Insert: Row; Update: Row; Relationships: [] };
type Fn = { Args: Record<string, unknown>; Returns: Json };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      families: Table;
      child_profiles: Table;
      parent_memberships: Table;
      device_assignments: Table;
      profile_balances: Table;
      xp_evidence_events: Table;
      xp_ledger: Table;
      daily_award_claims: Table;
      offline_attempt_authorizations: Table;
      family_reward_settings: Table;
      reward_items: Table;
      reward_revisions: Table;
      reward_goals: Table;
      redemption_requests: Table;
      reward_image_assets: Table;
      migration_sessions: Table;
      audit_events: Table;
    };
    Views: Record<string, never>;
    Functions: {
      create_enrollment_invitation: Fn;
      consume_enrollment_invitation: Fn;
      revoke_device: Fn;
      create_replacement_invitation: Fn;
      issue_offline_attempt_authorizations: Fn;
      submit_xp_evidence: Fn;
      record_terminal_xp_rejection: Fn;
      adjust_xp: Fn;
      set_exact_available_xp: Fn;
      reverse_xp_event: Fn;
      award_daily_xp: Fn;
      submit_reward_proposal: Fn;
      submit_reward_revision: Fn;
      withdraw_reward_revision: Fn;
      review_reward_revision: Fn;
      archive_reward: Fn;
      set_reward_goal: Fn;
      request_redemption: Fn;
      resolve_redemption: Fn;
      reverse_redemption: Fn;
      resolve_xp_evidence_review: Fn;
      stage_migration_snapshot: Fn;
      confirm_migration: Fn;
      rollback_migration: Fn;
      set_reward_visibility: Fn;
      attach_reward_image: Fn;
      get_phase1_projection: Fn;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends string> = T;
export type CompositeTypes<T extends string> = T;
export const Constants = { public: { Enums: {} } } as const;
