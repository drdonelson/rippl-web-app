import { resolveHouseholdReview, recordCompletion, issueReviewedEntitlement, deliverCompletionNotification } from "../services/referralCompletion";
import { assertTenant, RewardError } from "../services/rewardRedemption";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  adminTasksTable,
  referralEventsTable,
  referrersTable,
  practicesTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.use((req, res, next) => {
  if (req.authUser?.role !== "super_admin" && !req.authUser?.practice_id) { res.status(403).json({ error: "Tenant membership required" }); return; }
  next();
});
router.param("id", async (req, res, next, id) => {
  const [task] = await db.select().from(adminTasksTable).where(eq(adminTasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  try { assertTenant(task.practice_id, req.authUser); next(); }
  catch (err) { if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; } next(err); }
});

router.get("/", async (req, res) => {
  try {
    const user = req.authUser!;

    // Role-based scoping: non-super_admin users are always scoped to their office/practice.
    // Super admins can optionally pass ?office_id= to scope to a specific office.
    const roleOfficeId   = user.role !== "super_admin" ? (user.office_id   ?? null) : null;
    const rolePracticeId = user.role !== "super_admin"
      ? (user.practice_id ?? null)
      : ((req.query["practice_id"] as string | undefined)?.trim() || null);
    const queryOfficeId  = (req.query["office_id"] as string | undefined)?.trim() || null;

    // super_admin is scoped only by practice_id — never filter by office_id to prevent
    // stale office context from a different practice bleeding cross-practice tasks in.
    const effectiveOfficeId = user.role === "super_admin"
      ? null
      : (roleOfficeId ?? (queryOfficeId && queryOfficeId !== "all" ? queryOfficeId : null));

    const { rows } = await db.execute(
      effectiveOfficeId
        ? sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name,
              re.office_id
            FROM admin_tasks t
            LEFT JOIN referrers         r  ON t.referrer_id       = r.id
            LEFT JOIN referral_events   re ON t.referral_event_id = re.id
            WHERE COALESCE(t.status, 'pending') = 'pending'
              AND re.office_id = ${effectiveOfficeId}
              AND t.practice_id = ${rolePracticeId}
            ORDER BY t.created_at DESC
          `
        : rolePracticeId
        ? sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name,
              re.office_id
            FROM admin_tasks t
            LEFT JOIN referrers         r  ON t.referrer_id       = r.id
            LEFT JOIN referral_events   re ON t.referral_event_id = re.id
            WHERE COALESCE(t.status, 'pending') = 'pending'
              AND t.practice_id = ${rolePracticeId}
            ORDER BY t.created_at DESC
          `
        : sql`
            SELECT
              t.id, t.task_type, t.amount, t.notes,
              COALESCE(t.status, 'pending') AS status,
              t.referral_event_id, t.created_at,
              r.name  AS referrer_name,
              r.email AS referrer_email,
              re.new_patient_name,
              re.office_id
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
    const [task] = await db.select().from(adminTasksTable).where(eq(adminTasksTable.id, id));
    if (task?.task_type === "reward-reconciliation") {
      res.status(409).json({ error: "Reconcile the claim and provider outcome before closing this task" }); return;
    }
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
  const [task] = await db.select().from(adminTasksTable).where(eq(adminTasksTable.id, req.params.id));
  if (task.task_type !== "household-duplicate-review" || !task.referral_event_id) { res.status(400).json({ error: "Not a household review task" }); return; }
  try {
    const result = await resolveHouseholdReview(task.referral_event_id, req.authUser!, true);
    await deliverCompletionNotification(result);
    res.json({ event: result.event });
  } catch (err) {
    if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; }
    throw err;
  }
});

// ── POST /api/admin-tasks/:id/process-reward ─────────────────────────────────
// For reward-pending tasks: creates a reward_claim on the existing referral_event,
// increments referrer totals, and fires the notification. Does NOT create a new event.
router.post("/:id/process-reward", async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: taskRows } = await db.execute(sql`SELECT * FROM admin_tasks WHERE id = ${id}`);
    const task = taskRows[0] as {
      id: string;
      task_type: string;
      referral_event_id: string | null;
      referrer_id: string | null;
      status: string | null;
      practice_id: string | null;
    } | undefined;

    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.task_type !== "reward-pending") {
      res.status(400).json({ error: "Task is not a reward-pending task" });
      return;
    }
    if ((task.status ?? "pending") !== "pending") {
      res.status(409).json({ error: "Task already completed" });
      return;
    }
    if (!task.referral_event_id || !task.referrer_id || !task.practice_id) {
      res.status(400).json({ error: "Task is missing referral_event_id, referrer_id, or practice_id" });
      return;
    }

    const completion = await issueReviewedEntitlement(task.referral_event_id, req.authUser!);
    if (!completion.created) { res.status(409).json({ error: "Claim already exists; do not issue a replacement" }); return; }
    await db.update(adminTasksTable).set({ status: "completed", completed: true }).where(eq(adminTasksTable.id, id));
    await deliverCompletionNotification(completion);
    res.json({ success: true, claimToken: completion.claim?.claim_token, referral_event_id: task.referral_event_id });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] process-reward failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to process reward" });
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

    if (referrer.practice_id !== practiceId) { res.status(403).json({ error: "Referrer belongs to another practice" }); return; }
    // Preserve the original deal key so a later feed replay cannot reward it again.
    const dealId = task.notes?.match(/\bdeal ([A-Za-z0-9_-]+)[.:\s]/i)?.[1];
    if (!dealId || !task.notes?.includes("DriveCentric")) {
      res.status(409).json({ error: "Source completion identity requires review" }); return;
    }
    const completion = await recordCompletion({ new_patient_name: "Staff-confirmed customer", new_patient_phone: "",
      new_patient_pat_num: dealId, referrer_id: referrer.id, team_source: "drivecentric-sftp",
      office: practice.name, office_id: null, practice_id: practiceId, external_proc_num: dealId, status: "Completed" });
    if (!completion) { res.status(409).json({ error: "This deal already has a referral; reconcile instead of issuing another" }); return; }
    await db.update(adminTasksTable).set({ status: "completed", completed: true }).where(eq(adminTasksTable.id, id));
    await deliverCompletionNotification(completion);
    res.json({ success: true, claimToken: completion.claim?.claim_token, referral_event_id: completion.event.id });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] match-referrer failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to match referrer" });
  }
});

export default router;
