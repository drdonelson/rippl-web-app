import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminTasksTable, referrersTable, referralEventsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const tasks = await db
      .select({
        id: adminTasksTable.id,
        task_type: adminTasksTable.task_type,
        amount: adminTasksTable.amount,
        notes: adminTasksTable.notes,
        completed: adminTasksTable.completed,
        referral_event_id: adminTasksTable.referral_event_id,
        created_at: adminTasksTable.created_at,
        referrer_name: referrersTable.name,
        referrer_email: referrersTable.email,
        new_patient_name: referralEventsTable.new_patient_name,
      })
      .from(adminTasksTable)
      .leftJoin(referrersTable, eq(adminTasksTable.referrer_id, referrersTable.id))
      .leftJoin(referralEventsTable, eq(adminTasksTable.referral_event_id, referralEventsTable.id))
      .where(eq(adminTasksTable.completed, false))
      .orderBy(adminTasksTable.created_at);

    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "[admin-tasks] DB query failed");
    res.status(500).json({ error: "Failed to load admin tasks" });
  }
});

router.patch("/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    const [task] = await db
      .update(adminTasksTable)
      .set({ completed: true })
      .where(and(eq(adminTasksTable.id, id), eq(adminTasksTable.completed, false)))
      .returning();

    if (!task) {
      res.status(404).json({ error: "Task not found or already completed" });
      return;
    }

    res.json(task);
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] complete update failed");
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.patch("/:id/override", async (req, res) => {
  const { id } = req.params;
  try {
    const [task] = await db
      .select()
      .from(adminTasksTable)
      .where(and(eq(adminTasksTable.id, id), eq(adminTasksTable.completed, false)));

    if (!task) {
      res.status(404).json({ error: "Task not found or already completed" });
      return;
    }

    await db
      .update(adminTasksTable)
      .set({ completed: true })
      .where(eq(adminTasksTable.id, id));

    const [updatedEvent] = await db
      .update(referralEventsTable)
      .set({ household_duplicate: false })
      .where(eq(referralEventsTable.id, task.referral_event_id))
      .returning();

    req.log.info(
      { taskId: id, referralEventId: task.referral_event_id },
      "Admin overrode household duplicate — duplicate flag cleared"
    );

    res.json({ task: { ...task, completed: true }, event: updatedEvent });
  } catch (err) {
    req.log.error({ err, id }, "[admin-tasks] override failed");
    res.status(500).json({ error: "Failed to override task" });
  }
});

export default router;
