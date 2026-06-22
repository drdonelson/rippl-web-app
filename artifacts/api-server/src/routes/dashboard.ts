import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, rewardsTable, practicesTable } from "@workspace/db/schema";
import { eq, sql, and, inArray, notInArray, or, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const user = req.authUser!;
  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id
    : null;
  const officeId = user.role !== "super_admin" && user.office_id
    ? user.office_id
    : rawOfficeId;
  const practiceId = user.role !== "super_admin" ? user.practice_id : null;

  try {
    // For super_admin viewing all data, exclude demo practices so they don't pollute real stats
    let demoExclusionFilter: ReturnType<typeof notInArray> | undefined;
    if (user.role === "super_admin" && !practiceId) {
      const demoPractices = await db.select({ id: practicesTable.id })
        .from(practicesTable)
        .where(eq(practicesTable.status, "demo"));
      if (demoPractices.length > 0) {
        // Include NULL practice_ids (legacy events) but exclude known demo practice IDs
        demoExclusionFilter = or(
          isNull(referralEventsTable.practice_id),
          notInArray(referralEventsTable.practice_id, demoPractices.map(p => p.id))
        ) as ReturnType<typeof notInArray>;
      }
    }

    const officeFilter   = officeId   ? eq(referralEventsTable.office_id,   officeId)   : undefined;
    const practiceFilter = practiceId ? eq(referralEventsTable.practice_id, practiceId) : undefined;

    const filterParts = [officeFilter, practiceFilter, demoExclusionFilter].filter(Boolean);
    const bothFilters = filterParts.length === 0
      ? undefined
      : filterParts.reduce((acc, f) => acc ? and(acc, f!) : f);

    // Look up vertical so automotive practices get deal-closed count instead of exam count
    let practiceVertical: string | null = null;
    if (practiceId) {
      const [practice] = await db.select({ vertical: practicesTable.vertical })
        .from(practicesTable)
        .where(eq(practicesTable.id, practiceId))
        .limit(1);
      practiceVertical = practice?.vertical ?? null;
    }

    const completedStatuses = practiceVertical === "automotive"
      ? ["Completed", "Rewarded"]
      : ["Exam Completed"];

    const examCondition = bothFilters
      ? and(inArray(referralEventsTable.status, completedStatuses), bothFilters)
      : inArray(referralEventsTable.status, completedStatuses);

    const [
      [{ count: totalReferrals }],
      [{ count: examsCompleted }],
      rewardsIssuedRows,
      [{ count: activeReferrers }],
      topReferrers,
      recentEvents,
    ] = await Promise.all([
      // 1. Total referrals
      db.select({ count: sql<number>`count(*)::int` })
        .from(referralEventsTable)
        .where(bothFilters),

      // 2. Exams completed
      db.select({ count: sql<number>`count(*)::int` })
        .from(referralEventsTable)
        .where(examCondition),

      // 3. Rewards issued
      bothFilters
        ? db.select({ count: sql<number>`count(*)::int` })
            .from(rewardsTable)
            .leftJoin(referralEventsTable, eq(rewardsTable.referral_event_id, referralEventsTable.id))
            .where(bothFilters)
        : db.select({ count: sql<number>`count(*)::int` })
            .from(rewardsTable),

      // 4. Active referrers (distinct)
      db.select({ count: sql<number>`count(distinct ${referralEventsTable.referrer_id})::int` })
        .from(referralEventsTable)
        .where(bothFilters),

      // 5. Top referrers
      bothFilters
        ? db.select({
              id: referrersTable.id,
              name: referrersTable.name,
              total_referrals: sql<number>`count(${referralEventsTable.id})::int`,
              total_rewards_issued: referrersTable.total_rewards_issued,
            })
            .from(referralEventsTable)
            .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
            .where(bothFilters)
            .groupBy(referrersTable.id, referrersTable.name, referrersTable.total_rewards_issued)
            .orderBy(sql`count(${referralEventsTable.id}) desc`)
            .limit(5) as Promise<{ id: string; name: string; total_referrals: number; total_rewards_issued: number }[]>
        : db.select({
              id: referrersTable.id,
              name: referrersTable.name,
              total_referrals: referrersTable.total_referrals,
              total_rewards_issued: referrersTable.total_rewards_issued,
            })
            .from(referrersTable)
            .orderBy(sql`${referrersTable.total_referrals} desc`)
            .limit(5),

      // 6. Recent events
      db.select({
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
        .where(bothFilters)
        .orderBy(sql`${referralEventsTable.created_at} desc`)
        .limit(10),
    ]);

    res.json({
      total_referrals: totalReferrals,
      exams_completed: examsCompleted,
      rewards_issued: rewardsIssuedRows[0].count,
      active_referrers: activeReferrers,
      top_referrers: topReferrers,
      recent_events: recentEvents,
      vertical: practiceVertical,
    });
  } catch (err) {
    req.log.error({ err, officeId }, "[dashboard] DB query failed");
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

export default router;
