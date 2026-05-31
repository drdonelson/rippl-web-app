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
  total_referrals: 190,
  exams_completed: 142,
  rewards_issued: 118,
  active_referrers: 100,
  top_referrers: [
    { id: "demo-r98", name: "Crystal Payne",    total_referrals: 14, total_rewards_issued: 12 },
    { id: "demo-r99", name: "Michelle Webb",    total_referrals: 12, total_rewards_issued: 10 },
    { id: "demo-r97", name: "Randy Gonzales",   total_referrals: 9,  total_rewards_issued: 8  },
    { id: "demo-r3",  name: "Robert Kim",       total_referrals: 7,  total_rewards_issued: 6  },
    { id: "demo-r92", name: "Billy West",       total_referrals: 7,  total_rewards_issued: 6  },
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
      status: "Reward Sent",
      reward_type: "amazon-gift-card",
      reward_value: 75,
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
    status: "Reward Sent",
    reward_type: "amazon-gift-card",
    reward_value: 75,
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
    status: "Reward Sent",
    reward_type: "amazon-gift-card",
    reward_value: 75,
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
    tier: "super_rippler",
    total_referrals: 7,
    total_rewards_issued: 6,
    reward_value: 75,
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

// ── DEMO_EXTRA_REFERRERS ──────────────────────────────────────────────────────
// 95 additional patients bringing the total to 100. Grouped by tier.
// IDs demo-r6 through demo-r100. Existing demo-r1..r5 are unchanged above.

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

export const DEMO_EXTRA_REFERRERS = [
  // ── 0 referrals — not yet active (40 patients) ──────────────────────────────
  { id:"demo-r6",  name:"Patricia Moore",     patient_id:"PATR-1006", email:"patricia.moore@gmail.com",     phone:"(615) 555-0300", referral_code:"PATR1006", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(170), last_link_sent_at:null },
  { id:"demo-r7",  name:"James Taylor",       patient_id:"JAME-1007", email:"james.taylor@outlook.com",     phone:"(615) 555-0301", referral_code:"JAME1007", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(165), last_link_sent_at:null },
  { id:"demo-r8",  name:"Sandra Lee",         patient_id:"SAND-1008", email:"sandra.lee@yahoo.com",         phone:"(615) 555-0302", referral_code:"SAND1008", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(162), last_link_sent_at:null },
  { id:"demo-r9",  name:"Kevin Harris",       patient_id:"KEVI-1009", email:null,                           phone:"(615) 555-0303", referral_code:"KEVI1009", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(158), last_link_sent_at:null },
  { id:"demo-r10", name:"Michelle Clark",     patient_id:"MICH-1010", email:"michelle.clark@gmail.com",     phone:"(615) 555-0304", referral_code:"MICH1010", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(155), last_link_sent_at:null },
  { id:"demo-r11", name:"Daniel Robinson",    patient_id:"DANI-1011", email:"d.robinson@hotmail.com",       phone:"(615) 555-0305", referral_code:"DANI1011", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(150), last_link_sent_at:null },
  { id:"demo-r12", name:"Debra Walker",       patient_id:"DEBR-1012", email:"debra.walker@gmail.com",       phone:"(615) 555-0306", referral_code:"DEBR1012", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(148), last_link_sent_at:null },
  { id:"demo-r13", name:"George Hall",        patient_id:"GEOR-1013", email:null,                           phone:"(615) 555-0307", referral_code:"GEOR1013", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(145), last_link_sent_at:null },
  { id:"demo-r14", name:"Cynthia Allen",      patient_id:"CYNB-1014", email:"cynthia.allen@gmail.com",      phone:"(615) 555-0308", referral_code:"CYNB1014", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(142), last_link_sent_at:null },
  { id:"demo-r15", name:"Steven Young",       patient_id:"STEV-1015", email:"steven.young@yahoo.com",       phone:"(615) 555-0309", referral_code:"STEV1015", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(140), last_link_sent_at:null },
  { id:"demo-r16", name:"Rebecca King",       patient_id:"REBC-1016", email:"rebecca.king@gmail.com",       phone:"(629) 555-0310", referral_code:"REBC1016", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(138), last_link_sent_at:null },
  { id:"demo-r17", name:"Brian Wright",       patient_id:"BRIA-1017", email:null,                           phone:"(629) 555-0311", referral_code:"BRIA1017", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(135), last_link_sent_at:null },
  { id:"demo-r18", name:"Catherine Scott",    patient_id:"CATH-1018", email:"catherine.scott@outlook.com",  phone:"(629) 555-0312", referral_code:"CATH1018", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(132), last_link_sent_at:null },
  { id:"demo-r19", name:"Timothy Torres",     patient_id:"TIMO-1019", email:"tim.torres@gmail.com",         phone:"(629) 555-0313", referral_code:"TIMO1019", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(130), last_link_sent_at:null },
  { id:"demo-r20", name:"Angela Nguyen",      patient_id:"ANGE-1020", email:"angela.nguyen@gmail.com",      phone:"(629) 555-0314", referral_code:"ANGE1020", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(128), last_link_sent_at:null },
  { id:"demo-r21", name:"Joshua Hill",        patient_id:"JOSH-1021", email:null,                           phone:"(615) 555-0315", referral_code:"JOSH1021", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(125), last_link_sent_at:null },
  { id:"demo-r22", name:"Heather Flores",     patient_id:"HEAT-1022", email:"heather.flores@yahoo.com",     phone:"(615) 555-0316", referral_code:"HEAT1022", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(122), last_link_sent_at:null },
  { id:"demo-r23", name:"Anthony Green",      patient_id:"ANTH-1023", email:"a.green@hotmail.com",          phone:"(615) 555-0317", referral_code:"ANTH1023", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(120), last_link_sent_at:null },
  { id:"demo-r24", name:"Stephanie Adams",    patient_id:"STEP-1024", email:"stephanie.adams@gmail.com",    phone:"(615) 555-0318", referral_code:"STEP1024", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(118), last_link_sent_at:null },
  { id:"demo-r25", name:"Charles Nelson",     patient_id:"CHAR-1025", email:null,                           phone:"(615) 555-0319", referral_code:"CHAR1025", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(115), last_link_sent_at:null },
  { id:"demo-r26", name:"Donna Baker",        patient_id:"DONN-1026", email:"donna.baker@gmail.com",        phone:"(615) 555-0320", referral_code:"DONN1026", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(112), last_link_sent_at:null },
  { id:"demo-r27", name:"Melissa Rivera",     patient_id:"MELI-1027", email:"melissa.rivera@outlook.com",   phone:"(615) 555-0321", referral_code:"MELI1027", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(110), last_link_sent_at:null },
  { id:"demo-r28", name:"Raymond Campbell",   patient_id:"RAYC-1028", email:null,                           phone:"(629) 555-0322", referral_code:"RAYC1028", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(108), last_link_sent_at:null },
  { id:"demo-r29", name:"Virginia Mitchell",  patient_id:"VIRG-1029", email:"virginia.m@gmail.com",         phone:"(629) 555-0323", referral_code:"VIRG1029", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(105), last_link_sent_at:null },
  { id:"demo-r30", name:"Gloria Roberts",     patient_id:"GLOR-1030", email:"gloria.roberts@yahoo.com",     phone:"(629) 555-0324", referral_code:"GLOR1030", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(102), last_link_sent_at:null },
  { id:"demo-r31", name:"Craig Anderson",     patient_id:"CRAI-1031", email:null,                           phone:"(629) 555-0325", referral_code:"CRAI1031", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(100), last_link_sent_at:null },
  { id:"demo-r32", name:"Brenda Cooper",      patient_id:"BREN-1032", email:"brenda.cooper@gmail.com",      phone:"(629) 555-0326", referral_code:"BREN1032", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(98),  last_link_sent_at:null },
  { id:"demo-r33", name:"Ronald Baker",       patient_id:"RONB-1033", email:"ronald.baker@hotmail.com",     phone:"(615) 555-0327", referral_code:"RONB1033", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(95),  last_link_sent_at:null },
  { id:"demo-r34", name:"Tamara Phillips",    patient_id:"TAMA-1034", email:"tamara.p@gmail.com",           phone:"(615) 555-0328", referral_code:"TAMA1034", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(92),  last_link_sent_at:null },
  { id:"demo-r35", name:"Bruce Evans",        patient_id:"BRCE-1035", email:null,                           phone:"(615) 555-0329", referral_code:"BRCE1035", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(90),  last_link_sent_at:null },
  { id:"demo-r36", name:"Joyce Turner",       patient_id:"JOYC-1036", email:"joyce.turner@gmail.com",       phone:"(615) 555-0330", referral_code:"JOYC1036", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(88),  last_link_sent_at:null },
  { id:"demo-r37", name:"Gerald Diaz",        patient_id:"GERD-1037", email:null,                           phone:"(615) 555-0331", referral_code:"GERD1037", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(85),  last_link_sent_at:null },
  { id:"demo-r38", name:"Carolyn Parker",     patient_id:"CARP-1038", email:"carolyn.parker@yahoo.com",     phone:"(615) 555-0332", referral_code:"CARP1038", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(82),  last_link_sent_at:null },
  { id:"demo-r39", name:"Ruth Cruz",          patient_id:"RUTH-1039", email:"ruth.cruz@gmail.com",          phone:"(629) 555-0333", referral_code:"RUTH1039", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(80),  last_link_sent_at:null },
  { id:"demo-r40", name:"Harold Edwards",     patient_id:"HARE-1040", email:null,                           phone:"(629) 555-0334", referral_code:"HARE1040", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(78),  last_link_sent_at:null },
  { id:"demo-r41", name:"Alice Collins",      patient_id:"ALIC-1041", email:"alice.collins@outlook.com",    phone:"(629) 555-0335", referral_code:"ALIC1041", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(75),  last_link_sent_at:null },
  { id:"demo-r42", name:"Raymond Reyes",      patient_id:"RAYR-1042", email:null,                           phone:"(629) 555-0336", referral_code:"RAYR1042", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(72),  last_link_sent_at:null },
  { id:"demo-r43", name:"Earl Stewart",       patient_id:"EARL-1043", email:"earl.stewart@gmail.com",       phone:"(629) 555-0337", referral_code:"EARL1043", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(70),  last_link_sent_at:null },
  { id:"demo-r44", name:"Irene Morris",       patient_id:"IREN-1044", email:"irene.morris@yahoo.com",       phone:"(615) 555-0338", referral_code:"IREN1044", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(68),  last_link_sent_at:null },
  { id:"demo-r45", name:"Frank Morales",      patient_id:"FRNK-1045", email:null,                           phone:"(615) 555-0339", referral_code:"FRNK1045", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:d(65),  last_link_sent_at:null },
  // ── 1 referral — Influencer tier (20 patients) ───────────────────────────────
  { id:"demo-r46", name:"Shirley Murphy",     patient_id:"SHIM-1046", email:"shirley.murphy@gmail.com",     phone:"(615) 555-0340", referral_code:"SHIM1046", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(130), last_link_sent_at:d(20) },
  { id:"demo-r47", name:"Ralph Cook",         patient_id:"RALC-1047", email:"ralph.cook@hotmail.com",       phone:"(615) 555-0341", referral_code:"RALC1047", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(125), last_link_sent_at:d(18) },
  { id:"demo-r48", name:"Howard Rogers",      patient_id:"HOWR-1048", email:null,                           phone:"(615) 555-0342", referral_code:"HOWR1048", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(120), last_link_sent_at:d(15) },
  { id:"demo-r49", name:"Diane Gutierrez",    patient_id:"DIAG-1049", email:"diane.gutierrez@gmail.com",    phone:"(615) 555-0343", referral_code:"DIAG1049", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(118), last_link_sent_at:d(12) },
  { id:"demo-r50", name:"Wayne Ortiz",        patient_id:"WAYN-1050", email:"wayne.ortiz@yahoo.com",        phone:"(629) 555-0344", referral_code:"WAYN1050", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(115), last_link_sent_at:d(10) },
  { id:"demo-r51", name:"Billy Morgan",       patient_id:"BILM-1051", email:null,                           phone:"(629) 555-0345", referral_code:"BILM1051", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(112), last_link_sent_at:d(8)  },
  { id:"demo-r52", name:"Steve Peterson",     patient_id:"STPE-1052", email:"steve.peterson@gmail.com",     phone:"(629) 555-0346", referral_code:"STPE1052", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(110), last_link_sent_at:d(7)  },
  { id:"demo-r53", name:"Louis Bailey",       patient_id:"LOUB-1053", email:"louis.bailey@outlook.com",     phone:"(629) 555-0347", referral_code:"LOUB1053", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(108), last_link_sent_at:d(6)  },
  { id:"demo-r54", name:"Jeremy Reed",        patient_id:"JEMR-1054", email:null,                           phone:"(615) 555-0348", referral_code:"JEMR1054", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(105), last_link_sent_at:d(5)  },
  { id:"demo-r55", name:"Aaron Kelly",        patient_id:"AARK-1055", email:"aaron.kelly@gmail.com",        phone:"(615) 555-0349", referral_code:"AARK1055", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(102), last_link_sent_at:d(4)  },
  { id:"demo-r56", name:"Randy Howard",       patient_id:"RANH-1056", email:"randy.howard@yahoo.com",       phone:"(615) 555-0350", referral_code:"RANH1056", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(100), last_link_sent_at:d(22) },
  { id:"demo-r57", name:"Victor Ramos",       patient_id:"VICR-1057", email:null,                           phone:"(615) 555-0351", referral_code:"VICR1057", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(98),  last_link_sent_at:d(25) },
  { id:"demo-r58", name:"Martin Kim",         patient_id:"MARN-1058", email:"martin.kim@gmail.com",         phone:"(629) 555-0352", referral_code:"MARN1058", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(95),  last_link_sent_at:d(28) },
  { id:"demo-r59", name:"Ernest Cox",         patient_id:"ERNC-1059", email:"ernest.cox@hotmail.com",       phone:"(629) 555-0353", referral_code:"ERNC1059", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(92),  last_link_sent_at:d(30) },
  { id:"demo-r60", name:"Phillip Ward",       patient_id:"PHIW-1060", email:null,                           phone:"(629) 555-0354", referral_code:"PHIW1060", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(90),  last_link_sent_at:d(32) },
  { id:"demo-r61", name:"Todd Richardson",    patient_id:"TODR-1061", email:"todd.richardson@gmail.com",    phone:"(615) 555-0355", referral_code:"TODR1061", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(88),  last_link_sent_at:d(14) },
  { id:"demo-r62", name:"Jesse Watson",       patient_id:"JESW-1062", email:"jesse.watson@yahoo.com",       phone:"(615) 555-0356", referral_code:"JESW1062", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(85),  last_link_sent_at:d(16) },
  { id:"demo-r63", name:"Craig Brooks",       patient_id:"CRABS-1063",email:null,                           phone:"(615) 555-0357", referral_code:"CRABS1063",referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(82),  last_link_sent_at:d(19) },
  { id:"demo-r64", name:"Alan Chavez",        patient_id:"ALAC-1064", email:"alan.chavez@gmail.com",        phone:"(629) 555-0358", referral_code:"ALAC1064", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:1, created_at:d(80),  last_link_sent_at:d(21) },
  { id:"demo-r65", name:"Shawn Wood",         patient_id:"SHAW-1065", email:"shawn.wood@outlook.com",       phone:"(629) 555-0359", referral_code:"SHAW1065", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:1, total_rewards_issued:0, created_at:d(78),  last_link_sent_at:d(23) },
  // ── 2 referrals — Influencer tier (15 patients) ──────────────────────────────
  { id:"demo-r66", name:"Clarence James",     patient_id:"CLAJ-1066", email:"clarence.james@gmail.com",     phone:"(615) 555-0360", referral_code:"CLAJ1066", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(140), last_link_sent_at:d(30) },
  { id:"demo-r67", name:"Sean Bennett",       patient_id:"SEAB-1067", email:null,                           phone:"(615) 555-0361", referral_code:"SEAB1067", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(135), last_link_sent_at:d(25) },
  { id:"demo-r68", name:"Philip Gray",        patient_id:"PHIG-1068", email:"philip.gray@yahoo.com",        phone:"(615) 555-0362", referral_code:"PHIG1068", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(130), last_link_sent_at:d(20) },
  { id:"demo-r69", name:"Roger Mendoza",      patient_id:"ROGM-1069", email:"roger.mendoza@gmail.com",      phone:"(615) 555-0363", referral_code:"ROGM1069", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(125), last_link_sent_at:d(18) },
  { id:"demo-r70", name:"Joe Ruiz",           patient_id:"JOER-1070", email:null,                           phone:"(629) 555-0364", referral_code:"JOER1070", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(120), last_link_sent_at:d(15) },
  { id:"demo-r71", name:"Juan Hughes",        patient_id:"JUAH-1071", email:"juan.hughes@gmail.com",        phone:"(629) 555-0365", referral_code:"JUAH1071", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(118), last_link_sent_at:d(12) },
  { id:"demo-r72", name:"Jack Price",         patient_id:"JACP-1072", email:"jack.price@hotmail.com",       phone:"(629) 555-0366", referral_code:"JACP1072", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(115), last_link_sent_at:d(10) },
  { id:"demo-r73", name:"Albert Alvarez",     patient_id:"ALBA-1073", email:null,                           phone:"(615) 555-0367", referral_code:"ALBA1073", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(112), last_link_sent_at:d(8)  },
  { id:"demo-r74", name:"Jonathan Castillo",  patient_id:"JONC-1074", email:"jonathan.castillo@gmail.com",  phone:"(615) 555-0368", referral_code:"JONC1074", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(110), last_link_sent_at:d(7)  },
  { id:"demo-r75", name:"Justin Sanders",     patient_id:"JUSS-1075", email:"justin.sanders@yahoo.com",     phone:"(615) 555-0369", referral_code:"JUSS1075", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(108), last_link_sent_at:d(6)  },
  { id:"demo-r76", name:"Terry Patel",        patient_id:"TERP-1076", email:null,                           phone:"(629) 555-0370", referral_code:"TERP1076", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(105), last_link_sent_at:d(5)  },
  { id:"demo-r77", name:"Gerald Myers",       patient_id:"GERM-1077", email:"gerald.myers@gmail.com",       phone:"(629) 555-0371", referral_code:"GERM1077", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(102), last_link_sent_at:d(4)  },
  { id:"demo-r78", name:"Keith Long",         patient_id:"KEIL-1078", email:"keith.long@outlook.com",       phone:"(629) 555-0372", referral_code:"KEIL1078", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(100), last_link_sent_at:d(22) },
  { id:"demo-r79", name:"Samuel Ross",        patient_id:"SAMR-1079", email:null,                           phone:"(615) 555-0373", referral_code:"SAMR1079", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:2, created_at:d(98),  last_link_sent_at:d(25) },
  { id:"demo-r80", name:"Willie Henderson",   patient_id:"WILH-1080", email:"willie.henderson@gmail.com",   phone:"(615) 555-0374", referral_code:"WILH1080", referral_url:"#", office_id:"demo", tier:"starter", reward_value:35, total_referrals:2, total_rewards_issued:1, created_at:d(95),  last_link_sent_at:d(28) },
  // ── 3–5 referrals — Amplifier tier (10 patients) ─────────────────────────────
  { id:"demo-r81", name:"Ralph Foster",       patient_id:"RALF-1081", email:"ralph.foster@gmail.com",       phone:"(615) 555-0375", referral_code:"RALF1081", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:3, total_rewards_issued:2, created_at:d(155), last_link_sent_at:d(35) },
  { id:"demo-r82", name:"Lawrence Simmons",   patient_id:"LAWS-1082", email:null,                           phone:"(615) 555-0376", referral_code:"LAWS1082", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:3, total_rewards_issued:3, created_at:d(150), last_link_sent_at:d(32) },
  { id:"demo-r83", name:"Nicholas Russell",   patient_id:"NICR-1083", email:"nicholas.russell@yahoo.com",   phone:"(629) 555-0377", referral_code:"NICR1083", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:4, total_rewards_issued:3, created_at:d(145), last_link_sent_at:d(28) },
  { id:"demo-r84", name:"Roy Griffin",        patient_id:"ROYG-1084", email:"roy.griffin@gmail.com",        phone:"(629) 555-0378", referral_code:"ROYG1084", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:4, total_rewards_issued:4, created_at:d(140), last_link_sent_at:d(25) },
  { id:"demo-r85", name:"Benjamin Hayes",     patient_id:"BENH-1085", email:null,                           phone:"(629) 555-0379", referral_code:"BENH1085", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:5, total_rewards_issued:4, created_at:d(135), last_link_sent_at:d(22) },
  { id:"demo-r86", name:"Bruce Bryant",       patient_id:"BRCB-1086", email:"bruce.bryant@outlook.com",     phone:"(615) 555-0380", referral_code:"BRCB1086", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:5, total_rewards_issued:5, created_at:d(130), last_link_sent_at:d(20) },
  { id:"demo-r87", name:"Brandon Ford",       patient_id:"BRNF-1087", email:"brandon.ford@gmail.com",       phone:"(615) 555-0381", referral_code:"BRNF1087", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:5, total_rewards_issued:4, created_at:d(125), last_link_sent_at:d(18) },
  { id:"demo-r88", name:"Adam Hamilton",      patient_id:"ADAH-1088", email:null,                           phone:"(615) 555-0382", referral_code:"ADAH1088", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:5, total_rewards_issued:5, created_at:d(120), last_link_sent_at:d(15) },
  { id:"demo-r89", name:"Harry Graham",       patient_id:"HARG-1089", email:"harry.graham@yahoo.com",       phone:"(629) 555-0383", referral_code:"HARG1089", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:4, total_rewards_issued:3, created_at:d(115), last_link_sent_at:d(12) },
  { id:"demo-r90", name:"Fred Sullivan",      patient_id:"FRES-1090", email:"fred.sullivan@gmail.com",      phone:"(629) 555-0384", referral_code:"FRES1090", referral_url:"#", office_id:"demo", tier:"rippler", reward_value:50, total_referrals:3, total_rewards_issued:3, created_at:d(110), last_link_sent_at:d(10) },
  // ── 6–9 referrals — Ambassador tier (7 patients) ─────────────────────────────
  { id:"demo-r91", name:"Wayne Wallace",      patient_id:"WAYW-1091", email:"wayne.wallace@gmail.com",      phone:"(615) 555-0385", referral_code:"WAYW1091", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:6,  total_rewards_issued:5,  created_at:d(165), last_link_sent_at:d(40) },
  { id:"demo-r92", name:"Billy West",         patient_id:"BILW-1092", email:null,                           phone:"(615) 555-0386", referral_code:"BILW1092", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:7,  total_rewards_issued:6,  created_at:d(160), last_link_sent_at:d(38) },
  { id:"demo-r93", name:"Steve Cole",         patient_id:"STEC-1093", email:"steve.cole@hotmail.com",       phone:"(629) 555-0387", referral_code:"STEC1093", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:7,  total_rewards_issued:7,  created_at:d(158), last_link_sent_at:d(35) },
  { id:"demo-r94", name:"Louis Warren",       patient_id:"LOUW-1094", email:"louis.warren@gmail.com",       phone:"(629) 555-0388", referral_code:"LOUW1094", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:8,  total_rewards_issued:7,  created_at:d(155), last_link_sent_at:d(32) },
  { id:"demo-r95", name:"Jeremy Dixon",       patient_id:"JEMD-1095", email:null,                           phone:"(615) 555-0389", referral_code:"JEMD1095", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:8,  total_rewards_issued:8,  created_at:d(152), last_link_sent_at:d(28) },
  { id:"demo-r96", name:"Aaron Fowler",       patient_id:"AARF-1096", email:"aaron.fowler@yahoo.com",       phone:"(629) 555-0390", referral_code:"AARF1096", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:9,  total_rewards_issued:8,  created_at:d(150), last_link_sent_at:d(25) },
  { id:"demo-r97", name:"Randy Gonzales",     patient_id:"RANG-1097", email:"randy.gonzales@gmail.com",     phone:"(629) 555-0391", referral_code:"RANG1097", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75, total_referrals:9,  total_rewards_issued:9,  created_at:d(148), last_link_sent_at:d(22) },
  // ── 10+ referrals — Legend tier (3 patients) ─────────────────────────────────
  { id:"demo-r98",  name:"Crystal Payne",     patient_id:"CRYP-1098", email:"crystal.payne@gmail.com",      phone:"(615) 555-0392", referral_code:"CRYP1098", referral_url:"#", office_id:"demo", tier:"rippl_legend", reward_value:100, total_referrals:14, total_rewards_issued:12, created_at:d(180), last_link_sent_at:d(50) },
  { id:"demo-r99",  name:"Michelle Webb",     patient_id:"MICW-1099", email:"michelle.webb@outlook.com",    phone:"(615) 555-0393", referral_code:"MICW1099", referral_url:"#", office_id:"demo", tier:"rippl_legend", reward_value:100, total_referrals:12, total_rewards_issued:10, created_at:d(175), last_link_sent_at:d(45) },
  { id:"demo-r100", name:"Marcus Stafford",   patient_id:"MARS-1100", email:"marcus.stafford@gmail.com",    phone:"(615) 555-0394", referral_code:"MARS1100", referral_url:"#", office_id:"demo", tier:"rippl_legend", reward_value:100, total_referrals:11, total_rewards_issued:9,  created_at:d(172), last_link_sent_at:d(48) },
];

// ── DEMO_ADMIN_TASKS ──────────────────────────────────────────────────────────

export const DEMO_ADMIN_TASKS = [
  {
    id: "demo-task-1",
    task_type: "gift-card",
    amount: 35,
    notes: "Patient requested Amazon gift card via claim link",
    status: "pending",
    referral_event_id: "demo-e7",
    created_at: d(2),
    referrer_name: "Jennifer Martinez",
    referrer_email: "jennifer.m@example.com",
    new_patient_name: "Jessica Thomas",
  },
  {
    id: "demo-task-2",
    task_type: "in_house_credit",
    amount: 100,
    notes: "Apply $100 in-house dental credit to patient account",
    status: "pending",
    referral_event_id: "demo-e1",
    created_at: d(5),
    referrer_name: "Mike Thompson",
    referrer_email: "mike.thompson@example.com",
    new_patient_name: "Sarah Johnson",
  },
  {
    id: "demo-task-3",
    task_type: "charity_donation",
    amount: 35,
    notes: "Patient requested $35 donation to St. Jude Children's Research Hospital",
    status: "pending",
    referral_event_id: "demo-e3",
    created_at: d(8),
    referrer_name: "Robert Kim",
    referrer_email: "robert.kim@example.com",
    new_patient_name: "Emily Davis",
  },
  {
    id: "demo-task-4",
    task_type: "unmatched-referral",
    amount: null,
    notes: "New patient said they were referred by 'my neighbor who goes here' — no name given",
    status: "pending",
    referral_event_id: "demo-e-unmatched",
    created_at: d(1),
    referrer_name: null,
    referrer_email: null,
    new_patient_name: "Chloe Nguyen",
  },
];

// ── DEMO_ADMIN_TASKS_AUTO ─────────────────────────────────────────────────────
// Automotive demo tasks — no in-house credit (dental-specific).

export const DEMO_ADMIN_TASKS_AUTO = [
  {
    id: "auto-task-1",
    task_type: "gift-card",
    amount: 100,
    notes: "Customer requested Amazon gift card via claim link",
    status: "pending",
    referral_event_id: "auto-e7",
    created_at: d(2),
    referrer_name: "Tanya Pierce",
    referrer_email: "tanya.pierce@gmail.com",
    new_patient_name: "Victor Lowe",
  },
  {
    id: "auto-task-2",
    task_type: "charity_donation",
    amount: 100,
    notes: "Customer requested $100 donation to St. Jude Children's Research Hospital",
    status: "pending",
    referral_event_id: "auto-e3",
    created_at: d(5),
    referrer_name: "Derek Simmons",
    referrer_email: "derek.simmons@yahoo.com",
    new_patient_name: "Marcus Thompson",
  },
  {
    id: "auto-task-3",
    task_type: "unmatched-referral",
    amount: null,
    notes: "New customer said they were referred by 'a friend who bought here' — no name given",
    status: "pending",
    referral_event_id: "auto-e-unmatched",
    created_at: d(1),
    referrer_name: null,
    referrer_email: null,
    new_patient_name: "Greg Landis",
  },
];

// ── DEMO_OFFICES ──────────────────────────────────────────────────────────────

export const DEMO_OFFICES = [
  {
    id: "demo-office-1",
    name: "Smile Care Dental – Main",
    location_code: "main",
    logo_url: null,
    active: true,
    last_poll_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];

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

// ── AUTOMOTIVE VERTICAL DEMO DATA ─────────────────────────────────────────────

const da = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

export const DEMO_REFERRERS_AUTO = [
  { id:"auto-r01", name:"Carlos Mendez",    patient_id:"CARL-2001", email:"carlos.mendez@gmail.com",    phone:"(615) 555-1001", referral_code:"CARL2001", referral_url:"#", office_id:"demo", tier:"rippl_legend", reward_value:250, total_referrals:11, total_rewards_issued:9,  created_at:da(180), last_link_sent_at:da(14) },
  { id:"auto-r02", name:"Brenda Holloway",  patient_id:"BREN-2002", email:"brenda.holloway@outlook.com", phone:"(615) 555-1002", referral_code:"BREN2002", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:200, total_referrals:8,  total_rewards_issued:7,  created_at:da(160), last_link_sent_at:da(10) },
  { id:"auto-r03", name:"Derek Simmons",    patient_id:"DERE-2003", email:"derek.simmons@yahoo.com",    phone:"(615) 555-1003", referral_code:"DERE2003", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:200, total_referrals:7,  total_rewards_issued:6,  created_at:da(155), last_link_sent_at:da(8)  },
  { id:"auto-r04", name:"Tanya Pierce",     patient_id:"TANY-2004", email:"tanya.pierce@gmail.com",     phone:"(629) 555-1004", referral_code:"TANY2004", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:150, total_referrals:6,  total_rewards_issued:5,  created_at:da(150), last_link_sent_at:da(7)  },
  { id:"auto-r05", name:"Marcus James",     patient_id:"MARC-2005", email:"marcus.james@hotmail.com",   phone:"(629) 555-1005", referral_code:"MARC2005", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:150, total_referrals:5,  total_rewards_issued:5,  created_at:da(145), last_link_sent_at:da(5)  },
  { id:"auto-r06", name:"Angela Torres",    patient_id:"ANGE-2006", email:"angela.torres@gmail.com",    phone:"(615) 555-1006", referral_code:"ANGE2006", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:150, total_referrals:4,  total_rewards_issued:4,  created_at:da(140), last_link_sent_at:da(20) },
  { id:"auto-r07", name:"Kevin Grant",      patient_id:"KEVI-2007", email:null,                          phone:"(615) 555-1007", referral_code:"KEVI2007", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:150, total_referrals:3,  total_rewards_issued:3,  created_at:da(135), last_link_sent_at:da(18) },
  { id:"auto-r08", name:"Sandra Brooks",    patient_id:"SAND-2008", email:"sandra.brooks@gmail.com",    phone:"(629) 555-1008", referral_code:"SAND2008", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:2,  total_rewards_issued:2,  created_at:da(130), last_link_sent_at:da(15) },
  { id:"auto-r09", name:"Tyler Nguyen",     patient_id:"TYLE-2009", email:"tyler.nguyen@outlook.com",   phone:"(629) 555-1009", referral_code:"TYLE2009", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:2,  total_rewards_issued:1,  created_at:da(125), last_link_sent_at:da(12) },
  { id:"auto-r10", name:"Lisa Morales",     patient_id:"LISA-2010", email:"lisa.morales@yahoo.com",     phone:"(615) 555-1010", referral_code:"LISA2010", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:2,  total_rewards_issued:2,  created_at:da(120), last_link_sent_at:da(9)  },
  { id:"auto-r11", name:"James Okafor",     patient_id:"JAME-2011", email:null,                          phone:"(615) 555-1011", referral_code:"JAME2011", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:1,  total_rewards_issued:1,  created_at:da(115), last_link_sent_at:da(22) },
  { id:"auto-r12", name:"Patricia Owens",   patient_id:"PATR-2012", email:"patricia.owens@gmail.com",   phone:"(629) 555-1012", referral_code:"PATR2012", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:1,  total_rewards_issued:0,  created_at:da(110), last_link_sent_at:da(19) },
  { id:"auto-r13", name:"Robert Cheng",     patient_id:"ROBE-2013", email:"robert.cheng@gmail.com",     phone:"(615) 555-1013", referral_code:"ROBE2013", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:100, total_referrals:1,  total_rewards_issued:1,  created_at:da(105), last_link_sent_at:da(16) },
  { id:"auto-r14", name:"Monica Walsh",     patient_id:"MONI-2014", email:null,                          phone:"(629) 555-1014", referral_code:"MONI2014", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(100), last_link_sent_at:null },
  { id:"auto-r15", name:"David Kim",        patient_id:"DAVI-2015", email:"david.kim@yahoo.com",        phone:"(615) 555-1015", referral_code:"DAVI2015", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(95),  last_link_sent_at:null },
  { id:"auto-r16", name:"Jennifer Ross",    patient_id:"JENN-2016", email:"jennifer.ross@gmail.com",    phone:"(629) 555-1016", referral_code:"JENN2016", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(90),  last_link_sent_at:null },
  { id:"auto-r17", name:"Brian Foster",     patient_id:"BRIA-2017", email:null,                          phone:"(615) 555-1017", referral_code:"BRIA2017", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(85),  last_link_sent_at:null },
  { id:"auto-r18", name:"Karen Powell",     patient_id:"KARE-2018", email:"karen.powell@outlook.com",   phone:"(629) 555-1018", referral_code:"KARE2018", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(80),  last_link_sent_at:null },
  { id:"auto-r19", name:"Steve Lambert",    patient_id:"STEV-2019", email:"steve.lambert@gmail.com",    phone:"(615) 555-1019", referral_code:"STEV2019", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(75),  last_link_sent_at:null },
  { id:"auto-r20", name:"Nancy Reyes",      patient_id:"NANC-2020", email:null,                          phone:"(629) 555-1020", referral_code:"NANC2020", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(70),  last_link_sent_at:null },
];

export const DEMO_EVENTS_AUTO = [
  { id:"auto-e1", new_patient_name:"Ryan Carter",     new_patient_phone:"(615) 555-2001", referrer_id:"auto-r01", referrer_name:"Carlos Mendez",   team_source:"front",     office:"Summit Auto Group", status:"Exam Completed", reward_type:null,               household_duplicate:false, created_at:da(2)  },
  { id:"auto-e2", new_patient_name:"Jessica Hayes",   new_patient_phone:"(615) 555-2002", referrer_id:"auto-r02", referrer_name:"Brenda Holloway",  team_source:"back",      office:"Summit Auto Group", status:"Reward Sent",    reward_type:"amazon-gift-card",  household_duplicate:false, created_at:da(4)  },
  { id:"auto-e3", new_patient_name:"Marcus Thompson", new_patient_phone:"(629) 555-2003", referrer_id:"auto-r03", referrer_name:"Derek Simmons",    team_source:"assistant", office:"Summit Auto Group", status:"Reward Sent",    reward_type:"amazon-gift-card",  reward_value:200,          household_duplicate:false, created_at:da(5)  },
  { id:"auto-e4", new_patient_name:"Priya Patel",     new_patient_phone:"(615) 555-2004", referrer_id:"auto-r04", referrer_name:"Tanya Pierce",     team_source:"front",     office:"Summit Auto Group", status:"Booked",         reward_type:null,               household_duplicate:false, created_at:da(7)  },
  { id:"auto-e5", new_patient_name:"Kevin Grant Jr.", new_patient_phone:"(629) 555-2005", referrer_id:"auto-r05", referrer_name:"Marcus James",     team_source:"back",      office:"Summit Auto Group", status:"Reward Sent",    reward_type:"amazon-gift-card",  household_duplicate:false, created_at:da(8)  },
  { id:"auto-e6", new_patient_name:"Dana Hoffman",    new_patient_phone:"(615) 555-2006", referrer_id:"auto-r01", referrer_name:"Carlos Mendez",   team_source:"front",     office:"Summit Auto Group", status:"Reward Sent",    reward_type:"amazon-gift-card",  reward_value:250,          household_duplicate:false, created_at:da(14) },
  { id:"auto-e7", new_patient_name:"Victor Lowe",     new_patient_phone:"(629) 555-2007", referrer_id:"auto-r02", referrer_name:"Brenda Holloway",  team_source:"assistant", office:"Summit Auto Group", status:"Lead",           reward_type:null,               household_duplicate:false, created_at:da(15) },
  { id:"auto-e8", new_patient_name:"Alicia Stone",    new_patient_phone:"(615) 555-2008", referrer_id:"auto-r03", referrer_name:"Derek Simmons",    team_source:"back",      office:"Summit Auto Group", status:"Reward Sent",    reward_type:"charity-donation",  household_duplicate:false, created_at:da(21) },
];

export const DEMO_STATS_AUTO = {
  vertical: "automotive",
  total_referrals: 145,
  exams_completed: 103,
  rewards_issued: 89,
  active_referrers: 60,
  top_referrers: [
    { id: "auto-r01", name: "Carlos Mendez",   total_referrals: 11, total_rewards_issued: 9 },
    { id: "auto-r02", name: "Brenda Holloway", total_referrals: 8,  total_rewards_issued: 7 },
    { id: "auto-r03", name: "Derek Simmons",   total_referrals: 7,  total_rewards_issued: 6 },
    { id: "auto-r04", name: "Tanya Pierce",    total_referrals: 6,  total_rewards_issued: 5 },
    { id: "auto-r05", name: "Marcus James",    total_referrals: 5,  total_rewards_issued: 5 },
  ],
  recent_events: [
    { id:"auto-e1", new_patient_name:"Ryan Carter",     new_patient_phone:"(615) 555-2001", referrer_id:"auto-r01", referrer_name:"Carlos Mendez",   team_source:"front",     office:"Summit Auto Group", office_id:"demo", status:"Exam Completed", reward_type:null,              created_at:da(2)  },
    { id:"auto-e2", new_patient_name:"Jessica Hayes",   new_patient_phone:"(615) 555-2002", referrer_id:"auto-r02", referrer_name:"Brenda Holloway",  team_source:"back",      office:"Summit Auto Group", office_id:"demo", status:"Reward Sent",    reward_type:"amazon-gift-card", created_at:da(4)  },
    { id:"auto-e3", new_patient_name:"Marcus Thompson", new_patient_phone:"(629) 555-2003", referrer_id:"auto-r03", referrer_name:"Derek Simmons",    team_source:"assistant", office:"Summit Auto Group", office_id:"demo", status:"Reward Sent",    reward_type:"amazon-gift-card", reward_value:200, created_at:da(5)  },
    { id:"auto-e4", new_patient_name:"Priya Patel",     new_patient_phone:"(615) 555-2004", referrer_id:"auto-r04", referrer_name:"Tanya Pierce",     team_source:"front",     office:"Summit Auto Group", office_id:"demo", status:"Booked",         reward_type:null,              created_at:da(7)  },
    { id:"auto-e5", new_patient_name:"Kevin Grant Jr.", new_patient_phone:"(629) 555-2005", referrer_id:"auto-r05", referrer_name:"Marcus James",     team_source:"back",      office:"Summit Auto Group", office_id:"demo", status:"Reward Sent",    reward_type:"amazon-gift-card", created_at:da(8)  },
  ],
};

export const DEMO_OFFICES_AUTO = [
  {
    id: "demo-office-auto",
    name: "Summit Auto Group – Main",
    location_code: "main",
    logo_url: null,
    active: true,
    last_poll_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];

// ── SALON VERTICAL DEMO DATA ──────────────────────────────────────────────────

export const DEMO_REFERRERS_SALON = [
  { id:"salon-r01", name:"Sophia Brooks",    patient_id:"SOPH-3001", email:"sophia.brooks@gmail.com",    phone:"(615) 555-3001", referral_code:"SOPH3001", referral_url:"#", office_id:"demo", tier:"rippl_legend", reward_value:100, total_referrals:13, total_rewards_issued:11, created_at:da(180), last_link_sent_at:da(14) },
  { id:"salon-r02", name:"Rachel Green",     patient_id:"RACH-3002", email:"rachel.green@outlook.com",   phone:"(615) 555-3002", referral_code:"RACH3002", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75,  total_referrals:8,  total_rewards_issued:7,  created_at:da(165), last_link_sent_at:da(11) },
  { id:"salon-r03", name:"Mia Patel",        patient_id:"MIAP-3003", email:"mia.patel@yahoo.com",        phone:"(629) 555-3003", referral_code:"MIAP3003", referral_url:"#", office_id:"demo", tier:"super_rippler", reward_value:75,  total_referrals:7,  total_rewards_issued:6,  created_at:da(160), last_link_sent_at:da(9)  },
  { id:"salon-r04", name:"Kayla Robinson",   patient_id:"KAYL-3004", email:"kayla.robinson@gmail.com",   phone:"(615) 555-3004", referral_code:"KAYL3004", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:50,  total_referrals:5,  total_rewards_issued:4,  created_at:da(155), last_link_sent_at:da(7)  },
  { id:"salon-r05", name:"Amber Davis",      patient_id:"AMBE-3005", email:null,                          phone:"(629) 555-3005", referral_code:"AMBE3005", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:50,  total_referrals:4,  total_rewards_issued:4,  created_at:da(150), last_link_sent_at:da(6)  },
  { id:"salon-r06", name:"Nicole Carter",    patient_id:"NICO-3006", email:"nicole.carter@gmail.com",    phone:"(615) 555-3006", referral_code:"NICO3006", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:50,  total_referrals:3,  total_rewards_issued:3,  created_at:da(145), last_link_sent_at:da(20) },
  { id:"salon-r07", name:"Jasmine Hall",     patient_id:"JASM-3007", email:"jasmine.hall@hotmail.com",   phone:"(629) 555-3007", referral_code:"JASM3007", referral_url:"#", office_id:"demo", tier:"rippler",      reward_value:50,  total_referrals:3,  total_rewards_issued:2,  created_at:da(140), last_link_sent_at:da(17) },
  { id:"salon-r08", name:"Tiffany Moore",    patient_id:"TIFF-3008", email:"tiffany.moore@gmail.com",    phone:"(615) 555-3008", referral_code:"TIFF3008", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:2,  total_rewards_issued:2,  created_at:da(135), last_link_sent_at:da(15) },
  { id:"salon-r09", name:"Lauren White",     patient_id:"LAUR-3009", email:null,                          phone:"(629) 555-3009", referral_code:"LAUR3009", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:2,  total_rewards_issued:1,  created_at:da(130), last_link_sent_at:da(12) },
  { id:"salon-r10", name:"Danielle Rivera",  patient_id:"DANI-3010", email:"danielle.rivera@yahoo.com",  phone:"(615) 555-3010", referral_code:"DANI3010", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:2,  total_rewards_issued:2,  created_at:da(125), last_link_sent_at:da(10) },
  { id:"salon-r11", name:"Brittany Young",   patient_id:"BRIT-3011", email:"brittany.young@gmail.com",   phone:"(629) 555-3011", referral_code:"BRIT3011", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:1,  total_rewards_issued:1,  created_at:da(120), last_link_sent_at:da(22) },
  { id:"salon-r12", name:"Destiny Thomas",   patient_id:"DEST-3012", email:null,                          phone:"(615) 555-3012", referral_code:"DEST3012", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:1,  total_rewards_issued:0,  created_at:da(115), last_link_sent_at:da(19) },
  { id:"salon-r13", name:"Samantha Cruz",    patient_id:"SAMA-3013", email:"samantha.cruz@gmail.com",    phone:"(629) 555-3013", referral_code:"SAMA3013", referral_url:"#", office_id:"demo", tier:"starter",      reward_value:35,  total_referrals:1,  total_rewards_issued:1,  created_at:da(110), last_link_sent_at:da(16) },
  { id:"salon-r14", name:"Victoria Bell",    patient_id:"VICT-3014", email:"victoria.bell@outlook.com",  phone:"(615) 555-3014", referral_code:"VICT3014", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(105), last_link_sent_at:null },
  { id:"salon-r15", name:"Alexis Foster",    patient_id:"ALEX-3015", email:null,                          phone:"(629) 555-3015", referral_code:"ALEX3015", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(100), last_link_sent_at:null },
  { id:"salon-r16", name:"Courtney Adams",   patient_id:"COUR-3016", email:"courtney.adams@gmail.com",   phone:"(615) 555-3016", referral_code:"COUR3016", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(95),  last_link_sent_at:null },
  { id:"salon-r17", name:"Monique Diaz",     patient_id:"MONI-3017", email:null,                          phone:"(629) 555-3017", referral_code:"MONI3017", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(90),  last_link_sent_at:null },
  { id:"salon-r18", name:"Erica Nguyen",     patient_id:"ERIC-3018", email:"erica.nguyen@yahoo.com",     phone:"(615) 555-3018", referral_code:"ERIC3018", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(85),  last_link_sent_at:null },
  { id:"salon-r19", name:"Naomi Phillips",   patient_id:"NAOM-3019", email:"naomi.phillips@gmail.com",   phone:"(629) 555-3019", referral_code:"NAOM3019", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(80),  last_link_sent_at:null },
  { id:"salon-r20", name:"Jada Stewart",     patient_id:"JADA-3020", email:null,                          phone:"(615) 555-3020", referral_code:"JADA3020", referral_url:"#", office_id:"demo", total_referrals:0, total_rewards_issued:0, created_at:da(75),  last_link_sent_at:null },
];

export const DEMO_EVENTS_SALON = [
  { id:"salon-e1", new_patient_name:"Emma Collins",    new_patient_phone:"(615) 555-4001", referrer_id:"salon-r01", referrer_name:"Sophia Brooks",   team_source:"front",     office:"Luxe Hair Studio", status:"Exam Completed", reward_type:null,              household_duplicate:false, created_at:da(2)  },
  { id:"salon-e2", new_patient_name:"Maya Johnson",    new_patient_phone:"(615) 555-4002", referrer_id:"salon-r02", referrer_name:"Rachel Green",    team_source:"back",      office:"Luxe Hair Studio", status:"Reward Sent",    reward_type:"amazon-gift-card", household_duplicate:false, created_at:da(4)  },
  { id:"salon-e3", new_patient_name:"Olivia Scott",    new_patient_phone:"(629) 555-4003", referrer_id:"salon-r03", referrer_name:"Mia Patel",       team_source:"assistant", office:"Luxe Hair Studio", status:"Reward Sent",    reward_type:"amazon-gift-card", reward_value:75,  household_duplicate:false, created_at:da(5)  },
  { id:"salon-e4", new_patient_name:"Chloe Martin",    new_patient_phone:"(615) 555-4004", referrer_id:"salon-r04", referrer_name:"Kayla Robinson",  team_source:"front",     office:"Luxe Hair Studio", status:"Booked",         reward_type:null,              household_duplicate:false, created_at:da(7)  },
  { id:"salon-e5", new_patient_name:"Zoe Harris",      new_patient_phone:"(629) 555-4005", referrer_id:"salon-r05", referrer_name:"Amber Davis",     team_source:"back",      office:"Luxe Hair Studio", status:"Reward Sent",    reward_type:"in-house-credit",  household_duplicate:false, created_at:da(8)  },
  { id:"salon-e6", new_patient_name:"Lily Anderson",   new_patient_phone:"(615) 555-4006", referrer_id:"salon-r01", referrer_name:"Sophia Brooks",   team_source:"front",     office:"Luxe Hair Studio", status:"Reward Sent",    reward_type:"amazon-gift-card", reward_value:75,  household_duplicate:false, created_at:da(14) },
  { id:"salon-e7", new_patient_name:"Grace Wilson",    new_patient_phone:"(629) 555-4007", referrer_id:"salon-r02", referrer_name:"Rachel Green",    team_source:"assistant", office:"Luxe Hair Studio", status:"Lead",           reward_type:null,              household_duplicate:false, created_at:da(15) },
  { id:"salon-e8", new_patient_name:"Aria Thompson",   new_patient_phone:"(615) 555-4008", referrer_id:"salon-r03", referrer_name:"Mia Patel",       team_source:"back",      office:"Luxe Hair Studio", status:"Reward Sent",    reward_type:"charity-donation", household_duplicate:false, created_at:da(21) },
];

export const DEMO_STATS_SALON = {
  vertical: "salon",
  total_referrals: 112,
  exams_completed: 84,
  rewards_issued: 71,
  active_referrers: 48,
  top_referrers: [
    { id: "salon-r01", name: "Sophia Brooks",  total_referrals: 13, total_rewards_issued: 11 },
    { id: "salon-r02", name: "Rachel Green",   total_referrals: 8,  total_rewards_issued: 7  },
    { id: "salon-r03", name: "Mia Patel",      total_referrals: 7,  total_rewards_issued: 6  },
    { id: "salon-r04", name: "Kayla Robinson", total_referrals: 5,  total_rewards_issued: 4  },
    { id: "salon-r05", name: "Amber Davis",    total_referrals: 4,  total_rewards_issued: 4  },
  ],
  recent_events: [
    { id:"salon-e1", new_patient_name:"Emma Collins",    new_patient_phone:"(615) 555-4001", referrer_id:"salon-r01", referrer_name:"Sophia Brooks",   team_source:"front",     office:"Luxe Hair Studio", office_id:"demo", status:"Exam Completed", reward_type:null,              created_at:da(2)  },
    { id:"salon-e2", new_patient_name:"Maya Johnson",    new_patient_phone:"(615) 555-4002", referrer_id:"salon-r02", referrer_name:"Rachel Green",    team_source:"back",      office:"Luxe Hair Studio", office_id:"demo", status:"Reward Sent",    reward_type:"amazon-gift-card", created_at:da(4)  },
    { id:"salon-e3", new_patient_name:"Olivia Scott",    new_patient_phone:"(629) 555-4003", referrer_id:"salon-r03", referrer_name:"Mia Patel",       team_source:"assistant", office:"Luxe Hair Studio", office_id:"demo", status:"Reward Sent",    reward_type:"amazon-gift-card", reward_value:75,  created_at:da(5)  },
    { id:"salon-e4", new_patient_name:"Chloe Martin",    new_patient_phone:"(615) 555-4004", referrer_id:"salon-r04", referrer_name:"Kayla Robinson",  team_source:"front",     office:"Luxe Hair Studio", office_id:"demo", status:"Booked",         reward_type:null,              created_at:da(7)  },
    { id:"salon-e5", new_patient_name:"Zoe Harris",      new_patient_phone:"(629) 555-4005", referrer_id:"salon-r05", referrer_name:"Amber Davis",     team_source:"back",      office:"Luxe Hair Studio", office_id:"demo", status:"Reward Sent",    reward_type:"in-house-credit",  created_at:da(8)  },
  ],
};

export const DEMO_OFFICES_SALON = [
  {
    id: "demo-office-salon",
    name: "Luxe Hair Studio – Main",
    location_code: "main",
    logo_url: null,
    active: true,
    last_poll_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];
