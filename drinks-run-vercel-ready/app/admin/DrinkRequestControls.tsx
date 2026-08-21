"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DrinkRequestControls({ id }: { id: string }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function approve() {
    const cents = Math.round(Number(price) * 100);
    if (!Number.isFinite(cents) || cents < 1) return;
    setBusy(true);
    const response = await fetch(`/api/admin/drink-requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", priceCents: cents, imageUrl }) });
    if (response.ok) router.refresh(); else setBusy(false);
  }
  async function reject() {
    if (!window.confirm("Reject this drink request?")) return;
    setBusy(true);
    const response = await fetch(`/api/admin/drink-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) router.refresh(); else setBusy(false);
  }
  return <div className="drinkRequestControls"><input aria-label="Price" type="number" min="0.01" step="0.01" placeholder="Price" value={price} onChange={(event) => setPrice(event.target.value)} /><input aria-label="Photo URL" placeholder="Photo URL (optional)" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /><button type="button" onClick={approve} disabled={busy || !price}>Approve and add</button><button className="rejectRequest" type="button" onClick={reject} disabled={busy}>Reject</button></div>;
}

