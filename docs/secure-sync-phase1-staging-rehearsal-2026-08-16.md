# Secure Sync Phase 1 synthetic staging rehearsal — 2026-08-16

## Scope and guardrails

- Checkout: `/Users/celinabelizan/Documents/analogy-quest-game`
- Branch and starting commit: `codex/secure-sync-phase-1` at `06d6cc1`
- Supabase target: `SSAT Quest Staging` (`hvzzymjfmxqmbzibinqz`, `us-east-1`)
- Production was not accessed.
- No real profile was read, migrated, or changed.
- `VITE_SECURE_SYNC_PHASE1=false` throughout.
- `VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false` throughout.
- Every rehearsal child profile used `kind='test'`; each synthetic family kept
  `real_profile_migration_enabled=false`.
- No secret or credential value was printed or committed.

## Staging configuration observed

- Project state: `ACTIVE_HEALTHY`.
- Nine secure-sync migrations are recorded.
- `consume-enrollment-invite`, `migration-backup-upload`,
  `reward-image-upload`, and `reward-image-url` are active at version 1 with
  JWT verification enabled.
- `ENROLLMENT_IP_HASH_SECRET` is present by name in Edge secrets.
- Anonymous Auth is enabled for fresh child installation identities.
- CAPTCHA remains disabled.
- Auth redirects were changed only in staging:
  - Site URL: `http://127.0.0.1:4173`
  - Allow list: `http://127.0.0.1:4173/**,http://localhost:4173/**`

## Local verification

- `npm test`: 10 files, 77 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and 8 existing Fast Refresh warnings.
- `npm run build -- --mode staging`: passed with both release flags disabled;
  Vite reported only existing chunk-size/plugin warnings.
- The staging-mode development preview returned HTTP 200 for `/`, `/parent`,
  `/enroll`, and `/migration` on `127.0.0.1:4173`.

The packaged `npm run preview -- --host 127.0.0.1 --port 4173` path returned
HTTP 500 for every tested route. TanStack's preview plugin looked for
`dist/server/server.js`, while this project emitted Nitro output under
`.output`. The staging-mode development server was used for the Auth redirect
rehearsal; this does not establish that a deployable preview is healthy.

## Successful synthetic run

Run label: `secure-sync-e2e-20260816163425-0b42e877`

The guarded runner is
`scripts/staging-secure-sync-rehearsal.mjs`. It refuses to run unless both
release flags are exactly `false`, verifies the target project and redirect,
and obtains secrets only at runtime without printing or storing them.

Evidence captured through real staging Auth, Edge Function, and RPC boundaries:

1. A synthetic parent Auth identity was created.
2. A real magic-link action redirected successfully to the local staging
   preview.
3. The parent signed in and verified a synthetic TOTP factor, reaching AAL2.
4. An AAL2 parent created a bounded enrollment invitation.
5. A fresh anonymous child identity consumed the invitation through
   `consume-enrollment-invite` and received one active assignment.
6. The assigned child was denied projection access to a second synthetic
   family's profile.
7. The parent requested migration capture for the `test` profile.
8. The child produced and uploaded an AES-256-GCM synthetic backup; the Edge
   Function returned the matching SHA-256 attestation and storage path.
9. Staging returned an explicit empty-cloud migration comparison, and the child
   acknowledged separate backup export readiness.
10. The AAL2 parent explicitly confirmed only the reviewed `test` migration;
    the opening balance was 40 lifetime / 40 available XP.
11. Four ordered, offline-authorized analogy evidence events were accepted and
    reconciled to 48 lifetime / 48 available XP.
12. A synthetic reward proposal replayed with the same idempotency key without
    duplication, then the AAL2 parent approved it.
13. The assigned child projection contained the 48 XP balance and one approved
    reward while the isolation profile remained inaccessible.
14. The AAL2 parent requested rollback. The assigned child acknowledged local
    materialization of the final synchronized fields and completed rollback.

The final database evidence for the successful run is:

- profile kind: `test`
- server real-profile gate: `false`
- migration status: `rolled_back`
- cloud authoritative: `false`
- retained final projection: 48 lifetime XP, 48 available XP, one reward

Synthetic records were retained in isolated staging for auditability. They use
`example.invalid` Auth email addresses and the run label above. No synthetic
profile remains cloud-authoritative.

## Blockers and limitations

### 1. Offline authorization issuance is broken in staging

`issue_offline_attempt_authorizations(1)` fails with:

```text
column reference "expires_at" is ambiguous
```

The PL/pgSQL function returns a column named `expires_at` and also uses an
unqualified `expires_at` table column in its outstanding-token query. This
blocks the normal child path for obtaining offline attempt authorizations. To
continue synthetic ingestion coverage only, the rehearsal inserted one
random, hashed, profile-bound authorization through the staging management
channel; the public evidence-ingestion RPC then consumed it normally. This
fallback is not a release fix and must not be used for real profiles.

A forward-only remediation migration should qualify the table column (for
example, through an alias) and rerun the pgTAP plus end-to-end rehearsal. No new
migration was applied during this work.

### 2. Packaged preview is not runnable

`vite preview` serves HTTP 500 because its expected TanStack `dist` server entry
does not match the generated Nitro `.output`. A deployable staging preview must
be repaired and verified before browser-client rollout testing.

### 3. Secure-sync browser UI remains intentionally gated

Because `VITE_SECURE_SYNC_PHASE1` stayed `false`, the browser build correctly
does not register the secure-sync runtime. Parent Auth, enrollment, isolation,
migration, XP/reward reconciliation, and rollback were therefore rehearsed at
their real staging service boundaries, not by clicking the gated UI. Full UI
coverage requires separate approval for a staging-only build with the Phase 1
flag enabled; real-profile migration must remain disabled.

### 4. Rollout security gates remain open

- CAPTCHA is still disabled in staging.
- The synthetic parent verified one TOTP factor; the UI's two-factor recovery
  readiness contract was not exercised.
- Trusted enrollment client-IP header behavior was exercised through the live
  Edge gateway, but provider header overwrite policy was not independently
  inspected.

## Failed-run containment

- The first harness attempt stopped before family/profile creation because
  service-role table inserts are correctly denied; its exact synthetic Auth
  identity was deleted.
- Run `secure-sync-e2e-20260816163323-5c21024b` reached migration confirmation
  before exposing the offline-authorization ambiguity. A tightly scoped
  staging cleanup set that synthetic migration to `rolled_back` and cleared
  cloud authority. Read-back confirmed `authoritative=false`.

## Next review gates

1. Review and approve a forward-only SQL remediation for the ambiguous
   `expires_at` reference.
2. Apply it to staging only and rerun the 77 local tests, pgTAP suite, and this
   synthetic rehearsal without the seeded-token fallback.
3. Repair the packaged preview output mismatch.
4. Obtain explicit approval for a staging-only `VITE_SECURE_SYNC_PHASE1=true`
   preview, while keeping `VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false`, then
   execute the full browser UI rehearsal.
5. Resolve CAPTCHA, MFA recovery, and trusted proxy-header verification before
   any rollout discussion.
