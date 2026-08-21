"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("That password was not accepted.");
      setSaving(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <main className={styles.loginShell}>
      <section className={styles.loginCard}>
        <p className={styles.eyebrow}>Private organizer view</p>
        <h1>Drinks run control</h1>
        <p>Enter the organizer password to see orders and mark payments.</p>
        <form onSubmit={submit}>
          <label>
            Organizer password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className={styles.loginError} role="alert">{error}</p> : null}
          <button type="submit" disabled={saving}>
            {saving ? "Checking…" : "Open dashboard"}
          </button>
        </form>
        <Link href="/">Back to order form</Link>
      </section>
    </main>
  );
}
