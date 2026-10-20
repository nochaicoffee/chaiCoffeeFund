import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { remainingDue } from "@/lib/aggregate/cardSpend";
import { periodParam } from "@/lib/aggregate/period";
import { dueLabel, paymentVariance, type FilterCounts, type MonthGroup, type Page, type StatusFilter } from "@/lib/aggregate/cardStatements";
import type { StatementsListState } from "@/app/cards/params";
import type { Account, Card, Statement } from "@/lib/sheets/types";
import { ISO_DATE_PATTERN, formatDate, formatMonthYear } from "@/lib/format/date";
import { cardName, optionLabel } from "@/lib/format/labels";
import { formatInr, formatInrExact } from "@/lib/format/money";
import { cardGradient, cardSwatch } from "./CardTile";
import { StatusPill } from "./StatusPill";

/** The design's eleven columns; below `lg` each row stacks into a small two-column card instead. */
const COLUMNS = "lg:grid-cols-[1.75fr_1fr_1.15fr_0.95fr_0.85fr_0.8fr_0.95fr_0.8fr_0.9fr_1fr_96px]";
const HEADERS = ["Card", "Statement date", "Due date", "Total due", "Min due", "Status", "Amount paid", "Paid on", "Paid from", "Variance"];

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ["all", "All"],
  ["pending", "Pending"],
  ["paid", "Paid"],
];

const NONE = <span className="text-muted">—</span>;

function Count({ value }: { value: number }) {
  return <span className="text-[10px] font-extrabold opacity-70">{value}</span>;
}

