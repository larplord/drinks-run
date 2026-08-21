import { ensureDatabase } from "@/db";
import { getOwnerApiAccess } from "@/app/owner-auth";
import { jsonResponse } from "@/app/api/_lib/http";

export async function GET(): Promise<Response> {
  const access = await getOwnerApiAccess();
  if (!access.allowed) return jsonResponse({ error: "Not allowed." }, { status: 403 });
  const db = await ensureDatabase();
  const { rows } = await db.query(`SELECT id, name, detail, price_cents, image_url, status, submitted_at::text AS submitted_at FROM custom_drinks ORDER BY submitted_at DESC`);
  return jsonResponse({ requests: rows });
}

