# Rippl SMS Onboarding SOP — All New Clients

> Last updated: 2026-09-18
> Source: Meeting notes + Twilio rejection analysis (TLC of Franklin / Carlock case)

---

## Timeline Expectation — Set This Upfront With Every Client

- **Email notifications:** Live immediately on signup
- **SMS notifications:** ~30 days from when client completes the website requirements below
- Tell clients: *"You can start tracking referrals and sending email notifications right away. SMS takes about a month due to carrier compliance verification."*

---

## The Core Rule

> The opt-in page AND privacy policy **must be on the client's own domain**.
> Using joinrippl.com URLs will result in Twilio rejection every time.

Twilio's position: the patient is receiving messages *from the practice*, not from Rippl. The practice must own the consent on their own website.

---

## Step 1 — Send Client the Website Requirements Email

Send this to the practice contact (or forward to their IT/web team). Do **not** explain Twilio internals — just give instructions and let them handle it.

---

**Subject: Action Required — 2 Website Updates to Activate SMS**

Hi [Name],

To activate SMS notifications through your Rippl account, your website needs two updates. Please forward to your web developer or IT team:

---

**1. Add an SMS opt-in page**

Create a page at `[yourdomain.com]/sms-opt-in` (or similar URL) containing the following consent language:

> By providing your mobile number and submitting this form, you consent to receive text message notifications from **[Practice Name]** regarding your referral rewards. Message and data rates may apply. Reply STOP at any time to opt out. Reply HELP for help.

The page should include your practice name, a field to enter a mobile number, and a submit button. Once live, send us the URL.

---

**2. Add an SMS disclosure section to your Privacy Policy**

Add the following under a heading such as "Text Messaging" or "SMS Communications":

> **[Practice Name]** may send text messages to patients who have opted in to receive SMS notifications regarding referral rewards. Message frequency varies. Message and data rates may apply. To opt out, reply STOP to any message. To request help, reply HELP. We do not share your mobile number with third parties for marketing purposes. [Practice Name] uses Rippl, a third-party platform, to facilitate referral reward notifications.

Once updated, send us the direct URL to your privacy policy page.

---

Once both are live, reply with the URLs and we will complete the carrier verification. SMS will be active within approximately 3–7 business days after that.

---

## Step 2 — Rippl Setup (Do in Parallel While Client Updates Their Site)

1. Create secondary compliance profile in Twilio Trust Hub
   - Friendly name: `[Practice Name]`
   - Business identity: ISV Reseller or Partner
   - Legal business name + EIN: BD America (or Discovery Expeditions LLC) — update to client EIN later if needed; not required for toll-free approval
2. Purchase a toll-free number and assign to the compliance profile
3. Create `/enroll/[slug]` practice record in Rippl DB with the client's slug

---

## Step 3 — Twilio Toll-Free Verification Submission

Submit only after the client confirms their opt-in page and privacy policy are live.

| Field | Value |
|---|---|
| Use case | `Account_notification` |
| Opt-in type | `Website` |
| Opt-in policy proof URL | `https://[clientdomain.com]/sms-opt-in` |
| Privacy policy URL | `https://[clientdomain.com]/privacy-policy` |
| Terms URL | leave blank |

---

### Use Case Description Template (keep under 500 characters)

> [Practice Name] sends account status notifications to enrolled referral rewards members. Patients opt in via a web form on the practice website where they enter their mobile number and consent to receive notifications by text. They receive an enrollment confirmation SMS and a notification when a referred patient completes their first visit and a reward is available. All recipients are opted-in enrolled members. All messages include STOP opt-out.

---

### Sample Message Templates

**Sample 1 — Enrollment confirmation:**
> You're enrolled in [Practice Name] Rewards! You'll earn a gift card when someone you refer completes their first visit. Reply STOP to opt out.

**Sample 2 — Reward notification:**
> Great news! Your referral just completed their first visit at [Practice Name]. Your reward is ready to claim: https://www.joinrippl.com/claim?token=XXXX Reply STOP to opt out.

---

### Opt-In Message Field

> Patients visit [clientdomain.com]/sms-opt-in, enter their mobile number, and consent to receive account notifications from [Practice Name] by text. Consent is confirmed on the practice's own website before submission.

---

## Step 4 — Rejection Troubleshooting

| Code | Meaning | Fix |
|---|---|---|
| 30496 | Use case category doesn't match description | Description sounds promotional — reframe as transactional account notifications; remove "earn money" language from description and sample messages |
| 30498 | Opt-in workflow doesn't match submission | Opt-in URL is on joinrippl.com (not client domain), or URL doesn't load, or description mentions QR code but type is Website |

**7-day priority window:** Always edit and resubmit within 7 days of rejection. After 7 days the submission expires and loses priority queue status.

---

## Vertical-Specific Notes

### Dental Practices
- Likely already have HIPAA-compliant privacy policies — just need the SMS section added
- Consent language: "from [Practice Name]" not "from Rippl"
- Open Dental eConnector API: $35/practice — cannot offer free tier if this cost applies

### Automotive (Carlock / DriveCentric)
- Privacy policy likely does NOT have SMS language — full section needs to be added
- Opt-in page must be created from scratch on dealer's website
- Attribution is manual via DriveCentric — set client expectations accordingly

### Salon (Vagaro)
- Similar to automotive — privacy policy needs SMS section added
- Opt-in page must be on salon's own domain

---

## Important: One Number Per System

Each SMS platform (Rippl, All-in-One, Flex, NexHealth, etc.) requires its own dedicated phone number. A number provisioned to Rippl cannot simultaneously be used by another platform. If the client uses another SMS system, Rippl will have a separate number. This is a carrier/Twilio constraint, not a Rippl limitation.

---

## Twilio Account Structure

- **Primary profile:** BD America / Discovery Expeditions LLC (ISV Reseller) — approved
- **Secondary profiles:** One per client practice — `Account_notification` use case
- **Numbers:** One toll-free number per client, assigned to their secondary profile
- **EIN:** BD America EIN can be used as placeholder for toll-free submissions; client's own EIN preferred but not strictly required for toll-free approval
