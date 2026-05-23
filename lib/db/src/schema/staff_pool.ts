import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { practicesTable } from "./practices";
import { rewardsTable } from "./rewards";

export const staffPoolConfigsTable = pgTable("staff_pool_configs", {
  id:                  text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  practice_id:         text("practice_id").notNull().unique().references(() => practicesTable.id),
  enabled:             boolean("enabled").notNull().default(false),
  amount_per_referral: integer("amount_per_referral").notNull().default(10),
  created_at:          timestamp("created_at").notNull().defaultNow(),
  updated_at:          timestamp("updated_at").notNull().defaultNow(),
});

export const staffPoolEntriesTable = pgTable("staff_pool_entries", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  practice_id: text("practice_id").notNull().references(() => practicesTable.id),
  reward_id:   text("reward_id").references(() => rewardsTable.id),
  amount:      integer("amount").notNull(),
  created_at:  timestamp("created_at").notNull().defaultNow(),
});

export type StaffPoolConfig = typeof staffPoolConfigsTable.$inferSelect;
export type StaffPoolEntry  = typeof staffPoolEntriesTable.$inferSelect;
