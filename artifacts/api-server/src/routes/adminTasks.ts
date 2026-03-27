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

export default router;
