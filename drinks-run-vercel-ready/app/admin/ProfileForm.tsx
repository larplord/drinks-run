"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ProfileForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/admin/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (!response.ok) { const result = await response.json() as { error?: string }; setError(result.error ?? "Could not save profile."); setSaving(false); return; }
    setName(""); setDescription(""); setSaving(false); router.refresh();
  }

  return <form className="profileForm" onSubmit={submit}>
    <input aria-label="Profile name" placeholder="Name (must match orders)" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
    <input aria-label="Profile description" placeholder="Description, preferences, notes" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} />
    <button type="submit" disabled={saving}>{saving ? "Adding…" : "Add profile"}</button>
    {error ? <span className="profileError">{error}</span> : null}
  </form>;
}

export function DeleteProfileButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  async function remove() {
    if (!window.confirm("Delete this profile? Orders will stay untouched.")) return;
    const response = await fetch(`/api/admin/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }
  return <button className="profileDelete" type="button" onClick={remove}>Remove</button>;
}

