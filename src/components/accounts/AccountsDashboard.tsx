"use client";

import { useEffect, useState } from "react";
import { ALL, type AccountsPageView } from "@/app/accounts/views";
import { AccountsHero } from "./AccountsHero";
import { ComingUpCard } from "./ComingUpCard";
import { HistoryCard } from "./HistoryCard";
import { InOutCard } from "./InOutCard";
import { MixCard } from "./MixCard";
import { MoneyInOutCard } from "./MoneyInOutCard";
import { OverTimeCard } from "./OverTimeCard";

/**
 * The Accounts page under the greeting (#162): the hero, and below it what's built as the
 * page grows. One pick drives all of it, kept by id (a refresh can reorder or drop an account)
 * and in the address (`?account=`) with the history API, which the Next router follows without
 * asking the server again, so picking is instant and a link opens the same pick.
 */
export function AccountsDashboard({ view, initialPick }: { view: AccountsPageView; initialPick: string }) {
  const [pickId, setPickId] = useState(initialPick);
  const [shownPick, setShownPick] = useState(initialPick);
  // A link to another ?account= on this page arrives as a new initialPick: follow it.
  if (initialPick !== shownPick) {
    setShownPick(initialPick);
    setPickId(initialPick);
  }
  const pick = view.picks.find((p) => p.id === pickId) ?? view.picks[0];

  // An ?account= that isn't an account (any more) falls back; take it out of the address too.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("account");
    if (requested && !view.picks.some((p) => p.id === requested)) {
      params.delete("account");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, [view.picks]);

  function choose(id: string) {
    setPickId(id);
    const params = new URLSearchParams(window.location.search);
    if (id === view.picks[0].id && id === ALL) params.delete("account");
    else params.set("account", id);
    const query = params.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <AccountsHero picks={view.picks} pickId={pick.id} onPick={choose} hasAccounts={view.hasAccounts} />
      {view.hasAccounts && (
        // An equal split; the cards stretch so they end level.
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
          <MixCard blocks={view.mix} picked={pick.id} onPick={choose} />
          <HistoryCard key={pick.id} pick={pick} rows={view.history[pick.id] ?? []} href={view.historyHrefs[pick.id]} />
        </div>
      )}
      {view.hasAccounts && (
        <>
          <InOutCard detail={pick.detail} />
          <OverTimeCard key={pick.id} detail={pick.detail} />
          <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
            <MoneyInOutCard detail={pick.detail} />
            <ComingUpCard detail={pick.detail} />
          </div>
        </>
      )}
    </div>
  );
}
