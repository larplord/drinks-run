import { ensureDatabase } from "@/db";
import { catalog } from "@/lib/catalog";

export async function GET(): Promise<Response> {
  try {
    const db = await ensureDatabase();
    const { rows } = await db.query<{ id: string; name: string; detail: string; price_cents: number; image_url: string | null }>(
      `SELECT id, name, detail, price_cents, image_url FROM custom_drinks WHERE status = 'approved' ORDER BY approved_at ASC, name ASC`,
    );
    const custom = rows.map((item) => ({
      id: item.id, name: item.name, detail: item.detail, priceCents: Number(item.price_cents),
      imagePath: item.image_url ?? undefined, tone: "coral" as const,
    }));
    return Response.json({ catalog: [...catalog, ...custom] });
  } catch {
    return Response.json({ catalog }, { status: 200 });
  }
}

