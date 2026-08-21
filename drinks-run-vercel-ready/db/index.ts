import { Pool } from "pg";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_payment'
      CHECK (status IN ('awaiting_payment', 'paid', 'purchased')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    catalog_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_detail TEXT NOT NULL,
    flavor TEXT,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 12),
    line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS customer_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_customer_profiles_name
    ON customer_profiles(name);
`;

declare global {
  var drinksRunPool: Pool | undefined;
  var drinksRunSchema: Promise<void> | undefined;
}

export function getPool(): Pool {
  const configuredConnectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!configuredConnectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Connect a Postgres storage integration in Vercel and redeploy.",
    );
  }

  if (!globalThis.drinksRunPool) {
    // pg lets an sslmode query parameter override the explicit ssl object.
    // Remove it so hosted Supabase connections use the deployment's TLS
    // connection while tolerating the provider's self-signed chain.
    const connectionString = configuredConnectionString.replace(
      /([?&])sslmode=[^&]*/i,
      "$1",
    ).replace(/[?&]$/, "");
    globalThis.drinksRunPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  return globalThis.drinksRunPool;
}

export async function ensureDatabase(): Promise<Pool> {
  const pool = getPool();
  globalThis.drinksRunSchema ??= pool.query(SCHEMA_SQL).then(() => undefined);
  await globalThis.drinksRunSchema;
  return pool;
}

