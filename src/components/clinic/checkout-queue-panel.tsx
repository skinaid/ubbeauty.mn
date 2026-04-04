"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import {
  filterAndSortCheckoutQueue,
  getCheckoutOutstandingAmount,
  type QueueCheckout
} from "@/modules/clinic/checkout-queue";

function getCheckoutBadgeVariant(paymentStatus?: string | null) {
  switch (paymentStatus) {
    case "paid":
      return "success" as const;
    case "partial":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function CheckoutQueuePanel({
  checkouts,
  activeCheckoutId
}: {
  checkouts: QueueCheckout[];
  activeCheckoutId?: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "collecting" | "paid" | "voided">("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");
  const [sortMode, setSortMode] = useState<
    "priority_balance" | "oldest" | "newest" | "alphabetical"
  >("priority_balance");

  const providerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          checkouts
            .map((checkout) => checkout.appointment?.staff_member?.full_name ?? "")
            .filter(Boolean)
        )
      ),
    [checkouts]
  );

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          checkouts
            .map((checkout) => checkout.appointment?.location?.name ?? "")
            .filter(Boolean)
        )
      ),
    [checkouts]
  );

  const filteredCheckouts = useMemo(() => {
    return filterAndSortCheckoutQueue({
      checkouts,
      query,
      statusFilter,
      providerFilter,
      locationFilter,
      timeFilter,
      sortMode
    });
  }, [checkouts, locationFilter, providerFilter, query, sortMode, statusFilter, timeFilter]);

  return (
    <Card padded stack className="checkout-print-hidden">
      <h2 className="ui-section-title" style={{ marginTop: 0 }}>
        Queue
      </h2>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        <input
          id="checkout-queue-search"
          className="ui-input"
          placeholder="Patient эсвэл checkout id хайх"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {[
            { value: "all", label: "All" },
            { value: "collecting", label: "Collecting" },
            { value: "paid", label: "Paid" },
            { value: "voided", label: "Voided" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className="ui-button ui-button--ghost ui-button--sm"
              aria-pressed={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value as typeof statusFilter)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"
          }}
        >
          <select
            className="ui-input"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
          >
            <option value="all">All providers</option>
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>

          <select
            className="ui-input"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <option value="all">All locations</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            className="ui-input"
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value as typeof timeFilter)}
          >
            <option value="all">All day</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>

          <select
            className="ui-input"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
          >
            <option value="priority_balance">Priority: biggest balance</option>
            <option value="oldest">Priority: oldest visit</option>
            <option value="newest">Priority: newest visit</option>
            <option value="alphabetical">Priority: patient A-Z</option>
          </select>
        </div>
      </div>

      {filteredCheckouts.length === 0 ? (
        <p style={{ margin: 0 }}>Тохирох checkout олдсонгүй.</p>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {filteredCheckouts.map((checkout) => {
            const isActive = activeCheckoutId === checkout.id;
            const itemCount = checkout.items?.length ?? 0;
            const balance = getCheckoutOutstandingAmount(checkout);

            return (
              <Link
                key={checkout.id}
                href={`/checkout?checkoutId=${checkout.id}`}
                className="ui-card ui-card--padded"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: isActive ? "1px solid var(--color-accent)" : undefined,
                  boxShadow: isActive ? "0 0 0 3px rgba(30, 41, 59, 0.08)" : undefined,
                  display: "grid",
                  gap: "0.4rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                  <strong>{checkout.patient?.full_name ?? "Patient"}</strong>
                  <Badge variant={getCheckoutBadgeVariant(checkout.payment_status)}>
                    {checkout.payment_status}
                  </Badge>
                </div>
                <span className="ui-text-muted">
                  {checkout.appointment?.scheduled_start
                    ? new Date(checkout.appointment.scheduled_start).toLocaleString("mn-MN")
                    : "Visit time unknown"}
                </span>
                <span className="ui-text-muted">
                  {checkout.appointment?.staff_member?.full_name ?? "Provider TBD"}
                  {" · "}
                  {checkout.appointment?.location?.name ?? "Location TBD"}
                </span>
                <span className="ui-text-muted">
                  {itemCount} item · Үлдэгдэл {balance.toFixed(2)} {checkout.currency}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
