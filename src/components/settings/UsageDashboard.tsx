"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";

interface UsageData {
  totalCents: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  messageCount: number;
}

export function UsageDashboard() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch("/api/stripe/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleAddPayment = async () => {
    setAddingPayment(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to create checkout session.");
    }
    setAddingPayment(false);
  };

  if (!session?.user) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Sign in to view usage and billing.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Loading usage data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Messages this month" value={usage?.messageCount ?? 0} />
        <Stat label="Cost this month" value={`$${((usage?.totalCents ?? 0) / 100).toFixed(2)}`} />
        <Stat label="Input tokens" value={(usage?.totalPromptTokens ?? 0).toLocaleString()} />
        <Stat label="Output tokens" value={(usage?.totalCompletionTokens ?? 0).toLocaleString()} />
      </div>

      <Button variant="primary" size="sm" onClick={handleAddPayment} disabled={addingPayment}>
        {addingPayment ? "Redirecting..." : "Add / update payment method"}
      </Button>

      <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
        Usage is billed monthly via Stripe. You can also switch to &quot;Bring your own key&quot; mode
        in the API Keys section above to use your own keys at no charge.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
    >
      <div className="text-[10px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}
