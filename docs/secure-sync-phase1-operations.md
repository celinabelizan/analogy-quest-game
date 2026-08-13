# Secure Sync Phase 1 Operations

This branch contains review artifacts only. No SQL or Edge Function has been applied or deployed.

## Abuse thresholds

The maximum regular analogy award is 18 XP: 2 type + 4 bridge + up to four incorrect discards at 2 each + 4 final. A fifth-correct streak can make the terminal total 23 XP. Vocabulary awards come from the versioned server catalog; the current highest answer plus one-time mastery bonus remains far below the review thresholds. The 3,000 earned-XP/day and 200 terminal-attempt/hour review thresholds, and 2,000 submissions/day hard cap, therefore leave substantial room for legitimate practice while escalating implausible use. An offline browser cannot prove a human performed the work: a hostile child can fabricate plausible evidence. Catalog validation, attempt state, sequencing, authorization tokens, rate limits, and parent review narrow but do not eliminate that risk.

## Staging gate

Use a separate staging Supabase project and synthetic Test identities. Apply migrations in order only after explicit approval. Deploy all reviewed Edge Functions, set a 32+ random-character `ENROLLMENT_IP_HASH_SECRET` only in Edge secrets, and verify the gateway overwrites/provides trusted `cf-connecting-ip` or `x-real-ip` headers. Never expose the service-role key to browser code. Keep real-profile migration disabled.

## Capture, confirmation, and rollback

The parent requests capture, but the assigned child installation creates and durably stores the exact encrypted snapshot, recovery key, normalized candidate, hashes, idempotency key, and upload attestation. Capture locks child mutations until the parent confirms or cancels. Test must complete this flow first. Confirmation makes only that child installation cloud-authoritative.

For rollback, the parent requests rollback and the assigned child first reconciles all outbox events, reward withdrawals, and pending images. It archives the complete final cloud child snapshot locally, materializes only synchronized balance/reward/redemption/settings fields, preserves analogy and Vocabulary V1 learning state, and then acknowledges completion. A staged but unconfirmed migration may be cancelled without materialization because cloud authority was never enabled.
