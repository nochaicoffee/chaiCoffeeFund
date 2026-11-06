"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Fetches today's closes (POST /api/prices/refresh, ADR 0013) and redraws the page. A source that is down is reported in words and the
 * saved prices stay as they were.
 */
export function RefreshPricesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            try {
              const response = await fetch("/api/prices/refresh", { method: "POST" });
              const body = (await response.json()) as { added?: number; failed?: number; error?: string; tickers?: { ticker: string; error?: string }[] };
              if (!response.ok) setMessage(body.error ?? "The prices couldn't be refreshed.");
              else if (body.failed) setMessage(`${body.failed} price ${body.failed === 1 ? "source" : "sources"} didn't answer (${(body.tickers ?? []).filter((t) => t.error).map((t) => t.ticker).join(", ")}). Those prices are as they were.`);
              else setMessage(body.added ? `Saved ${body.added} new ${body.added === 1 ? "price" : "prices"}.` : "Prices are up to date.");
            } catch {
              setMessage("The prices couldn't be refreshed.");
            }
            router.refresh();
          })
        }
        className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 max-md:min-h-11"
      >
        {pending ? "Refreshing prices…" : "Refresh prices"}
      </button>
      {message && <span role="status" className="max-w-64 text-right text-[11px] font-semibold text-muted">{message}</span>}
    </span>
  );
}
