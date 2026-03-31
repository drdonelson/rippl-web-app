import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, rewardsTable } from "@workspace/db/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  // Optional office_id filter — "all" or absent means no filter
  const officeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id
    : null;

  const officeFilter = officeId
    ? eq(referralEventsTable.office_id, officeId)
    : undefined;

  // Total referrals
  const [{ count: totalReferrals }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable)
    .where(officeFilter);

  // Exams completed
  const examCondition = officeFilter
    ? and(eq(referralEventsTable.status, "Exam Completed"), officeFilter)
    : eq(referralEventsTable.status, "Exam Completed");
  const [{ count: examsCompleted }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable)
    .where(examCondition);

  // Rewards issued — rewards table has no office column, so we filter via referral_events join
  let rewardsIssued: number;
  if (officeId) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rewardsTable)
      .leftJoin(referralEventsTable, eq(rewardsTable.referral_event_id, referralEventsTable.id))
      .where(eq(referralEventsTable.office_id, officeId));
    rewardsIssued = count;
  } else {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rewardsTable);
    rewardsIssued = count;
  }

  // Active referrers
  const [{ count: activeReferrers }] = await db
    .select({ count: sql<number>`count(distinct ${referralEventsTable.referrer_id})::int` })
    .from(referralEventsTable)
    .where(officeFilter);

  // Top 5 referrers by total_referrals
  // When filtering by office, compute referral count from events table for that office
  let topReferrers: { id: string; name: string; total_referrals: number; total_rewards_issued: number }[];
  if (officeId) {
    topReferrers = await db
      .select({
        id: referrersTable.id,
        name: referrersTable.name,
        total_referrals: sql<number>`count(${referralEventsTable.id})::int`,
        total_rewards_issued: referrersTable.total_rewards_issued,
      })
      .from(referralEventsTable)
      .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
      .where(eq(referralEventsTable.office_id, officeId))
      .groupBy(referrersTable.id, referrersTable.name, referrersTable.total_rewards_issued)
      .orderBy(sql`count(${referralEventsTable.id}) desc`)
      .limit(5) as { id: string; name: string; total_referrals: number; total_rewards_issued: number }[];
  } else {
    topReferrers = await db
      .select({
        id: referrersTable.id,
        name: referrersTable.name,
        total_referrals: referrersTable.total_referrals,
        total_rewards_issued: referrersTable.total_rewards_issued,
      })
      .from(referrersTable)
      .orderBy(sql`${referrersTable.total_referrals} desc`)
      .limit(5);
  }

  // Recent 10 referral events with referrer name
  const recentEvents = await db
    .select({
      id: referralEventsTable.id,
      new_patient_name: referralEventsTable.new_patient_name,
      new_patient_phone: referralEventsTable.new_patient_phone,
      referrer_id: referralEventsTable.referrer_id,
      referrer_name: referrersTable.name,
      team_source: referralEventsTable.team_source,
      office: referralEventsTable.office,
      office_id: referralEventsTable.office_id,
      status: referralEventsTable.status,
      reward_type: referralEventsTable.reward_type,
      created_at: referralEventsTable.created_at,
    })
    .from(referralEventsTable)
    .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
    .where(officeFilter)
    .orderBy(sql`${referralEventsTable.created_at} desc`)
    .limit(10);

  res.json({
    total_referrals: totalReferrals,
    exams_completed: examsCompleted,
    rewards_issued: rewardsIssued,
    active_referrers: activeReferrers,
    top_referrers: topReferrers,
    recent_events: recentEvents,
  });
});

export default router;
