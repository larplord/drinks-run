import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orderStatuses = ["awaiting_payment", "paid", "purchased"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    customerName: text("customer_name").notNull(),
    partyName: text("party_name").notNull(),
    partyDate: text("party_date").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status", { enum: orderStatuses })
      .notNull()
      .default("awaiting_payment"),
    totalCents: integer("total_cents").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "orders_status_check",
      sql`${table.status} IN ('awaiting_payment', 'paid', 'purchased')`,
    ),
    check("orders_total_cents_check", sql`${table.totalCents} >= 0`),
    index("idx_orders_created_at").on(table.createdAt),
    index("idx_orders_status").on(table.status),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    catalogId: text("catalog_id").notNull(),
    itemName: text("item_name").notNull(),
    itemDetail: text("item_detail").notNull(),
    flavor: text("flavor"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [
    check("order_items_unit_price_check", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_check", sql`${table.quantity} BETWEEN 1 AND 12`),
    check("order_items_line_total_check", sql`${table.lineTotalCents} >= 0`),
    index("idx_order_items_order_id").on(table.orderId),
  ],
);
