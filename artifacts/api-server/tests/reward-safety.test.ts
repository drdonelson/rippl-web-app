import enrollRouter from "../src/routes/enroll";
import { requireOdOffice } from "../src/middleware/odOffice";
import express from "express";
import publicRouter from "../src/routes/publicClaim";
import rewardsRouter from "../src/routes/rewards";
import test from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import {
  practicesTable,
  officesTable,
  referrersTable,
  referralEventsTable,
  rewardClaimsTable,
  adminTasksTable,
  preReferralsTable,
} from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import {
  recordCompletion,
  completeManualReferral,
  resolveHouseholdReview,
} from "../src/services/referralCompletion";
import { redeemReward } from "../src/services/rewardRedemption";
import { matchReferrerByName } from "../src/lib/matchReferrer";

const actor = {
  id: "staff",
  email: "test@example.invalid",
  role: "practice_admin" as const,
  practice_id: "a",
  office_id: "oa",
};
let seq = 0;
const completion = (extra = {}) => ({
  practice_id: "a",
  office_id: "oa",
  referrer_id: "ra",
  new_patient_name: "Test patient",
  new_patient_phone: "",
  new_patient_pat_num: `p${++seq}`,
  external_proc_num: `proc${seq}`,
  team_source: "open-dental-sync",
  office: "Office A",
  status: "Exam Completed",
  ...extra,
});
const localFetch = globalThis.fetch;
let orders = 0;
let providerMode = "success";
globalThis.fetch = async (input, options) => {
  assert.equal(
    String(input),
    "https://api.tangocard.com/raas/v2/orders",
    "No unmocked external requests allowed",
  );
  orders++;
  await new Promise((r) => setTimeout(r, 30));
  if (providerMode === "timeout")
    throw new Error("simulated accepted order with response lost");
  const body = JSON.parse(String(options?.body));
  return new Response(
    JSON.stringify({
      referenceOrderID: `order-${body.externalRefID}`,
      status: "COMPLETE",
    }),
    { status: 200 },
  );
};
const count = async (
  table:
    | typeof rewardClaimsTable
    | typeof referralEventsTable
    | typeof adminTasksTable,
) => (await db.select({ n: sql<number>`count(*)::int` }).from(table))[0].n;
const total = async () =>
  (await db.select().from(referrersTable).where(eq(referrersTable.id, "ra")))[0]
    .total_referrals;

