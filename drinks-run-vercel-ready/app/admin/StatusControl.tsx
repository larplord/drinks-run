"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { orderStatuses, type OrderStatus } from "@/db/schema";

const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid — ready to buy",
  purchased: "Purchased",
};

export function StatusControl({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: OrderStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("The status could not be saved.");
      router.refresh();
    } catch {
      setStatus(previousStatus);
      setError("Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label>
        <span className="sr-only">Order status</span>
        <select
          aria-label="Order status"
          disabled={saving}
          value={status}
          onChange={(event) => updateStatus(event.target.value as OrderStatus)}
        >
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <span aria-live="polite">{saving ? "Saving…" : error}</span>
    </div>
  );
}
