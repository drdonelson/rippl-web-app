import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const localPartnersTable = pgTable("local_partners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  business_name: text("business_name").notNull(),
  category: text("category").notNull(),
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  contact_phone: text("contact_phone"),
  address: text("address"),
  logo_url: text("logo_url"),
  active: boolean("active").default(true),
  redemption_type: text("redemption_type").default("pin"),
  created_at: timestamp("created_at").defaultNow(),
});

export type LocalPartner = typeof localPartnersTable.$inferSelect;
export type InsertLocalPartner = typeof localPartnersTable.$inferInsert;
