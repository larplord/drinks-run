import { ensureDatabase } from "@/db";
import { getOwnerApiAccess } from "@/app/owner-auth";
import { isRecord, jsonResponse, readLimitedJson, RequestError, requireSameOrigin } from "@/app/api/_lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const access = await getOwnerApiAccess();
    if (!access.allowed) return jsonResponse({ error: "Not allowed." }, { status: 403 });
    const payload = await readLimitedJson(request, 4096);
    if (!isRecord(payload) || typeof payload.name !== "string" || typeof payload.description !== "string") {
      throw new RequestError(400, "Enter a profile name and description.");
    }
    const name = payload.name.trim().replace(/\s+/g, " ");
    const description = payload.description.trim().replace(/\s+/g, " ");
    if (!name || name.length > 80) throw new RequestError(400, "Profile name must be 1–80 characters.");
    if (description.length > 240) throw new RequestError(400, "Description must be 240 characters or less.");
    const db = await ensureDatabase();
    const { rows } = await db.query(
      `INSERT INTO customer_profiles (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description`,
      [crypto.randomUUID(), name, description],
    );
    return jsonResponse({ profile: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, { status: error.status });
    return jsonResponse({ error: "The profile could not be saved." }, { status: 503 });
  }
}

