/**
 * startup.ts — runs once at server boot in production.
 *
 * Best-effort seed of user_profiles for known bootstrap accounts.
 * This is a convenience backup only — the real self-healing logic lives
 * in requireAuth / getProfileHandler which auto-create profiles on first login.
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
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceKey) {
    logger.warn(
      { hasUrl: !!supabaseUrl, hasKey: !!serviceKey },
      "[startup] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — " +
      "seeder skipped. Profiles will be auto-created on first login instead."
    );
    return;
  }

  try {
    logger.info("[startup] Fetching Supabase auth users to seed default profiles…");

    const listResult = await supabaseAdmin.auth.admin.listUsers();
    if (listResult.error) {
      logger.warn(
        { error: listResult.error.message },
        "[startup] Could not list Supabase users — seeder skipped. " +
        "Check SUPABASE_SERVICE_ROLE_KEY permissions. Profiles auto-created on first login."
      );
      return;
    }

    const users = listResult.data.users;
    logger.info({ count: users.length }, "[startup] Supabase returned auth users");

    for (const seed of SEED_USERS) {
      const authUser = users.find(u => u.email === seed.email);
      if (!authUser) {
        logger.warn({ email: seed.email }, "[startup] Auth user not found in Supabase — will be seeded on first login");
        continue;
      }

      const [existing] = await db
        .select({ id: userProfilesTable.id })
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, authUser.id))
        .limit(1);

      if (existing) {
        logger.info({ email: seed.email, id: authUser.id }, "[startup] Profile already exists — OK");
        continue;
      }

      await db
        .insert(userProfilesTable)
        .values({ id: authUser.id, role: seed.role, practice_id: null, full_name: seed.full_name })
        .onConflictDoNothing();

      logger.info({ email: seed.email, role: seed.role, id: authUser.id }, "[startup] Created missing user profile");
    }

    logger.info("[startup] Profile seed complete");
  } catch (err) {
    logger.error({ err }, "[startup] seedDefaultProfiles failed — profiles will be auto-created on first login");
  }
}
