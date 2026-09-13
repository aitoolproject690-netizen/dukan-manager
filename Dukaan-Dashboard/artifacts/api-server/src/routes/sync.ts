import { Router } from "express";

const router = Router();

/**
 * Sync transport foundation.
 * The mobile client sends immutable operation IDs so a retry can never be
 * interpreted as a new money movement. Persistence/auth will be added when
 * the cloud database is connected; this endpoint deliberately does not claim
 * to persist shop data yet.
 */
router.post("/sync/push", (req, res) => {
  const operations = Array.isArray(req.body?.operations) ? req.body.operations : null;
  if (!operations) return res.status(400).json({ ok: false, error: "operations array is required" });

  const invalid = operations.find((op: any) =>
    !op || typeof op.operationId !== "string" || !op.operationId ||
    typeof op.entity !== "string" || typeof op.entityId !== "string" ||
    !["create", "update", "delete"].includes(op.operation)
  );
  if (invalid) return res.status(400).json({ ok: false, error: "Invalid sync operation" });

  return res.json({
    ok: true,
    accepted: operations.map((op: any) => op.operationId),
    serverTime: Date.now(),
    persisted: false,
    message: "Transport validated; cloud persistence is not enabled yet."
  });
});

router.get("/sync/pull", (_req, res) => {
  return res.json({ ok: true, operations: [], serverTime: Date.now(), persisted: false });
});

export default router;
