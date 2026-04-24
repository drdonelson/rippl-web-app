import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProfilesTable, officesTable } from "@workspace/db/schema";
import { eq, like } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { getProfileHandler, requireAuth, requireSuperAdmin, requirePracticeAdmin } from "../middleware/auth";

const router: IRouter = Router();

// GET /api/auth/profile — returns the user_profile for the given x-user-id header
router.get("/profile", getProfileHandler);

// POST /api/auth/onboard — create a new practice admin account (super_admin only)
router.post("/onboard", requireAuth, requireSuperAdmin, async (req, res) => {
  const { practice_name, doctor_name, email, password, customer_key, location_code, od_url } = req.body;

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
      od_url: od_url || null,
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

// POST /api/auth/onboard-staff — create a staff account for an office
// super_admin: can specify any office_id in body
// practice_admin: always scoped to their own practice_id
router.post("/onboard-staff", requireAuth, requirePracticeAdmin, async (req, res) => {
  const caller = req.authUser!;
  const { email, password, full_name } = req.body;
  const office_id = caller.role === "practice_admin" ? caller.practice_id : req.body.office_id;

  if (!email || !password || !office_id) {
    res.status(400).json({ error: "Missing required fields: email, password, office_id" });
    return;
  }

  try {
    // 1. Verify the office exists (and belongs to caller if practice_admin)
    const [office] = await db.select().from(officesTable).where(eq(officesTable.id, office_id));
    if (!office) {
      res.status(400).json({ error: "Office not found" });
      return;
    }
    if (caller.role === "practice_admin" && office.id !== caller.practice_id) {
      res.status(403).json({ error: "Cannot create staff for another office" });
      return;
    }

    // 2. Derive staff role from the office location_code
    const role = `staff_${office.location_code}`;

    // 3. Create Supabase auth user
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

    // 4. Create user_profile with staff role + assigned office as practice_id
    await db.insert(userProfilesTable).values({
      id: userId,
      role,
      practice_id: office.id,
      full_name: full_name || null,
    });

    res.status(201).json({ success: true, role, office_id: office.id });
  } catch (err) {
    console.error("[onboard-staff] Error:", err);
    res.status(500).json({ error: "Failed to create staff account" });
  }
});

// GET /api/auth/staff-accounts — list staff profiles
// super_admin: all staff; practice_admin: only their office's staff
router.get("/staff-accounts", requireAuth, requirePracticeAdmin, async (req, res) => {
  const caller = req.authUser!;
  try {
    // 1. Fetch user_profiles with a staff_ role, scoped for practice_admin
    const query = db
      .select({
        id:          userProfilesTable.id,
        full_name:   userProfilesTable.full_name,
        role:        userProfilesTable.role,
        practice_id: userProfilesTable.practice_id,
        created_at:  userProfilesTable.created_at,
        office_name: officesTable.name,
        location_code: officesTable.location_code,
      })
      .from(userProfilesTable)
      .leftJoin(officesTable, eq(userProfilesTable.practice_id, officesTable.id));

    const profiles = caller.role === "practice_admin" && caller.practice_id
      ? await query.where(
          like(userProfilesTable.role, "staff_%")
        ).then(rows => rows.filter(r => r.practice_id === caller.practice_id))
      : await query.where(like(userProfilesTable.role, "staff_%"));

    if (profiles.length === 0) {
      res.json([]);
      return;
    }

    // 2. Fetch matching Supabase users for their emails
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of (authList?.users ?? [])) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    const result = profiles.map(p => ({
      id:            p.id,
      full_name:     p.full_name ?? "",
      email:         emailMap.get(p.id) ?? "(unknown)",
      role:          p.role,
      office_id:     p.practice_id ?? "",
      office_name:   p.office_name ?? "",
      location_code: p.location_code ?? "",
      created_at:    p.created_at,
    }));

    res.json(result);
  } catch (err) {
    console.error("[staff-accounts] Error:", err);
    res.status(500).json({ error: "Failed to fetch staff accounts" });
  }
});

// DELETE /api/auth/staff-accounts/:id — remove a staff account
// practice_admin: can only delete staff belonging to their office
router.delete("/staff-accounts/:id", requireAuth, requirePracticeAdmin, async (req, res) => {
  const { id } = req.params;
  const caller = req.authUser!;
  if (!id) { res.status(400).json({ error: "Missing id" }); return; }

  try {
    // For practice_admin, verify the target staff belongs to their office
    if (caller.role === "practice_admin") {
      const [target] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.id, id));
      if (!target || target.practice_id !== caller.practice_id) {
        res.status(403).json({ error: "Cannot delete staff from another office" });
        return;
      }
    }

    // 1. Delete from Supabase auth (ignore error if user doesn't exist there)
    await supabaseAdmin.auth.admin.deleteUser(id);

    // 2. Delete from user_profiles
    await db.delete(userProfilesTable).where(eq(userProfilesTable.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error("[staff-accounts delete] Error:", err);
    res.status(500).json({ error: "Failed to delete staff account" });
  }
});

export default router;
