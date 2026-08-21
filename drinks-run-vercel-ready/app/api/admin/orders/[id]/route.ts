import { ensureDatabase } from "@/db";
import { orderStatuses, type OrderStatus } from "@/db/schema";
import { getOwnerApiAccess } from "@/app/owner-auth";
import {
  hasOnlyKeys,
  isRecord,
  jsonResponse,
  readLimitedJson,
  RequestError,
  requireSameOrigin,
} from "@/app/api/_lib/http";

const MAX_BODY_BYTES = 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    requireSameOrigin(request);

    const access = await getOwnerApiAccess();
    if (!access.allowed) {
      return jsonResponse(
        { error: access.reason === "unauthenticated" ? "Sign in required." : "Not allowed." },
        { status: access.reason === "unauthenticated" ? 401 : 403 },
      );
    }

    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) {
      throw new RequestError(400, "Invalid order reference.");
    }

    const payload = await readLimitedJson(request, MAX_BODY_BYTES);
    if (!isRecord(payload) || !hasOnlyKeys(payload, ["status"])) {
      throw new RequestError(400, "Choose a valid order status.");
    }
    if (
      typeof payload.status !== "string" ||
      !orderStatuses.includes(payload.status as OrderStatus)
    ) {
      throw new RequestError(400, "Choose a valid order status.");
    }

    const status = payload.status as OrderStatus;
    const db = await ensureDatabase();
    const { rows } = await db.query<{ id: string; status: OrderStatus }>(
      `UPDATE orders
          SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, status`,
      [status, id],
    );
    const updated = rows[0];

    if (!updated) {
      return jsonResponse({ error: "Order not found." }, { status: 404 });
    }
    return jsonResponse({ order: updated });
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse(
      { error: "The order status could not be updated." },
      { status: 503 },
    );
  }
}
