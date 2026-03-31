import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";

export const referrersTable = pgTable("referrers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
});

export const insertReferrerSchema = createInsertSchema(referrersTable).omit({ id: true, created_at: true });
export type InsertReferrer = z.infer<typeof insertReferrerSchema>;
export type Referrer = typeof referrersTable.$inferSelect;
