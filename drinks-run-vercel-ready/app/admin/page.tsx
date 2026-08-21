import { requireOwner } from "@/app/owner-auth";
import Link from "next/link";
import { getAdminDashboardData } from "./data";
import { StatusControl } from "./StatusControl";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

const statusLabels = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  purchased: "Purchased",
} as const;

export default async function AdminPage() {
  const owner = await requireOwner("/admin");
  const dashboard = await getAdminDashboardData();
  const awaitingPayment = dashboard.orders.filter(
    (order) => order.status === "awaiting_payment",
  ).length;
  const paid = dashboard.orders.filter((order) => order.status === "paid").length;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Private organizer view</p>
          <h1>Drinks run control</h1>
          <p>Signed in as {owner.email}</p>
        </div>
        <div className={styles.headerLinks}>
          <Link href="/">Open order form</Link>
          <a href="/api/admin/logout">Sign out</a>
        </div>
      </header>

      <section className={styles.stats} aria-label="Order totals">
        <article>
          <span>Awaiting payment</span>
          <strong>{awaitingPayment}</strong>
        </article>
        <article>
          <span>Paid and ready</span>
          <strong>{paid}</strong>
        </article>
        <article>
          <span>Recent orders</span>
          <strong>{dashboard.orders.length}</strong>
        </article>
      </section>

      <section className={styles.shoppingSection} aria-labelledby="shopping-title">
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>Store run</p>
            <h2 id="shopping-title">Shopping list</h2>
          </div>
          <p>Only paid orders are included. Mark an order purchased after you grab it.</p>
        </div>
        {dashboard.shoppingList.length ? (
          <div className={styles.shoppingGrid}>
            {dashboard.shoppingList.map((item) => (
              <article key={`${item.catalogId}:${item.name}:${item.detail}:${item.flavor ?? ""}`}>
                <strong>{item.quantity}×</strong>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.detail}</p>
                  {item.flavor ? (
                    <p className={styles.flavor}>Flavor: {item.flavor}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No paid orders are waiting to be purchased.</p>
        )}
      </section>

      <section className={styles.ordersSection} aria-labelledby="orders-title">
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>Newest first</p>
            <h2 id="orders-title">Orders</h2>
          </div>
          <p>The latest 100 orders are shown.</p>
        </div>

        {dashboard.orders.length ? (
          <div className={styles.orderList}>
            {dashboard.orders.map((order) => (
              <article className={styles.orderCard} key={order.id}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderMeta}>
                      <span className={`${styles.status} ${styles[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <h3>{order.customerName}</h3>
                    <p>
                      {order.partyName} · <time dateTime={order.partyDate}>{formatPartyDate(order.partyDate)}</time>
                    </p>
                  </div>
                  <strong className={styles.orderTotal}>{formatMoney(order.totalCents)}</strong>
                </div>

                <div className={styles.itemList}>
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <div className={styles.itemDescription}>
                        <span>
                          <b>{item.quantity}×</b> {item.name} · {item.detail}
                        </span>
                        {item.flavor ? (
                          <span className={styles.flavor}>Flavor: {item.flavor}</span>
                        ) : null}
                      </div>
                      <strong>{formatMoney(item.lineTotalCents)}</strong>
                    </div>
                  ))}
                </div>

                <footer className={styles.orderFooter}>
                  <div>
                    <span>Paying with {order.paymentMethod}</span>
                    <time dateTime={normalizeTimestamp(order.createdAt)}>
                      Ordered {formatTimestamp(order.createdAt)}
                    </time>
                  </div>
                  <div className={styles.statusControl}>
                    <StatusControl orderId={order.id} initialStatus={order.status} />
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No orders have been submitted yet.</p>
        )}
      </section>
    </main>
  );
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatPartyDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function normalizeTimestamp(value: string): string {
  const normalized = value.trim().includes("T")
    ? value.trim()
    : value.trim().replace(" ", "T");
  const withFullOffset = normalized.replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(withFullOffset);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(normalizeTimestamp(value)));
}
