import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { formatUsd } from "@/lib/format/money";

/**
 * Dollar accounts that aren't counted because today's USD to INR rate couldn't be had (ADR 0012,
 * PRD Q14). Amber, with the dollars still shown, so nothing is silently ₹0 or silently missing from the total.
 */
export function UnpricedNotice({ unpriced }: { unpriced: NonNullable<AccountsData["unpriced"]> }) {
  return (
    <div className="flex flex-col gap-2" role="status">
      {unpriced.accounts.map((account) => (
        <p key={account.id} className="flex w-fit max-w-full items-start gap-2.5 rounded-control bg-warning-tint px-3.5 py-2.5 text-[13px] leading-relaxed font-medium text-fg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-warning-text">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="min-w-0">
            <span className="font-bold">{account.name} isn&apos;t counted</span>: {account.dollars === null ? "its dollars" : formatUsd(account.dollars)} can&apos;t be turned into rupees, because {unpriced.reason}. Your totals leave it out until the rate is back; Refresh tries again.
          </span>
        </p>
      ))}
    </div>
  );
}
