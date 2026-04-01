import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: "super_admin" | "practice_admin" | "demo";
  practice_id: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization token" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Step 1: validate JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      req.log.warn({ supabaseError: error?.message }, "[auth] Supabase getUser rejected token");
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Step 2: look up user_profiles row
    let profile;
    try {
      const [row] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, user.id))
        .limit(1);
      profile = row;
    } catch (dbErr) {
      req.log.error({ err: dbErr, userId: user.id }, "[auth] DB error querying user_profiles — table may not exist");
      res.status(500).json({ error: "Authentication error: database unavailable" });
      return;
    }

    if (!profile) {
      req.log.warn({ userId: user.id, email: user.email }, "[auth] No user_profiles row — user not onboarded");
      res.status(403).json({ error: "No profile found for this user. Contact your administrator." });
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

// For the /api/auth/profile endpoint — no token needed, uses x-user-id header
// This is safe because it's called by the frontend after Supabase auth validates the session
export async function getProfileHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(400).json({ error: "Missing x-user-id header" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, userId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "Profile not found. Contact your administrator." });
      return;
    }

    res.json(profile);
  } catch (err) {
    console.error("[auth/profile] DB error:", err);
    res.status(500).json({ error: "Failed to load profile. Please try again." });
  }
}
