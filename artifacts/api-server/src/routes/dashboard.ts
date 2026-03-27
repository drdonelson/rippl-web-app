import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, rewardsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  // Total referrals
  const [{ count: totalReferrals }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable);

  // Exams completed
  const [{ count: examsCompleted }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable)
    .where(eq(referralEventsTable.status, "Exam Completed"));

  // Rewards issued
  const [{ count: rewardsIssued }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewardsTable);

  // Active referrers (those who have at least 1 referral)
  const [{ count: activeReferrers }] = await db
    .select({ count: sql<number>`count(distinct referrer_id)::int` })
    .from(referralEventsTable);

  // Top 5 referrers by total_referrals
  const topReferrers = await db
    .select({
      id: referrersTable.id,
      name: referrersTable.name,
      total_referrals: referrersTable.total_referrals,
      total_rewards_issued: referrersTable.total_rewards_issued,
    })
    .from(referrersTable)
    .orderBy(sql`${referrersTable.total_referrals} desc`)
    .limit(5);

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
      status: referralEventsTable.status,
      reward_type: referralEventsTable.reward_type,
      created_at: referralEventsTable.created_at,
    })
    .from(referralEventsTable)
    .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
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
