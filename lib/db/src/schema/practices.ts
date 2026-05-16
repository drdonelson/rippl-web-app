import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const practicesTable = pgTable("practices", {
  id:                      text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:                    text("name").notNull(),
  slug:                    text("slug").notNull(),
  vertical:                text("vertical").default("dental"),        // dental | automotive | salon | other
  status:                  text("status").default("active"),          // active | inactive | trial
  plan:                    text("plan").default("per_referral"),      // per_referral | monthly
  monthly_fee:             integer("monthly_fee").default(0),         // cents
  per_referral_fee:        integer("per_referral_fee").default(20),   // dollars
  reward_value:            integer("reward_value").default(35),       // default gift card dollar amount
  twilio_phone_number:     text("twilio_phone_number"),
  sendgrid_from_email:     text("sendgrid_from_email"),
  sendgrid_from_name:      text("sendgrid_from_name"),
  tango_email_template_id: text("tango_email_template_id"),
  logo_url:                text("logo_url"),
  primary_color:           text("primary_color").default("E0622A"),   // hex without #

  // Multi-vertical integration config (jsonb keyed by vertical)
  integration_config:        jsonb("integration_config").$type<Record<string, string>>().default({}),
  notification_template:     jsonb("notification_template").$type<Record<string, string>>().default({}),

  // White-label branding (overrides Rippl defaults on claim page)
  white_label_name:          text("white_label_name"),
  white_label_logo_url:      text("white_label_logo_url"),
  white_label_primary_color: text("white_label_primary_color").default("0d9488"), // hex without #
  show_powered_by_rippl:     boolean("show_powered_by_rippl").default(true),

  // In-house credit reward config
  in_house_credit_label: text("in_house_credit_label").default("$100 Dental Account Credit"),
  in_house_credit_value: integer("in_house_credit_value").default(100),

  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type Practice = typeof practicesTable.$inferSelect;
export type InsertPractice = typeof practicesTable.$inferInsert;
