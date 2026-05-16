import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  adminTasksTable,
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  practicesTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendRewardNotification } from "../services/notifications";
import { calculateTier } from "../lib/tierUtils";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const user = req.authUser!;
    const officeId   = user.role !== "super_admin" ? (user.office_id   ?? null) : null;
    const practiceId = user.role !== "super_admin" ? (user.practice_id ?? null) : null;

    const { rows } = await db.execute(
      officeId
        ? sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name
            FROM admin_tasks t
            LEFT JOIN referrers         r  ON t.referrer_id       = r.id
            LEFT JOIN referral_events   re ON t.referral_event_id = re.id
            WHERE COALESCE(t.status, 'pending') = 'pending'
              AND re.office_id = ${officeId}
            ORDER BY t.created_at DESC
          `
        : practiceId
        ? sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name
            FROM admin_tasks t
            LEFT JOIN referrers         r  ON t.referrer_id       = r.id
            LEFT JOIN referral_events   re ON t.referral_event_id = re.id
            WHERE COALESCE(t.status, 'pending') = 'pending'
              AND t.practice_id = ${practiceId}
            ORDER BY t.created_at DESC
          `
        : sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name
            FROM admin_tasks t
            LEFT JOIN referrers         r  ON t.referrer_id       = r.id
            LEFT JOIN referral_events   re ON t.referral_event_id = re.id
            WHERE COALESCE(t.status, 'pending') = 'pending'
            ORDER BY t.created_at DESC
          `
    );
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "[admin-tasks] GET query failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load admin tasks" });
  }
});

// ── GET /api/admin-tasks/referrers/search ─────────────────────────────────────
// Typeahead search for referrers when matching an unmatched-referral task.
// Must be registered BEFORE /:id routes so "referrers" isn't treated as an id.
router.get("/referrers/search", async (req, res) => {
  const q = (req.query["q"] as string ?? "").trim();
  const practiceId = req.query["practice_id"] as string | undefined;

  if (!q || q.length < 2) { res.json([]); return; }

  try {
    const { rows } = await db.execute(
      practiceId
        ? sql`
            SELECT id, name, phone, email
            FROM referrers
            WHERE practice_id = ${practiceId}
              AND (
                LOWER(name) LIKE ${"%" + q.toLowerCase() + "%"}
                OR phone LIKE ${"%" + q + "%"}
              )
            ORDER BY name
            LIMIT 20
          `
        : sql`
            SELECT id, name, phone, email
            FROM referrers
            WHERE LOWER(name) LIKE ${"%" + q.toLowerCase() + "%"}
               OR phone LIKE ${"%" + q + "%"}
            ORDER BY name
            LIMIT 20
          `,
    );
    res.json(rows);
  } catch (err) {
    req.log.error({ err, q }, "[admin-tasks] referrer search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

router.patch("/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.execute(sql`
      UPDATE admin_tasks
      SET status = 'completed', completed = true
      WHERE id = ${id}
        AND COALESCE(status, 'pending') = 'pending'
      RETURNING *
    `);
    if (!rows.length) { res.status(404).json({ error: "Task not found or already completed" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] complete update failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to complete task" });
  }
});

router.patch("/:id/override", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: found } = await db.execute(sql`
      SELECT * FROM admin_tasks WHERE id = ${id}
    `);
    const task = found[0] as {
      id: string;
      referral_event_id: string;
      completed?: boolean;
      status?: string | null;
    } | undefined;

    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const currentStatus = task.status ?? (task.completed ? "completed" : "pending");
    if (currentStatus !== "pending") {
      res.status(404).json({ error: "Task not found or already completed" });
      return;
    }

    await db.execute(sql`
      UPDATE admin_tasks SET status = 'completed', completed = true WHERE id = ${id}
    `);

    const { rows: eventRows } = await db.execute(sql`
      UPDATE referral_events
      SET household_duplicate = false
      WHERE id = ${task.referral_event_id}
      RETURNING *
    `);

    req.log.info(
      { taskId: id, referralEventId: task.referral_event_id },
      "Admin overrode household duplicate — duplicate flag cleared"
    );

    res.json({ task: { ...task, status: "completed", completed: true }, event: eventRows[0] ?? null });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] override failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to override task" });
  }
});

// ── POST /api/admin-tasks/:id/match-referrer ──────────────────────────────────
// Resolve an unmatched-referral task by linking it to an existing referrer.
// Creates referral_event + reward_claim + sends notification, then completes the task.
router.post("/:id/match-referrer", async (req, res) => {
  const { id } = req.params;
  const { referrer_id } = req.body as { referrer_id: string };

  if (!referrer_id) {
    res.status(400).json({ error: "referrer_id is required" });
    return;
  }

  try {
    // Load the task
    const { rows: taskRows } = await db.execute(sql`
      SELECT * FROM admin_tasks WHERE id = ${id}
    `);
    const task = taskRows[0] as {
      id: string;
      task_type: string;
      notes: string | null;
      status: string | null;
      practice_id: string | null;
    } | undefined;

    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.task_type !== "unmatched-referral") {
      res.status(400).json({ error: "Task is not an unmatched-referral" });
      return;
    }
    if ((task.status ?? "pending") !== "pending") {
      res.status(409).json({ error: "Task already completed" });
      return;
    }

    const practiceId = task.practice_id!;

    // Load referrer + practice in parallel
    const [[referrer], [practice]] = await Promise.all([
      db.select().from(referrersTable).where(eq(referrersTable.id, referrer_id)),
      db.select().from(practicesTable).where(eq(practicesTable.id, practiceId)),
    ]);

    if (!referrer) { res.status(404).json({ error: "Referrer not found" }); return; }
    if (!practice) { res.status(404).json({ error: "Practice not found" }); return; }

    const tierData = calculateTier(referrer.total_referrals + 1);

    // Create referral_event
    const [newEvent] = await db.insert(referralEventsTable).values({
      new_patient_name:    "Unknown Patient",
      new_patient_phone:   "",
      new_patient_pat_num: `admin-match-${id}`,
      referrer_id:         referrer.id,
      team_source:         "admin-match",
      office:              practice.name,
      office_id:           null,
      practice_id:         practiceId,
      external_proc_num:   `admin-match-${id}`,
      status:              "Exam Completed",
    }).returning();

    if (!newEvent) throw new Error("Failed to create referral event");

    // Update referrer totals + tier
    await db
      .update(referrersTable)
      .set({
        total_referrals:  referrer.total_referrals + 1,
        tier:             tierData.name,
        tier_unlocked_at: tierData.name !== referrer.tier ? new Date() : referrer.tier_unlocked_at,
        reward_value:     tierData.rewardValue,
      })
      .where(eq(referrersTable.id, referrer.id));

    // Create reward_claim
    const claimToken = crypto.randomUUID();
    await db.insert(rewardClaimsTable).values({
      claim_token:       claimToken,
      referral_event_id: newEvent.id,
      referrer_id:       referrer.id,
      reward_value:      tierData.rewardValue,
      practice_id:       practiceId,
      status:            "pending",
    });

    // Complete the admin task
    await db.execute(sql`
      UPDATE admin_tasks SET status = 'completed', completed = true WHERE id = ${id}
    `);

    // Fire notification (non-blocking)
    sendRewardNotification(
      referrer.name,
      referrer.phone,
      referrer.email ?? null,
      "your referred customer",
      claimToken,
      practice.name,
      tierData.rewardValue,
      practiceId,
    ).catch((err) => {
      req.log.error({ err, taskId: id }, "[admin-tasks] match-referrer notification failed");
    });

    req.log.info(
      { taskId: id, referrerId: referrer.id, claimToken },
      "[admin-tasks] Unmatched referral resolved",
    );

    res.json({ success: true, claimToken, referral_event_id: newEvent.id });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] match-referrer failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to match referrer" });
  }
});

export default router;
