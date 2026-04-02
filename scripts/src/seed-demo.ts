/**
 * Populates the demo account (demo@joinrippl.com) with fictional placeholder data:
 *   - 1 demo office: "Smile Care Dental – Nashville TN"
 *   - 5 clearly fictional referrers with generic names and @example.com / @demodental.com emails
 *   - 12 referral events across all statuses
 *   - 2 rewards issued
 *
 * Safe to run multiple times — clears and re-seeds demo data on each run.
 * No real patient names, no real email domains, no Hallmark Dental references.
 *
 * Usage: pnpm --filter @workspace/scripts run seed-demo
 */
import { db } from "@workspace/db";
import {
  officesTable,
  referrersTable,
  referralEventsTable,
  rewardsTable,
  userProfilesTable,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

const DEMO_LOCATION_CODE = "nashville-demo";
const DEMO_OFFICE_NAME   = "Smile Care Dental – Nashville TN";

// Spreads event timestamps across the past N days for realism
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedDemo() {
  console.log("Starting demo seed...\n");

  // ── 1. Create or find the demo office ─────────────────────────────────────
  let demoOfficeId: string;
  const [existingOffice] = await db.select({ id: officesTable.id })
    .from(officesTable)
    .where(eq(officesTable.location_code, DEMO_LOCATION_CODE));

  if (existingOffice) {
    demoOfficeId = existingOffice.id;
    await db.update(officesTable)
      .set({ name: DEMO_OFFICE_NAME, active: true })
      .where(eq(officesTable.id, demoOfficeId));
    console.log(`✓ Demo office exists — id: ${demoOfficeId}`);
  } else {
    const [newOffice] = await db.insert(officesTable).values({
      name:          DEMO_OFFICE_NAME,
      customer_key:  "DEMO-NASHVILLE",
      location_code: DEMO_LOCATION_CODE,
      active:        true,
    }).returning({ id: officesTable.id });
    demoOfficeId = newOffice.id;
    console.log(`✓ Demo office created — id: ${demoOfficeId}`);
  }

  // ── 2. Update demo user profiles to point at the demo office ──────────────
  const updated = await db.update(userProfilesTable)
    .set({ practice_id: demoOfficeId })
    .where(eq(userProfilesTable.role, "demo"))
    .returning({ id: userProfilesTable.id });
  console.log(`✓ Updated ${updated.length} demo user profile(s) — practice_id → ${demoOfficeId}`);

  // ── 3. Clear any existing demo data (FK order: rewards → events → referrers) ─
  const existingReferrers = await db.select({ id: referrersTable.id })
    .from(referrersTable)
    .where(eq(referrersTable.office_id, demoOfficeId));

  if (existingReferrers.length > 0) {
    const existingEvents = await db.select({ id: referralEventsTable.id })
      .from(referralEventsTable)
      .where(eq(referralEventsTable.office_id, demoOfficeId));

    if (existingEvents.length > 0) {
      const eventIds = existingEvents.map(e => e.id);
      await db.delete(rewardsTable).where(inArray(rewardsTable.referral_event_id, eventIds));
      await db.delete(referralEventsTable).where(inArray(referralEventsTable.id, eventIds));
    }
    await db.delete(referrersTable).where(inArray(referrersTable.id, existingReferrers.map(r => r.id)));
    console.log(`✓ Cleared existing demo data (${existingReferrers.length} referrers, ${existingEvents?.length ?? 0} events)`);
  }

  // ── 4. Insert 5 fictional referrers ───────────────────────────────────────
  // Names are clearly fictional / generic. Emails use @example.com / @demodental.com.
  // Phone numbers are non-real placeholder numbers.
  const referrerRows = await db.insert(referrersTable).values([
    {
      patient_id:           "DEMO-PAT-001",
      name:                 "Sarah Johnson",
      phone:                "+15550010001",
      email:                "sarah.johnson@example.com",
      referral_code:        "SARA-0001",
      total_referrals:      3,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(58),
    },
    {
      patient_id:           "DEMO-PAT-002",
      name:                 "Mike Chen",
      phone:                "+15550020002",
      email:                "mike.chen@example.com",
      referral_code:        "MIKE-0002",
      total_referrals:      3,
      total_rewards_issued: 1,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(52),
    },
    {
      patient_id:           "DEMO-PAT-003",
      name:                 "Emily Davis",
      phone:                "+15550030003",
      email:                "emily.davis@demodental.com",
      referral_code:        "EMIL-0003",
      total_referrals:      2,
      total_rewards_issued: 1,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(45),
    },
    {
      patient_id:           "DEMO-PAT-004",
      name:                 "James Wilson",
      phone:                "+15550040004",
      email:                "james.wilson@example.com",
      referral_code:        "JAME-0004",
      total_referrals:      2,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(38),
    },
    {
      patient_id:           "DEMO-PAT-005",
      name:                 "Rachel Park",
      phone:                "+15550050005",
      email:                "rachel.park@demodental.com",
      referral_code:        "RACH-0005",
      total_referrals:      2,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(30),
    },
  ]).returning();

  const [sarah, mike, emily, james, rachel] = referrerRows;
  console.log(`✓ Inserted ${referrerRows.length} referrers`);

  // ── 5. Insert 12 referral events ──────────────────────────────────────────
  // Distribution: 3 Lead, 3 Booked, 4 Exam Completed, 2 Reward Sent
  // New patient names are clearly gender-neutral and fictional.
  const eventRows = await db.insert(referralEventsTable).values([
    // Sarah Johnson (3 events: Lead, Booked, Exam Completed)
    {
      new_patient_name:  "Chris Taylor",
      new_patient_phone: "+15550100001",
      referrer_id:       sarah.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(55),
    },
    {
      new_patient_name:  "Alex Morgan",
      new_patient_phone: "+15550100002",
      referrer_id:       sarah.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(48),
    },
    {
      new_patient_name:  "Jordan Lee",
      new_patient_phone: "+15550100003",
      referrer_id:       sarah.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(40),
    },
    // Mike Chen (3 events: Exam Completed, Booked, Reward Sent)
    {
      new_patient_name:  "Casey Brown",
      new_patient_phone: "+15550200001",
      referrer_id:       mike.id,
      team_source:       "assistant",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(47),
    },
    {
      new_patient_name:  "Sam Rivera",
      new_patient_phone: "+15550200002",
      referrer_id:       mike.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(35),
    },
    {
      new_patient_name:  "Morgan Hayes",
      new_patient_phone: "+15550200003",
      referrer_id:       mike.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Reward Sent",
      reward_type:       "amazon-gift-card",
      created_at:        daysAgo(25),
    },
    // Emily Davis (2 events: Lead, Reward Sent)
    {
      new_patient_name:  "Tyler King",
      new_patient_phone: "+15550300001",
      referrer_id:       emily.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(42),
    },
    {
      new_patient_name:  "Jamie Flores",
      new_patient_phone: "+15550300002",
      referrer_id:       emily.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Reward Sent",
      reward_type:       "in-house-credit",
      created_at:        daysAgo(18),
    },
    // James Wilson (2 events: Booked, Exam Completed)
    {
      new_patient_name:  "Quinn Adams",
      new_patient_phone: "+15550400001",
      referrer_id:       james.id,
      team_source:       "assistant",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(33),
    },
    {
      new_patient_name:  "Avery Scott",
      new_patient_phone: "+15550400002",
      referrer_id:       james.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(20),
    },
    // Rachel Park (2 events: Lead, Exam Completed)
    {
      new_patient_name:  "Dakota Reed",
      new_patient_phone: "+15550500001",
      referrer_id:       rachel.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(27),
    },
    {
      new_patient_name:  "Blake Turner",
      new_patient_phone: "+15550500002",
      referrer_id:       rachel.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(12),
    },
  ]).returning();

  console.log(`✓ Inserted ${eventRows.length} referral events`);

  // ── 6. Insert 2 rewards ───────────────────────────────────────────────────
  const mikeSentEvent  = eventRows.find(e => e.referrer_id === mike.id  && e.reward_type === "amazon-gift-card");
  const emilySentEvent = eventRows.find(e => e.referrer_id === emily.id && e.reward_type === "in-house-credit");

  if (!mikeSentEvent || !emilySentEvent) {
    throw new Error("Could not find expected Reward Sent events — seed data mismatch");
  }

  const rewardRows = await db.insert(rewardsTable).values([
    {
      referrer_id:       mike.id,
      referral_event_id: mikeSentEvent.id,
      reward_type:       "amazon-gift-card",
      fulfilled:         true,
      office_id:         demoOfficeId,
      created_at:        daysAgo(24),
    },
    {
      referrer_id:       emily.id,
      referral_event_id: emilySentEvent.id,
      reward_type:       "in-house-credit",
      fulfilled:         true,
      office_id:         demoOfficeId,
      created_at:        daysAgo(17),
    },
  ]).returning();

  console.log(`✓ Inserted ${rewardRows.length} rewards`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
Demo seed complete!
  Office:            ${DEMO_OFFICE_NAME} (${demoOfficeId})
  Referrers:         ${referrerRows.length} (fictional names, @example.com / @demodental.com emails)
  Referral Events:   ${eventRows.length} (3 Lead, 3 Booked, 4 Exam Completed, 2 Reward Sent)
  Rewards:           ${rewardRows.length} (1 Amazon gift card, 1 in-house credit)
`);

  process.exit(0);
}

seedDemo().catch(err => {
  console.error("seed-demo failed:", err);
  process.exit(1);
});
