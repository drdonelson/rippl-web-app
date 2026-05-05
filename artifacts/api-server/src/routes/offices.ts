import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, requirePracticeAdmin, requireSuperAdmin } from "../middleware/auth";

const router: IRouter = Router();

// Never expose the customer key to the frontend — select only safe columns
const safeColumns = {
  id:            officesTable.id,
  name:          officesTable.name,
  location_code: officesTable.location_code,
  logo_url:      officesTable.logo_url,
  active:        officesTable.active,
};

// GET /api/offices — return all offices (active and inactive), without credentials
router.get("/", async (_req, res) => {
  const offices = await db
    .select(safeColumns)
    .from(officesTable)
    .orderBy(officesTable.name);
  res.json(offices);
});

// GET /api/offices/active — return only active offices
router.get("/active", async (_req, res) => {
  const offices = await db
    .select(safeColumns)
    .from(officesTable)
    .where(eq(officesTable.active, true))
    .orderBy(officesTable.name);
  res.json(offices);
});

// GET /api/offices/managed — returns offices the caller can manage
// super_admin: all offices; practice_admin: only their own office
router.get("/managed", requireAuth, requirePracticeAdmin, async (req, res) => {
  const caller = req.authUser!;
  try {
    const offices = caller.role === "practice_admin" && caller.practice_id
      ? await db.select(safeColumns).from(officesTable).where(eq(officesTable.id, caller.practice_id))
      : await db.select(safeColumns).from(officesTable).orderBy(officesTable.name);
    res.json(offices);
  } catch (err) {
    console.error("[offices/managed] Error:", err);
    res.status(500).json({ error: "Failed to fetch offices" });
  }
});

// POST /api/offices/test-od — test OD connectivity (super_admin only)
router.post("/test-od", requireAuth, requireSuperAdmin, async (req, res) => {
  const { od_url, customer_key } = req.body as { od_url?: string; customer_key?: string };
  if (!od_url?.trim() || !customer_key?.trim()) {
    res.status(400).json({ error: "od_url and customer_key are required" });
    return;
  }
  const developerKey = process.env.OPEN_DENTAL_DEVELOPER_KEY?.trim();
  if (!developerKey) {
    res.status(500).json({ error: "Server not configured with developer key" });
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `${od_url.trim()}/api/v1/procedureCodes?Abbr=R0150`,
      {
        headers: { Authorization: `ODFHIR ${developerKey}/${customer_key.trim()}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (response.ok) {
      res.json({ ok: true });
    } else {
      res.json({ ok: "reachable" });
    }
  } catch (err: any) {
    clearTimeout(timeout);
    const isTimeout = err?.name === "AbortError";
    res.json({ ok: false, error: isTimeout ? "Connection timed out" : (err?.message ?? "Connection failed") });
  }
});

// PATCH /api/offices/:id — update active status (super_admin only)
router.patch("/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { active } = req.body as { active?: boolean };
  if (typeof active !== "boolean") {
    res.status(400).json({ error: "active (boolean) is required" });
    return;
  }
  try {
    const [office] = await db
      .update(officesTable)
      .set({ active })
      .where(eq(officesTable.id, id))
      .returning(safeColumns);
    if (!office) { res.status(404).json({ error: "Office not found" }); return; }
    res.json(office);
  } catch (err) {
    console.error("[offices/patch] Error:", err);
    res.status(500).json({ error: "Failed to update office" });
  }
});

// POST /api/offices/:id/logo — upload a logo and save the public URL
// Accepts JSON: { filename: string, mimeType: string, data: string (base64) }
router.post("/:id/logo", requireAuth, requirePracticeAdmin, async (req, res) => {
  const { id } = req.params;
  const caller = req.authUser!;
  const { filename, mimeType, data } = req.body;

  if (!filename || !mimeType || !data) {
    res.status(400).json({ error: "Missing filename, mimeType, or data" });
    return;
  }

  // practice_admin can only update their own office
  if (caller.role === "practice_admin" && caller.practice_id !== id) {
    res.status(403).json({ error: "Cannot update another office's logo" });
    return;
  }

  try {
    // Verify office exists
    const [office] = await db.select({ id: officesTable.id }).from(officesTable).where(eq(officesTable.id, id));
    if (!office) {
      res.status(404).json({ error: "Office not found" });
      return;
    }

    // Ensure the bucket exists (public)
    await supabaseAdmin.storage.createBucket("office-logos", { public: true }).catch(() => {});

    // Decode base64 → buffer
    const buffer = Buffer.from(data, "base64");
    const path = `${id}/${filename}`;

    // Upload to Supabase Storage (upsert so re-uploads work)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("office-logos")
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("[offices/logo] Upload error:", uploadError);
      res.status(500).json({ error: "Failed to upload logo" });
      return;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from("office-logos").getPublicUrl(path);
    const logo_url = urlData.publicUrl;

    // Save to DB
    await db.update(officesTable).set({ logo_url }).where(eq(officesTable.id, id));

    res.json({ success: true, logo_url });
  } catch (err) {
    console.error("[offices/logo] Error:", err);
    res.status(500).json({ error: "Failed to save logo" });
  }
});

// DELETE /api/offices/:id/logo — remove a logo
router.delete("/:id/logo", requireAuth, requirePracticeAdmin, async (req, res) => {
  const { id } = req.params;
  const caller = req.authUser!;

  if (caller.role === "practice_admin" && caller.practice_id !== id) {
    res.status(403).json({ error: "Cannot update another office's logo" });
    return;
  }

  try {
    await db.update(officesTable).set({ logo_url: null }).where(eq(officesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("[offices/logo delete] Error:", err);
    res.status(500).json({ error: "Failed to remove logo" });
  }
});

export default router;
