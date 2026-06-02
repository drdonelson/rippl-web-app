import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProfilesTable, officesTable, practicesTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";
import { sendEmail } from "../lib/email";
import { supabaseAdmin } from "../lib/supabase";
import { getProfileHandler, requireAuth, requireSuperAdmin, requirePracticeAdmin } from "../middleware/auth";

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "hello@joinrippl.com";

const router: IRouter = Router();

// GET /api/auth/profile — returns the user_profile for the given x-user-id header
router.get("/profile", getProfileHandler);

// POST /api/auth/onboard — create a new practice admin account (super_admin only)
// Body: { practice_name, doctor_name, email, password, location_code, vertical?,
//         customer_key?, od_url?,           ← dental
//         integration_config?,              ← automotive / salon / other
//         white_label_name?, white_label_logo_url?, white_label_primary_color?,
//         show_powered_by_rippl?,
//         in_house_credit_label?, in_house_credit_value?,
//         practice_id? }
// If practice_id is provided the office is linked to an existing practice.
router.post("/onboard", requireAuth, requireSuperAdmin, async (req, res) => {
  const {
    practice_name, doctor_name, email, password, location_code,
    vertical = "dental",
    customer_key, od_url,
    integration_config,
    white_label_name, white_label_logo_url, white_label_primary_color,
    show_powered_by_rippl,
    in_house_credit_label, in_house_credit_value,
    practice_id: bodyPracticeId,
  } = req.body;

  const isDental = vertical === "dental";

  if (!practice_name || !email || !password || !location_code) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (isDental && !customer_key) {
    res.status(400).json({ error: "customer_key is required for dental practices" });
    return;
  }

  let userId: string | null = null;
  let officeId: string | null = null;
  let createdPracticeId: string | null = null;

  try {
    // 1. Resolve or create the practice
    let practiceId: string;
    if (bodyPracticeId) {
      const [existing] = await db.select({ id: practicesTable.id }).from(practicesTable).where(eq(practicesTable.id, bodyPracticeId));
      if (!existing) {
        res.status(400).json({ error: "practice_id not found" });
        return;
      }
      practiceId = existing.id;
    } else {
      const [newPractice] = await db.insert(practicesTable).values({
        name:                    practice_name,
        slug:                    practice_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        vertical:                String(vertical),
        integration_config:      integration_config ?? {},
        white_label_name:        white_label_name ?? null,
        white_label_logo_url:    white_label_logo_url ?? null,
        white_label_primary_color: white_label_primary_color ? String(white_label_primary_color).replace("#", "") : undefined,
        show_powered_by_rippl:   show_powered_by_rippl !== undefined ? Boolean(show_powered_by_rippl) : true,
        in_house_credit_label:   in_house_credit_label ?? (isDental ? "$100 Dental Account Credit" : "$100 Account Credit"),
        in_house_credit_value:   in_house_credit_value !== undefined ? Number(in_house_credit_value) : 100,
      }).returning();
      practiceId = newPractice.id;
      createdPracticeId = practiceId;
    }

    // 2. Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });

    if (authError || !authData.user) {
      if (createdPracticeId) await db.delete(practicesTable).where(eq(practicesTable.id, createdPracticeId)).catch(() => {});
      res.status(400).json({ error: authError?.message ?? "Failed to create auth user" });
      return;
    }

    userId = authData.user.id;

    // 3. Create office record (customer_key nullable for non-dental)
    const [office] = await db.insert(officesTable).values({
      practice_id: practiceId,
      name:         practice_name,
      customer_key: isDental ? customer_key : null,
      location_code,
      od_url:       isDental ? (od_url || null) : null,
      active:       true,
      agreement_accepted_at: new Date(),
    }).returning();
    officeId = office.id;

    // 4. Create user_profile
    await db.insert(userProfilesTable).values({
      id: userId, role: "practice_admin",
      practice_id: practiceId, office_id: null,
      full_name: doctor_name || null,
    });

    // 5. Welcome email (non-fatal)
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
      if (!linkError && linkData?.properties?.action_link && process.env.BREVO_API_KEY) {
        await sendEmail({
          to:      email,
          from:    { email: FROM_EMAIL, name: "Rippl" },
          subject: "Welcome to Rippl — set up your account",
          html: `<p>Hi${doctor_name ? ` ${doctor_name}` : ""},</p>
<p>Your Rippl practice account has been created. Click the link below to set your password and get started:</p>
<p><a href="${linkData.properties.action_link}">Set up my account</a></p>
<p>If you have any questions, reply to this email.</p>
<p>— The Rippl Team</p>`,
        });
      }
    } catch (emailErr) {
      console.warn("[onboard] Welcome email failed (non-fatal):", emailErr);
    }

    res.status(201).json({ success: true, office_id: office.id, practice_id: practiceId });
  } catch (err) {
    console.error("[onboard] Error:", err);
    if (userId)           await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    if (officeId)         await db.delete(officesTable).where(eq(officesTable.id, officeId)).catch(() => {});
    if (createdPracticeId) await db.delete(practicesTable).where(eq(practicesTable.id, createdPracticeId)).catch(() => {});
    res.status(500).json({ error: "Failed to create practice admin account" });
  }
});

