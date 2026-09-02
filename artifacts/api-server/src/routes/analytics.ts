import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, rewardClaimsTable, practicesTable } from "@workspace/db/schema";
import { eq, sql, and, gte, lte, notInArray, isNull, or } from "drizzle-orm";

const router: IRouter = Router();

function dateFilter(col: Parameters<typeof gte>[0], start: string | null, end: string | null) {
  const parts: ReturnType<typeof gte>[] = [];
  if (start) parts.push(gte(col, new Date(start)));
  if (end)   parts.push(lte(col, new Date(end + "T23:59:59.999Z")));
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(parts[0], parts[1]);
}

router.get("/", async (req, res) => {
  const user = req.authUser!;

  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id : null;
  const officeId   = user.role !== "super_admin" && user.office_id ? user.office_id : rawOfficeId;
  const practiceId = user.role !== "super_admin"
    ? user.practice_id
    : (typeof req.query.practice_id === "string" ? req.query.practice_id : null);

  const startDate = typeof req.query.start_date === "string" ? req.query.start_date : null;
  const endDate   = typeof req.query.end_date   === "string" ? req.query.end_date   : null;

  try {
    // Exclude demo practices for super_admin viewing all data
    let demoExclusionFilter: ReturnType<typeof notInArray> | undefined;
    if (user.role === "super_admin" && !practiceId) {
      const demoPractices = await db.select({ id: practicesTable.id })
        .from(practicesTable)
        .where(eq(practicesTable.status, "demo"));
      if (demoPractices.length > 0) {
        demoExclusionFilter = or(
          isNull(referralEventsTable.practice_id),
          notInArray(referralEventsTable.practice_id, demoPractices.map(p => p.id))
        ) as ReturnType<typeof notInArray>;
      }
    }

    const officeFilter   = officeId   ? eq(referralEventsTable.office_id,   officeId)   : undefined;
    const practiceFilter = practiceId ? eq(referralEventsTable.practice_id, practiceId) : undefined;
    const dtFilter       = dateFilter(referralEventsTable.created_at, startDate, endDate);

    const parts = [officeFilter, practiceFilter, dtFilter, demoExclusionFilter].filter(Boolean);
    const where = parts.length === 0
      ? undefined
      : parts.reduce((acc, f) => acc ? and(acc!, f!) : f) as ReturnType<typeof and>;

    // Look up vertical for correct "completed" status label
    let practiceVertical: string | null = null;
    if (practiceId) {
      const [p] = await db.select({ vertical: practicesTable.vertical })
        .from(practicesTable).where(eq(practicesTable.id, practiceId)).limit(1);
      practiceVertical = p?.vertical ?? null;
    }
    const completedStatuses = practiceVertical === "automotive" ? ["Completed", "Rewarded"] : ["Exam Completed"];

    const [
      [{ total_referrals }],
      [{ exams_completed }],
      [{ rewards_sent }],
      rewardValueRows,
      monthlyTrends,
      topReferrers,
      rewardBreakdown,
    ] = await Promise.all([
      db.select({ total_referrals: sql<number>`count(*)::int` })
        .from(referralEventsTable).where(where),

      db.select({ exams_completed: sql<number>`count(*)::int` })
        .from(referralEventsTable)
        .where(where
          ? and(where, sql`${referralEventsTable.status} = ANY(${sql.raw(`ARRAY[${completedStatuses.map(s => `'${s}'`).join(",")}]`)})`)
          : sql`${referralEventsTable.status} = ANY(${sql.raw(`ARRAY[${completedStatuses.map(s => `'${s}'`).join(",")}]`)})`),

      db.select({ rewards_sent: sql<number>`count(*)::int` })
        .from(referralEventsTable)
        .where(where
          ? and(where, eq(referralEventsTable.status, "Reward Sent"))
          : eq(referralEventsTable.status, "Reward Sent")),

      // Total reward value claimed in period
      db.select({ total_value: sql<number>`coalesce(sum(${rewardClaimsTable.reward_value}), 0)::int` })
        .from(rewardClaimsTable)
        .where((() => {
          const rcDateFilter = dateFilter(rewardClaimsTable.created_at, startDate, endDate);
          const rcPracticeFilter = practiceId ? eq(rewardClaimsTable.practice_id, practiceId) : undefined;
          const rcParts = [rcPracticeFilter, rcDateFilter].filter(Boolean);
          return rcParts.length === 0 ? undefined : rcParts.reduce((acc, f) => acc ? and(acc!, f!) : f) as ReturnType<typeof and>;
        })()),

      // Monthly trends
      db.execute(sql`
        SELECT
          to_char(date_trunc('month', ${referralEventsTable.created_at}), 'YYYY-MM') AS period,
          to_char(date_trunc('month', ${referralEventsTable.created_at}), 'Mon YYYY') AS label,
          count(*)::int AS referrals,
          count(*) FILTER (WHERE ${referralEventsTable.status} = 'Reward Sent')::int AS rewards_sent
        FROM ${referralEventsTable}
        ${where ? sql`WHERE ${where}` : sql``}
        GROUP BY 1, 2
        ORDER BY 1
      `),

      // Top referrers in period
      db.select({
        id: referrersTable.id,
        name: referrersTable.name,
        referrals: sql<number>`count(${referralEventsTable.id})::int`,
        rewards: referrersTable.total_rewards_issued,
      })
        .from(referralEventsTable)
        .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
        .where(where)
        .groupBy(referrersTable.id, referrersTable.name, referrersTable.total_rewards_issued)
        .orderBy(sql`count(${referralEventsTable.id}) desc`)
        .limit(5),

      // Reward type breakdown
      db.select({
        reward_type: rewardClaimsTable.reward_type,
        count: sql<number>`count(*)::int`,
        total_value: sql<number>`coalesce(sum(${rewardClaimsTable.reward_value}), 0)::int`,
      })
        .from(rewardClaimsTable)
        .where((() => {
          const rcDateFilter = dateFilter(rewardClaimsTable.created_at, startDate, endDate);
          const rcPracticeFilter = practiceId ? eq(rewardClaimsTable.practice_id, practiceId) : undefined;
          const rcParts = [rcPracticeFilter, rcDateFilter, eq(rewardClaimsTable.status, "claimed")].filter(Boolean);
          return rcParts.reduce((acc, f) => acc ? and(acc!, f!) : f) as ReturnType<typeof and>;
        })())
        .groupBy(rewardClaimsTable.reward_type)
        .orderBy(sql`count(*) desc`),
    ]);

    const trends = (monthlyTrends as unknown as { period: string; label: string; referrals: number; rewards_sent: number }[]);
    const totalValue = rewardValueRows[0]?.total_value ?? 0;

    res.json({
      stats: {
        total_referrals,
        exams_completed,
        rewards_sent,
        total_reward_value: totalValue,
        vertical: practiceVertical,
      },
      monthly_trends: trends,
      top_referrers: topReferrers,
      reward_breakdown: rewardBreakdown,
    });
  } catch (err) {
    req.log.error({ err }, "[analytics] query failed");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

// CSV export — same filters, returns trend + reward data as CSV
router.get("/export", async (req, res) => {
  const user = req.authUser!;

  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id : null;
  const officeId   = user.role !== "super_admin" && user.office_id ? user.office_id : rawOfficeId;
  const practiceId = user.role !== "super_admin"
    ? user.practice_id
    : (typeof req.query.practice_id === "string" ? req.query.practice_id : null);
  const startDate = typeof req.query.start_date === "string" ? req.query.start_date : null;
  const endDate   = typeof req.query.end_date   === "string" ? req.query.end_date   : null;

  try {
    const officeFilter   = officeId   ? eq(referralEventsTable.office_id,   officeId)   : undefined;
    const practiceFilter = practiceId ? eq(referralEventsTable.practice_id, practiceId) : undefined;
    const dtFilter       = dateFilter(referralEventsTable.created_at, startDate, endDate);

    const parts = [officeFilter, practiceFilter, dtFilter].filter(Boolean);
    const where = parts.length === 0
      ? undefined
      : parts.reduce((acc, f) => acc ? and(acc!, f!) : f) as ReturnType<typeof and>;

    const rows = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', ${referralEventsTable.created_at}), 'Mon YYYY') AS "Month",
        count(*)::int AS "Total Referrals",
        count(*) FILTER (WHERE ${referralEventsTable.status} IN ('Exam Completed', 'Completed', 'Rewarded'))::int AS "Exams Completed",
        count(*) FILTER (WHERE ${referralEventsTable.status} = 'Reward Sent')::int AS "Rewards Sent"
      FROM ${referralEventsTable}
      ${where ? sql`WHERE ${where}` : sql``}
      GROUP BY 1, date_trunc('month', ${referralEventsTable.created_at})
      ORDER BY date_trunc('month', ${referralEventsTable.created_at})
    `) as unknown as { Month: string; "Total Referrals": number; "Exams Completed": number; "Rewards Sent": number }[];

    const header = ["Month", "Total Referrals", "Exams Completed", "Rewards Sent"];
    const lines = [
      header.join(","),
      ...rows.map(r => [
        `"${r.Month}"`,
        r["Total Referrals"],
        r["Exams Completed"],
        r["Rewards Sent"],
      ].join(",")),
    ];

    const filename = `rippl-referrals-${startDate ?? "all"}-to-${endDate ?? "today"}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\n"));
  } catch (err) {
    req.log.error({ err }, "[analytics/export] query failed");
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
