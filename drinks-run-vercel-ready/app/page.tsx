"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { catalog, paymentMethods, type CatalogItem } from "../lib/catalog";

export default function Home() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState<readonly CatalogItem[]>(catalog);
  const [flavors, setFlavors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyDate, setPartyDate] = useState("");
  const [payment, setPayment] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [confirmedTotalCents, setConfirmedTotalCents] = useState(0);
  const [customDrinkName, setCustomDrinkName] = useState("");
  const [customDrinkDetail, setCustomDrinkDetail] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    fetch("/api/catalog").then((response) => response.json()).then((result: { catalog?: CatalogItem[] }) => {
      if (Array.isArray(result.catalog)) setMenu(result.catalog);
    }).catch(() => undefined);
  }, []);

  const selected = useMemo(
    () => menu.filter((item) => (quantities[item.id] ?? 0) > 0),
    [menu, quantities],
  );

  const totalCents = selected.reduce(
    (sum, item) => sum + item.priceCents * (quantities[item.id] ?? 0),
    0,
  );
  const total = totalCents / 100;

  function changeQuantity(id: string, change: number) {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(12, (current[id] ?? 0) + change)),
    }));
    setSubmitError("");
  }

  function changeFlavor(id: string, value: string) {
    setFlavors((current) => ({ ...current, [id]: value }));
    setSubmitError("");
  }

  async function requestCustomDrink() {
    if (!customDrinkName.trim()) return;
    setRequestMessage("Sending…");
    const response = await fetch("/api/drink-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customDrinkName, detail: customDrinkDetail }) });
    setRequestMessage(response.ok ? "Sent to the organizer for approval." : "Couldn’t send that request. Try again.");
    if (response.ok) { setCustomDrinkName(""); setCustomDrinkDetail(""); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name || !partyName || !partyDate || !payment || !selected.length || !ageConfirmed || !paymentConfirmed) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          partyName,
          partyDate,
          paymentMethod: payment,
          ageConfirmed,
          paymentAcknowledged: paymentConfirmed,
          website: "",
          items: selected.map((item) => ({
            id: item.id,
            quantity: quantities[item.id],
            flavor: flavors[item.id]?.trim() ?? "",
          })),
        }),
      });
      const result = await response.json() as { orderId?: string; totalCents?: number; error?: string };
      if (!response.ok || !result.orderId || typeof result.totalCents !== "number") {
        throw new Error(result.error || "Your order could not be sent. Please try again.");
      }
      setOrderId(result.orderId);
      setConfirmedTotalCents(result.totalCents);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your order could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="success-shell">
        <section className="success-card" aria-live="polite">
          <span className="success-mark">✓</span>
          <p className="eyebrow">Order ready</p>
          <h1>You&apos;re on the list, {name.split(" ")[0]}.</h1>
          <p>
            Your <strong>${(confirmedTotalCents / 100).toFixed(2)}</strong> order for {partyName} has been sent.
            It is marked as awaiting payment until the organizer confirms it.
          </p>
          <div className="success-receipt">
            {selected.map((item) => (
              <div key={item.id}>
                <span>
                  {quantities[item.id]}× {item.name} {item.detail}
                  {flavors[item.id]?.trim() ? <small>Flavor: {flavors[item.id].trim()}</small> : null}
                </span>
                <strong>${((item.priceCents * quantities[item.id]) / 100).toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <p className="order-reference">Order reference: {orderId.slice(0, 8).toUpperCase()}</p>
          <div className="success-actions">
            <a className="secondary-button" href="/">Home</a>
            <button className="primary-button" type="button" onClick={() => setSubmitted(false)}>
              Edit my order
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="hero">
        <nav className="topbar" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Drinks Run home">DRINKS<span>RUN</span></a>
          <a className="organizer-link" href="#order-summary">Your order · ${total.toFixed(2)}</a>
        </nav>
        <div className="hero-copy" id="top">
          <p className="eyebrow">Party pre-order</p>
          <h1>Your drinks.<br /><em>Your tab.</em></h1>
          <p className="hero-subtitle">Pick what you want, see exactly what you owe, and pay before the store run.</p>
        </div>
        <div className="hero-sticker" aria-hidden="true">
          <span>NO MORE</span>
          <strong>“I&apos;LL PAY<br />YOU BACK”</strong>
        </div>
      </header>

      <form className="order-layout" onSubmit={handleSubmit}>
        <div className="form-main">
          <section className="form-section details-section" aria-labelledby="details-title">
            <div className="section-heading">
              <span>01</span>
              <div><p className="eyebrow">Start here</p><h2 id="details-title">Party details</h2></div>
            </div>
            <div className="field-grid">
              <label>Your full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Smith" required maxLength={80} /></label>
              <label>Party name<input value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder="Friday at Jake's" required maxLength={100} /></label>
              <label>Party date<input type="date" value={partyDate} onChange={(event) => setPartyDate(event.target.value)} required /></label>
            </div>
          </section>

          <section className="form-section" aria-labelledby="menu-title">
            <div className="section-heading">
              <span>02</span>
              <div><p className="eyebrow">The lineup</p><h2 id="menu-title">Choose your drinks</h2></div>
            </div>
            <div className="menu-grid">
              {menu.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                return (
                  <article className={`menu-card ${quantity > 0 ? "selected" : ""}`} key={item.id}>
                    {item.imagePath ? (
                      <div className="product-photo">
                        {/* Plain images keep these local product assets compatible with Sites. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imagePath} alt={`${item.name} ${item.detail}`} width="88" height="94" loading="lazy" />
                      </div>
                    ) : (
                      <div className={`can-mark ${item.tone}`} aria-hidden="true">{item.name.slice(0, 1)}</div>
                    )}
                    <div className="item-copy">
                      <h3>{item.name}</h3><p>{item.detail}</p><strong>{item.displayPrice ?? `$${(item.priceCents / 100).toFixed(0)}`}</strong>
                    </div>
                    <div className="stepper" aria-label={`${item.name} ${item.detail} quantity`}>
                      <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`} disabled={quantity === 0}>−</button>
                      <output aria-live="polite">{quantity}</output>
                      <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}>+</button>
                    </div>
                    {quantity > 0 ? (
                      <label className="flavor-field">
                        <span>Flavor or variety <small>optional</small></span>
                        <input
                          type="text"
                          value={flavors[item.id] ?? ""}
                          onChange={(event) => changeFlavor(item.id, event.target.value)}
                          placeholder="e.g. Black Cherry"
                          maxLength={80}
                          autoComplete="off"
                        />
                      </label>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="custom-drink-card" aria-labelledby="custom-drink-title">
            <div><p className="eyebrow">Don&apos;t see it?</p><h2 id="custom-drink-title">Request a drink</h2><p>Send the name and variety to the organizer. They&apos;ll set the price and decide whether to add it.</p></div>
            <div className="custom-drink-fields"><input value={customDrinkName} onChange={(event) => setCustomDrinkName(event.target.value)} placeholder="Drink name" maxLength={80} /><input value={customDrinkDetail} onChange={(event) => setCustomDrinkDetail(event.target.value)} placeholder="Size or variety (optional)" maxLength={100} /><button type="button" onClick={requestCustomDrink} disabled={!customDrinkName.trim() || requestMessage === "Sending…"}>Send request</button></div>
            {requestMessage ? <p className="request-message" role="status">{requestMessage}</p> : null}
          </section>

          <section className="form-section" aria-labelledby="payment-title">
            <div className="section-heading">
              <span>03</span>
              <div><p className="eyebrow">Almost done</p><h2 id="payment-title">How will you pay?</h2></div>
            </div>
            <fieldset className="payment-options">
              <legend className="sr-only">Payment method</legend>
              {paymentMethods.map((method) => (
                <label key={method} className={payment === method ? "active" : ""}>
                  <input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} required />
                  <span>{method}</span>
                </label>
              ))}
            </fieldset>
            <p className="helper">This records how you plan to pay. It does not charge you online.</p>
          </section>
        </div>

        <aside className="summary-card" id="order-summary" aria-labelledby="summary-title">
          <div><p className="eyebrow">Order check</p><h2 id="summary-title">Your order</h2></div>
          <div className="summary-lines" aria-live="polite">
            {selected.length ? selected.map((item) => (
              <div className="summary-line" key={item.id}>
                <span>
                  <b>{quantities[item.id]}×</b> {item.name}
                  <small>{item.detail}</small>
                  {flavors[item.id]?.trim() ? <small className="summary-flavor">Flavor: {flavors[item.id].trim()}</small> : null}
                </span>
                <strong>${((item.priceCents * quantities[item.id]) / 100).toFixed(2)}</strong>
              </div>
            )) : (
              <div className="empty-order"><span>0</span><p>Your tab is empty.<br />Add a drink to get started.</p></div>
            )}
          </div>
          <div className="total-line"><span>Total due</span><strong>${total.toFixed(2)}</strong></div>
          <label className="check-row">
            <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} required />
            <span>I confirm I&apos;m 21 or older.</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} required />
            <span>I understand this won&apos;t be purchased until I&apos;ve paid in full.</span>
          </label>
          {submitError ? <p className="submit-error" role="alert">{submitError}</p> : null}
          <button className="primary-button" type="submit" disabled={selected.length === 0 || submitting}>
            {submitting ? "Sending order…" : <>Submit order <span>·</span> ${total.toFixed(2)}</>}
          </button>
          <p className="fine-print">Submitting sends your order to the organizer as awaiting payment.</p>
        </aside>
      </form>

      <footer className="site-footer">
        <a className="brand" href="#top">DRINKS<span>RUN</span></a>
        <p>Order it. Pay it. We&apos;ll grab it.</p>
        <a className="owner-link" href="/admin">Organizer sign in</a>
      </footer>
    </main>
  );
}

