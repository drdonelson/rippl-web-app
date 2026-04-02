import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { referrersTable } from "./referrers";

export const referralLinkDeliveriesTable = pgTable("referral_link_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrer_id: text("referrer_id").notNull().references(() => referrersTable.id),
  referral_code: text("referral_code").notNull(),
  channel: text("channel").notNull(),        // "sms" | "email"
  recipient: text("recipient").notNull(),    // phone or email address
  message_body: text("message_body"),
  status: text("status").notNull().default("pending"), // "pending" | "sent" | "failed"
  provider_message_id: text("provider_message_id"),
  error_message: text("error_message"),
  sent_at: timestamp("sent_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralLinkDelivery = typeof referralLinkDeliveriesTable.$inferSelect;
export type InsertReferralLinkDelivery = typeof referralLinkDeliveriesTable.$inferInsert;
