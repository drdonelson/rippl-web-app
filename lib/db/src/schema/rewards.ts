import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { referrersTable } from "./referrers";
import { referralEventsTable } from "./referral_events";
import { officesTable } from "./offices";

export const rewardsTable = pgTable("rewards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrer_id: text("referrer_id").notNull().references(() => referrersTable.id),
  referral_event_id: text("referral_event_id").notNull().references(() => referralEventsTable.id),
  reward_type: text("reward_type").notNull(), // in-house-credit | amazon-gift-card | charity-donation
  fulfilled: boolean("fulfilled").notNull().default(false),
  tango_order_id: text("tango_order_id"),
  office_id: text("office_id").references(() => officesTable.id), // nullable — pre-multi-location rewards have no office
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertRewardSchema = createInsertSchema(rewardsTable).omit({ id: true, created_at: true });
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewardsTable.$inferSelect;
