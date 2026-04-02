import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const referralLeadsTable = pgTable("referral_leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referral_code: text("referral_code"),
  referrer_id: text("referrer_id"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  office_preference: text("office_preference"),
  contact_preference: text("contact_preference"),
  message: text("message"),
  source: text("source"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralLead = typeof referralLeadsTable.$inferSelect;
export type InsertReferralLead = typeof referralLeadsTable.$inferInsert;
