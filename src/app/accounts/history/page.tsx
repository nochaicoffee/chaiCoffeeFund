import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { ReviewProvider } from "@/components/accounts/ReviewDialog";
import { AccountFormsProvider, UpdateBalancesButton } from "@/components/accounts/forms/AccountForms";
import { HistoryList } from "@/components/accounts/history/HistoryList";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { PageHeader } from "@/components/shell/PageHeader";
import { todayIso } from "@/lib/format/date";
import { loadAccountsData } from "../loadAccountsData";
import { accountsPeriodMenu, accountsPeriodValue, accountsRangeStart } from "../params";
import { formsView } from "../views";
import { historyHref, parseHistoryState, type HistoryState } from "./params";
import { historyPageView } from "./views";

export const metadata: Metadata = { title: "Balance history" };

/**
 * The Balance history page (#177, layout H1 Ledger in docs/design/accounts.md): every recorded
 * balance in one list, like the Cards Statements and Subscriptions Renewals pages. The summary
 * sentence and tiles, then the filters and the rows grouped by month. Everything is in the
 * address (`?period= &account= &purpose= &status= &q= &sort= &page=`), so a link opens the same
 * view, and the dashboard's Balance history card links here with its pick and period. Editing
 * and deleting a balance, and Update balances, use the Accounts forms (#165). `?demo` shows
 * sample data in development, with the forms disabled.
 */
export default async function BalanceHistoryPage({ searchParams }: PageProps<"/accounts/history">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadAccountsData(params, today);
  const state = parseHistoryState(params, data.accounts, today, demo);
  const view = historyPageView(data, state, today);
  const hrefFor = (changes: Partial<HistoryState>) => historyHref({ ...state, page: 1, ...changes }, today);
  const accountsHref = `/accounts${state.accountId ? `?account=${state.accountId}${demo ? "&demo" : ""}` : demo ? "?demo" : ""}`;

  return (
    <AccountFormsProvider forms={formsView(data, today, demo)}>
      <ReviewProvider demo={demo}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Bank accounts"
          eyebrow={
            <Link href={accountsHref} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="11 6 5 12 11 18" />
              </svg>
              Bank accounts · Balance history
            </Link>
          }
          title="Balance history"
          actions={
            <>
              <PeriodSelect options={accountsPeriodMenu(data, state.period, today)} value={accountsPeriodValue(state.period, today)} start={accountsRangeStart(data, state.period, today)} currentMonth={today.slice(0, 7)} />
              <span className="max-md:hidden">
                <RefreshButton iconOnly />
              </span>
              <UpdateBalancesButton />
            </>
          }
        >
          <p className="text-[15px] leading-relaxed font-medium text-muted">
            {view.lede.map((part, i) =>
              part.strong ? (
                <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">
                  {part.text}
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
          {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>

        <StatementsSummary
          tiles={view.tiles.map((t) => ({
            label: t.label,
            value: (
              <span className={t.warning ? "text-warning-text" : t.tone === "positive" ? "text-positive" : t.tone === "negative" ? "text-negative" : ""}>
                {t.value}
                {t.unit && <small className="ml-1.5 text-sm font-bold text-muted">{t.unit}</small>}
              </span>
            ),
            caption: t.caption.map((part, i) =>
              part.strong ? (
                <b key={i} className="font-bold text-fg">
                  {part.text}
                </b>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            ),
          }))}
        />

        <HistoryList view={view} state={state} hrefFor={hrefFor} accountsHref={accountsHref} today={today} />
      </div>
      </ReviewProvider>
    </AccountFormsProvider>
  );
}
