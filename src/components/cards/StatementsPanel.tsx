import Link from "next/link";
import type { RangeRow, SpendRange, StatementCounts } from "@/lib/aggregate/cardSpend";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import type { Card, Statement } from "@/lib/sheets/types";
import { formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { cardSwatch } from "./CardTile";
import type { PanelView } from "@/app/cards/params";


/** How many years the range view shows before folding the rest away. */
const VISIBLE_YEARS = 3;

function Segmented({ view, hrefFor }: { view: PanelView; hrefFor: (v: PanelView) => string }) {
  const options: [PanelView, string][] = [
    ["statements", "Statements"],
    ["range", "Spend range"],
  ];
  return (
    <nav aria-label="Panel view" className="flex rounded-full bg-fill p-[3px]">
      {options.map(([value, label]) => (
        <Link
          key={value}
          href={hrefFor(value)}
          scroll={false}
          aria-current={view === value ? "page" : undefined}
          className={`flex h-[26px] items-center rounded-full px-[11px] text-[11px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent max-md:h-9 ${
            view === value ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function StatementsView({
  statements,
  cardsById,
  today,
  counts,
  viewAllHref,
}: {
  statements: Statement[];
  cardsById: Map<string, Card>;
  today: string;
  counts: StatementCounts;
  viewAllHref?: string;
}) {
  if (statements.length === 0) {
    return <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted">No statements yet.</p>;
  }
  return (
    <>
      <div className="-mx-[22px] overflow-x-auto px-[22px]">
        <table className="w-full min-w-[440px] text-left text-[13px]">
          <thead>
            <tr className="text-[10px] font-bold tracking-[0.03em] text-muted uppercase">
              <th className="py-2 pr-3 font-bold">Card</th>
              <th className="py-2 pr-3 font-bold">Statement</th>
              <th className="py-2 pr-3 font-bold">Due</th>
              <th className="py-2 pr-3 text-right font-bold">Total due</th>
              <th className="py-2 text-right font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((s) => {
              const card = cardsById.get(s.cardId);
              const days = daysBetween(today, s.dueDate);
              return (
                <tr key={s.id} className="h-11 border-t border-divider">
                  <td className="pr-3 font-bold">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-[9px] shrink-0 rounded-[3px]" style={{ background: cardSwatch(card?.color) }} aria-hidden="true" />
                      {card?.name ?? "Unknown card"}
                    </span>
                  </td>
                  <td className="pr-3 text-muted tabular-nums">{formatShortDate(s.statementDate)}</td>
                  <td className="pr-3 whitespace-nowrap tabular-nums">
                    {formatShortDate(s.dueDate)}
                    {s.status === "Pending" && (
                      <span className={`text-[11px] font-semibold ${days < 0 ? "text-negative" : "text-muted"}`}>
                        {" "}
                        · {days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `in ${days}d`}
                      </span>
                    )}
                  </td>
                  <td className="pr-3 text-right font-bold tabular-nums">{formatInr(s.totalAmountDue)}</td>
                  <td className="text-right">
                    <span
                      className={`rounded-full px-[11px] py-1 text-[10px] font-bold ${
                        s.status === "Paid" ? "bg-accent-tint text-accent-text" : "bg-fill text-muted"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3">
        <span className="text-[11px] font-semibold text-muted">
          Showing the {statements.length} most recent
          {counts.closed > 0 && ` · ${counts.inFull} of ${counts.closed} closed ${counts.closed === 1 ? "statement" : "statements"} paid in full`}
        </span>
        {viewAllHref && (
          <Link href={viewAllHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-accent-text hover:underline md:min-h-0">
            View all statements
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>
    </>
  );
}

function RangeRowView({ row, range, singleYear }: { row: RangeRow; range: SpendRange; singleYear: boolean }) {
  const span = range.scaleMax - range.scaleMin;
  const at = (v: number) => `${((v - range.scaleMin) / span) * 100}%`;
  const label = (month: string) => (singleYear ? formatMonthShort(month) : formatMonthYear(month));
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 sm:grid-cols-[56px_minmax(0,1fr)_150px]">
      <div className="text-[13px] font-extrabold">{row.year}</div>
      <div className="relative h-8" role="img" aria-label={`${row.year}: lowest ${row.lowest ? formatInr(row.lowest.amount) : "none"}, highest ${row.highest ? formatInr(row.highest.amount) : "none"}, average ${formatInr(row.average)}`}>
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-fill" />
        {row.lowest && row.highest && (
          <div
            className="absolute top-1/2 h-6 -translate-y-1/2 rounded-full"
            style={{
              left: `calc(${at(row.lowest.amount)} - 8px)`,
              width: `calc(${at(row.highest.amount)} - ${at(row.lowest.amount)} + 16px)`,
              background: "linear-gradient(90deg, var(--heat-2), var(--heat-4))",
            }}
          />
        )}
        {row.months.length > 0 && (
          <div className="absolute top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg opacity-50" style={{ left: at(row.average) }} />
        )}
        {row.months.map((m) => {
          const isCurrent = range.current?.month === m.month;
          return (
            <span
              key={m.month}
              title={`${formatMonthYear(m.month)}: ${formatInr(m.amount)}`}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                isCurrent ? "size-3.5 border-2 border-surface bg-accent shadow-card" : "size-2 border-[1.5px] border-heat-ink/60 bg-surface"
              }`}
              style={{ left: at(m.amount) }}
            />
          );
        })}
      </div>
      <div className="col-start-2 flex gap-4 text-xs font-bold tabular-nums sm:col-start-auto sm:flex-col sm:gap-0.5 sm:text-right">
        {row.highest && (
          <span>
            <span className="text-negative" aria-hidden="true">▲ </span>
            {formatInr(row.highest.amount)} <span className="text-[11px] font-semibold text-muted">{label(row.highest.month)}</span>
          </span>
        )}
        {row.lowest && (
          <span>
            <span className="text-positive" aria-hidden="true">▼ </span>
            {formatInr(row.lowest.amount)} <span className="text-[11px] font-semibold text-muted">{label(row.lowest.month)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/** "+6.2%" in red above the average, "−3.0%" in green below it, and a plain "0.0%" when it's level. */
function VsAverage({ value }: { value: number }) {
  const rounded = Math.round(value * 1000) / 10;
  if (rounded === 0) return <span>0.0%</span>;
  return (
    <span className={rounded > 0 ? "text-negative" : "text-positive"}>
      {rounded > 0 ? "+" : "−"}
      {Math.abs(rounded).toFixed(1)}%
    </span>
  );
}

function RangeView({ range, monthName }: { range: SpendRange; monthName: string }) {
  if (range.rows.every((r) => r.months.length === 0)) {
    return <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted">No spending to compare yet.</p>;
  }
  const singleYear = range.rows.length === 1;
  const visible = range.rows.slice(0, VISIBLE_YEARS);
  const folded = range.rows.slice(VISIBLE_YEARS);
  const { ticks, highest, lowest } = range;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-1 flex-col justify-center gap-3">
        {visible.map((row) => (
          <RangeRowView key={row.year} row={row} range={range} singleYear={singleYear} />
        ))}
        {folded.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-accent-text">
              Show {folded.length} earlier {folded.length === 1 ? "year" : "years"}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {folded.map((row) => (
                <RangeRowView key={row.year} row={row} range={range} singleYear={false} />
              ))}
            </div>
          </details>
        )}
        <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3.5 sm:grid-cols-[56px_minmax(0,1fr)_150px]" aria-hidden="true">
          <span />
          <div className="relative h-4 text-[10px] font-semibold text-muted tabular-nums">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((t - range.scaleMin) / (range.scaleMax - range.scaleMin)) * 100}%` }}>
                {formatInrCompact(t).replace(".0", "")}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-divider pt-3 text-xs font-bold tabular-nums">
        {highest && (
          <span>
            <span className="text-negative" aria-hidden="true">▲ </span>Highest {formatInr(highest.amount)}{" "}
            <span className="font-semibold text-muted">· {formatMonthYear(highest.month)}</span>
          </span>
        )}
        {lowest && (
          <span>
            <span className="text-positive" aria-hidden="true">▼ </span>Lowest {formatInr(lowest.amount)}{" "}
            <span className="font-semibold text-muted">· {formatMonthYear(lowest.month)}</span>
          </span>
        )}
        {range.currentVsAverage !== null && (
          <span>
            {monthName} vs avg <VsAverage value={range.currentVsAverage} />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The panel beside the details card: the 5 most recent statements, or where the
 * current month sits against each year's highest, lowest and average month.
 */
export function StatementsPanel({
  view,
  hrefFor,
  statements,
  cardsById,
  today,
  counts,
  periodLabel,
  range,
  viewAllHref,
}: {
  view: PanelView;
  hrefFor: (v: PanelView) => string;
  statements: Statement[];
  cardsById: Map<string, Card>;
  today: string;
  counts: StatementCounts;
  periodLabel: string;
  range: SpendRange;
  viewAllHref?: string;
}) {
  const monthName = formatMonthYear(today.slice(0, 7)).split(" ")[0];
  // Only promise "where this month sits" when this month's year is actually shown.
  const showsCurrentYear = range.rows.some((r) => r.year === Number(today.slice(0, 4)));
  return (
    <section aria-labelledby="panel-heading" className="flex min-h-full flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="panel-heading" className="text-sm font-bold text-fg">
          {view === "statements" ? (
            <>
              Statements{" "}
              <span className="text-xs font-semibold text-muted">
                · {periodLabel}
                {counts.pending > 0 && ` · ${counts.pending} pending`}
              </span>
            </>
          ) : (
            <>
              {showsCurrentYear ? `Where ${monthName} sits` : `Spend range in ${periodLabel}`}{" "}
              <span className="text-xs font-semibold text-muted">
                · <span className="inline-block h-3 w-0.5 bg-fg align-middle opacity-50" aria-hidden="true" /> year avg
              </span>
            </>
          )}
        </h2>
        <Segmented view={view} hrefFor={hrefFor} />
      </div>
      {view === "statements" ? (
        <StatementsView statements={statements} cardsById={cardsById} today={today} counts={counts} viewAllHref={viewAllHref} />
      ) : (
        <RangeView range={range} monthName={monthName} />
      )}
    </section>
  );
}
