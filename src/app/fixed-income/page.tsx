import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AddEpfStatementButton } from "@/components/fixed-income/AddEpfStatementButton";
import { FixedIncomeDashboard } from "@/components/fixed-income/FixedIncomeDashboard";
import { AddDepositButton, DepositFormsProvider, DepositsList } from "@/components/fixed-income/forms/DepositForms";
import { EpfEntriesList, EpfFormsProvider } from "@/components/fixed-income/forms/EpfForms";
import { GreetingSentence } from "@/components/fixed-income/GreetingSentence";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { fixedIncome } from "@/lib/aggregate/fixedIncome";
import { greetingFor, todayIso } from "@/lib/format/date";
import { getCachedAccounts, getCachedEpfAccountsTab, getCachedEpfEntriesTab, getCachedEpfRatesTab, getCachedFixedDepositsTab } from "@/lib/sheets/cached";
import { depositFormsData } from "./depositFormsData";
import { epfFormsData } from "./epfFormsData";
import { attentionView, doorsView, DOORS, greetingView, stagesView, summarySentence, type DoorId } from "./views";

export const metadata: Metadata = { title: "Fixed Income" };

/**
 * The Fixed Income page (docs/design/fixed-income.md, J1): the greeting, whose figures point, what needs attention, then three
 * doors (Everything, EPF, Fixed deposits) and the stage the picked one opens. `?door=` picks a door. The widgets under the stage
 * (#269) are still to come; until then a plain list of the deposits and of every EPF row stays under it, with the forms.
 */
export default async function FixedIncomePage({ searchParams }: PageProps<"/fixed-income">) {
  const params = await searchParams;
  const today = todayIso();
  const [accountsTab, entriesTab, ratesTab, depositsTab, accounts] = await Promise.all([getCachedEpfAccountsTab(), getCachedEpfEntriesTab(), getCachedEpfRatesTab(), getCachedFixedDepositsTab(), getCachedAccounts()]);
  const data = { epfAccounts: accountsTab.records, epfEntries: entriesTab.records, epfRates: ratesTab.records, deposits: depositsTab.records };
  const f = fixedIncome(data, today);
  const requested = typeof params.door === "string" ? params.door : "all";
  const initialPick = (DOORS as readonly string[]).includes(requested) ? (requested as DoorId) : "all";
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
            <DepositsList />
            <EpfEntriesList />
          </FixedIncomeDashboard>
        </div>
      </EpfFormsProvider>
    </DepositFormsProvider>
  );
}
