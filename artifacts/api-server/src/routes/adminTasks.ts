import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { rows } = await db.execute(sql`
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
    `);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "[admin-tasks] GET query failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load admin tasks" });
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

export default router;
