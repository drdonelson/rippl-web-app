import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { UserProfile } from "@workspace/db/schema";

export type StaffRole = "staff_brentwood" | "staff_lewisburg" | "staff_greenbrier";
export type UserRole = "super_admin" | "practice_admin" | "demo" | StaffRole;

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: UserRole;
  practice_id: string | null;
}

export function isStaff(user: AuthUser): boolean {
  return user.role.startsWith("staff_");
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// Known first-party accounts that should always have a profile.
// These are auto-created on first login so the app never requires manual seeding.
const BOOTSTRAP_PROFILES: Record<string, { role: UserRole; full_name: string }> = {
  "hello@joinrippl.com": { role: "super_admin",  full_name: "Rippl Admin"   },
  "demo@joinrippl.com":  { role: "demo",          full_name: "Demo Account"  },
};

/**
 * Look up the user_profiles row for a given Supabase user.
 * If the row is missing AND the user's email is a known bootstrap account,
 * the row is created on the spot (self-healing).
 * Returns null only for unknown users who have not been onboarded.
 */
async function findOrCreateProfile(
  userId: string,
  email: string | undefined,
  logger: Request["log"],
): Promise<UserProfile | null> {
  // Fetch existing profile
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);

  if (existing) return existing;

  // No row — see if this is a bootstrap account we can auto-create
  const seed = email ? BOOTSTRAP_PROFILES[email] : undefined;
  if (!seed) {
    logger.warn({ userId, email }, "[auth] No user_profiles row and not a known account — access denied");
    return null;
  }

  logger.info({ userId, email, role: seed.role }, "[auth] Auto-creating missing profile for bootstrap account");

  const [created] = await db
    .insert(userProfilesTable)
    .values({ id: userId, role: seed.role, practice_id: null, full_name: seed.full_name })
    .onConflictDoNothing()   // safe to call twice (race condition guard)
    .returning();

  // onConflictDoNothing returns [] if a concurrent insert won the race; re-fetch
  if (!created) {
    const [reloaded] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, userId))
      .limit(1);
    return reloaded ?? null;
  }

  return created;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization token" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Step 1: validate JWT with Supabase and get user identity (including email)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      req.log.warn({ supabaseError: error?.message }, "[auth] Supabase getUser rejected token");
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Step 2: look up (or auto-create) user_profiles row
    let profile: UserProfile | null;
    try {
      profile = await findOrCreateProfile(user.id, user.email, req.log);
    } catch (dbErr) {
      req.log.error({ err: dbErr, userId: user.id }, "[auth] DB error in findOrCreateProfile");
      res.status(500).json({ error: "Authentication error: database unavailable" });
      return;
    }

    if (!profile) {
      res.status(403).json({ error: "Your account has not been set up. Contact your administrator." });
      return;
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: profile.role as AuthUser["role"],
      practice_id: profile.practice_id,
    };

    next();
  } catch (err) {
    req.log.error({ err }, "[auth] Unexpected error in requireAuth");
    res.status(500).json({ error: "Authentication error" });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.authUser?.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}

// GET /api/auth/profile — called by the frontend immediately after Supabase login.
// Accepts x-user-id + Authorization header. Auto-creates profile for bootstrap accounts.
export async function getProfileHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(400).json({ error: "Missing x-user-id header" });
    return;
  }

  try {
    // Fast path: profile already exists
    const [existing] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, userId))
      .limit(1);

    if (existing) {
      res.json(existing);
      return;
    }

    // Profile missing — try to get the user's email to auto-create a bootstrap profile
    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(404).json({ error: "Profile not found. Contact your administrator." });
      return;
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }

    // Re-use the same auto-create logic
    const noop = { info: () => {}, warn: () => {}, error: () => {} } as unknown as Request["log"];
    const profile = await findOrCreateProfile(user.id, user.email, noop);
    if (!profile) {
      res.status(404).json({ error: "Profile not found. Contact your administrator." });
      return;
    }

    res.json(profile);
  } catch (err) {
    console.error("[auth/profile] Error:", err);
    res.status(500).json({ error: "Failed to load profile. Please try again." });
  }
}
