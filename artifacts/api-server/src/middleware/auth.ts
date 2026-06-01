import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { userProfilesTable, practicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { UserProfile } from "@workspace/db/schema";

export type StaffRole = "staff_brentwood" | "staff_lewisburg" | "staff_greenbrier" | "staff_all";
export type UserRole = "super_admin" | "practice_admin" | "demo" | StaffRole;

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: UserRole;
  /** UUID from practices table — used for cross-tenant isolation. NULL = super_admin / demo. */
  practice_id: string | null;
  /** UUID from offices table — used for intra-practice office scoping. NULL = sees all offices in practice. */
  office_id: string | null;
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

const BOOTSTRAP_PROFILES: Record<string, { role: UserRole; full_name: string }> = {
  "hello@joinrippl.com": { role: "super_admin", full_name: "Rippl Admin"  },
  "demo@joinrippl.com":  { role: "demo",         full_name: "Demo Account" },
};

async function findOrCreateProfile(
  userId: string,
  email: string | undefined,
  logger: Request["log"],
): Promise<UserProfile | null> {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);

  if (existing) return existing;

  const seed = email ? BOOTSTRAP_PROFILES[email] : undefined;
  if (!seed) {
    logger.warn({ userId, email }, "[auth] No user_profiles row and not a known account — access denied");
    return null;
  }

  logger.info({ userId, email, role: seed.role }, "[auth] Auto-creating missing profile for bootstrap account");

  const [created] = await db
    .insert(userProfilesTable)
    .values({ id: userId, role: seed.role, practice_id: null, office_id: null, full_name: seed.full_name })
    .onConflictDoNothing()
    .returning();

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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      req.log.warn({ supabaseError: error?.message }, "[auth] Supabase getUser rejected token");
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

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
      id:          user.id,
      email:       user.email,
      role:        profile.role as AuthUser["role"],
      practice_id: profile.practice_id ?? null,
      office_id:   profile.office_id   ?? null,
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

export function requirePracticeAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.authUser?.role;
  if (role !== "super_admin" && role !== "practice_admin") {
    res.status(403).json({ error: "Practice admin access required" });
    return;
  }
  next();
}

export async function getProfileHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(400).json({ error: "Missing x-user-id header" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, userId))
      .limit(1);

    if (existing) {
      let vertical: string | null = null;
      if (existing.practice_id) {
        const [practice] = await db.select({ vertical: practicesTable.vertical })
          .from(practicesTable)
          .where(eq(practicesTable.id, existing.practice_id))
          .limit(1);
        vertical = practice?.vertical ?? null;
      }
      res.json({ ...existing, vertical });
      return;
    }

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

    const noop = { info: () => {}, warn: () => {}, error: () => {} } as unknown as Request["log"];
    const profile = await findOrCreateProfile(user.id, user.email, noop);
    if (!profile) {
      res.status(404).json({ error: "Profile not found. Contact your administrator." });
      return;
    }

    let vertical: string | null = null;
    if (profile.practice_id) {
      const [practice] = await db.select({ vertical: practicesTable.vertical })
        .from(practicesTable)
        .where(eq(practicesTable.id, profile.practice_id))
        .limit(1);
      vertical = practice?.vertical ?? null;
    }
    res.json({ ...profile, vertical });
  } catch (err) {
    console.error("[auth/profile] Error:", err);
    res.status(500).json({ error: "Failed to load profile. Please try again." });
  }
}
