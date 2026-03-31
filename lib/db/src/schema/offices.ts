import { pgTable, text, boolean } from "drizzle-orm/pg-core";

export const officesTable = pgTable("offices", {
  id:                       text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:                     text("name").notNull(),
  open_dental_customer_key: text("open_dental_customer_key").notNull(),
  location:                 text("location").notNull(), // brentwood | lewisburg | greenbrier
  active:                   boolean("active").notNull().default(true),
});

export type Office = typeof officesTable.$inferSelect;