// POST /api/auth/onboard-staff — create a staff account for an office
// super_admin or practice_admin must provide office_id in body
// practice_admin: can only assign staff to offices in their own practice
router.post("/onboard-staff", requireAuth, requirePracticeAdmin, async (req, res) => {
  const caller = req.authUser!;
  const { email, password, full_name, office_id: bodyOfficeId } = req.body;

  if (!email || !password || !bodyOfficeId) {
    res.status(400).json({ error: "Missing required fields: email, password, office_id" });
    return;
  }

  const allLocations = bodyOfficeId === "all";

  let userId: string | null = null;

  try {
    let role: string;
    let assignedOfficeId: string | null;
    let practiceId: string | null;

    if (allLocations) {
      // practice_admin uses their own practice_id; super_admin must supply one in the body
      const resolvedPracticeId: string | null = caller.practice_id ?? (req.body.practice_id as string | undefined) ?? null;
      if (!resolvedPracticeId) {
        res.status(400).json({ error: "Cannot create all-locations staff without a practice context" });
        return;
      }
      role = "staff_all";
      assignedOfficeId = null;
      practiceId = resolvedPracticeId;
    } else {
      // 1. Verify the office exists (and belongs to caller's practice if practice_admin)
      const [office] = await db.select().from(officesTable).where(eq(officesTable.id, bodyOfficeId));
      if (!office) {
        res.status(400).json({ error: "Office not found" });
        return;
      }
      if (caller.role === "practice_admin" && office.practice_id !== caller.practice_id) {
        res.status(403).json({ error: "Cannot create staff for another practice's office" });
        return;
      }
      role = `staff_${office.location_code}`;
      assignedOfficeId = office.id;
      practiceId = office.practice_id ?? null;
    }

    // 2. Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message ?? "Failed to create auth user" });
      return;
    }

    userId = authData.user.id;

    // 3. Create user_profile
    await db.insert(userProfilesTable).values({
      id: userId,
      role,
      practice_id: practiceId,
      office_id: assignedOfficeId,
      full_name: full_name || null,
    });

    res.status(201).json({ success: true, role, office_id: assignedOfficeId });
  } catch (err) {
    console.error("[onboard-staff] Error:", err);
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(e =>
        console.error("[onboard-staff] Failed to clean up orphaned auth user:", e)
      );
    }
    res.status(500).json({ error: "Failed to create staff account" });
  }
});

// GET /api/auth/staff-accounts — list staff/admin profiles
// super_admin: all staff + practice_admin accounts; practice_admin: only their practice's accounts
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
        office_id:   userProfilesTable.office_id,
        created_at:  userProfilesTable.created_at,
        office_name: officesTable.name,
        location_code: officesTable.location_code,
      })
      .from(userProfilesTable)
      .leftJoin(officesTable, eq(userProfilesTable.office_id, officesTable.id));

    const staffOrAdmin = or(like(userProfilesTable.role, "staff_%"), eq(userProfilesTable.role, "practice_admin"));
    const profiles = caller.role === "practice_admin" && caller.practice_id
      ? await query.where(staffOrAdmin).then(rows => rows.filter(r => r.practice_id === caller.practice_id))
      : await query.where(staffOrAdmin);

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
      office_id:     p.office_id ?? "",
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
