import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AddEpfStatementButton } from "@/components/fixed-income/AddEpfStatementButton";
import { FixedIncomeDashboard } from "@/components/fixed-income/FixedIncomeDashboard";
import { AddDepositButton, DepositFormsProvider } from "@/components/fixed-income/forms/DepositForms";
import { EpfEntriesList, EpfFormsProvider } from "@/components/fixed-income/forms/EpfForms";
import { GreetingSentence } from "@/components/fixed-income/GreetingSentence";
import { ComingUpCard } from "@/components/fixed-income/widgets/ComingUpCard";
import { CreditsCard } from "@/components/fixed-income/widgets/CreditsCard";
import { DepositsTable } from "@/components/fixed-income/widgets/DepositsTable";
import { EpfCard } from "@/components/fixed-income/widgets/EpfCard";
import { GrowthCard } from "@/components/fixed-income/widgets/GrowthCard";
import { MoneyInCard } from "@/components/fixed-income/widgets/MoneyInCard";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { fixedIncome } from "@/lib/aggregate/fixedIncome";
import { greetingFor, todayIso } from "@/lib/format/date";
import { getCachedAccounts, getCachedEpfAccountsTab, getCachedEpfEntriesTab, getCachedEpfRatesTab, getCachedFixedDepositsTab } from "@/lib/sheets/cached";
import { depositFormsData } from "./depositFormsData";
import { epfFormsData } from "./epfFormsData";
import { attentionView, doorsView, DOORS, greetingView, stagesView, summarySentence, type DoorId } from "./views";
import { comingUpView, creditsView, depositsTableView, epfCardView, growthView, moneyInView } from "./widgetsView";

export const metadata: Metadata = { title: "Fixed Income" };

/**
 * The Fixed Income page (docs/design/fixed-income.md, J1): the greeting, whose figures point, what needs attention, then three
 * doors (Everything, EPF, Fixed deposits) and the stage the picked one opens. `?door=` picks a door. Under it the widgets: money in each
 * month, credits on time (with the passbook check) beside the growth path, the deposits, coming up beside the EPF card, and every EPF row
 * (to edit or delete). A widget with nothing to say is left out.
 */
export default async function FixedIncomePage({ searchParams }: PageProps<"/fixed-income">) {
  const params = await searchParams;
  const today = todayIso();
  const [accountsTab, entriesTab, ratesTab, depositsTab, accounts] = await Promise.all([getCachedEpfAccountsTab(), getCachedEpfEntriesTab(), getCachedEpfRatesTab(), getCachedFixedDepositsTab(), getCachedAccounts()]);
  const data = { epfAccounts: accountsTab.records, epfEntries: entriesTab.records, epfRates: ratesTab.records, deposits: depositsTab.records };
  const f = fixedIncome(data, today);
  const requested = typeof params.door === "string" ? params.door : "all";
  const initialPick = (DOORS as readonly string[]).includes(requested) ? (requested as DoorId) : "all";
  const holding = f.epf.holdings[0];
  const own = holding ? data.epfEntries.filter((e) => e.epfAccountId === holding.accountId) : [];
  const account = holding ? data.epfAccounts.find((a) => a.id === holding.accountId) : undefined;
  const moneyIn = moneyInView(data, today);
  const credits = holding ? creditsView({ epfEntries: own }, holding.confirmedThrough, today) : null;
  const growth = holding ? growthView(own, data.epfRates.filter((r) => r.epfAccountId === holding.accountId), account?.projectionCredit, today) : null;
  const deposits = depositsTableView(f, today);
  const comingUp = comingUpView(f, data, today);
  const epfCard = epfCardView(f, data, today);
  const row = "grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12";
  const skipped = [accountsTab.skipped, entriesTab.skipped, ratesTab.skipped, depositsTab.skipped].filter((t) => t.rows.length > 0);

  return (
    <DepositFormsProvider forms={depositFormsData(data.deposits, accounts, today)}>
      <EpfFormsProvider forms={epfFormsData({ accounts: data.epfAccounts, entries: data.epfEntries, rates: data.epfRates }, today)}>
        <div className="flex flex-col gap-6">
          <PageHeader
            section="Fixed Income"
            title={`${greetingFor()}, ${appConfig.ownerName}`}
            actions={
              <>
                <RefreshButton iconOnly />
                <AddDepositButton />
                <AddEpfStatementButton />
              </>
            }
          >
            <GreetingSentence parts={summarySentence(f)} cards={greetingView(f, today)} />
            <SkippedRowsNotice tabs={skipped} />
          </PageHeader>
          <FixedIncomeDashboard doors={doorsView(f)} stages={stagesView(data, f, today)} attention={attentionView(f, today)} initialPick={initialPick}>
            {moneyIn && <MoneyInCard view={moneyIn} />}
            {(credits || growth) && (
              <div className={row}>
                {credits && <div className={growth ? "xl:col-span-6" : "xl:col-span-12"}><CreditsCard view={credits} /></div>}
                {growth && <div className={credits ? "xl:col-span-6" : "xl:col-span-12"}><GrowthCard view={growth} /></div>}
              </div>
            )}
            {deposits && <DepositsTable rows={deposits} />}
            {(comingUp || epfCard) && (
              <div className={row}>
                {comingUp && <div className={epfCard ? "xl:col-span-6" : "xl:col-span-12"}><ComingUpCard items={comingUp.items} note={comingUp.note} /></div>}
                {epfCard && <div className={comingUp ? "xl:col-span-6" : "xl:col-span-12"}><EpfCard view={epfCard} /></div>}
              </div>
            )}
            {data.epfEntries.length > 0 && (
            <details className="group rounded-[22px] border border-surface-line bg-surface p-5 md:p-6">
              <summary className="cursor-pointer text-[15px] font-extrabold">Every EPF row <small className="ml-2 text-xs font-semibold text-muted">to edit or delete a typed one, or delete one read from a passbook</small></summary>
              <div className="mt-4">
                <EpfEntriesList />
              </div>
            </details>
            )}
          </FixedIncomeDashboard>
        </div>
      </EpfFormsProvider>
    </DepositFormsProvider>
  );
}
