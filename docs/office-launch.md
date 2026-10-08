# Open Dental office activation and reward-safety deployment

This release supports managed onboarding, not a claim that every integration and historical
identity is reconciled. No production data is merged, deleted, repriced, or re-notified by
this migration. Existing public referral codes and claim tokens remain unchanged.

## Changes and operating behavior

- OD and DriveCentric SFTP completion writes are transactional: event, tier/count, claim,
  and a pending notification task commit together. OD also serializes different procedures
  for the same source patient. Replays cannot add another entitlement.
- Manual leads no longer increment completed-referral progress. Completion increments once.
  Historical counters are not rewritten; review them separately before any correction.
- Public, authenticated, and legacy staff redemption share one claim reservation. The legacy
  endpoint redeems the existing claim's amount; it no longer manufactures a separate $50 reward.
- A reservation changes pending to processing before provider contact. An interrupted or
  uncertain provider operation remains processing, with a reward-reconciliation task.
  Do not reset it to pending or send a replacement without checking the provider outcome.
- Unknown custom rewards, mismatched tenant relationships, and tenantless claims fail closed.
  Backfill verified legacy ownership before enabling redemption of those claims.
- Name-only and phone-only automotive attribution now goes to staff review. Pre-referral
  submissions remain stored; a shared phone alone does not consume them or authorize money.
  Explicit tenant-scoped codes in the source feed can still attribute automatically.
- SFTP requires an explicit store number before any enrolment, SMS, or completion processing.
- Public phone lookup/invitations refuse ambiguous households rather than choosing a member.
- Self-enrolment creates an independent membership using a request UUID (not a phone key).
  Retries of that request return the same membership. No additional SMS is sent by this endpoint.
  Separate submissions/pages are not proof of distinct humans: staff-assisted recovery and
  verified source linking are still needed. There is no automatic name/phone merge.

## Preflight: read-only production checks

Save results and a database snapshot. Any rows below require review before rollout; do not
resolve conflicts by deleting claims or changing a customer's code.

```sql
-- Identity-index conflicts (the index is intentionally OD numeric IDs only).
SELECT office_id, patient_id, count(*)
FROM referrers
WHERE office_id IS NOT NULL AND patient_id ~ '^[0-9]+$'
GROUP BY office_id, patient_id HAVING count(*) > 1;

SELECT office_id, external_proc_num, count(*)
FROM referral_events
WHERE office_id IS NOT NULL AND external_proc_num IS NOT NULL
  AND team_source = 'open-dental-sync'
GROUP BY office_id, external_proc_num HAVING count(*) > 1;

SELECT practice_id, external_proc_num, count(*)
FROM referral_events
WHERE practice_id IS NOT NULL AND external_proc_num IS NOT NULL
  AND team_source IN ('drivecentric-sftp', 'drivecentric-poll')
GROUP BY practice_id, external_proc_num HAVING count(*) > 1;

SELECT referral_event_id, count(*)
FROM reward_claims
WHERE referral_event_id IS NOT NULL AND status IS DISTINCT FROM 'voided'
GROUP BY referral_event_id HAVING count(*) > 1;

SELECT c.id, c.practice_id, r.practice_id AS referrer_practice,
       e.practice_id AS event_practice
FROM reward_claims c
LEFT JOIN referrers r ON r.id = c.referrer_id
LEFT JOIN referral_events e ON e.id = c.referral_event_id
WHERE c.practice_id IS NULL OR r.id IS NULL
   OR c.practice_id IS DISTINCT FROM r.practice_id
   OR (c.referral_event_id IS NOT NULL AND
       (e.id IS NULL OR c.practice_id IS DISTINCT FROM e.practice_id
        OR c.referrer_id IS DISTINCT FROM e.referrer_id));

SELECT r.id, r.practice_id, o.practice_id AS office_practice
FROM referrers r JOIN offices o ON o.id = r.office_id
WHERE r.practice_id IS DISTINCT FROM o.practice_id;

SELECT e.id, e.practice_id, e.status
FROM referral_events e
WHERE e.status IN ('Exam Completed', 'Completed', 'Reward Sent')
  AND NOT e.household_duplicate
  AND NOT EXISTS (SELECT 1 FROM reward_claims c WHERE c.referral_event_id = e.id);
```

Verify the real database behind each OD office. One office must correspond to one stable
source database in this interim model. Do not attach two office IDs to the same database,
reuse an office ID for a reset/replacement database, or assume different URLs necessarily
mean different databases. Keep shared-database/new-source topologies in review until a
source mapping is configured. Verify actual event provenance, not just non-null office IDs.

