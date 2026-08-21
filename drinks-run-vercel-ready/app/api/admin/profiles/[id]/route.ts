import { ensureDatabase } from "@/db";
import { getOwnerApiAccess } from "@/app/owner-auth";
import { jsonResponse, requireSameOrigin, RequestError } from "@/app/api/_lib/http";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    requireSameOrigin(request);
    const access = await getOwnerApiAccess();
    if (!access.allowed) return jsonResponse({ error: "Not allowed." }, { status: 403 });
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new RequestError(400, "Invalid profile.");
    const db = await ensureDatabase();
    const result = await db.query("DELETE FROM customer_profiles WHERE id = $1", [id]);
    if (!result.rowCount) return jsonResponse({ error: "Profile not found." }, { status: 404 });
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, { status: error.status });
    return jsonResponse({ error: "The profile could not be deleted." }, { status: 503 });
  }
}

