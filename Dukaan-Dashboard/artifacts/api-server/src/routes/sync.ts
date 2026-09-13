import { Router } from "express";
import { db, syncOperations } from "@workspace/db";
import { and, asc, eq, gt } from "drizzle-orm";

const router = Router();

function validOperation(op: any): boolean {
  return !!op && typeof op.operationId === "string" && !!op.operationId &&
    typeof op.entity === "string" && !!op.entity &&
    typeof op.entityId === "string" && !!op.entityId &&
    ["create", "update", "delete"].includes(op.operation) &&
    typeof op.createdAt === "number";
}

router.post("/sync/push", async (req, res) => {
  const shopId = typeof req.body?.shopId === "string" ? req.body.shopId.trim() : "";
  const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";
  const operations = Array.isArray(req.body?.operations) ? req.body.operations : null;
  if (!shopId || !deviceId || !operations) return res.status(400).json({ ok: false, error: "shopId, deviceId and operations are required" });
  if (operations.length > 200 || operations.some((op: any) => !validOperation(op))) return res.status(400).json({ ok: false, error: "Invalid sync operation batch" });

  try {
    const serverAt = Date.now();
    if (operations.length) {
      await db.insert(syncOperations).values(operations.map((op: any) => ({
        operationId: op.operationId, shopId, deviceId, entity: op.entity, entityId: op.entityId,
        operation: op.operation, payload: JSON.stringify(op.payload ?? null), createdAt: op.createdAt, serverAt,
      }))).onConflictDoNothing();
    }
    return res.json({ ok: true, accepted: operations.map((op: any) => op.operationId), serverTime: serverAt, persisted: true });
  } catch (error) {
    req.log.error({ err: error }, "sync push failed");
    return res.status(503).json({ ok: false, error: "Sync persistence is unavailable" });
  }
});

router.get("/sync/pull", async (req, res) => {
  const shopId = typeof req.query.shopId === "string" ? req.query.shopId.trim() : "";
  const since = typeof req.query.since === "string" ? Number(req.query.since) : 0;
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));
  if (!shopId || !Number.isFinite(since) || since < 0) return res.status(400).json({ ok: false, error: "shopId and valid since are required" });

  try {
    const rows = await db.select().from(syncOperations)
      .where(and(eq(syncOperations.shopId, shopId), gt(syncOperations.serverAt, since)))
      .orderBy(asc(syncOperations.serverAt)).limit(limit);
    const operations = rows.map(row => ({
      operationId: row.operationId, entity: row.entity, entityId: row.entityId, operation: row.operation,
      payload: JSON.parse(row.payload), createdAt: row.createdAt, serverAt: row.serverAt, deviceId: row.deviceId,
    }));
    return res.json({ ok: true, operations, serverTime: Date.now(), persisted: true });
  } catch (error) {
    req.log.error({ err: error }, "sync pull failed");
    return res.status(503).json({ ok: false, error: "Sync persistence is unavailable" });
  }
});

export default router;
