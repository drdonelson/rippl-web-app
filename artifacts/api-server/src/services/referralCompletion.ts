import { db } from "@workspace/db";
import {
  staffPoolConfigsTable,
  staffPoolEntriesTable,
  practicesTable,
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  officesTable,
  preReferralsTable,
  adminTasksTable,
} from "@workspace/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { calculateTier } from "../lib/tierUtils";
import { assertTenant, RewardError } from "./rewardRedemption";
import type { AuthUser } from "../middleware/auth";
import { sendRewardNotification } from "./notifications";
import { logger } from "../lib/logger";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Event = typeof referralEventsTable.$inferSelect;
type NewEvent = typeof referralEventsTable.$inferInsert;

// Call with the event row locked (or newly inserted in this transaction). A voided
// claim is historical evidence, not permission to silently issue a replacement.
async function issueEntitlement(tx: Tx, event: Event) {
  assertTenant(event.practice_id);
  const [referrer] = await tx
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, event.referrer_id))
    .for("no key update");
  if (!referrer || referrer.practice_id !== event.practice_id)
    throw new RewardError(409, "Referrer ownership requires review");
  const [existing] = await tx
    .select()
    .from(rewardClaimsTable)
    .where(eq(rewardClaimsTable.referral_event_id, event.id))
    .limit(1);
  if (existing)
    return { event, claim: existing, created: false, notificationTaskId: null };
  if (event.household_duplicate) {
    await tx
      .insert(adminTasksTable)
      .values({
        practice_id: event.practice_id,
        referral_event_id: event.id,
        referrer_id: referrer.id,
        task_type: "household-duplicate-review",
        amount: 0,
        notes: "Review referral eligibility before issuing a reward.",
        status: "pending",
      });
    return { event, claim: null, created: false, notificationTaskId: null };
  }
  const [practice] = await tx
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, event.practice_id!));
  if (!practice) throw new RewardError(409, "Practice configuration missing");
  const total = referrer.total_referrals + 1;
  const tier = calculateTier(total, practice);
  await tx
    .update(referrersTable)
    .set({
      total_referrals: total,
      tier: tier.name,
      reward_value: tier.rewardValue,
      ...(tier.name !== referrer.tier ? { tier_unlocked_at: new Date() } : {}),
    })
    .where(eq(referrersTable.id, referrer.id));
  const [claim] = await tx
    .insert(rewardClaimsTable)
    .values({
      practice_id: event.practice_id,
      referrer_id: referrer.id,
      referral_event_id: event.id,
      claim_token: crypto.randomUUID(),
      reward_value: tier.rewardValue,
      status: "pending",
    })
    .returning();
  const [task] = await tx
    .insert(adminTasksTable)
    .values({
      practice_id: event.practice_id,
      referrer_id: referrer.id,
      referral_event_id: event.id,
      task_type: "reward-notification",
      amount: 0,
      notes: `Claim ${claim.id} is ready. If delivery is interrupted, resend the existing claim notification; do not create another claim.`,
      status: "pending",
    })
    .returning();
  return { event, claim, created: true, notificationTaskId: task.id };
}

