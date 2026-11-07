import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AttentionStrip } from "@/components/lent/AttentionStrip";
import { GreetingSentence } from "@/components/lent/GreetingSentence";
import { InterestClock } from "@/components/lent/InterestClock";
import { ComingUpCard, LoansTable, MoneyBackCard } from "@/components/lent/LentWidgets";
import { WhoOwesWhat } from "@/components/lent/WhoOwesWhat";
import { AddFirstLoanButton, HeaderButtons, LentFormsProvider } from "@/components/lent/forms/LentForms";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { getCachedAccounts, getCachedIncomeEntriesTab, getCachedIncomeSourcesTab, getCachedLentLoansTab, getCachedLentRepaymentsTab } from "@/lib/sheets/cached";
import { clockView, PERIODS, type ClockPeriod } from "./clockView";
import { lentFormsData } from "./formsData";
import { heroView } from "./heroView";
import { comingUpView, loansTableView, moneyBackView } from "./widgetsView";
import { attentionView, greetingView, lentModel, summarySentence } from "./views";

export const metadata: Metadata = { title: "Lent out" };

/**
 * The Lent out page (docs/design/lent-out.md, L3 Who owes what + the interest clock): the greeting, whose figures point, then what needs
 * attention, then the Who owes what hero (`?who=` picks a borrower). The clock, the loans table and the forms are built on this shell (C3 to C5);
 * `?clock=` picks the clock's period. Under them: the loans table, Interest coming up and Money back. The forms are built on this (C5).
 */
export default async function LentPage({ searchParams }: PageProps<"/lent">) {
  const params = await searchParams;
  const today = todayIso();
  const [loansTab, repaymentsTab, sourcesTab, entriesTab, accounts] = await Promise.all([getCachedLentLoansTab(), getCachedLentRepaymentsTab(), getCachedIncomeSourcesTab(), getCachedIncomeEntriesTab(), getCachedAccounts()]);
  const model = lentModel({ loans: loansTab.records, repayments: repaymentsTab.records, sources: sourcesTab.records, entries: entriesTab.records }, today);
  const hero = heroView(model);
  const requested = typeof params.who === "string" ? params.who : "all";
  const forms = lentFormsData(model, accounts.filter((a) => a.status === "Active").map((a) => ({ id: a.id, name: a.name })));
  const clock = clockView(model);
  const table = loansTableView(model);
  const comingUp = comingUpView(model);
  const moneyBack = moneyBackView(model);
  const requestedClock = typeof params.clock === "string" ? params.clock : "day";
  const skipped = [loansTab.skipped, repaymentsTab.skipped].filter((t) => t.rows.length > 0);

  return (
    <LentFormsProvider forms={forms}>
    <div className="flex flex-col gap-6">
      <PageHeader section="Lent out" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<><RefreshButton iconOnly /><HeaderButtons /></>}>
        <GreetingSentence parts={summarySentence(model)} cards={greetingView(model)} />
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <AttentionStrip items={attentionView(model)} />
      {hero && <WhoOwesWhat view={hero} initialPick={hero.keys.includes(requested) ? requested : "all"} />}
      {clock && <InterestClock view={clock} initialPick={(PERIODS as readonly string[]).includes(requestedClock) ? (requestedClock as ClockPeriod) : "day"} />}
      {table && <LoansTable view={table} />}
      {model.data.loans.length > 0 && (comingUp || moneyBack) && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12">
          {comingUp && <div className={moneyBack ? "xl:col-span-6" : "xl:col-span-12"}><ComingUpCard view={comingUp} /></div>}
          {moneyBack && <div className={comingUp ? "xl:col-span-6" : "xl:col-span-12"}><MoneyBackCard view={moneyBack} /></div>}
        </div>
      )}
      {model.data.loans.length === 0 && (
        <section className="rounded-[22px] border border-surface-line bg-surface p-6 text-sm font-semibold text-muted">
          <p>Money you have lent to friends or family, outside any bank, goes here.</p>
          <div className="mt-4"><AddFirstLoanButton /></div>
        </section>
      )}
    </div>
    </LentFormsProvider>
  );
}
