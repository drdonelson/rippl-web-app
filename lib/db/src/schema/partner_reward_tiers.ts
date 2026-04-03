import { pgTable, text, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { localPartnersTable } from "./local_partners";

export const partnerRewardTiersTable = pgTable("partner_reward_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  partner_id: uuid("partner_id").references(() => localPartnersTable.id, { onDelete: "cascade" }),
  patient_tier: text("patient_tier").notNull(),
  reward_value: integer("reward_value").notNull(),
  platform_fee: integer("platform_fee").notNull(),
  active: boolean("active").default(true),
});

export type PartnerRewardTier = typeof partnerRewardTiersTable.$inferSelect;
export type InsertPartnerRewardTier = typeof partnerRewardTiersTable.$inferInsert;
