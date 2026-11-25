import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { DailyBody } from "@/components/daily/DailyBody";
import { DailyShell } from "@/components/daily/DailyShell";
import { GreetingConnected } from "@/components/daily/GreetingConnected";
import { PageHeader } from "@/components/shell/PageHeader";
import { greetingTitle, todayIso } from "@/lib/format/date";
import { getCachedDailyBudgetsTab, getCachedDailyCategoriesTab, getCachedDailyCategoryLimitsTab, getCachedDailySpendsTab } from "@/lib/sheets/cached";

export const metadata: Metadata = { title: "Daily" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * The Daily page (docs/design/daily.md, round 3): a diary of everyday spending he writes down by hand, split into UPI and credit card. The server reads the
 * three tabs and hands their rows to the shell, which works every figure out itself so an added spend shows at once (see DailyShell). `?month=YYYY-MM` is the
 * calendar's month and `?period=` is a year, or "month".
 */
export default async function DailyPage({ searchParams }: PageProps<"/daily">) {
  const params = await searchParams;
  const today = todayIso();
  const [spends, categoryRows, budgets, categoryLimits] = await Promise.all([getCachedDailySpendsTab(), getCachedDailyCategoriesTab(), getCachedDailyBudgetsTab(), getCachedDailyCategoryLimitsTab()]);
  const month = one(params.month);
  const skipped = [spends.skipped, categoryRows.skipped, budgets.skipped, categoryLimits.skipped].filter((s) => s.rows.length > 0);

  return (
    <DailyShell raw={{ spends: spends.records, budgets: budgets.records, categoryLimits: categoryLimits.records, categoryRows: categoryRows.records, today, month, period: one(params.period) }}>
      <PageHeader
        section="Daily"
        title={greetingTitle()}
        actions={
          <>
            <Link href="/daily/entries" className="inline-flex min-h-11 items-center rounded-full border border-surface-line bg-surface px-4 text-[13px] font-bold shadow-soft hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent md:min-h-10">
              All spends
            </Link>
            <RefreshButton iconOnly />
          </>
        }
      >
        <GreetingConnected />
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <DailyBody />
    </DailyShell>
  );
}
