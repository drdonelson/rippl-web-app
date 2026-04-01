/**
 * startup.ts — runs once at server boot in production.
 *
 * Ensures the two first-class Supabase accounts always have matching rows in
 * the user_profiles table.  If the rows are missing (e.g. fresh Render DB),
 * they are auto-created so the app works without manual DB seeding.
 */

import { supabaseAdmin } from "./lib/supabase";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

const SEED_USERS: Array<{
  email: string;
  role: "super_admin" | "practice_admin" | "demo";
  full_name: string;
}> = [
  { email: "hello@joinrippl.com", role: "super_admin",  full_name: "Rippl Admin" },
  { email: "demo@joinrippl.com",  role: "demo",         full_name: "Demo Account" },
];

export async function seedDefaultProfiles(): Promise<void> {
  try {
    // Fetch all Supabase auth users (returns up to 1000 by default)
    const listResult = await supabaseAdmin.auth.admin.listUsers();
    if (listResult.error) {
      logger.warn({ error: listResult.error.message }, "[startup] Could not list Supabase users — skipping profile seed");
      return;
    }
    const users = listResult.data.users;

    for (const seed of SEED_USERS) {
      const authUser = users.find(u => u.email === seed.email);
      if (!authUser) {
        logger.warn({ email: seed.email }, "[startup] Supabase auth user not found — skipping");
        continue;
      }

      // Check if a profile row already exists
      const [existing] = await db
        .select({ id: userProfilesTable.id })
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, authUser.id))
        .limit(1);

      if (existing) {
        logger.info({ email: seed.email, id: authUser.id }, "[startup] Profile already exists — OK");
        continue;
      }

      // Create the missing profile
      await db.insert(userProfilesTable).values({
        id:          authUser.id,
        role:        seed.role,
        practice_id: null,
        full_name:   seed.full_name,
      });

      logger.info({ email: seed.email, role: seed.role, id: authUser.id }, "[startup] Created missing user profile");
    }
  } catch (err) {
    // Non-fatal — log clearly but do not crash the server.
    // If the user_profiles table doesn't exist yet (schema not pushed), this
    // will log the error so the engineer knows exactly what to fix.
    logger.error({ err }, "[startup] seedDefaultProfiles failed — check DB schema and user_profiles table");
  }
}
