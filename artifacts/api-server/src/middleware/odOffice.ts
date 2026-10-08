import type { RequestHandler } from "express";
import { db } from "@workspace/db";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { assertTenant, RewardError } from "../services/rewardRedemption";

// Shared boundary for both OD import implementations. An authenticated user is not
// automatically allowed to read another practice's external patient database.
export const requireOdOffice: RequestHandler = async (req, res, next) => {
  const id = req.method === "GET" ? req.query.office_id : req.body?.office_id;
  if (typeof id !== "string" || !id.trim()) {
    res.status(400).json({ error: "office_id is required" });
    return;
  }
  const [office] = await db
    .select()
    .from(officesTable)
    .where(eq(officesTable.id, id.trim()));
  if (!office) {
    res.status(404).json({ error: "Office not found" });
    return;
  }
  try {
    assertTenant(office.practice_id, req.authUser);
  } catch (err) {
    if (err instanceof RewardError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
    return;
  }
  if (
    req.authUser?.role !== "super_admin" &&
    req.authUser?.office_id &&
    req.authUser.office_id !== office.id
  ) {
    res.status(403).json({ error: "Office access denied" });
    return;
  }
  res.locals.odOffice = office;
  next();
};
