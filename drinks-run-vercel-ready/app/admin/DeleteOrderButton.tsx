"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm("Delete this order permanently?")) return;
    setBusy(true);
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setBusy(false);
  }
  return <button className="deleteButton" type="button" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete order"}</button>;
}

