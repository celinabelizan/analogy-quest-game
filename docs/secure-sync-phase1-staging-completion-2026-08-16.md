# Secure Sync Phase 1 staging completion — 2026-08-16

## Outcome

The synthetic Phase 1 staging rehearsal is complete at the service boundary.
The offline-authorization defect and packaged-preview defect found in the first
run are remediated. Production was not accessed, no real profile was migrated,
and the final local files and generated preview both have these release flags:

```text
VITE_SECURE_SYNC_PHASE1=false
VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false
```

The temporary enabled preview used only a process-level build override:

```text
VITE_SECURE_SYNC_PHASE1=true
VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false
```

It was stopped and replaced with a fresh flag-disabled build after validation.

## Forward-only database remediation

Migration
`202608160010_offline_authorization_qualification.sql` replaces only
`issue_offline_attempt_authorizations(integer)`. The function now qualifies
the `offline_attempt_authorizations` table as `offline_token`, preventing the
`RETURNS TABLE` output variable `expires_at` from shadowing the table column.
The migration reasserts anonymous/public revocation and authenticated execute
permission without broadening table access.

The first staging submission used the reserved alias `authorization` and was
rejected transactionally before the migration ledger changed. After renaming
the alias and rerunning the parser/regression test, the corrected migration was
applied and recorded as:

```text
version: 202608160010
name: offline_authorization_qualification
statement_count: 1
```

Staging now records 10 migrations.

## Post-remediation rehearsal

Successful run: `secure-sync-e2e-20260816165027-ae594793`

The guarded runner completed without its previous management-token fallback:

1. Parent magic-link redirect reached the packaged staging preview.
2. The synthetic parent signed in and reached AAL2 with TOTP.
3. An AAL2 parent created a bounded enrollment invitation.
4. A fresh anonymous child identity enrolled through the Edge gateway.
5. Cross-profile projection access was denied.
6. Encrypted migration capture, upload attestation, comparison, export
   acknowledgement, and explicit test-profile confirmation succeeded.
7. The child issued a bounded offline attempt authorization through the fixed
   public RPC.
8. Four ordered offline evidence events reconciled from 40 to 48 XP.
9. A reward retry replayed idempotently and the AAL2 parent approved it.
10. The AAL2 parent requested rollback and the assigned child completed local
    materialization acknowledgement.
11. Final migration status was `rolled_back` and cloud authority was false.

Synthetic records remain in isolated staging for auditability. They use
`example.invalid` parent addresses and `kind='test'` child profiles.

## Packaged preview remediation

The project now uses `nitro preview` instead of `vite preview` and includes
Wrangler as a development dependency. This matches the generated
`cloudflare-module` Nitro preset rather than asking TanStack's preview plugin
for a nonexistent `dist/server/server.js`.

The packaged worker returned HTTP 200 for all of these routes in both the
normal flag-disabled build and the temporary Phase-1-enabled build:

- `/`
- `/parent`
- `/enroll`
- `/migration`

The temporary enabled build also established that:

- `/parent` rendered `Parent sign in` and `Email me a secure link`;
- `/migration` rendered the migration review and parent sign-in surface;
- the client entry dynamically registered `registerPhase1SyncRuntime`;
- the compiled runtime contained `VITE_SECURE_SYNC_PHASE1=true`;
- the compiled runtime contained
  `VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false`; and
- the runtime retained the explicit real-profile migration rejection.

The configured browser-control runtime was not callable in this session, so
interactive clicks were not duplicated in a controlled browser. The matching
Auth, enrollment, isolation, migration, XP, reward, and rollback actions were
all executed against real staging service boundaries by the successful runner.
No separate browser automation stack was substituted.

## Verification

- `npm test`: 10 files, 79 tests passed.
- Targeted migration suite: 15 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors and 8 pre-existing Fast Refresh warnings.
- `npm run build -- --mode staging`: passed after the final flag reset.
- Prettier and `git diff --check`: passed.
- Final staging query:
  - authoritative real profiles: 0
  - families with real-profile migration enabled: 0
  - migration count: 10

## Remaining rollout gates

These are rollout-policy items, not blockers to the completed synthetic
service rehearsal:

- CAPTCHA remains disabled in staging.
- Two-factor recovery readiness with two separately verified TOTP factors was
  not exercised.
- The provider's trusted proxy-header overwrite policy was not independently
  inspected, although enrollment succeeded through the live Edge gateway.
- Enabling Phase 1 for any persistent or production client still requires a
  separate release decision. Real-profile migration remains disabled.
