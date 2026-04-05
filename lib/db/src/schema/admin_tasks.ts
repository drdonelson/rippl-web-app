import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { referrersTable } from "./referrers";
import { referralEventsTable } from "./referral_events";

export const adminTasksTable = pgTable("admin_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  task_type: text("task_type").notNull(), // charity-donation | manual-gift-card | apply-credit | household-duplicate-review
  referrer_id: text("referrer_id").notNull().references(() => referrersTable.id),
  referral_event_id: text("referral_event_id").notNull().references(() => referralEventsTable.id),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // 'pending' | 'completed'
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminTaskSchema = createInsertSchema(adminTasksTable).omit({ id: true, created_at: true });
export type InsertAdminTask = z.infer<typeof insertAdminTaskSchema>;
export type AdminTask = typeof adminTasksTable.$inferSelect;
