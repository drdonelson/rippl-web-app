import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProfilesTable, officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { getProfileHandler, requireAuth, requireSuperAdmin } from "../middleware/auth";

const router: IRouter = Router();

// GET /api/auth/profile — returns the user_profile for the given x-user-id header
router.get("/profile", getProfileHandler);

// POST /api/auth/onboard — create a new practice admin account (super_admin only)
router.post("/onboard", requireAuth, requireSuperAdmin, async (req, res) => {
  const { practice_name, doctor_name, email, password, customer_key, location_code } = req.body;

  if (!practice_name || !email || !password || !customer_key || !location_code) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message ?? "Failed to create auth user" });
      return;
    }

    const userId = authData.user.id;

    // 2. Create office record
    const [office] = await db.insert(officesTable).values({
      name: practice_name,
      customer_key,
      location_code,
      active: true,
    }).returning();

    // 3. Create user_profile
    await db.insert(userProfilesTable).values({
      id: userId,
      role: "practice_admin",
      practice_id: office.id,
      full_name: doctor_name || null,
    });

    res.status(201).json({ success: true, office_id: office.id });
  } catch (err) {
    console.error("[onboard] Error:", err);
    res.status(500).json({ error: "Failed to create practice admin account" });
  }
});

export default router;
