"use client";

import { ALL, type AccountsPageView } from "@/app/accounts/views";
import { usePickInAddress } from "../usePickInAddress";
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
  const [pickId, choose] = usePickInAddress("account", initialPick, view.picks.map((p) => p.id), (id) => id === ALL && view.picks[0].id === ALL);
  const pick = view.picks.find((p) => p.id === pickId) ?? view.picks[0];

  return (
    <div className="flex flex-col gap-5">
      <AccountsHero view={view} pickId={pick.id} onPick={choose} />
      {view.hasAccounts && (
        // An equal split; the cards stretch so they end level.
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
          <MixCard blocks={view.mix} picked={pick.id} onPick={choose} />
          <HistoryCard key={pick.id} pick={pick} rows={view.history[pick.id] ?? []} href={view.historyHrefs[pick.id]} hasAll={view.picks[0].id === ALL} onAll={() => choose(ALL)} />
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
