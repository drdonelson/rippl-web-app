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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Look up user profile
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, user.id))
      .limit(1);

    if (!profile) {
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
    console.error("[auth] Error verifying token:", err);
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

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(profile);
}
