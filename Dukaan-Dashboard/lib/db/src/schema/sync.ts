import { pgTable, text, bigint, uniqueIndex, index } from "drizzle-orm/pg-core";

export const syncOperations = pgTable(
  "sync_operations",
  {
    operationId: text("operation_id").primaryKey(),
    shopId: text("shop_id").notNull(),
    deviceId: text("device_id").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation").notNull(),
    payload: text("payload").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    serverAt: bigint("server_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("sync_operations_shop_operation_idx").on(table.shopId, table.operationId),
    index("sync_operations_shop_server_idx").on(table.shopId, table.serverAt),
  ],
);

export type SyncOperation = typeof syncOperations.$inferSelect;
export type NewSyncOperation = typeof syncOperations.$inferInsert;
