import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Detect which status/completed column exists on admin_tasks — handles both
// schema versions (legacy: completed boolean, current: status text)
async function getStatusColumn(): Promise<"status" | "completed" | null> {
  const { rows } = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_tasks'
      AND column_name IN ('status', 'completed')
  `);
  const names = (rows as { column_name: string }[]).map((r) => r.column_name);
  if (names.includes("status")) return "status";
  if (names.includes("completed")) return "completed";
  return null;
}

router.get("/", async (req, res) => {
  try {
    const col = await getStatusColumn();
    req.log.info({ statusColumn: col }, "[admin-tasks] using column");

    let rows: unknown[];

    if (col === "status") {
      ({ rows } = await db.execute(sql`
        SELECT
          t.id, t.task_type, t.amount, t.notes, t.status,
          t.referral_event_id, t.created_at,
          r.name  AS referrer_name,
          r.email AS referrer_email,
          re.new_patient_name
        FROM admin_tasks t
        LEFT JOIN referrers         r  ON t.referrer_id       = r.id
        LEFT JOIN referral_events   re ON t.referral_event_id = re.id
        WHERE t.status = 'pending'
        ORDER BY t.created_at DESC
      `));
    } else if (col === "completed") {
      ({ rows } = await db.execute(sql`
        SELECT
          t.id, t.task_type, t.amount, t.notes,
          CASE WHEN t.completed THEN 'completed' ELSE 'pending' END AS status,
          t.referral_event_id, t.created_at,
          r.name  AS referrer_name,
          r.email AS referrer_email,
          re.new_patient_name
        FROM admin_tasks t
        LEFT JOIN referrers         r  ON t.referrer_id       = r.id
        LEFT JOIN referral_events   re ON t.referral_event_id = re.id
        WHERE t.completed = false
        ORDER BY t.created_at DESC
      `));
    } else {
      req.log.error("[admin-tasks] neither status nor completed column found");
      res.status(500).json({ error: "Unexpected schema — contact support" });
      return;
    }

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "[admin-tasks] GET query failed");
    res.status(500).json({ error: "Failed to load admin tasks" });
  }
});

router.patch("/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    const col = await getStatusColumn();

    if (col === "status") {
      const { rows } = await db.execute(sql`
        UPDATE admin_tasks
        SET status = 'completed'
        WHERE id = ${id} AND status = 'pending'
        RETURNING *
      `);
      if (!rows.length) { res.status(404).json({ error: "Task not found or already completed" }); return; }
      res.json(rows[0]);
    } else if (col === "completed") {
      const { rows } = await db.execute(sql`
        UPDATE admin_tasks
        SET completed = true
        WHERE id = ${id} AND completed = false
        RETURNING *
      `);
      if (!rows.length) { res.status(404).json({ error: "Task not found or already completed" }); return; }
      res.json(rows[0]);
    } else {
      res.status(500).json({ error: "Unexpected schema" });
    }
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] complete update failed");
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.patch("/:id/override", async (req, res) => {
  const { id } = req.params;
  try {
    const col = await getStatusColumn();

    // Fetch the task first (need referral_event_id)
    const { rows: found } = await db.execute(sql`
      SELECT * FROM admin_tasks WHERE id = ${id}
    `);
    const task = found[0] as { id: string; referral_event_id: string; completed?: boolean; status?: string } | undefined;

    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    // Check it's still pending
    const isPending = col === "status"
      ? task.status === "pending"
      : task.completed === false;

    if (!isPending) { res.status(404).json({ error: "Task not found or already completed" }); return; }

    // Mark complete
    if (col === "status") {
      await db.execute(sql`UPDATE admin_tasks SET status = 'completed' WHERE id = ${id}`);
    } else {
      await db.execute(sql`UPDATE admin_tasks SET completed = true WHERE id = ${id}`);
    }

    // Clear household duplicate flag
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

    res.json({ task: { ...task, status: "completed" }, event: eventRows[0] ?? null });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] override failed");
    res.status(500).json({ error: "Failed to override task" });
  }
});

export default router;
