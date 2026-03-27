import { db, referrersTable, referralEventsTable, rewardsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(rewardsTable);
  await db.delete(referralEventsTable);
  await db.delete(referrersTable);

  // Insert 3 sample referrers
  const [alice, bob, carol] = await db.insert(referrersTable).values([
    {
      patient_id: "PT001",
      name: "Alice Johnson",
      phone: "555-100-0001",
      email: "alice@example.com",
      referral_code: "ALIC-XP7Q",
      total_referrals: 3,
      total_rewards_issued: 2,
    },
    {
      patient_id: "PT002",
      name: "Bob Martinez",
      phone: "555-100-0002",
      email: "bob@example.com",
      referral_code: "BOBM-3K9W",
      total_referrals: 1,
      total_rewards_issued: 0,
    },
    {
      patient_id: "PT003",
      name: "Carol Smith",
      phone: "555-100-0003",
      email: "carol@example.com",
      referral_code: "CARS-LM2T",
      total_referrals: 1,
      total_rewards_issued: 1,
    },
  ]).returning();

  console.log(`Created referrers: ${alice.name}, ${bob.name}, ${carol.name}`);

  // Insert 5 sample referral events
  const events = await db.insert(referralEventsTable).values([
    {
      new_patient_name: "David Chen",
      new_patient_phone: "555-200-0001",
      referrer_id: alice.id,
      team_source: "front",
      office: "Hallmark Dental - Main",
      status: "Reward Sent",
      reward_type: "amazon-gift-card",
    },
    {
      new_patient_name: "Emily Nguyen",
      new_patient_phone: "555-200-0002",
      referrer_id: alice.id,
      team_source: "back",
      office: "Hallmark Dental - Main",
      status: "Exam Completed",
      reward_type: null,
    },
    {
      new_patient_name: "Frank Williams",
      new_patient_phone: "555-200-0003",
      referrer_id: alice.id,
      team_source: "assistant",
      office: "Hallmark Dental - North",
      status: "Booked",
      reward_type: null,
    },
    {
      new_patient_name: "Grace Lee",
      new_patient_phone: "555-200-0004",
      referrer_id: bob.id,
      team_source: "front",
      office: "Hallmark Dental - Main",
      status: "Lead",
      reward_type: null,
    },
    {
      new_patient_name: "Henry Park",
      new_patient_phone: "555-200-0005",
      referrer_id: carol.id,
      team_source: "back",
      office: "Hallmark Dental - North",
      status: "Reward Sent",
      reward_type: "in-house-credit",
    },
  ]).returning();

  console.log(`Created ${events.length} referral events`);

  // Insert 2 rewards
  await db.insert(rewardsTable).values([
    {
      referrer_id: alice.id,
      referral_event_id: events[0].id,
      reward_type: "amazon-gift-card",
      fulfilled: true,
    },
    {
      referrer_id: carol.id,
      referral_event_id: events[4].id,
      reward_type: "in-house-credit",
      fulfilled: false,
    },
  ]);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
