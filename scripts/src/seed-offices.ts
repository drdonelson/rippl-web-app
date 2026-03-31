/**
 * Upserts (inserts or updates) the three Hallmark Dental offices using
 * customer keys from environment variables. Safe to run multiple times.
 *
 * Usage: pnpm --filter @workspace/scripts run seed-offices
 *
 * Required env vars:
 *   OPEN_DENTAL_CUSTOMER_KEY           — Brentwood customer key
 *   OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG — Lewisburg customer key
 *   OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER — Greenbrier customer key
 */
import { db } from "@workspace/db";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const OFFICES = [
  {
    location_code: "brentwood",
    name: "Hallmark Dental – Brentwood",
    envVar: "OPEN_DENTAL_CUSTOMER_KEY",
    active: true,
  },
  {
    location_code: "lewisburg",
    name: "Hallmark Dental – Lewisburg",
    envVar: "OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG",
    active: false, // becomes true once key is provided
  },
  {
    location_code: "greenbrier",
    name: "Hallmark Dental – Greenbrier",
    envVar: "OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER",
    active: false, // becomes true once key is provided
  },
] as const;

async function seedOffices() {
  console.log("Seeding offices...");

  for (const office of OFFICES) {
    const customerKey = process.env[office.envVar]?.trim();

    if (!customerKey) {
      console.warn(`  ⚠ ${office.name}: env var ${office.envVar} not set — skipping`);
      continue;
    }

    const hasKey = customerKey.length >= 8;
    const isActive = office.active && hasKey;

    const [existing] = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(eq(officesTable.location_code, office.location_code));

    if (existing) {
      await db
        .update(officesTable)
        .set({
          name: office.name,
          customer_key: customerKey,
          active: isActive,
        })
        .where(eq(officesTable.id, existing.id));
      console.log(`  ✓ ${office.name}: updated (active=${isActive}, key_len=${customerKey.length})`);
    } else {
      await db.insert(officesTable).values({
        name: office.name,
        customer_key: customerKey,
        location_code: office.location_code,
        active: isActive,
      });
      console.log(`  ✓ ${office.name}: inserted (active=${isActive}, key_len=${customerKey.length})`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

seedOffices().catch(err => {
  console.error("seed-offices failed:", err);
  process.exit(1);
});
