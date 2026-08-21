import { ensureDatabase } from "@/db";
import { isRecord, jsonResponse, readLimitedJson, RequestError, requireSameOrigin } from "@/app/api/_lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const payload = await readLimitedJson(request, 4096);
    if (!isRecord(payload) || typeof payload.name !== "string") throw new RequestError(400, "Enter a drink name.");
    const name = payload.name.trim().replace(/\s+/g, " ");
    const detail = typeof payload.detail === "string" ? payload.detail.trim().replace(/\s+/g, " ") : "Custom drink";
    if (!name || name.length > 80) throw new RequestError(400, "Drink name must be 1–80 characters.");
    if (detail.length > 100) throw new RequestError(400, "Keep the details under 100 characters.");
    const db = await ensureDatabase();
    await db.query(`INSERT INTO custom_drinks (id, name, detail) VALUES ($1, $2, $3)`, [crypto.randomUUID(), name, detail || "Custom drink"]);
    return jsonResponse({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, { status: error.status });
    return jsonResponse({ error: "The drink request could not be sent." }, { status: 503 });
  }
}

