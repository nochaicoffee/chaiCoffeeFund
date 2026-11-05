import type { Metadata } from "next";
import { EpfEntriesList, EpfFormsProvider, EpfHeaderButtons } from "@/components/fixed-income/forms/EpfForms";
import { ComingSoon } from "@/components/shell/ComingSoon";
import { todayIso } from "@/lib/format/date";
import { getCachedEpfAccounts, getCachedEpfEntries, getCachedEpfRates } from "@/lib/sheets/cached";
import { epfFormsData } from "./epfFormsData";

export const metadata: Metadata = { title: "Fixed Income" };

/**
 * Until the page is built (milestone M4), the EPF forms and the import are reachable from here, with a plain list of the rows to
 * edit and delete, so what is in the Sheet can already be added to and corrected.
 */
export default async function Page() {
  const [accounts, entries, rates] = await Promise.all([getCachedEpfAccounts(), getCachedEpfEntries(), getCachedEpfRates()]);
  const forms = epfFormsData({ accounts, entries, rates }, todayIso());
  return (
    <EpfFormsProvider forms={forms}>
      <div className="flex flex-col gap-6">
        <EpfHeaderButtons />
        <EpfEntriesList />
        <ComingSoon href="/fixed-income" />
      </div>
    </EpfFormsProvider>
  );
}
