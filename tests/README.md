# Secure sync Phase 1 test contracts

These tests define the security and reconciliation contracts for Phase 1. They
are intentionally written against the public sync modules rather than UI
components so that the same rules can be reused by browser, server, and SQL
integration tests.

## Runner assumptions

- `vitest` is available and configured with the repository's `@/` alias.
- `fake-indexeddb` is loaded for IndexedDB-backed outbox tests.
- Tests run with a timezone-independent JavaScript runtime; date-boundary tests
  pass the target IANA timezone explicitly.
- Supabase SQL tests run through `supabase test db` against a disposable local
  database after all migrations are applied. They require the `pgtap` extension.

## Expected TypeScript contracts

The test suite expects these modules:

- `src/lib/sync/xp-rules.ts`
  - `calculateAnalogyAward(input)` returns an integer XP amount.
  - `calculateVocabAward(input)` returns an integer XP amount.
  - `familyDayKey(instant, timeZone)` returns `YYYY-MM-DD`.
- `src/lib/sync/outbox.ts`
  - `createOutbox({ databaseName? })` returns an object with `enqueue`, `list`,
    `ack`, and `quarantine` methods.
- `src/lib/sync/migration.ts`
  - `captureRawV8Backup(storage)` captures raw v8 strings without normalizing.
  - `buildMigrationCandidate(backup, options)` builds the reviewed import.
  - `reconcilePhase1(local, cloud)` keeps acknowledged cloud state isolated
    from optimistic local state and returns explicit conflicts.
- `src/lib/sync/reward-validation.ts`
  - `validateProductUrl(value)` returns a normalized URL or throws.
  - `validateRewardImageMetadata(metadata)` returns validated metadata or throws.

The assertions are the authoritative behavior if implementation details differ.
