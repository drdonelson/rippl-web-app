import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminTasksTable, referrersTable, referralEventsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/admin-tasks — list all incomplete admin tasks (with referrer info)
router.get("/", async (req, res) => {
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
});

// PATCH /api/admin-tasks/:id/complete — mark a task as done
router.patch("/:id/complete", async (req, res) => {
  const { id } = req.params;

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
});

// PATCH /api/admin-tasks/:id/override — mark task done and clear household_duplicate flag on event
router.patch("/:id/override", async (req, res) => {
  const { id } = req.params;

  // Load the task first to get the referral_event_id
  const [task] = await db
    .select()
    .from(adminTasksTable)
    .where(and(eq(adminTasksTable.id, id), eq(adminTasksTable.completed, false)));

  if (!task) {
    res.status(404).json({ error: "Task not found or already completed" });
    return;
  }

  // Mark admin task as done
  await db
    .update(adminTasksTable)
    .set({ completed: true })
    .where(eq(adminTasksTable.id, id));

  // Clear the household_duplicate flag so the event re-enters the normal reward flow
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
});

export default router;
