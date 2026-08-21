import { ensureDatabase } from "@/db";
import { catalog, paymentMethods } from "@/lib/catalog";
import {
  hasOnlyKeys,
  isRecord,
  jsonResponse,
  readLimitedJson,
  RequestError,
  requireSameOrigin,
} from "@/app/api/_lib/http";

const MAX_BODY_BYTES = 16 * 1024;
const ORDER_KEYS = [
  "customerName",
  "partyName",
  "partyDate",
  "paymentMethod",
  "ageConfirmed",
  "paymentAcknowledged",
  "website",
  "items",
] as const;
const ITEM_KEYS = ["id", "quantity", "flavor"] as const;

type ValidatedItem = {
  id: string;
  quantity: number;
  flavor: string | null;
  catalogItem: (typeof catalog)[number];
};

type ValidatedOrder = {
  customerName: string;
  partyName: string;
  partyDate: string;
  paymentMethod: (typeof paymentMethods)[number];
  items: ValidatedItem[];
};

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const payload = await readLimitedJson(request, MAX_BODY_BYTES);

    if (!isRecord(payload)) {
      throw new RequestError(400, "Order details are required.");
    }

    // A filled honeypot is accepted without writing data so automated spam does
    // not get a useful signal about the filter.
    if (typeof payload.website === "string" && payload.website.length > 0) {
      return jsonResponse(
        { orderId: crypto.randomUUID(), totalCents: 0 },
        { status: 201 },
      );
    }

    const db = await ensureDatabase();
    const availableCatalog = await getAvailableCatalog(db);
    const order = validateOrder(payload, availableCatalog);
    const orderId = crypto.randomUUID();
    const totalCents = order.items.reduce(
      (total, item) => total + item.catalogItem.priceCents * item.quantity,
      0,
    );

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO orders
          (id, customer_name, party_name, party_date, payment_method, status, total_cents)
         VALUES ($1, $2, $3, $4, $5, 'awaiting_payment', $6)`,
        [
          orderId,
          order.customerName,
          order.partyName,
          order.partyDate,
          order.paymentMethod,
          totalCents,
        ],
      );
      for (const { catalogItem, quantity, flavor } of order.items) {
        await client.query(
          `INSERT INTO order_items
            (id, order_id, catalog_id, item_name, item_detail, flavor,
             unit_price_cents, quantity, line_total_cents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            orderId,
            catalogItem.id,
            catalogItem.name,
            catalogItem.detail,
            flavor,
            catalogItem.priceCents,
            quantity,
            catalogItem.priceCents * quantity,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return jsonResponse(
      { orderId, totalCents, status: "awaiting_payment" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }

    return jsonResponse(
      { error: "Orders are temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}

function validateOrder(payload: Record<string, unknown>, availableCatalog: CatalogItem[]): ValidatedOrder {
  if (!hasOnlyKeys(payload, ORDER_KEYS)) {
    throw new RequestError(400, "The order contains unsupported fields.");
  }
  if (payload.website !== "") {
    throw new RequestError(400, "The order form is incomplete.");
  }

  const customerName = requiredText(payload.customerName, "name", 80);
  const partyName = requiredText(payload.partyName, "party name", 100);
  const partyDate = validateDate(payload.partyDate);

  if (
    typeof payload.paymentMethod !== "string" ||
    !paymentMethods.includes(
      payload.paymentMethod as (typeof paymentMethods)[number],
    )
  ) {
    throw new RequestError(400, "Choose a valid payment method.");
  }

  if (payload.ageConfirmed !== true) {
    throw new RequestError(400, "You must confirm that you are 21 or older.");
  }
  if (payload.paymentAcknowledged !== true) {
    throw new RequestError(400, "You must agree to pay before the store run.");
  }

  if (
    !Array.isArray(payload.items) ||
    payload.items.length < 1 ||
    payload.items.length > availableCatalog.length
  ) {
    throw new RequestError(400, "Choose at least one valid menu item.");
  }

  const seenIds = new Set<string>();
  const items = payload.items.map((value): ValidatedItem => {
    if (!isRecord(value) || !hasOnlyKeys(value, ITEM_KEYS)) {
      throw new RequestError(400, "An order item is invalid.");
    }
    if (typeof value.id !== "string" || seenIds.has(value.id)) {
      throw new RequestError(400, "Each menu item can appear only once.");
    }
    const catalogItem = availableCatalog.find((item) => item.id === value.id);
    if (!catalogItem) {
      throw new RequestError(400, "An order item is not on the current menu.");
    }
    if (!Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 12) {
      throw new RequestError(400, "Item quantities must be between 1 and 12.");
    }

    const flavor = optionalText(value.flavor, "flavor", 80);
    seenIds.add(value.id);
    return {
      id: value.id,
      quantity: Number(value.quantity),
      flavor,
      catalogItem,
    };
  });

  return {
    customerName,
    partyName,
    partyDate,
    paymentMethod: payload.paymentMethod as (typeof paymentMethods)[number],
    items,
  };
}

type CatalogItem = (typeof catalog)[number];

async function getAvailableCatalog(db: Awaited<ReturnType<typeof ensureDatabase>>): Promise<CatalogItem[]> {
  const { rows } = await db.query<{ id: string; name: string; detail: string; price_cents: number; image_url: string | null }>(
    `SELECT id, name, detail, price_cents, image_url FROM custom_drinks WHERE status = 'approved'`,
  );
  return [...catalog, ...rows.map((item) => ({
    id: item.id, name: item.name, detail: item.detail, priceCents: Number(item.price_cents),
    imagePath: item.image_url ?? undefined, tone: "coral" as const,
  }))];
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new RequestError(400, `Enter a valid ${label}.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new RequestError(400, `Enter a valid ${label}.`);
  }
  return normalized;
}

function optionalText(
  value: unknown,
  label: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new RequestError(400, `Enter a valid ${label}.`);
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw new RequestError(
      400,
      `Keep the ${label} to ${maxLength} characters or fewer.`,
    );
  }
  return normalized;
}

function validateDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RequestError(400, "Choose a valid party date.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    parsed.getUTCFullYear() < 2000 ||
    parsed.getUTCFullYear() > 2100
  ) {
    throw new RequestError(400, "Choose a valid party date.");
  }
  return value;
}

