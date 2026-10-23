import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SyncAccountStatementsButton } from "@/components/SyncAccountStatementsButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AccountsDashboard } from "@/components/accounts/AccountsDashboard";
import { AttentionCard } from "@/components/accounts/AttentionCard";
import { ReviewProvider } from "@/components/accounts/ReviewDialog";
import { GreetingSentence } from "@/components/accounts/GreetingSentence";
import { AccountFormsProvider, HeaderFormButtons } from "@/components/accounts/forms/AccountForms";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { PageHeader } from "@/components/shell/PageHeader";
import { AccountSyncProvider } from "@/components/sync/AccountSyncContext";
import { AccountSyncReportPanel } from "@/components/sync/AccountSyncReportPanel";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { parsePeriod } from "../cards/params";
import { loadAccountsData } from "./loadAccountsData";
import { accountsPeriodMenu, accountsPeriodValue, accountsRangeStart } from "./params";
import { ALL, accountsPageView, greetingView, summarySentence } from "./views";

export const metadata: Metadata = { title: "Accounts" };

/**
 * The Accounts page (#162, docs/design/accounts.md): the greeting, whose figures point, then
 * the account cards as the hero. `?account=<id>` opens a pick; `?demo` shows sample data in
 * development. The period pill (`?period=`, as on Cards) decides what the line, the changes
 * and the bills cover; balances themselves are always today's. This year is the default.
 */
export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadAccountsData(params, today);
  const period = parsePeriod(params, today);
  const view = accountsPageView(data, today, period, demo);
  const requested = typeof params.account === "string" ? params.account : ALL;
  const initialPick = view.picks.some((p) => p.id === requested) ? requested : view.picks[0].id;

  return (
    <AccountFormsProvider forms={view.forms}>
    <ReviewProvider demo={demo}>
    <AccountSyncProvider>
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Bank accounts"
        title={`${greetingFor()}, ${appConfig.ownerName}`}
        actions={
          <>
            <PeriodSelect options={accountsPeriodMenu(data, period, today)} value={accountsPeriodValue(period, today)} start={accountsRangeStart(data, period, today)} currentMonth={today.slice(0, 7)} />
            <RefreshButton iconOnly />
            {!demo && <SyncAccountStatementsButton />}
            <HeaderFormButtons />
          </>
        }
      >
        <GreetingSentence parts={summarySentence(data, today, period)} cards={greetingView(data, today, period)} />
        {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
        {!demo && <AccountSyncReportPanel />}
      </PageHeader>
      <AttentionCard items={view.attention} />
      <AccountsDashboard view={view} initialPick={initialPick} />
    </div>
    </AccountSyncProvider>
    </ReviewProvider>
    </AccountFormsProvider>
  );
}
