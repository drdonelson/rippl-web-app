import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const launchEmailsTable = pgTable("launch_emails", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  patient_id:    text("patient_id").notNull(),
  email:         text("email").notNull(),
  first_name:    text("first_name").notNull(),
  referral_code: text("referral_code").notNull(),
  status:        text("status").notNull().default("pending"), // pending | sent | failed
  error:         text("error"),
  sent_at:       timestamp("sent_at"),
  opened:        boolean("opened").notNull().default(false),
  created_at:    timestamp("created_at").notNull().defaultNow(),
});

export const insertLaunchEmailSchema = createInsertSchema(launchEmailsTable).omit({ id: true, created_at: true });
export type InsertLaunchEmail = z.infer<typeof insertLaunchEmailSchema>;
export type LaunchEmail = typeof launchEmailsTable.$inferSelect;