/** A table cell, with its column name shown above the value when rows stack on a phone. */
function Cell({ label, className = "", children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="cell" className={`min-w-0 ${className}`}>
      {label && (
        <span aria-hidden="true" className="block text-[10px] font-bold tracking-[0.03em] text-muted uppercase lg:hidden">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

function VarianceValue({ statement, partPaid }: { statement: Statement; partPaid: boolean }) {
  // A part-paid pending bill shows what's left to pay instead (#84).
  if (partPaid) return <span className="font-bold whitespace-nowrap text-muted">{formatInrExact(remainingDue(statement))} left</span>;
  const variance = paymentVariance(statement);
  if (variance.kind === "none") return NONE;
  if (variance.kind === "full") {
    return (
      <span className="inline-flex items-center gap-[5px] font-bold text-accent-text">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
        Paid in full
      </span>
    );
  }
  return (
    <span className={`font-bold whitespace-nowrap ${variance.kind === "under" ? "text-negative" : "text-fg"}`}>
      {variance.kind === "over" ? "Overpaid" : "Underpaid"} {formatInrExact(variance.amount)}
    </span>
  );
}

function StatementRow({
  statement,
  card,
  paidFrom,
  today,
  action,
}: {
  statement: Statement;
  card: Card | undefined;
  paidFrom: string | undefined;
  today: string;
  /** Mark paid on a pending row, Edit payment on a paid one, built by the page. */
  action: ReactNode;
}) {
  const paid = statement.status === "Paid";
  // A pending bill can already be part-paid; its totals elsewhere count only what's left.
  const partPaid = !paid && (statement.amountPaid ?? 0) > 0;
  const amountPaid = paid || partPaid ? statement.amountPaid ?? 0 : undefined;
  const paidOn = statement.paidDate ? (ISO_DATE_PATTERN.test(statement.paidDate) ? formatDate(statement.paidDate) : statement.paidDate) : undefined;
  // On a phone, blank payment fields (all of them, on an unpaid pending row) are left out.
  const shownOnPhone = (value: unknown) => (value === undefined ? "max-lg:hidden" : "");
  return (
    <div
      role="row"
      className={`grid grid-cols-2 items-start gap-x-4 gap-y-2.5 border-b border-divider px-3.5 py-3.5 text-[13px] tabular-nums lg:min-h-[60px] lg:items-center lg:gap-3 lg:py-2 ${COLUMNS}`}
    >
      <Cell className="flex items-center gap-2.5">
        <span className="h-5 w-[30px] shrink-0 rounded-[5px] shadow-[0_2px_5px_oklch(0_0_0/0.18)]" style={{ background: cardGradient(card?.color) }} aria-hidden="true" />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-bold">{card ? cardName(card) : "Unknown card"}</div>
          <div className="truncate text-[11px] font-semibold text-muted">
            {card && optionLabel(card.issuer)}
            {card?.last4 && ` ·· ${card.last4}`}
          </div>
        </div>
      </Cell>
      <Cell label="Statement date">{formatDate(statement.statementDate)}</Cell>
      <Cell label="Due date" className="leading-tight">
        <div>{formatDate(statement.dueDate)}</div>
        <div className={`text-[11px] ${paid ? "font-semibold text-muted" : "font-bold text-negative"}`}>{dueLabel(statement, today)}</div>
      </Cell>
      <Cell label="Total due" className="font-extrabold">
        {formatInrExact(statement.totalAmountDue)}
      </Cell>
      <Cell label="Min due">{formatInrExact(statement.minimumAmountDue)}</Cell>
      <Cell className="max-lg:col-start-2 max-lg:row-start-1 max-lg:justify-self-end">
        <StatusPill status={statement.status} />
      </Cell>
      <Cell label="Amount paid" className={`font-bold ${shownOnPhone(amountPaid)}`}>
        {amountPaid === undefined ? NONE : formatInrExact(amountPaid)}
      </Cell>
      <Cell label="Paid on" className={shownOnPhone(paidOn)}>
        {paidOn ?? NONE}
      </Cell>
      <Cell label="Paid from" className={`truncate ${shownOnPhone(paidFrom)}`}>
        <span title={paidFrom}>{paidFrom ?? NONE}</span>
      </Cell>
      <Cell label="Variance" className={paid || partPaid ? "" : "max-lg:hidden"}>
        <VarianceValue statement={statement} partPaid={partPaid} />
      </Cell>
      <Cell className={`flex justify-end max-lg:col-span-2 ${paid ? "" : "max-lg:[&>*]:w-full"}`}>{action}</Cell>
    </div>
  );
}

function PageLink({ href, label, disabled, children }: { href: string; label: string; disabled: boolean; children: ReactNode }) {
  const className = "flex size-11 items-center justify-center rounded-full bg-fill text-base lg:size-7";
  if (disabled) {
    return (
      <span className={`${className} opacity-50`} aria-hidden="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={`${className} text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent`}>
      {children}
    </Link>
  );
}

/**
 * The Statements page's list (StatementsList.dc.html): status and card filters
 * with counts, a search and sort, then statements grouped by month with their
 * payment details and variance, Mark paid on pending rows and Edit payment on
 * paid ones. Every list control is a link or a GET form, so it all works before
 * (or without) client JavaScript.
 */
export function StatementsList({
  state,
  hrefFor,
  groups,
  pageInfo,
  counts,
  cards,
  accounts,
  today,
  periodText,
  periodTotal,
  addStatement,
  paymentFor,
}: {
  state: StatementsListState;
  /** A link to this page with some choices changed, back on page 1 unless a page is given. */
  hrefFor: (changes: Partial<StatementsListState>) => string;
  groups: MonthGroup[];
  pageInfo: Omit<Page<Statement>, "items">;
  counts: FilterCounts;
  cards: Card[];
  accounts: Account[];
  today: string;
  /** "in 2026", or "so far" for all time. */
  periodText: string;
  /** Every statement in the period, before filters. */
  periodTotal: number;
  /** The empty state's Add a statement button. */
  addStatement: ReactNode;
  /** Mark paid for a pending statement, Edit payment for a paid one. */
  paymentFor: (statement: Statement) => ReactNode;
}) {
  const status = state.status ?? "all";
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const shown = groups.flatMap((g) => g.statements);
  const paidShown = shown.filter((s) => s.status === "Paid");
  const blanksShown = paidShown.some((s) => !s.paidDate || (!s.paidFromAccountId && !s.paidFromCardId));
  const filtered = status !== "all" || state.cardId !== undefined || Boolean(state.search);
  const paidFromName = (s: Statement) =>
    s.paidFromAccountId ? (accountsById.get(s.paidFromAccountId)?.name ?? "Unknown account") : s.paidFromCardId ? (cardsById.has(s.paidFromCardId) ? cardName(cardsById.get(s.paidFromCardId)!) : "Unknown card") : undefined;

  const chip = (selected: boolean, empty: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent md:h-[30px] ${
      selected ? "bg-ink text-on-ink" : `bg-fill hover:bg-fill-strong ${empty ? "text-muted" : "text-fg"}`
    }`;

  return (
    <section aria-label="Statements" className="flex flex-col gap-4 rounded-[24px] border border-surface-line bg-surface p-4 shadow-soft md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-3">
          <nav aria-label="Status" className="flex rounded-full bg-fill p-[3px]">
            {STATUS_OPTIONS.map(([value, label]) => (
              <Link
                key={value}
                href={hrefFor({ status: value })}
                scroll={false}
                aria-current={status === value ? "page" : undefined}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent md:h-[30px] ${
                  status === value ? "bg-surface text-accent-text shadow-soft" : "text-muted hover:text-fg"
                }`}
              >
                {label}
                <Count value={counts.byStatus[value]} />
              </Link>
            ))}
          </nav>
          <div className="hidden h-[22px] w-px bg-divider sm:block" aria-hidden="true" />
          <nav aria-label="Card" className="-mx-4 flex max-w-[calc(100%+32px)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:max-w-full md:flex-wrap md:px-0">
            <Link href={hrefFor({ cardId: undefined })} scroll={false} aria-current={state.cardId === undefined ? "page" : undefined} className={chip(state.cardId === undefined, false)}>
              All cards <Count value={counts.allCards} />
            </Link>
            {cards.map((c) => (
              <Link
                key={c.id}
                href={hrefFor({ cardId: c.id })}
                scroll={false}
                aria-current={state.cardId === c.id ? "page" : undefined}
                className={chip(state.cardId === c.id, counts.byCard[c.id] === 0)}
              >
                <span className="size-2 rounded-[3px]" style={{ background: cardSwatch(c.color) }} aria-hidden="true" />
                {cardName(c)} <Count value={counts.byCard[c.id] ?? 0} />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Form action="/cards/statements" scroll={false} role="search" className="min-w-0 flex-1 md:w-60 md:flex-none">
            {state.cardId && <input type="hidden" name="card" value={state.cardId} />}
            {periodParam(state.period, today) && <input type="hidden" name="period" value={periodParam(state.period, today)} />}
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            {state.sort === "oldest" && <input type="hidden" name="sort" value="oldest" />}
            {state.demo && <input type="hidden" name="demo" value="" />}
            <label className="flex h-11 items-center gap-2 rounded-full bg-fill px-3.5 text-muted focus-within:outline-2 focus-within:outline-accent md:h-[34px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.5" y2="16.5" />
              </svg>
              <span className="sr-only">Search statements</span>
              <input
                type="search"
                name="q"
                defaultValue={state.search}
                placeholder="Search card or amount"
                className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-fg outline-none placeholder:text-muted"
              />
            </label>
          </Form>
          <Link
            href={hrefFor({ sort: state.sort === "oldest" ? "newest" : "oldest" })}
            scroll={false}
            aria-label={`Sorted ${state.sort === "oldest" ? "oldest" : "newest"} first. Sort ${state.sort === "oldest" ? "newest" : "oldest"} first instead`}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:h-[34px]"
          >
            {state.sort === "oldest" ? "Oldest first" : "Newest first"}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm font-semibold text-muted">
            {filtered && periodTotal > 0 ? "No statements match these filters." : `No statements ${periodText} yet.`}
          </p>
          {filtered && periodTotal > 0 ? (
            <Link href={hrefFor({ status: "all", cardId: undefined, search: undefined })} scroll={false} className="inline-flex min-h-11 items-center text-xs font-bold text-accent-text hover:underline md:min-h-0">
              Clear filters
            </Link>
          ) : (
            addStatement
          )}
        </div>
      ) : (
        <div role="table" aria-label={`Statements ${periodText}`} className="-mx-4 md:mx-0">
          <div role="rowgroup" className="max-lg:sr-only">
            <div role="row" className={`grid gap-3 border-b border-divider px-3.5 pb-2.5 ${COLUMNS}`}>
              {HEADERS.map((h) => (
                <span key={h} role="columnheader" className="text-[10px] font-bold tracking-[0.03em] text-muted uppercase">
                  {h}
                </span>
              ))}
              <span role="columnheader">
                <span className="sr-only">Action</span>
              </span>
            </div>
          </div>
          {groups.map((group) => (
            <div key={group.month} role="rowgroup">
              <div role="row" className="px-3.5 pt-3.5 pb-2">
                <div role="cell" aria-colspan={HEADERS.length + 1} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-extrabold">{formatMonthYear(group.month)}</span>
                  <span className="text-[11px] font-bold text-muted tabular-nums">
                    {group.count} {group.count === 1 ? "statement" : "statements"}
                    {group.due > 0 && ` · ${formatInr(group.due)} due`}
                    {group.paid > 0 && ` · ${formatInr(group.paid)} paid`}
                  </span>
                </div>
              </div>
              {group.statements.map((s) => (
                <StatementRow key={s.id} statement={s} card={cardsById.get(s.cardId)} paidFrom={paidFromName(s)} today={today} action={paymentFor(s)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[820px] text-[11px] leading-normal font-semibold text-muted">
            {pageInfo.pages > 1
              ? `Showing ${pageInfo.from}–${pageInfo.to} of ${pageInfo.total} statements${pageInfo.total < periodTotal ? ` (${periodTotal} ${periodText})` : ` ${periodText}`}.`
              : `Showing ${pageInfo.total} of ${periodTotal} ${periodTotal === 1 ? "statement" : "statements"} ${periodText}.`}
            {blanksShown && (
              <>
                {" "}
                <b className="text-fg">Paid on</b> and <b className="text-fg">Paid from</b> are blank where they weren&rsquo;t recorded. They fill in when you mark a statement paid, or with Edit payment.
              </>
            )}
            {paidShown.length > 0 && " Variance compares the amount paid with the total due."}
          </p>
          <nav aria-label="Pages" className="flex shrink-0 items-center gap-1.5 self-end text-xs font-bold text-muted md:self-auto">
            <PageLink href={hrefFor({ page: pageInfo.page - 1 })} label="Previous page" disabled={pageInfo.page <= 1}>
              ‹
            </PageLink>
            <span aria-current="page">
              Page {pageInfo.page} of {pageInfo.pages}
            </span>
            <PageLink href={hrefFor({ page: pageInfo.page + 1 })} label="Next page" disabled={pageInfo.page >= pageInfo.pages}>
              ›
            </PageLink>
          </nav>
        </div>
      )}
    </section>
  );
}
