import { Router } from "express";
import { db } from "@workspace/db";
import { staffPoolConfigsTable, staffPoolEntriesTable } from "@workspace/db/schema";
import { eq, sum, desc, and } from "drizzle-orm";
import { requireAuth, requirePracticeAdmin } from "../middleware/auth";

const router = Router();

// GET /api/practice/pool — config + running balance + last 30 entries
// Readable by any authenticated user scoped to a practice (staff, practice_admin)
router.get("/pool", requireAuth, async (req, res) => {
  const practice_id = req.authUser!.practice_id;
  if (!practice_id) {
    res.status(403).json({ error: "No practice associated with this account" });
    return;
  }

  // office_id scoping: role-assigned office takes precedence; super_admin uses query param
  const roleOfficeId  = req.authUser!.role !== "super_admin" ? (req.authUser!.office_id ?? null) : null;
  const queryOfficeId = (req.query["office_id"] as string | undefined)?.trim() || null;
  const officeId      = roleOfficeId ?? (queryOfficeId && queryOfficeId !== "all" ? queryOfficeId : null);

  const [config] = await db
    .select()
    .from(staffPoolConfigsTable)
    .where(eq(staffPoolConfigsTable.practice_id, practice_id));

  const filters = [
    eq(staffPoolEntriesTable.practice_id, practice_id),
    ...(officeId ? [eq(staffPoolEntriesTable.office_id, officeId)] : []),
  ];

  const [{ total }] = await db
    .select({ total: sum(staffPoolEntriesTable.amount) })
    .from(staffPoolEntriesTable)
    .where(and(...filters));

  const entries = await db
    .select()
    .from(staffPoolEntriesTable)
    .where(and(...filters))
    .orderBy(desc(staffPoolEntriesTable.created_at))
    .limit(30);

  res.json({
    config:         config ?? { enabled: false, amount_per_referral: 5 },
    balance:        parseInt(total ?? "0", 10),
    recent_entries: entries,
  });
});

// PUT /api/practice/pool — upsert config
router.put("/pool", requireAuth, requirePracticeAdmin, async (req, res) => {
  const practice_id = req.authUser!.practice_id;
  if (!practice_id) {
    res.status(403).json({ error: "No practice associated with this account" });
    return;
  }

  const enabled             = Boolean(req.body.enabled);
  const amount_per_referral = Math.max(1, parseInt(req.body.amount_per_referral, 10) || 10);

  const [config] = await db
    .insert(staffPoolConfigsTable)
    .values({ practice_id, enabled, amount_per_referral })
    .onConflictDoUpdate({
      target: staffPoolConfigsTable.practice_id,
      set:    { enabled, amount_per_referral, updated_at: new Date() },
    })
    .returning();

  res.json({ config });
});

export default router;
