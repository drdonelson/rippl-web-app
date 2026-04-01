import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { officesTable } from "./offices";

export const userProfilesTable = pgTable("user_profiles", {
  id:          text("id").primaryKey(), // Supabase auth user UUID
  role:        text("role").notNull(),  // super_admin | practice_admin | demo
  practice_id: text("practice_id").references(() => officesTable.id),
  full_name:   text("full_name"),
  created_at:  timestamp("created_at").notNull().defaultNow(),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
