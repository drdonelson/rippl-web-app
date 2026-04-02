// All hardcoded demo data. No real patient or practice information.
// ── EXTENSION POLICY ─────────────────────────────────────────────────────────
// Never replace existing records. Only add new fields to existing objects or
// add new exports. IDs, names, codes, and event structure are frozen.

export const DEMO_OFFICE = {
  id: "demo",
  name: "Demo Practice",
  location_code: "demo",
  active: true,
};

export const DEMO_STATS = {
  total_referrals: 24,
  exams_completed: 18,
  rewards_issued: 12,
  active_referrers: 47,
  top_referrers: [
    { id: "demo-r3", name: "Robert Kim",        total_referrals: 4, total_rewards_issued: 3 },
    { id: "demo-r1", name: "Mike Thompson",     total_referrals: 3, total_rewards_issued: 2 },
    { id: "demo-r2", name: "Lisa Chen",         total_referrals: 2, total_rewards_issued: 2 },
    { id: "demo-r5", name: "David Wilson",      total_referrals: 2, total_rewards_issued: 1 },
    { id: "demo-r4", name: "Jennifer Martinez", total_referrals: 1, total_rewards_issued: 0 },
  ],
  recent_events: [
    {
      id: "demo-e1",
      new_patient_name: "Sarah Johnson",
      new_patient_phone: "(615) 555-0101",
      referrer_id: "demo-r1",
      referrer_name: "Mike Thompson",
      team_source: "front",
      office: "Demo Practice",
      office_id: "demo",
      status: "Exam Completed",
      reward_type: null,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-e2",
      new_patient_name: "James Wilson",
      new_patient_phone: "(615) 555-0102",
      referrer_id: "demo-r2",
      referrer_name: "Lisa Chen",
      team_source: "back",
      office: "Demo Practice",
      office_id: "demo",
      status: "Reward Sent",
      reward_type: "amazon-gift-card",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-e3",
      new_patient_name: "Emily Davis",
      new_patient_phone: "(615) 555-0103",
      referrer_id: "demo-r3",
      referrer_name: "Robert Kim",
      team_source: "assistant",
      office: "Demo Practice",
      office_id: "demo",
      status: "Exam Completed",
      reward_type: null,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-e4",
      new_patient_name: "Michael Brown",
      new_patient_phone: "(615) 555-0104",
      referrer_id: "demo-r4",
      referrer_name: "Jennifer Martinez",
      team_source: "front",
      office: "Demo Practice",
      office_id: "demo",
      status: "Booked",
      reward_type: null,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-e5",
      new_patient_name: "Ashley Taylor",
      new_patient_phone: "(615) 555-0105",
      referrer_id: "demo-r5",
      referrer_name: "David Wilson",
      team_source: "back",
      office: "Demo Practice",
      office_id: "demo",
      status: "Reward Sent",
      reward_type: "in-house-credit",
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_EVENTS = [
  {
    id: "demo-e1",
    new_patient_name: "Sarah Johnson",
    new_patient_phone: "(615) 555-0101",
    referrer_id: "demo-r1",
    referrer_name: "Mike Thompson",
    team_source: "front",
    office: "Demo Practice",
    status: "Exam Completed",
    reward_type: null,
    household_duplicate: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e2",
    new_patient_name: "James Wilson",
    new_patient_phone: "(615) 555-0102",
    referrer_id: "demo-r2",
    referrer_name: "Lisa Chen",
    team_source: "back",
    office: "Demo Practice",
    status: "Reward Sent",
    reward_type: "amazon-gift-card",
    household_duplicate: false,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e3",
    new_patient_name: "Emily Davis",
    new_patient_phone: "(615) 555-0103",
    referrer_id: "demo-r3",
    referrer_name: "Robert Kim",
    team_source: "assistant",
    office: "Demo Practice",
    status: "Exam Completed",
    reward_type: null,
    household_duplicate: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e4",
    new_patient_name: "Michael Brown",
    new_patient_phone: "(615) 555-0104",
    referrer_id: "demo-r4",
    referrer_name: "Jennifer Martinez",
    team_source: "front",
    office: "Demo Practice",
    status: "Booked",
    reward_type: null,
    household_duplicate: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e5",
    new_patient_name: "Ashley Taylor",
    new_patient_phone: "(615) 555-0105",
    referrer_id: "demo-r5",
    referrer_name: "David Wilson",
    team_source: "back",
    office: "Demo Practice",
    status: "Reward Sent",
    reward_type: "in-house-credit",
    household_duplicate: false,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e6",
    new_patient_name: "Christopher Anderson",
    new_patient_phone: "(615) 555-0106",
    referrer_id: "demo-r3",
    referrer_name: "Robert Kim",
    team_source: "front",
    office: "Demo Practice",
    status: "Exam Completed",
    reward_type: null,
    household_duplicate: false,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e7",
    new_patient_name: "Jessica Thomas",
    new_patient_phone: "(615) 555-0107",
    referrer_id: "demo-r1",
    referrer_name: "Mike Thompson",
    team_source: "assistant",
    office: "Demo Practice",
    status: "Lead",
    reward_type: null,
    household_duplicate: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-e8",
    new_patient_name: "Daniel Jackson",
    new_patient_phone: "(615) 555-0108",
    referrer_id: "demo-r2",
    referrer_name: "Lisa Chen",
    team_source: "back",
    office: "Demo Practice",
    status: "Reward Sent",
    reward_type: "charity-donation",
    household_duplicate: false,
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ── DEMO_REFERRERS ────────────────────────────────────────────────────────────
// Existing fields are UNCHANGED. Added: last_link_sent_at (new in this session).
// referral_url stays "#" — patients.tsx computes the real URL dynamically.

export const DEMO_REFERRERS = [
  {
    id: "demo-r1",
    name: "Mike Thompson",
    patient_id: "MIKE-1001",
    email: "mike.thompson@example.com",
    phone: "(615) 555-0201",
    referral_code: "MIKE1001",
    referral_url: "#",
    office_id: "demo",
    total_referrals: 3,
    total_rewards_issued: 2,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    // NEW: link was sent 12 days ago
    last_link_sent_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-r2",
    name: "Lisa Chen",
    patient_id: "LISA-1002",
    email: "lisa.chen@example.com",
    phone: "(615) 555-0202",
    referral_code: "LISA1002",
    referral_url: "#",
    office_id: "demo",
    total_referrals: 2,
    total_rewards_issued: 2,
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    // NEW: link was sent 3 days ago
    last_link_sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-r3",
    name: "Robert Kim",
    patient_id: "ROBE-1003",
    email: "robert.kim@example.com",
    phone: "(615) 555-0203",
    referral_code: "ROBE1003",
    referral_url: "#",
    office_id: "demo",
    total_referrals: 4,
    total_rewards_issued: 3,
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    // NEW: link was sent 28 days ago (near cooldown boundary)
    last_link_sent_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-r4",
    name: "Jennifer Martinez",
    patient_id: "JENN-1004",
    email: "jennifer.m@example.com",
    phone: "(615) 555-0204",
    referral_code: "JENN1004",
    referral_url: "#",
    office_id: "demo",
    total_referrals: 1,
    total_rewards_issued: 0,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    // NEW: never sent (null)
    last_link_sent_at: null,
  },
  {
    id: "demo-r5",
    name: "David Wilson",
    patient_id: "DAVI-1005",
    email: "david.wilson@example.com",
    phone: "(615) 555-0205",
    referral_code: "DAVI1005",
    referral_url: "#",
    office_id: "demo",
    total_referrals: 2,
    total_rewards_issued: 1,
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    // NEW: never sent (null)
    last_link_sent_at: null,
  },
];

// ── DEMO_CODE_TO_REFERRER ─────────────────────────────────────────────────────
// Lookup map used by the /refer page backend intercept so demo referral codes
// resolve without hitting the real database. Codes map to the same referrers
// already defined above — no new referrers created.

export const DEMO_CODE_TO_REFERRER: Record<string, {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
}> = {
  MIKE1001: { referrer_id: "demo-r1", referrer_name: "Mike", referral_code: "MIKE1001", office_name: "Brentwood" },
  LISA1002: { referrer_id: "demo-r2", referrer_name: "Lisa", referral_code: "LISA1002", office_name: "Lewisburg" },
  ROBE1003: { referrer_id: "demo-r3", referrer_name: "Robert", referral_code: "ROBE1003", office_name: "Greenbrier" },
  JENN1004: { referrer_id: "demo-r4", referrer_name: "Jennifer", referral_code: "JENN1004", office_name: "Brentwood" },
  DAVI1005: { referrer_id: "demo-r5", referrer_name: "David", referral_code: "DAVI1005", office_name: "Lewisburg" },
};

// Flat set of codes for quick membership tests
export const DEMO_CODES = new Set(Object.keys(DEMO_CODE_TO_REFERRER));

// Flat set of demo referrer IDs for quick membership tests
export const DEMO_REFERRER_IDS = new Set(DEMO_REFERRERS.map(r => r.id));

// ── DEMO_LAST_DELIVERIES ──────────────────────────────────────────────────────
// Simulated delivery records for the GET /:id/last-delivery endpoint in demo
// mode. Mirrors the shape of referral_link_deliveries table rows.
// Only referrers who have last_link_sent_at get an entry.

export const DEMO_LAST_DELIVERIES: Record<string, {
  id: number;
  referrer_id: string;
  channel: string;
  recipient: string;
  status: string;
  reason: string | null;
  provider_message_id: string | null;
  error: string | null;
  sent_at: string;
}> = {
  "demo-r1": {
    id: 1001,
    referrer_id: "demo-r1",
    channel: "sms",
    recipient: "(615) 555-0201",
    status: "sent",
    reason: null,
    provider_message_id: "SM-DEMO-001",
    error: null,
    sent_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  "demo-r2": {
    id: 1002,
    referrer_id: "demo-r2",
    channel: "email",
    recipient: "lisa.chen@example.com",
    status: "sent",
    reason: null,
    provider_message_id: "SG-DEMO-002",
    error: null,
    sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  "demo-r3": {
    id: 1003,
    referrer_id: "demo-r3",
    channel: "sms",
    recipient: "(615) 555-0203",
    status: "sent",
    reason: null,
    provider_message_id: "SM-DEMO-003",
    error: null,
    sent_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// ── DEMO_LEADS ────────────────────────────────────────────────────────────────
// Sample leads submitted via the /refer page. All referral_codes link back to
// existing DEMO_REFERRERS — no new referrers created.

export const DEMO_LEADS = [
  {
    id: "demo-lead-1",
    first_name: "Jessica",
    last_name: "Thomas",
    phone: "(615) 555-0107",
    email: null,
    office_preference: "Brentwood",
    referral_code: "MIKE1001",
    referrer_id: "demo-r1",
    contact_preference: "phone",
    message: null,
    source: "qr_landing_page",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-lead-2",
    first_name: "Chloe",
    last_name: "Nguyen",
    phone: "(615) 555-0301",
    email: "chloe.nguyen@example.com",
    office_preference: "Lewisburg",
    referral_code: "LISA1002",
    referrer_id: "demo-r2",
    contact_preference: "email",
    message: "Looking for a family dentist for my two kids as well.",
    source: "qr_landing_page",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-lead-3",
    first_name: "Brandon",
    last_name: "Okafor",
    phone: "(615) 555-0302",
    email: null,
    office_preference: "Greenbrier",
    referral_code: "ROBE1003",
    referrer_id: "demo-r3",
    contact_preference: "text",
    message: null,
    source: "qr_landing_page",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
