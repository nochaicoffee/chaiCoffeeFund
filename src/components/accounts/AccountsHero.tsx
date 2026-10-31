"use client";

import type { AccountsPageView } from "@/app/accounts/views";
import { FormTrigger, useAccountForms } from "./forms/AccountForms";
import { HeroTrend } from "./HeroTrend";
import { WalletCards } from "./WalletCards";

/**
 * The Accounts page's hero (docs/design/accounts.md, round 24): a light card in the style of
 * the Income dashboards, with no colour background. On the left the wallet: the open account's
 * card with the others as strips under it. On the right the open account's Trend over the
 * page's period, or when its balance was read. The card's only colour is a pale tint of the
 * pick's, which glides to the next when you pick another. On a phone the two stack.
 */

const tint = (colorKey: string) => `color-mix(in oklab, var(--card-${colorKey}) 12%, var(--surface))`;

export function AccountsHero({ view, pickId, onPick }: { view: AccountsPageView; pickId: string; onPick: (id: string) => void }) {
  const pick = view.picks.find((p) => p.id === pickId) ?? view.picks[0];
  return (
    <section aria-label="Your accounts" className="rounded-[28px] border border-surface-line p-4 text-fg shadow-card transition-colors duration-[650ms] motion-reduce:transition-none md:rounded-[36px] md:p-7" style={{ backgroundColor: tint(pick.colorKey) }}>
      {!view.hasAccounts ? (
        <EmptyStage balance={pick.balance} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:gap-8">
          <WalletCards picks={view.picks} pickId={pick.id} onPick={onPick} />
          <HeroTrend pick={pick} checkIns={view.checkIns} flowItems={view.flowItems} periodLabel={view.periodLabel} today={view.forms.today} onPick={onPick} />
        </div>
      )}
    </section>
  );
}

/** With no accounts: ₹0, a dashed place where the first card goes. */
function EmptyStage({ balance }: { balance: string }) {
  const { open } = useAccountForms();
  return (
    <div className="flex min-h-[220px] flex-col items-start justify-between gap-6 rounded-[26px] border-2 border-dashed border-fg/20 p-6">
      <div>
        <div className="text-xs font-bold text-muted">Your balance</div>
        <div className="mt-1 text-[44px] leading-none font-extrabold md:text-[62px]">{balance}</div>
      </div>
      <div className="flex flex-col items-start gap-3">
        <div className="text-sm font-semibold text-muted">No accounts yet. Add your first account and its balance, and its card shows here.</div>
        <FormTrigger className="min-h-10 rounded-full bg-ink px-5 text-[13px] font-extrabold text-on-ink hover:opacity-90" label="Add your first account" onClick={() => open({ kind: "add" })} />
      </div>
    </div>
  );
}
