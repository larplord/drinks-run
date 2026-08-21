import { ensureDatabase } from "@/db";
import { type OrderStatus } from "@/db/schema";

export type AdminOrderItem = {
  id: string;
  catalogId: string;
  name: string;
  detail: string;
  flavor: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type AdminOrder = {
  id: string;
  customerName: string;
  partyName: string;
  partyDate: string;
  paymentMethod: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  items: AdminOrderItem[];
};

export type ShoppingItem = {
  catalogId: string;
  name: string;
  detail: string;
  flavor: string | null;
  quantity: number;
};

export type CustomerProfile = {
  id: string;
  name: string;
  description: string;
  totalPaidCents: number;
  orderCount: number;
  drinkCount: number;
  topDrinks: { name: string; quantity: number }[];
};

type OrderRow = {
  id: string;
  customer_name: string;
  party_name: string;
  party_date: string;
  payment_method: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
};

type ItemRow = {
  id: string;
  order_id: string;
  catalog_id: string;
  item_name: string;
  item_detail: string;
  flavor: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export async function getAdminDashboardData(): Promise<{
  orders: AdminOrder[];
  shoppingList: ShoppingItem[];
  profiles: CustomerProfile[];
}> {
  const db = await ensureDatabase();
  const { rows: orderRows } = await db.query<OrderRow>(
    `SELECT id, customer_name, party_name, party_date, payment_method,
            status, total_cents, created_at::text AS created_at
       FROM orders
      ORDER BY created_at DESC, id DESC
      LIMIT 100`,
  );

  const orderIds = orderRows.map((order) => order.id);
  const itemRows = orderIds.length
    ? (
        await db.query<ItemRow>(
          `SELECT id, order_id, catalog_id, item_name, item_detail, flavor,
                  unit_price_cents, quantity, line_total_cents
             FROM order_items
            WHERE order_id = ANY($1::text[])
            ORDER BY item_name ASC, item_detail ASC`,
          [orderIds],
        )
      ).rows
    : [];

  const itemsByOrder = new Map<string, AdminOrderItem[]>();
  for (const item of itemRows) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push({
      id: item.id,
      catalogId: item.catalog_id,
      name: item.item_name,
      detail: item.item_detail,
      flavor: item.flavor,
      unitPriceCents: Number(item.unit_price_cents),
      quantity: Number(item.quantity),
      lineTotalCents: Number(item.line_total_cents),
    });
    itemsByOrder.set(item.order_id, current);
  }

  const { rows: shoppingRows } = await db.query<ShoppingItem>(
    `SELECT oi.catalog_id AS "catalogId", oi.item_name AS name,
            oi.item_detail AS detail, oi.flavor,
            SUM(oi.quantity)::integer AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'paid'
      GROUP BY oi.catalog_id, oi.item_name, oi.item_detail, oi.flavor
      ORDER BY oi.item_name ASC, oi.item_detail ASC, oi.flavor ASC`,
  );

  const { rows: profileRows } = await db.query<{
    id: string; name: string; description: string; total_paid_cents: number;
    order_count: number; drink_count: number;
  }>(
    `SELECT p.id, p.name, p.description,
            COALESCE((SELECT SUM(o.total_cents) FROM orders o WHERE LOWER(TRIM(o.customer_name)) = LOWER(TRIM(p.name)) AND o.status IN ('paid', 'purchased')), 0)::integer AS total_paid_cents,
            (SELECT COUNT(*) FROM orders o WHERE LOWER(TRIM(o.customer_name)) = LOWER(TRIM(p.name)))::integer AS order_count,
            COALESCE((SELECT SUM(oi.quantity) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE LOWER(TRIM(o.customer_name)) = LOWER(TRIM(p.name)) AND o.status IN ('paid', 'purchased')), 0)::integer AS drink_count
       FROM customer_profiles p
      ORDER BY p.name ASC`,
  );
  const { rows: drinkRows } = await db.query<{ profile_id: string; name: string; quantity: number }>(
    `SELECT p.id AS profile_id, oi.item_name AS name, SUM(oi.quantity)::integer AS quantity
       FROM customer_profiles p
       JOIN orders o ON LOWER(TRIM(o.customer_name)) = LOWER(TRIM(p.name))
       JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('paid', 'purchased')
      GROUP BY p.id, oi.item_name
      ORDER BY p.id, quantity DESC`,
  );
  const drinksByProfile = new Map<string, { name: string; quantity: number }[]>();
  for (const drink of drinkRows) {
    const list = drinksByProfile.get(drink.profile_id) ?? [];
    if (list.length < 5) list.push({ name: drink.name, quantity: Number(drink.quantity) });
    drinksByProfile.set(drink.profile_id, list);
  }

  return {
    orders: orderRows.map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      partyName: order.party_name,
      partyDate: order.party_date,
      paymentMethod: order.payment_method,
      status: order.status,
      totalCents: Number(order.total_cents),
      createdAt: order.created_at,
      items: itemsByOrder.get(order.id) ?? [],
    })),
    shoppingList: shoppingRows.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    })),
    profiles: profileRows.map((profile) => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      totalPaidCents: Number(profile.total_paid_cents),
      orderCount: Number(profile.order_count),
      drinkCount: Number(profile.drink_count),
      topDrinks: drinksByProfile.get(profile.id) ?? [],
    })),
  };
}

