import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Never expose the customer key to the frontend — select only safe columns
const safeColumns = {
  id:       officesTable.id,
  name:     officesTable.name,
  location: officesTable.location,
  active:   officesTable.active,
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

export default router;
