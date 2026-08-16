# Secure Sync Phase 1 staging rollout-gate follow-up — 2026-08-16

## Outcome

The synthetic MFA-recovery and trusted-client-IP gates are complete in isolated
staging. A response-validation defect discovered during the proxy probe was
fixed, regression-tested, and deployed as staging Edge Function version 4.
The final full rehearsal passed with no service-rehearsal blockers.

Production was not accessed, no real profile was migrated, and both release
flags remained disabled throughout:

```text
VITE_SECURE_SYNC_PHASE1=false
VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false
```

CAPTCHA remains a rollout blocker because staging has neither a configured
provider secret nor a client site key/token integration. It was not enabled in
a state that would break parent or anonymous-child Auth.

## Staging Auth policy

The final non-secret configuration read reported:

- TOTP enrollment: enabled
- TOTP verification: enabled
- maximum enrolled factors: 10
- low-AAL MFA enrollment: disabled
- Auth `Sb-Forwarded-For` acceptance: disabled
- CAPTCHA provider selection: hCaptcha
- CAPTCHA enabled: false
- CAPTCHA secret configured: false

Supabase documents `Sb-Forwarded-For` as a separately enabled Auth rate-limit
feature that accepts the header only with a secret API key. The staging Auth
setting remains disabled. The enrollment Edge Function's gateway behavior was
tested independently. See the official
[Auth rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits).

## Two-factor recovery readiness

The guarded runner enrolled two separately named TOTP factors on a synthetic
parent, challenged and verified each distinct factor, read both back as
verified, and confirmed AAL2. This exercises the application's
`mfaRecoveryReady()` contract without using any real identity.

## Trusted client-IP verification

The runner sent two invalid-invitation probes with documentation-only address
ranges:

1. A caller-supplied `cf-connecting-ip` header was rejected by the Edge gateway
   with HTTP 403 before the function ran.
2. Caller-supplied `x-real-ip` and `x-forwarded-for` values reached the function,
   which returned the same generic invalid-invitation error used for every
   failure.
3. The independently committed IP rate-limit bucket changed, proving the
   request was counted.
4. Its secret-keyed digest matched none of the supplied spoof values, proving
   those values did not control the rate-limit key.

No raw client IP is stored or printed. Supabase's architecture describes the
Edge gateway as the request boundary for routing, Auth headers, and traffic
rules; see the official [Edge Functions documentation](https://supabase.com/docs/guides/functions).

## Enrollment response remediation

The probe exposed that a failed composite RPC can produce a truthy wrapper with
no assignment ID. The prior function treated that wrapper as success and
returned HTTP 200 with a non-assignment payload. No device was enrolled, but
the response did not satisfy the generic-error contract.

`consume-enrollment-invite` now:

- normalizes array and scalar RPC responses;
- requires a string assignment ID before returning success; and
- otherwise returns the generic HTTP 400 response.

The targeted regression suite passed before deployment. Staging deployment
version 4 is active with JWT verification enabled.

## Final rehearsal evidence

Successful run: `secure-sync-e2e-20260816175644-b2258eac`

The run passed parent redirect and sign-in, two-factor recovery readiness,
AAL2, invitation creation, spoof-header rejection/overwrite, generic invalid
invitation handling, child enrollment, cross-profile isolation, encrypted
migration capture and confirmation, offline authorization and XP sync, reward
idempotency and approval, and two-party rollback.

Final state:

```text
migration status: rolled_back
cloud authority: false
retained synthetic lifetime XP: 48
retained synthetic rewards: 1
```

The final database audit reported:

- cloud-authoritative real child profiles: 0
- families with real-profile migration enabled: 0
- synthetic migration sessions: 8 rolled back; no other status present

Repeated diagnostic runs created only `example.invalid` synthetic parents and
`kind='test'` child profiles. They remain in staging for auditability.

## Remaining CAPTCHA blocker

Enabling CAPTCHA requires an approved staging hCaptcha site/secret key pair and
client token integration for both parent OTP and anonymous-child sign-in. No
provider credential is present, and the current Auth calls do not submit a
`captchaToken`. Enabling the server switch now would make those staging Auth
flows fail rather than validate them.

After staging credentials and the intended preview host are supplied, the next
bounded step is to add the client challenge, configure the secret in staging,
enable CAPTCHA in staging only, and repeat this synthetic rehearsal. Production
and both Secure Sync release flags must remain unchanged until a separate
release decision.
