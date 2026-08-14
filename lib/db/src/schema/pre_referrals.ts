import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const preReferralsTable = pgTable("pre_referrals", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referral_code: text("referral_code").notNull(),
  practice_id:   text("practice_id").notNull(),
  first_name:    text("first_name").notNull(),
  last_name:     text("last_name").notNull(),
  phone:         text("phone").notNull(),
  created_at:    timestamp("created_at").notNull().defaultNow(),
  matched:       text("matched").default("no"),
});

export type PreReferral = typeof preReferralsTable.$inferSelect;
export type InsertPreReferral = typeof preReferralsTable.$inferInsert;
