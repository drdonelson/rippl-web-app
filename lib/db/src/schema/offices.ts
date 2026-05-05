import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const officesTable = pgTable("offices", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text("name").notNull(),
  customer_key:  text("customer_key").notNull(),
  location_code: text("location_code").notNull(), // brentwood | lewisburg | greenbrier
  od_url:        text("od_url"),                  // per-office OD server URL; falls back to OPEN_DENTAL_URL env var
  logo_url:      text("logo_url"),               // public URL for practice logo (used on claim page + Tango customization)
  active:                boolean("active").notNull().default(true),
  agreement_accepted_at: timestamp("agreement_accepted_at"),
  created_at:            timestamp("created_at").notNull().defaultNow(),
});

export type Office = typeof officesTable.$inferSelect;
