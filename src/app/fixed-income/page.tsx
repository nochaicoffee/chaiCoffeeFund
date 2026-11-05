import type { Metadata } from "next";
import { AddDepositButton, DepositFormsProvider, DepositsList } from "@/components/fixed-income/forms/DepositForms";
import { EpfEntriesList, EpfFormsProvider, EpfHeaderButtons } from "@/components/fixed-income/forms/EpfForms";
import { ComingSoon } from "@/components/shell/ComingSoon";
import { todayIso } from "@/lib/format/date";
import { getCachedAccounts, getCachedEpfAccounts, getCachedEpfEntries, getCachedEpfRates, getCachedFixedDeposits } from "@/lib/sheets/cached";
import { depositFormsData } from "./depositFormsData";
import { epfFormsData } from "./epfFormsData";

export const metadata: Metadata = { title: "Fixed Income" };

/**
 * Until the page is built (milestone M4), the deposit forms, the EPF forms and the import are reachable from here, with plain lists of
 * what is in the Sheet to edit, close and delete, so it can already be added to and corrected.
 */
export default async function Page() {
  const [epfAccounts, epfEntries, epfRates, deposits, accounts] = await Promise.all([getCachedEpfAccounts(), getCachedEpfEntries(), getCachedEpfRates(), getCachedFixedDeposits(), getCachedAccounts()]);
  const today = todayIso();
  return (
    <DepositFormsProvider forms={depositFormsData(deposits, accounts, today)}>
      <EpfFormsProvider forms={epfFormsData({ accounts: epfAccounts, entries: epfEntries, rates: epfRates }, today)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <AddDepositButton />
            <EpfHeaderButtons />
          </div>
          <DepositsList />
          <EpfEntriesList />
          <ComingSoon href="/fixed-income" />
        </div>
      </EpfFormsProvider>
    </DepositFormsProvider>
  );
}