test("reward safety against real PostgreSQL", async (t) => {
  try {
    await db.execute(sql`TRUNCATE practices, pre_referrals CASCADE`);
    await db.insert(practicesTable).values([
      { id: "a", name: "Practice A", slug: "a", billing_status: "exempt" },
      { id: "b", name: "Practice B", slug: "b", billing_status: "exempt" },
    ]);
    await db.insert(officesTable).values([
      { id: "oa", name: "A", practice_id: "a", location_code: "a" },
      { id: "ob", name: "B", practice_id: "b", location_code: "b" },
    ]);
    await db.insert(referrersTable).values([
      {
        id: "ra",
        practice_id: "a",
        office_id: "oa",
        patient_id: "1",
        name: "Shared Name",
        phone: "6155551111",
        referral_code: "AAAA",
        email: "a@example.invalid",
      },
      {
        id: "rb",
        practice_id: "b",
        office_id: "ob",
        patient_id: "1",
        name: "Shared Name",
        phone: "6155551111",
        referral_code: "BBBB",
      },
    ]);

    await t.test(
      "concurrent procedure replay creates one event, claim, counter credit",
      async () => {
        const input = completion();
        const before = await total();
        const results = await Promise.all(
          Array.from({ length: 8 }, () => recordCompletion(input)),
        );
        assert.equal(results.filter(Boolean).length, 1);
        assert.equal(await total(), before + 1);
        assert.equal(await count(rewardClaimsTable), 1);
      },
    );
    await t.test(
      "overlapping patient/procedure IDs in another tenant remain independent",
      async () => {
        const result = await recordCompletion(
          completion({
            practice_id: "b",
            office_id: "ob",
            referrer_id: "rb",
            external_proc_num: "proc1",
            new_patient_pat_num: "p1",
          }),
        );
        assert.ok(result?.claim);
        assert.equal(result.claim.practice_id, "b");
      },
    );
    await t.test(
      "different procedures for the same OD patient cannot race into two entitlements",
      async () => {
        const results = await Promise.all([
          recordCompletion(completion({ new_patient_pat_num: "same-person" })),
          recordCompletion(completion({ new_patient_pat_num: "same-person" })),
        ]);
        assert.equal(results.filter(Boolean).length, 1);
      },
    );
    await t.test(
      "parallel legitimate completions do not lose counter increments",
      async () => {
        const before = await total();
        await Promise.all(
          Array.from({ length: 5 }, () => recordCompletion(completion())),
        );
        assert.equal(await total(), before + 5);
      },
    );
    await t.test(
      "mismatched referrer and office tenants roll back the whole completion",
      async () => {
        const before = await count(referralEventsTable);
        await assert.rejects(
          recordCompletion(completion({ referrer_id: "rb" })),
          /ownership/,
        );
        await assert.rejects(
          recordCompletion(completion({ office_id: "ob" })),
          /ownership/,
        );
        assert.equal(await count(referralEventsTable), before);
      },
    );
    await t.test(
      "claim insert failure rolls back event, progress, and pre-referral consumption; retry succeeds",
      async () => {
        await db
          .insert(preReferralsTable)
          .values({
            id: "pre",
            practice_id: "a",
            referral_code: "AAAA",
            first_name: "Test",
            last_name: "Buyer",
            phone: "6155551112",
          });
        await db.execute(
          sql`CREATE OR REPLACE FUNCTION safety_fail_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected claim failure'; END $$`,
        );
        await db.execute(
          sql`CREATE TRIGGER safety_fail BEFORE INSERT ON reward_claims FOR EACH ROW EXECUTE FUNCTION safety_fail_claim()`,
        );
        const before = await total();
        const events = await count(referralEventsTable);
        const input = completion();
        try {
          await assert.rejects(
            recordCompletion(input, { preReferralId: "pre" }),
            /injected|Failed query/,
          );
        } finally {
          await db.execute(sql`DROP TRIGGER safety_fail ON reward_claims`);
        }
        assert.equal(await total(), before);
        assert.equal(await count(referralEventsTable), events);
        assert.equal(
          (
            await db
              .select()
              .from(preReferralsTable)
              .where(eq(preReferralsTable.id, "pre"))
          )[0].matched,
          "no",
        );
        assert.ok(
          (await recordCompletion(input, { preReferralId: "pre" }))?.claim,
        );
      },
    );
    await t.test(
      "manual completion is idempotent and counts only completion",
      async () => {
        const [event] = await db
          .insert(referralEventsTable)
          .values(completion({ status: "Lead", external_proc_num: null }))
          .returning();
        const before = await total();
        const results = await Promise.all([
          completeManualReferral(event.id, actor),
          completeManualReferral(event.id, actor),
        ]);
        assert.equal(results.filter(Boolean).length, 1);
        assert.equal(await total(), before + 1);
      },
    );
    await t.test(
      "voided future-expiry claims and unauthorized staff cannot redeem",
      async () => {
        const result = (await recordCompletion(completion()))!;
        await db
          .update(rewardClaimsTable)
          .set({ status: "voided", expires_at: new Date("2099-01-01") })
          .where(eq(rewardClaimsTable.id, result.claim!.id));
        await assert.rejects(
          redeemReward({
            token: result.claim!.claim_token,
            reward_type: "gift-card",
          }),
          /voided/,
        );
        const other = (await recordCompletion(completion()))!;
        await assert.rejects(
          redeemReward(
            { token: other.claim!.claim_token, reward_type: "gift-card" },
            { ...actor, practice_id: "b" },
          ),
          /forbidden/,
        );
        await assert.rejects(
          redeemReward(
            { token: other.claim!.claim_token, reward_type: "gift-card" },
            { ...actor, practice_id: null },
          ),
          /forbidden/,
        );
      },
    );
    await t.test(
      "parallel redemption across reward types reserves only one fulfilment",
      async () => {
        const result = (await recordCompletion(completion()))!;
        const before = orders;
        const results = await Promise.allSettled(
          ["gift-card", "in-house-credit", "gift-card"].map((reward_type) =>
            redeemReward({ token: result.claim!.claim_token, reward_type }),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.ok(orders - before <= 1);
        const [claim] = await db
          .select()
          .from(rewardClaimsTable)
          .where(eq(rewardClaimsTable.id, result.claim!.id));
        assert.equal(claim.status, "claimed");
        assert.equal(
          (
            await db
              .select()
              .from(adminTasksTable)
              .where(
                and(
                  eq(adminTasksTable.referral_event_id, result.event.id),
                  eq(adminTasksTable.task_type, "reward-reconciliation"),
                ),
              )
          ).filter((x) => x.status === "pending").length,
          0,
        );
      },
    );
    await t.test(
      "provider uncertainty stays reserved, cannot retry or become a manual payable gift-card task",
      async () => {
        const result = (await recordCompletion(completion()))!;
        providerMode = "timeout";
        try {
          const response = await redeemReward({
            token: result.claim!.claim_token,
            reward_type: "gift-card",
          });
          assert.equal(response.success, false);
          await assert.rejects(
            redeemReward({
              token: result.claim!.claim_token,
              reward_type: "in-house-credit",
            }),
            /processing/,
          );
          const tasks = await db
            .select()
            .from(adminTasksTable)
            .where(eq(adminTasksTable.referral_event_id, result.event.id));
          assert.equal(
            tasks.filter(
              (t) =>
                t.task_type === "reward-reconciliation" &&
                t.status === "pending",
            ).length,
            1,
          );
          assert.equal(
            tasks.filter((t) => t.task_type === "gift-card").length,
            0,
          );
        } finally {
          providerMode = "success";
        }
      },
    );
    await t.test(
      "failure after provider success keeps the reservation and a durable reconciliation task",
      async () => {
        const result = (await recordCompletion(completion()))!;
        await db.execute(
          sql`CREATE OR REPLACE FUNCTION safety_fail_finalize() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'claimed' THEN RAISE EXCEPTION 'injected finalization failure'; END IF; RETURN NEW; END $$`,
        );
        await db.execute(
          sql`CREATE TRIGGER safety_finalize BEFORE UPDATE ON reward_claims FOR EACH ROW EXECUTE FUNCTION safety_fail_finalize()`,
        );
        try {
          await assert.rejects(
            redeemReward({
              token: result.claim!.claim_token,
              reward_type: "gift-card",
            }),
          );
        } finally {
          await db.execute(sql`DROP TRIGGER safety_finalize ON reward_claims`);
        }
        assert.equal(
          (
            await db
              .select()
              .from(rewardClaimsTable)
              .where(eq(rewardClaimsTable.id, result.claim!.id))
          )[0].status,
          "processing",
        );
        await assert.rejects(
          redeemReward({
            token: result.claim!.claim_token,
            reward_type: "gift-card",
          }),
          /processing/,
        );
        assert.equal(
          (
            await db
              .select()
              .from(adminTasksTable)
              .where(
                and(
                  eq(adminTasksTable.referral_event_id, result.event.id),
                  eq(adminTasksTable.task_type, "reward-reconciliation"),
                ),
              )
          )[0].status,
          "pending",
        );
      },
    );
    await t.test(
      "arbitrary custom rewards are rejected without reserving the claim",
      async () => {
        const result = (await recordCompletion(completion()))!;
        await assert.rejects(
          redeemReward({
            token: result.claim!.claim_token,
            reward_type: "custom:invented",
          }),
          /Invalid reward_type/,
        );
        assert.equal(
          (
            await db
              .select()
              .from(rewardClaimsTable)
              .where(eq(rewardClaimsTable.id, result.claim!.id))
          )[0].status,
          "pending",
        );
      },
    );
    await t.test(
      "free-text name cannot automatically authorize money",
      async () => {
        assert.equal(await matchReferrerByName("Shared Name", "a"), null);
      },
    );
    await t.test(
      "public and authenticated endpoints share reservation and void guards",
      async () => {
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
          req.log = { error() {}, info() {}, warn() {} } as any;
          next();
        });
        app.use("/claim", publicRouter);
        app.use("/enroll", enrollRouter);
        app.get(
          "/office",
          (req, _res, next) => {
            req.authUser = actor;
            next();
          },
          requireOdOffice,
          (_req, res) => res.json({ ok: true }),
        );
        app.use(
          "/rewards",
          (req, _res, next) => {
            req.authUser = actor;
            next();
          },
          rewardsRouter,
        );
        const server = app.listen(0, "127.0.0.1");
        await new Promise<void>((r) => server.once("listening", r));
        const base = `http://127.0.0.1:${(server.address() as any).port}`;
        try {
          assert.equal(
            (await localFetch(`${base}/office?office_id=ob`)).status,
            403,
          );
          assert.equal(
            (await localFetch(`${base}/office?office_id=oa`)).status,
            200,
          );
          assert.equal((await localFetch(`${base}/office`)).status, 400);
          const enrollment = (first_name: string, request_id: string) =>
            localFetch(`${base}/enroll`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: "a",
                first_name,
                last_name: "Family",
                phone: "6155559999",
                request_id,
              }),
            }).then((r) => r.json());
          const requestId = crypto.randomUUID();
          const [one, retry] = await Promise.all([
            enrollment("One", requestId),
            enrollment("One", requestId),
          ]);
          const two = await enrollment("Two", crypto.randomUUID());
          assert.equal(one.id, retry.id);
          assert.notEqual(one.id, two.id);
          assert.notEqual(one.referral_code, two.referral_code);
          const result = (await recordCompletion(completion()))!;
          await db
            .update(rewardClaimsTable)
            .set({ status: "voided", expires_at: new Date("2099-01-01") })
            .where(eq(rewardClaimsTable.id, result.claim!.id));
          for (const prefix of ["/claim", "/rewards"]) {
            assert.equal(
              (
                await localFetch(
                  `${base}${prefix}/by-token/${result.claim!.claim_token}`,
                )
              ).status,
              410,
            );
            assert.equal(
              (
                await localFetch(
                  `${base}${prefix === "/claim" ? "/claim" : "/rewards/claim"}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token: result.claim!.claim_token,
                      reward_type: "gift-card",
                    }),
                  },
                )
              ).status,
              410,
            );
          }
          const fresh = (await recordCompletion(completion()))!;
          const requests = ["/claim", "/rewards/claim"].map((path) =>
            localFetch(base + path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: fresh.claim!.claim_token,
                reward_type: "in-house-credit",
              }),
            }),
          );
          const statuses = (await Promise.all(requests))
            .map((r) => r.status)
            .sort();
          assert.deepEqual(statuses, [200, 409]);
        } finally {
          server.closeAllConnections();
          await new Promise<void>((r) => server.close(() => r()));
        }
      },
    );
    await t.test(
      "household review and dismissal cannot issue a duplicate or revive voided claims",
      async () => {
        const approved = (await recordCompletion(
          completion({ household_duplicate: true }),
        ))!;
        assert.equal(approved.claim, null);
        const decisions = await Promise.allSettled([
          resolveHouseholdReview(approved.event.id, actor, true),
          resolveHouseholdReview(approved.event.id, actor, true),
        ]);
        assert.equal(
          decisions.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.equal(
          (
            await db
              .select()
              .from(rewardClaimsTable)
              .where(eq(rewardClaimsTable.referral_event_id, approved.event.id))
          ).length,
          1,
        );
        const denied = (await recordCompletion(
          completion({ household_duplicate: true }),
        ))!;
        await resolveHouseholdReview(denied.event.id, actor, false);
        await assert.rejects(
          resolveHouseholdReview(denied.event.id, actor, true),
          /Voided/,
        );
      },
    );
    await t.test(
      "DriveCentric source replay across processors has one entitlement per tenant",
      async () => {
        const a = completion({
          office_id: null,
          team_source: "drivecentric-sftp",
          external_proc_num: "deal-1",
        });
        const results = await Promise.all([
          recordCompletion(a),
          recordCompletion({ ...a, team_source: "drivecentric-poll" }),
        ]);
        assert.equal(results.filter(Boolean).length, 1);
        assert.ok(
          await recordCompletion({ ...a, referrer_id: "rb", practice_id: "b" }),
        );
      },
    );
    await t.test(
      "database guards reject duplicate identities and active entitlements",
      async () => {
        await assert.rejects(
          db
            .insert(referrersTable)
            .values({
              id: "dup",
              practice_id: "a",
              office_id: "oa",
              patient_id: "1",
              name: "Dup",
              phone: "",
              referral_code: "DUP",
            }),
        );
        const result = (await recordCompletion(completion()))!;
        await assert.rejects(
          db
            .insert(rewardClaimsTable)
            .values({
              practice_id: "a",
              referrer_id: "ra",
              referral_event_id: result.event.id,
              claim_token: "duplicate-token",
              reward_value: 35,
            }),
        );
      },
    );
  } finally {
    await db.$client.end();
  }
});
