import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AttentionStrip } from "@/components/income/AttentionStrip";
import { GreetingSentence } from "@/components/income/GreetingSentence";
import { IncomeDashboard } from "@/components/income/IncomeDashboard";
import { AddFirstSource } from "@/components/income/forms/AddFirstSource";
import { HeaderFormButtons, IncomeFormsProvider } from "@/components/income/forms/IncomeForms";
import { YearSelect } from "@/components/income/YearSelect";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { formatInrCompact } from "@/lib/format/money";
import { totalReceivedBetween } from "@/lib/aggregate/incomeYear";
import { loadIncomeData } from "./loadIncomeData";
import { ALL, attentionView, coverView, greetingView, incomeFormsData, incomeYears, summarySentence } from "./views";
import { lowerWidgets } from "./lowerView";
import { incomeWidgets } from "./widgetsView";

export const metadata: Metadata = { title: "Income" };

/**
 * The Income page (#188, docs/design/income.md "The final design"): the greeting, whose figures point, the
 * attention strip while money is late, then the Year in columns cover. `?year=` picks a past year (this one is
 * the default), `?source=` opens a source, and `?demo` shows sample data in development.
 */
export default async function IncomePage({ searchParams }: PageProps<"/income">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadIncomeData(params, today);
  const years = incomeYears(data, today);
  const requestedYear = Number(typeof params.year === "string" ? params.year : NaN);
  const year = years.includes(requestedYear) ? requestedYear : years[0];
  const cover = coverView(data, today, year);
  const requested = typeof params.source === "string" ? params.source : ALL;
  const initialPick = cover.picks.some((p) => p.id === requested) ? requested : ALL;
  const yearOptions = years.map((y, i) => ({ value: i === 0 ? "" : String(y), label: i === 0 ? "This year" : String(y), meta: formatInrCompact(totalReceivedBetween(data.entries, `${y}-01-01`, `${y}-12-31`)) }));

  return (
    <IncomeFormsProvider forms={incomeFormsData(data, today, demo)}>
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Income"
        title={`${greetingFor()}, ${appConfig.ownerName}`}
        actions={
          <>
            <YearSelect options={yearOptions} value={year === years[0] ? "" : String(year)} />
            <RefreshButton iconOnly />
            <HeaderFormButtons />
          </>
        }
      >
        <GreetingSentence parts={summarySentence(data, today, year)} cards={greetingView(data, today, year)} />
        {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      {year === years[0] && <AttentionStrip items={attentionView(data, today)} />}
      {data.sources.length === 0 ? (
        <section className="rounded-[26px] border border-dashed border-divider bg-surface px-6 py-14 text-center">
          <p className="text-base font-extrabold">No income sources yet</p>
          <p className="mt-1 text-sm font-semibold text-muted">Your salary, interest, dividends and one-offs will show here, a column for every month.</p>
          <div className="mt-5 flex justify-center">
            <AddFirstSource />
          </div>
        </section>
      ) : (
        <IncomeDashboard cover={cover} widgets={incomeWidgets(data, today, year, cover.picks.map((p) => p.id))} lower={lowerWidgets(data, today, year, cover.picks.map((p) => p.id))} today={today} initialPick={initialPick} />
      )}
    </div>
    </IncomeFormsProvider>
  );
}
