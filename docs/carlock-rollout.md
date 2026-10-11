# Carlock feed correction — October 11, 2026

Verified using the actual SFTP `StoreInfo` and `StoreId` in all rows, not directory names or old email assumptions:

| Rippl practice | Export prefix | Authoritative StoreId | Directory |
|---|---|---|---|
| carlock | 3367 | 19d38b15-ab29-4806-8a61-8a99a1ae9a1a | /home/drivecentric/carlock |
| volvo-of-cool-springs | 3364 | 9ae8c205-5cc7-4ccb-852f-0ea5690b1bd8 | /home/drivecentric/volvo-cool-springs/ |

Both have October 11 exports covering October 10. The old configuration reversed the prefixes. Carlock was rereading July 31's leftover Volvo files; Volvo rejected all files because its configured prefix was wrong. A successful sync timestamp did not prove fresh source data.

The six historical members and two unmatched tasks under Carlock all trace to Volvo's StoreId in July's export. The audit found zero linked events, claims, rewards, delivery records, or member-linked tasks. Preserve record IDs and referral codes when repairing ownership; do not infer or award a referrer from a phone/name match.

The importer now validates a configured `sftp_store_id` against StoreInfo and every imported row, requires a complete batch with matching reporting periods, sorts by export timestamp, rejects feeds older than 72 hours, and parses quoted multiline CSV fields. Empty source-group tables are valid. Referrals still need reliable identifying evidence; an appointment note is not automatically a referrer match.

## Remaining activation work

- Configure an approved sender separately for each business. No automotive Twilio number or dedicated credentials were configured at this audit.
- The two historical unmatched referrals do not contain an identified referrer. Staff must supply evidence; do not invent a match or create replacement rewards.
- Buyer enrollment still uses the legacy phone lookup. A stable source-customer mapping and consent-aware onboarding require separate implementation before broad automotive activation.
- The latest-batch importer does not backfill all missed daily exports. Historical replay needs a separately reviewed plan, with messaging suppressed and durable source identity handling.
- Confirm delivery, replies, opt-out handling, reward fulfillment, and the person responsible for support before a public launch.

## Surge recommendation

As checked October 11 at https://surge.app/pricing/: Starter is $20/month with up to three local/toll-free numbers and $20 message credit; Growth is $100/month for up to 15 numbers; Custom starts at $250/month and lists HIPAA compliance. Number rental, campaign fees and setup fees must be accounted for separately from message estimates. Confirm how billing applies across customer accounts.

Pilot Volvo on Starter if the business/account terms fit. Confirm the BAA and plan requirements for Hallmark before transferring patient messaging. Keep Hallmark's functioning Twilio sender during the pilot. Surge needs a provider adapter, customer account mapping, signed inbound/status webhooks, opt-out migration and registration gates; it is not currently wired into Rippl. Do not close Twilio until all dependent numbers, messaging and other services have been inventoried and migrated, and any retained numbers have finished porting.
