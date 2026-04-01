/**
 * Populates the demo account (demo@joinrippl.com) with realistic fake data:
 *   - 1 demo office: "Demo Dental – Nashville TN"
 *   - 5 referrers with Tennessee names and Nashville area phones
 *   - 12 referral events across all statuses
 *   - 2 rewards issued
 *
 * Safe to run multiple times — clears and re-seeds demo data on each run.
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
const DEMO_OFFICE_NAME   = "Demo Dental – Nashville TN";

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
    const referrerIds = existingReferrers.map(r => r.id);
    const existingEvents = await db.select({ id: referralEventsTable.id })
      .from(referralEventsTable)
      .where(eq(referralEventsTable.office_id, demoOfficeId));

    if (existingEvents.length > 0) {
      const eventIds = existingEvents.map(e => e.id);
      await db.delete(rewardsTable).where(inArray(rewardsTable.referral_event_id, eventIds));
      await db.delete(referralEventsTable).where(inArray(referralEventsTable.id, eventIds));
    }
    await db.delete(referrersTable).where(inArray(referrersTable.id, referrerIds));
    console.log(`✓ Cleared existing demo data (${existingReferrers.length} referrers, ${existingEvents?.length ?? 0} events)`);
  }

  // ── 4. Insert 5 referrers ─────────────────────────────────────────────────
  const referrerRows = await db.insert(referrersTable).values([
    {
      patient_id:           "DEMO-PAT-001",
      name:                 "Wade Harrington",
      phone:                "+16158324417",
      email:                "wade.harrington@gmail.com",
      referral_code:        "WADEH122",
      total_referrals:      3,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(58),
    },
    {
      patient_id:           "DEMO-PAT-002",
      name:                 "Clara Sutton",
      phone:                "+16157419023",
      email:                "csutton.nash@gmail.com",
      referral_code:        "CLARS8K2",
      total_referrals:      3,
      total_rewards_issued: 1,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(52),
    },
    {
      patient_id:           "DEMO-PAT-003",
      name:                 "Marcus Deleon",
      phone:                "+16152568831",
      email:                "marcusdeleon@outlook.com",
      referral_code:        "MARCD7P1",
      total_referrals:      2,
      total_rewards_issued: 1,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(45),
    },
    {
      patient_id:           "DEMO-PAT-004",
      name:                 "Ashley Thorn",
      phone:                "+16154736102",
      email:                "ashley.thorn@yahoo.com",
      referral_code:        "ASHLT3R9",
      total_referrals:      2,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(38),
    },
    {
      patient_id:           "DEMO-PAT-005",
      name:                 "Devon Calloway",
      phone:                "+16159985247",
      email:                "devoncalloway@gmail.com",
      referral_code:        "DEVOC6N4",
      total_referrals:      2,
      total_rewards_issued: 0,
      onboarding_sms_sent:  true,
      office_id:            demoOfficeId,
      created_at:           daysAgo(30),
    },
  ]).returning();

  const [wade, clara, marcus, ashley, devon] = referrerRows;
  console.log(`✓ Inserted ${referrerRows.length} referrers`);

  // ── 5. Insert 12 referral events ──────────────────────────────────────────
  // Distribution: 3 Lead, 3 Booked, 4 Exam Completed, 2 Reward Sent
  const eventRows = await db.insert(referralEventsTable).values([
    // Wade Harrington (3 events)
    {
      new_patient_name:  "Tyler Brooks",
      new_patient_phone: "+16153248801",
      referrer_id:       wade.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(55),
    },
    {
      new_patient_name:  "Sarah Pruett",
      new_patient_phone: "+16154519234",
      referrer_id:       wade.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(48),
    },
    {
      new_patient_name:  "James Whitfield",
      new_patient_phone: "+16157723901",
      referrer_id:       wade.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(40),
    },
    // Clara Sutton (3 events)
    {
      new_patient_name:  "Natalie Odom",
      new_patient_phone: "+16158836712",
      referrer_id:       clara.id,
      team_source:       "assistant",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(47),
    },
    {
      new_patient_name:  "Cody Vickers",
      new_patient_phone: "+16152194455",
      referrer_id:       clara.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(35),
    },
    {
      new_patient_name:  "Renee Malone",
      new_patient_phone: "+16153670812",
      referrer_id:       clara.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Reward Sent",
      reward_type:       "amazon-gift-card",
      created_at:        daysAgo(25),
    },
    // Marcus Deleon (2 events)
    {
      new_patient_name:  "Josh Blackwell",
      new_patient_phone: "+16157012983",
      referrer_id:       marcus.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(42),
    },
    {
      new_patient_name:  "Diane Crosby",
      new_patient_phone: "+16154832176",
      referrer_id:       marcus.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Reward Sent",
      reward_type:       "in-house-credit",
      created_at:        daysAgo(18),
    },
    // Ashley Thorn (2 events)
    {
      new_patient_name:  "Kevin Haynes",
      new_patient_phone: "+16152947631",
      referrer_id:       ashley.id,
      team_source:       "assistant",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(33),
    },
    {
      new_patient_name:  "Tamara Wise",
      new_patient_phone: "+16156381024",
      referrer_id:       ashley.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Exam Completed",
      created_at:        daysAgo(20),
    },
    // Devon Calloway (2 events)
    {
      new_patient_name:  "Marcus Prince",
      new_patient_phone: "+16157195403",
      referrer_id:       devon.id,
      team_source:       "back",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Booked",
      created_at:        daysAgo(27),
    },
    {
      new_patient_name:  "Jessica Dunn",
      new_patient_phone: "+16153864290",
      referrer_id:       devon.id,
      team_source:       "front",
      office:            DEMO_OFFICE_NAME,
      office_id:         demoOfficeId,
      status:            "Lead",
      created_at:        daysAgo(12),
    },
  ]).returning();

  console.log(`✓ Inserted ${eventRows.length} referral events`);

  // ── 6. Insert 2 rewards ───────────────────────────────────────────────────
  // Find the Reward Sent events for Clara (amazon-gift-card) and Marcus (in-house-credit)
  const claraSentEvent  = eventRows.find(e => e.referrer_id === clara.id  && e.reward_type === "amazon-gift-card");
  const marcusSentEvent = eventRows.find(e => e.referrer_id === marcus.id && e.reward_type === "in-house-credit");

  if (!claraSentEvent || !marcusSentEvent) {
    throw new Error("Could not find expected Reward Sent events — seed data mismatch");
  }

  const rewardRows = await db.insert(rewardsTable).values([
    {
      referrer_id:       clara.id,
      referral_event_id: claraSentEvent.id,
      reward_type:       "amazon-gift-card",
      fulfilled:         true,
      office_id:         demoOfficeId,
      created_at:        daysAgo(24),
    },
    {
      referrer_id:       marcus.id,
      referral_event_id: marcusSentEvent.id,
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
  Referrers:         ${referrerRows.length}
  Referral Events:   ${eventRows.length} (3 Lead, 3 Booked, 4 Exam Completed, 2 Reward Sent)
  Rewards:           ${rewardRows.length} (1 Amazon gift card, 1 in-house credit)
`);

  process.exit(0);
}

seedDemo().catch(err => {
  console.error("seed-demo failed:", err);
  process.exit(1);
});
