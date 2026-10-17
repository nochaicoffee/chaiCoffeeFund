import type { Metadata } from "next";
import Link from "next/link";
import { loadCardData } from "../loadCardData";
import { cardsQuery, parsePage, parsePeriod, parseSearch, parseSelectedCard, parseSort, parseStatus, periodYears, statementsQuery, type StatementsListState } from "../params";
import { RefreshButton } from "@/components/RefreshButton";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { StatementsList } from "@/components/cards/StatementsList";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { PageHeader } from "@/components/shell/PageHeader";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { pendingSummary, statementYears } from "@/lib/aggregate/cardSpend";
import { filterCounts, filterStatements, groupByMonth, minimumDueNow, paginate, paidSummary, periodOverview } from "@/lib/aggregate/cardStatements";
import { formatShortDate, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";

export const metadata: Metadata = { title: "Statements" };

/** Rows per page. About two years of statements for two or three cards. */
const PAGE_SIZE = 25;

export default async function StatementsPage({ searchParams }: PageProps<"/cards/statements">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, accounts, skipped } = await loadCardData(params, today);

  const period = parsePeriod(params, today);
  const currentYear = Number(today.slice(0, 4));
  const state: StatementsListState = {
    period,
    status: parseStatus(params),
    cardId: parseSelectedCard(params, data),
    search: parseSearch(params) || undefined,
    sort: parseSort(params),
    demo,
  };
  const hrefFor = (changes: Partial<StatementsListState>) => `/cards/statements${statementsQuery({ ...state, page: 1, ...changes }, today)}`;

  const list = filterStatements(data, state);
  const { items, ...pageInfo } = paginate(list, parsePage(params), PAGE_SIZE);

  const periodText = period.kind === "all" ? "so far" : `in ${period.year}`;
  const overview = periodOverview(data, period);
  // Due now is every pending bill, whatever the period, like the dashboard's pending line (PRD §8).
  const due = pendingSummary(data, today);
  const paid = paidSummary(data, period);
  // Sample data never reaches the real forms, so it can't write to the Sheet.
  const addStatementHref = "/cards#add-statement";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        section="Cards"
        eyebrow={
          <Link href={`/cards${cardsQuery({ period, cardId: state.cardId, demo }, today)}`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="11 6 5 12 11 18" />
            </svg>
            Cards · Statements
          </Link>
        }
        title="Statements"
        actions={
          <>
            <PeriodSelect years={periodYears(statementYears(data, today), period)} currentYear={currentYear} value={period.kind === "all" ? "all" : String(period.year)} />
            <RefreshButton iconOnly />
            <Link
              href={addStatementHref}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add statement
            </Link>
          </>
        }
      >
        <p className="text-[15px] leading-relaxed font-medium text-muted">
          Every card statement in one place —{" "}
          {overview.count === 0 ? (
            `none ${periodText} yet.`
          ) : (
            <>
              {overview.count} {periodText} across {overview.cardCount} {overview.cardCount === 1 ? "card" : "cards"},{" "}
              {overview.pending > 0 ? <span className="font-bold text-fg">{overview.pending} pending</span> : "all paid"}.
            </>
          )}
        </p>
        {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>

      <StatementsSummary
        tiles={[
          {
            label: "Due now",
            value: formatInr(due.total),
            caption:
              due.count === 0
                ? "nothing pending"
                : `${due.count} ${due.count === 1 ? "statement" : "statements"}${due.nextDueDate ? ` · next due ${formatShortDate(due.nextDueDate)}` : ""}`,
          },
          { label: "Minimum due", value: formatInr(minimumDueNow(data)), caption: due.count === 0 ? "nothing pending" : "if you pay only the minimums" },
          {
            label: period.kind === "all" ? "Paid so far" : period.year === currentYear ? "Paid this year" : `Paid in ${period.year}`,
            value: formatInr(paid.total),
            caption: `${paid.count} ${paid.count === 1 ? "statement" : "statements"}`,
          },
          {
            label: "Paid in full",
            value: `${paid.inFull} of ${paid.count}`,
            caption:
              paid.count === 0
                ? "no closed statements yet"
                : `closed ${paid.count === 1 ? "statement" : "statements"} · ${paid.partial === 0 ? "no partial payments" : `${paid.partial} paid in part`}`,
          },
        ]}
      />

      <StatementsList
        state={state}
        hrefFor={hrefFor}
        groups={groupByMonth(items, list)}
        pageInfo={pageInfo}
        counts={filterCounts(data, state)}
        cards={data.cards}
        accounts={accounts}
        today={today}
        periodText={periodText}
        periodTotal={overview.count}
        addStatementHref={addStatementHref}
      />
    </div>
  );
}
