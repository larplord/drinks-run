import { ensureDatabase } from "@/db";
import { getOwnerApiAccess } from "@/app/owner-auth";
import { isRecord, jsonResponse, readLimitedJson, RequestError, requireSameOrigin } from "@/app/api/_lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    requireSameOrigin(request);
    const access = await getOwnerApiAccess();
    if (!access.allowed) return jsonResponse({ error: "Not allowed." }, { status: 403 });
    const payload = await readLimitedJson(request, 4096);
    if (!isRecord(payload) || payload.action !== "approve" || typeof payload.priceCents !== "number" || !Number.isInteger(payload.priceCents) || payload.priceCents < 1 || payload.priceCents > 100000) throw new RequestError(400, "Enter a valid price to approve this drink.");
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    if (imageUrl.length > 500) throw new RequestError(400, "Photo URL is too long.");
    const { id } = await context.params;
    const db = await ensureDatabase();
    const { rows } = await db.query(`UPDATE custom_drinks SET price_cents = $1, image_url = NULLIF($2, ''), status = 'approved', approved_at = NOW() WHERE id = $3 RETURNING id`, [payload.priceCents, imageUrl, id]);
    if (!rows[0]) return jsonResponse({ error: "Drink request not found." }, { status: 404 });
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, { status: error.status });
    return jsonResponse({ error: "The drink request could not be approved." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  requireSameOrigin(request);
  const access = await getOwnerApiAccess();
  if (!access.allowed) return jsonResponse({ error: "Not allowed." }, { status: 403 });
  const { id } = await context.params;
  const db = await ensureDatabase();
  await db.query(`UPDATE custom_drinks SET status = 'rejected' WHERE id = $1`, [id]);
  return jsonResponse({ ok: true });
}

