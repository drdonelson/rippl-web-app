import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { referralEventsTable } from "./referral_events";
import { referrersTable } from "./referrers";
import { localPartnersTable } from "./local_partners";

export const rewardClaimsTable = pgTable("reward_claims", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // referral_event_id and referrer_id are text to match their existing PK types
  referral_event_id: text("referral_event_id").references(() => referralEventsTable.id),
  referrer_id: text("referrer_id").references(() => referrersTable.id),
  reward_type: text("reward_type").notNull(),
  reward_value: integer("reward_value").notNull(),
  platform_fee: integer("platform_fee").default(0),
  partner_id: uuid("partner_id").references(() => localPartnersTable.id),
  claim_token: text("claim_token").unique().notNull(),
  status: text("status").default("pending"),
  claimed_at: timestamp("claimed_at"),
  expires_at: timestamp("expires_at").default(sql`now() + interval '30 days'`),
  tango_order_id: text("tango_order_id"),
  pin_code: text("pin_code"),
  created_at: timestamp("created_at").defaultNow(),
});

export type RewardClaim = typeof rewardClaimsTable.$inferSelect;
export type InsertRewardClaim = typeof rewardClaimsTable.$inferInsert;
