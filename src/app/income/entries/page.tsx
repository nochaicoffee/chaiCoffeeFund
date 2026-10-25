import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { Ledger } from "@/components/income/entries/Ledger";
import { Passbook } from "@/components/income/entries/Passbook";
import { YearSelect } from "@/components/income/YearSelect";
import { HeaderFormButtons, IncomeFormsProvider } from "@/components/income/forms/IncomeForms";
import { PageHeader } from "@/components/shell/PageHeader";
import { totalReceivedBetween } from "@/lib/aggregate/incomeYear";
import { todayIso } from "@/lib/format/date";
import { formatInrCompact } from "@/lib/format/money";
import { loadIncomeData } from "../loadIncomeData";
import { incomeFormsData, incomeHref, incomeYears } from "../views";
import { entriesHeader, ledgerRows, passbook, passbookSources } from "./entriesView";

export const metadata: Metadata = { title: "Income entries" };

/**
 * The Entries page (#191, docs/design/income.md "The final design"): every payment, like Cards' Statements,
 * Subscriptions' Renewals and Accounts' Balance history. For all sources it's the Ledger (E1); with `?source=` it's
 * that source's Passbook (E3). `?year=` picks a past year, `?demo` shows sample data in development. The forms are
 * the Income page's (#190).
 */
export default async function IncomeEntriesPage({ searchParams }: PageProps<"/income/entries">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadIncomeData(params, today);
  const years = incomeYears(data, today);
  const requestedYear = Number(typeof params.year === "string" ? params.year : NaN);
  const year = years.includes(requestedYear) ? requestedYear : years[0];
  const sourceId = typeof params.source === "string" ? params.source : undefined;
  const book = sourceId ? passbook(data, today, year, sourceId) : undefined;
  const header = entriesHeader(data, today, year);
  const yearOptions = years.map((y, i) => ({ value: i === 0 ? "" : String(y), label: i === 0 ? "This year" : String(y), meta: formatInrCompact(totalReceivedBetween(data.entries, `${y}-01-01`, `${y}-12-31`)) }));
  const sources = passbookSources(data, year);
  const at = { demo, year, thisYear: years[0] };
  const hrefFor = Object.fromEntries(sources.map((s) => [s.id, incomeHref("/income/entries", { ...at, source: s.id })]));

  return (
    <IncomeFormsProvider forms={incomeFormsData(data, today, demo)}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Income"
          eyebrow={
            <Link href={incomeHref("/income", { ...at, source: book?.id })} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="11 6 5 12 11 18" />
              </svg>
              Income · Entries
            </Link>
          }
          title={book ? `Entries · ${book.name}` : "Entries"}
          actions={
            <>
              <YearSelect options={yearOptions} value={year === years[0] ? "" : String(year)} />
              <span className="max-md:hidden">
                <RefreshButton iconOnly />
              </span>
              <HeaderFormButtons />
            </>
          }
        >
          <p className="text-[15px] leading-relaxed font-medium text-muted">
            {header.sentence.map((part, i) =>
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
          {sourceId && !book && <p className="w-fit rounded-full bg-warning-tint px-3 py-1 text-xs font-bold text-warning-text">That source isn&apos;t in the Sheet any more, so every source is shown.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>

        <StatementsSummary
          tiles={header.tiles.map((t) => ({
            label: t.label,
            value: <span className={t.tone === "warn" ? "text-warning-text" : ""}>{t.value}</span>,
            caption: t.note,
          }))}
        />

        {book ? <Passbook book={book} sources={sources} hrefFor={hrefFor} /> : <Ledger key={year} year={year} current={year === years[0]} rows={ledgerRows(data, today, year)} sources={sources.filter((s) => s.id !== "all").map((s) => ({ id: s.id, name: s.name }))} today={today} />}
      </div>
    </IncomeFormsProvider>
  );
}
