import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AddSpendButton, Entries, EntriesPeriod } from "@/components/daily/Entries";
import { DailyShell } from "@/components/daily/DailyShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { monthOf, readMonth } from "@/lib/aggregate/dailySpends";
import { formatMonthYear, todayIso } from "@/lib/format/date";
import { getCachedDailyBudgetsTab, getCachedDailyCategoriesTab, getCachedDailyCategoryLimitsTab, getCachedDailySpendsTab } from "@/lib/sheets/cached";

export const metadata: Metadata = { title: "All spends" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * The all-spends page (docs/design/daily.md, round 6, G1, the Ledger): every spend, like Income's Entries, Cards' Statements and Subscriptions' Renewals. It
 * sits in the Daily page's shell, so adding, editing and deleting work as they do there. `?month=YYYY-MM` is the month (the default is the month today is in)
 * or `all`; `?category=` opens it on one category (an id, or `none`).
 */
export default async function DailyEntriesPage({ searchParams }: PageProps<"/daily/entries">) {
  const params = await searchParams;
  const today = todayIso();
  const [spends, categoryRows, budgets, categoryLimits] = await Promise.all([getCachedDailySpendsTab(), getCachedDailyCategoriesTab(), getCachedDailyBudgetsTab(), getCachedDailyCategoryLimitsTab()]);
  const skipped = [spends.skipped, categoryRows.skipped, budgets.skipped, categoryLimits.skipped].filter((s) => s.rows.length > 0);
  const asked = one(params.month);
  const thisMonth = monthOf(today);
  const period = asked === "all" ? "all" : (readMonth(asked) ?? thisMonth);
  const periodKey = period === "all" ? "" : period;

  return (
    <DailyShell raw={{ spends: spends.records, budgets: budgets.records, categoryLimits: categoryLimits.records, categoryRows: categoryRows.records, today }}>
      <PageHeader
        section="Daily"
        eyebrow={
          <Link href="/daily" className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="11 6 5 12 11 18" />
            </svg>
            Daily · All spends
          </Link>
        }
        title="All spends"
        actions={
          <>
            <EntriesPeriod value={period} defaultValue={thisMonth} />
            <span className="max-md:hidden">
              <RefreshButton iconOnly />
            </span>
            <AddSpendButton />
          </>
        }
      >
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <Entries periodKey={periodKey} periodLabel={periodKey ? formatMonthYear(periodKey) : "all time"} initialCategory={one(params.category) ?? ""} />
    </DailyShell>
  );
}
