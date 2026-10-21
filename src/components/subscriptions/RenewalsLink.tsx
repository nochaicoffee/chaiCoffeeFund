"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * "All renewals →" under the payments (#130): with a subscription picked, its whole
 * history on the Renewals page (`?sub=<id>`, all time); with All, every renewal this
 * year. Sample data stays sample data.
 */
export function RenewalsLink({ subscriptionId }: { subscriptionId?: string }) {
  const demo = useSearchParams().has("demo");
  const query = [subscriptionId && `sub=${encodeURIComponent(subscriptionId)}&period=all`, demo && "demo"].filter(Boolean).join("&");
  return (
    <Link
      href={`/subscriptions/renewals${query ? `?${query}` : ""}`}
      className="inline-flex min-h-11 shrink-0 items-center gap-[5px] text-[13px] font-bold whitespace-nowrap text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0"
    >
      {subscriptionId ? "All renewals" : "View all renewals"}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="13 6 19 12 13 18" />
      </svg>
    </Link>
  );
}
