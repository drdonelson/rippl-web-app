import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { referrersTable } from "./referrers";

export const referralEventsTable = pgTable("referral_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  new_patient_name: text("new_patient_name").notNull(),
  new_patient_phone: text("new_patient_phone").notNull(),
  referrer_id: text("referrer_id").notNull().references(() => referrersTable.id),
  team_source: text("team_source").notNull(), // front | back | assistant
  office: text("office").notNull(),
  status: text("status").notNull().default("Lead"), // Lead | Booked | Exam Completed | Reward Sent
  reward_type: text("reward_type"), // in-house-credit | amazon-gift-card | charity-donation
  external_proc_num: text("external_proc_num"), // Open Dental ProcNum for deduplication
  household_id: text("household_id"), // hash(lastName + streetAddress) for duplicate detection
  household_duplicate: boolean("household_duplicate").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertReferralEventSchema = createInsertSchema(referralEventsTable).omit({ id: true, created_at: true });
export type InsertReferralEvent = z.infer<typeof insertReferralEventSchema>;
export type ReferralEvent = typeof referralEventsTable.$inferSelect;
