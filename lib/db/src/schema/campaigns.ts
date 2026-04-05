import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:             text("name").notNull(),
  channel:          text("channel").notNull(),          // 'sms' | 'email'
  audience_filter:  text("audience_filter").notNull(),  // see filter keys in campaigns route
  message_template: text("message_template").notNull(),
  sent_count:       integer("sent_count").notNull().default(0),
  failed_count:     integer("failed_count").notNull().default(0),
  status:           text("status").notNull().default("draft"), // 'draft' | 'sent' | 'failed'
  created_by:       text("created_by"),
  sent_at:          timestamp("sent_at"),
  created_at:       timestamp("created_at").notNull().defaultNow(),
});

export type Campaign = typeof campaignsTable.$inferSelect;