## Deployment sequence

1. Take a snapshot and inspect preflight results. Reconcile unknown ownership explicitly.
2. Pause OD/DC writers, manual completion, and redemption traffic; drain in-flight requests
   on every application instance. Old workers must not run alongside new reward writers.
3. Apply `supabase/migrations/20261007000000_reward_safety.sql` (the db/migrations copy is
   equivalent; use the project's chosen migration mechanism, not both). Index creation is
   intended for a controlled write pause. Do not silently skip migration failure.
4. Inspect index definitions and validity, not just whether their names exist:
   `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('referrers','referral_events','reward_claims');`
   `SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE NOT indisvalid;`
5. Deploy backend and frontend together (self-enrolment now supplies a request ID).
6. Canary an existing office and a synthetic second tenant. Verify repeated/concurrent
   completion, voided and processing claims, correct sender, and task visibility.
7. Resume writers and inspect reconciliation/notification tasks and logs before enabling
   more offices. Never use the production force-sync endpoint as a side-effect-free dry run.

Rollback is a write pause plus a compatible forward fix. Reverting to old reward code would
bypass durable reservations and can pay a processing claim again. Keep the indexes and
processing claims intact until a reviewed reconciliation plan exists.

## Tier-one support and recovery

Use the existing hello@joinrippl.com intake. Assign one owner and backup before publishing
hours/response promises. Track request time, practice/office, category, internal record IDs,
owner, next action, and resolution. Do not send patient details or claim tokens in ordinary
email. This repository does not provision an external ticket vendor or staff the inbox.

Tier one: login/navigation, referral-link instructions, training, documented configuration,
and checking the visible status of a sync or notification. Never merge people, change
reward amounts, void processing claims, or issue replacement gift cards from tier one.

Escalate wrong recipients, duplicate rewards, tenant exposure, and provider uncertainty to
the owner/engineering immediately. Named coverage and real monitoring remain an operational
activation requirement, not something code alone supplies.

- `reward-notification`: entitlement exists. Use the event's resend action, which reuses its
  pending token, then close the reminder after confirmed delivery. Never replay completion
  to send a notification. These reminders are durable but do not yet have an automatic worker.
- `reward-reconciliation`: check the claim and Tango order by externalRefID = claim UUID.
  Confirm amount, recipient, account, order state, and whether an order exists before any
  action. A timeout is not proof that no order was created. Do not use the ordinary task
  Complete button (the server refuses it). Engineering must finalize the existing claim
  and counters exactly once, or approve an explicit recovery after provider confirmation.
  There is no automatic stuck-claim reset or new-token replacement.
- Manual credit/charity/custom tasks: an existing reservation has been finalized into one
  fulfilment task. Record actual completion; a claimed status means selection was accepted,
  not that an office credit has already been applied.
- Missing historical entitlements: review counter history before using a reward-pending
  action. The action credits progress once when it creates a claim; historical partial
  counter updates must be reconciled first. Never auto-backfill money from row counts.

## Office acceptance before patient activation

- Confirm supported Open Dental topology and authoritative tenant/office ownership.
- Import twice; the second run adds no duplicate identities and reports actual insert counts.
- Verify the office endpoint and customer key; no other tenant's default key is acceptable.
- Walk one controlled referral through completion, link delivery, reward selection, and fulfilment.
- Replay the procedure; confirm one event, one entitlement, one progress credit.
- Verify a second tenant with colliding PatNum/ProcNum never selects the first tenant's rows.
- Verify messaging approval/configuration, sender branding, opt-out, support coverage, and staff training.

Automotive buyer auto-enrolment still uses the legacy phone-based identity lookup. Its
customer/source mapping and household recovery need a separate rollout before claiming
full automotive household support. Disabled/unused alternate integration processors are
not certified by the SFTP tests. Manual events without verified OD patient identity cannot
be automatically correlated to a later OD completion; reconcile those before dual entry.
Provider billing and notification transport are post-commit operations; reconcile billing
failures from logs and pending tasks. This release is not an exactly-once external-delivery guarantee.

## Local verification

Only disposable local Postgres is allowed by the test runner. The suite truncates its data.
Use a local database named `rippl_safety_test`, apply the schema with the existing Drizzle
push command pointing explicitly at that database, then run:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:PORT/rippl_safety_test' pnpm --filter @workspace/api-server test:safety
pnpm run typecheck
pnpm run build:prod
```

All Tango requests are intercepted in tests; no real payout, email, or SMS is performed.
