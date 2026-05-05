import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const waitlistTable = pgTable("waitlist", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:       text("name").notNull(),
  practice:   text("practice").notNull(),
  email:      text("email").notNull().unique(),
  phone:      text("phone").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type Waitlist = typeof waitlistTable.$inferSelect;
