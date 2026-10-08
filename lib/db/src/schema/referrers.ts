import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { practicesTable } from "./practices";
import { officesTable } from "./offices";

export const referrersTable = pgTable("referrers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  practice_id: text("practice_id").references(() => practicesTable.id), // tenant
  patient_id: text("patient_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  referral_code: text("referral_code").notNull().unique(),
  total_referrals: integer("total_referrals").notNull().default(0),
  total_rewards_issued: integer("total_rewards_issued").notNull().default(0),
  onboarding_sms_sent: boolean("onboarding_sms_sent").notNull().default(false),
  office_id: text("office_id").references(() => officesTable.id), // nullable — pre-multi-location referrers have no office
  created_at: timestamp("created_at").notNull().defaultNow(),
  // Tier / reward value
  tier: text("tier").default("starter"),
  tier_unlocked_at: timestamp("tier_unlocked_at"),
  reward_value: integer("reward_value").default(35),
  sms_opt_out: boolean("sms_opt_out").default(false),
  sms_opt_out_permanent: boolean("sms_opt_out_permanent").default(false),
  opt_out_reason: text("opt_out_reason"),
  // Advisor / sales rep — which staff member "owns" this referrer
  advisor: text("advisor"),
  // Timestamps for Today's Activity view
  onboarding_sms_scheduled_at: timestamp("onboarding_sms_scheduled_at"), // when the 2-hour delay was queued
  onboarding_sms_sent_at: timestamp("onboarding_sms_sent_at"),           // when the SMS actually fired
}, table => [
  uniqueIndex("referrers_self_request_unique").on(table.practice_id, table.patient_id).where(sql`${table.practice_id} IS NOT NULL AND ${table.patient_id} LIKE 'self-v2-%'`),
  uniqueIndex("referrers_od_identity_unique").on(table.office_id, table.patient_id).where(sql`${table.office_id} IS NOT NULL AND ${table.patient_id} ~ '^[0-9]+$'`)]);

export const insertReferrerSchema = createInsertSchema(referrersTable).omit({ id: true, created_at: true });
export type InsertReferrer = z.infer<typeof insertReferrerSchema>;
export type Referrer = typeof referrersTable.$inferSelect;