export async function recordCompletion(
  values: NewEvent,
  options: { preReferralId?: string } = {},
) {
  assertTenant(values.practice_id ?? null);
  if (!values.external_proc_num)
    throw new RewardError(400, "External completion ID required");
  const dental = values.team_source === "open-dental-sync";
  if (dental && !values.office_id)
    throw new RewardError(400, "OD office required");
  const namespace = dental
    ? `od:${values.office_id}`
    : `dc:${values.practice_id}`;
  return db.transaction(async (tx) => {
    // Transaction-scoped locks work across processes. Source/procedure guards ingestion;
    // OD patient lock additionally serializes different procedures for the same patient.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${namespace + ":event:" + values.external_proc_num}, 0))`,
    );
    if (dental && values.new_patient_pat_num)
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${namespace + ":patient:" + values.new_patient_pat_num}, 0))`,
      );
    if (values.office_id) {
      const [office] = await tx
        .select({ practice_id: officesTable.practice_id })
        .from(officesTable)
        .where(eq(officesTable.id, values.office_id));
      if (!office || office.practice_id !== values.practice_id)
        throw new RewardError(409, "Office ownership mismatch");
    }
    const scope = dental
      ? eq(referralEventsTable.office_id, values.office_id!)
      : and(
          eq(referralEventsTable.practice_id, values.practice_id!),
          inArray(referralEventsTable.team_source, [
            "drivecentric-sftp",
            "drivecentric-poll",
          ]),
        );
    const [existing] = await tx
      .select()
      .from(referralEventsTable)
      .where(
        and(
          scope,
          eq(referralEventsTable.external_proc_num, values.external_proc_num!),
        ),
      );
    if (existing) return null;
    if (dental && values.new_patient_pat_num) {
      const [patient] = await tx
        .select({ id: referralEventsTable.id })
        .from(referralEventsTable)
        .where(
          and(
            eq(referralEventsTable.office_id, values.office_id!),
            eq(
              referralEventsTable.new_patient_pat_num,
              values.new_patient_pat_num,
            ),
            inArray(referralEventsTable.status, [
              "Exam Completed",
              "Reward Sent",
            ]),
          ),
        )
        .limit(1);
      if (patient) return null;
    }
    if (options.preReferralId) {
      const [pre] = await tx
        .update(preReferralsTable)
        .set({ matched: "yes" })
        .where(
          and(
            eq(preReferralsTable.id, options.preReferralId),
            eq(preReferralsTable.practice_id, values.practice_id!),
            eq(preReferralsTable.matched, "no"),
          ),
        )
        .returning();
      if (!pre) throw new RewardError(409, "Pre-referral already consumed");
    }
    const [event] = await tx
      .insert(referralEventsTable)
      .values(values)
      .returning();
    return issueEntitlement(tx, event);
  });
}

export async function completeManualReferral(id: string, actor: AuthUser) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(referralEventsTable)
      .where(eq(referralEventsTable.id, id))
      .for("update");
    if (!event) throw new RewardError(404, "Referral event not found");
    assertTenant(event.practice_id, actor);
    if (["Exam Completed", "Completed", "Reward Sent"].includes(event.status))
      return null;
    const [updated] = await tx
      .update(referralEventsTable)
      .set({ status: "Exam Completed" })
      .where(eq(referralEventsTable.id, id))
      .returning();
    const result = await issueEntitlement(tx, updated);
    if (result.created) {
      const [config] = await tx
        .select()
        .from(staffPoolConfigsTable)
        .where(eq(staffPoolConfigsTable.practice_id, event.practice_id!));
      if (config?.enabled)
        await tx
          .insert(staffPoolEntriesTable)
          .values({
            practice_id: event.practice_id!,
            office_id: event.office_id,
            referral_event_id: event.id,
            amount: config.amount_per_referral,
          });
    }
    return result;
  });
}

// The durable task is created with the entitlement. A restart cannot erase the reminder.
// Errors stay visible for support; retry only notification delivery, never completion.
export async function deliverCompletionNotification(
  result: NonNullable<Awaited<ReturnType<typeof recordCompletion>>>,
) {
  if (!result.created || !result.claim || !result.notificationTaskId) return;
  try {
    const [referrer] = await db
      .select()
      .from(referrersTable)
      .where(eq(referrersTable.id, result.event.referrer_id));
    const sent = await sendRewardNotification(
      referrer.name,
      referrer.phone,
      referrer.email,
      result.event.new_patient_name,
      result.claim.claim_token,
      result.event.office,
      result.claim.reward_value,
      result.event.practice_id!,
    );
    if (sent.errors.length) throw new Error(sent.errors.join("; "));
    await db
      .update(adminTasksTable)
      .set({ status: "completed", completed: true, completed_at: new Date() })
      .where(eq(adminTasksTable.id, result.notificationTaskId));
  } catch (err) {
    logger.error(
      { err, eventId: result.event.id },
      "Notification pending in admin tasks",
    );
  }
}

// Explicit staff recovery only. Historical completions are never silently replayed by
// the poller: an operator must first reconcile whether their counters were already credited.
export async function issueReviewedEntitlement(
  eventId: string,
  actor: AuthUser,
) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(referralEventsTable)
      .where(eq(referralEventsTable.id, eventId))
      .for("update");
    if (!event) throw new RewardError(404, "Referral not found");
    assertTenant(event.practice_id, actor);
    if (
      !["Exam Completed", "Completed"].includes(event.status) ||
      event.household_duplicate
    )
      throw new RewardError(409, "Referral is not eligible");
    return issueEntitlement(tx, event);
  });
}

export async function resolveHouseholdReview(
  id: string,
  actor: AuthUser,
  approve: boolean,
) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(referralEventsTable)
      .where(eq(referralEventsTable.id, id))
      .for("update");
    if (!event) throw new RewardError(404, "Referral not found");
    assertTenant(event.practice_id, actor);
    if (!event.household_duplicate)
      throw new RewardError(409, "Referral is not awaiting household review");
    const claims = await tx
      .select()
      .from(rewardClaimsTable)
      .where(eq(rewardClaimsTable.referral_event_id, id));
    if (claims.some((c) => c.status !== "pending" && c.status !== "voided"))
      throw new RewardError(
        409,
        "Reward is processing or claimed; reconcile it first",
      );
    let result;
    if (approve) {
      if (claims.some((c) => c.status === "voided"))
        throw new RewardError(
          409,
          "Voided history requires explicit reconciliation",
        );
      const [updated] = await tx
        .update(referralEventsTable)
        .set({ household_duplicate: false })
        .where(eq(referralEventsTable.id, id))
        .returning();
      result = await issueEntitlement(tx, updated);
    } else {
      for (const claim of claims.filter((c) => c.status === "pending")) {
        const changed = await tx
          .update(rewardClaimsTable)
          .set({ status: "voided" })
          .where(
            and(
              eq(rewardClaimsTable.id, claim.id),
              eq(rewardClaimsTable.status, "pending"),
            ),
          )
          .returning();
        if (!changed.length)
          throw new RewardError(409, "Reward processing has started");
      }
      if (!claims.length)
        await tx
          .insert(rewardClaimsTable)
          .values({
            practice_id: event.practice_id,
            referrer_id: event.referrer_id,
            referral_event_id: id,
            claim_token: crypto.randomUUID(),
            reward_value: 0,
            status: "voided",
          });
      result = { event, claim: null, created: false, notificationTaskId: null };
    }
    await tx
      .update(adminTasksTable)
      .set({ status: "completed", completed: true })
      .where(
        and(
          eq(adminTasksTable.referral_event_id, id),
          eq(adminTasksTable.task_type, "household-duplicate-review"),
        ),
      );
    return result;
  });
}
