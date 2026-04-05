import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { referrersTable } from "./referrers";
import { referralEventsTable } from "./referral_events";

export const adminTasksTable = pgTable("admin_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  task_type: text("task_type").notNull(),
  referrer_id: text("referrer_id").references(() => referrersTable.id),
  referral_event_id: text("referral_event_id").references(() => referralEventsTable.id),
  amount: integer("amount"),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  status: text("status").default("pending"),
  completed_by: text("completed_by"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAdminTaskSchema = createInsertSchema(adminTasksTable).omit({ id: true, created_at: true });
export type InsertAdminTask = z.infer<typeof insertAdminTaskSchema>;
export type AdminTask = typeof adminTasksTable.$inferSelect;
