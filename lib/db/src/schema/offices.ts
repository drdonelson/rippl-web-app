import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const officesTable = pgTable("offices", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text("name").notNull(),
  customer_key:  text("customer_key").notNull(),
  location_code: text("location_code").notNull(), // brentwood | lewisburg | greenbrier
  od_url:        text("od_url"),                  // per-office OD server URL; falls back to OPEN_DENTAL_URL env var
  active:        boolean("active").notNull().default(true),
  created_at:    timestamp("created_at").notNull().defaultNow(),
});

export type Office = typeof officesTable.$inferSelect;
