import type { PickDetail } from "@/app/accounts/detailView";
import { formatInr, formatInrCompact } from "@/lib/format/money";

const H = 150;

/**
 * Money in and out (docs/design/accounts.md): paired columns for each month, what came in beside
 * the expenses with what was invested stacked on top, and the saved amount under the month. Money borrowed
 * sits on top of what came in, in its own colour: it isn't income, but it paid for what was sent to brokers.
 * It scrolls sideways when there are many months.
 */
export function MoneyInOutCard({ detail }: { detail: PickDetail }) {
  const { columns } = detail;
  const top = Math.max(1, ...columns.map((c) => Math.max(c.cameIn + c.borrowed, c.expenses + Math.max(0, c.invested) + Math.max(0, c.lent))));
  const quiet = !detail.hasFlows;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Money in and out">
      <h2 className="text-[15px] font-extrabold">
        Money in and out <small className="ml-2 text-xs font-semibold text-muted">By month, worked out</small>
      </h2>
      {quiet ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">No income or bills are recorded against this account in {detail.periodName.toLowerCase()}.</p>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <div className="flex min-w-full flex-1 items-end justify-between gap-2" style={{ minWidth: columns.length * 56 }}>
              {columns.map((c) => (
                <div key={c.key} className="flex min-w-[44px] flex-1 flex-col items-center gap-1" title={`${c.label}: came in ${formatInr(c.cameIn)}${c.borrowed > 0 ? `, borrowed ${formatInr(c.borrowed)}` : ""}, expenses ${formatInr(c.expenses)}, ${c.invested < 0 ? `taken back from brokers ${formatInr(-c.invested)}` : `sent to brokers ${formatInr(c.invested)}`}${c.lent > 0 ? `, lent ${formatInr(c.lent)}` : c.lent < 0 ? `, paid back to you ${formatInr(-c.lent)}` : ""}${c.moved > 0 ? `, ${formatInr(c.moved)} in from your other accounts` : c.moved < 0 ? `, ${formatInr(-c.moved)} out to your other accounts` : ""}`}>
                  <div className="flex items-end gap-1" style={{ height: H }}>
                    <span className="flex w-3.5 flex-col-reverse">
                      <i className="block rounded-b-[2px] bg-accent" style={{ height: Math.max(c.cameIn > 0 ? 3 : 0, (c.cameIn / top) * H) }} />
                      <i className="block rounded-t-[5px] bg-[var(--card-ocean)]" style={{ height: (c.borrowed / top) * H }} />
                    </span>
                    <span className="flex w-3.5 flex-col-reverse">
                      <i className="block rounded-b-[2px] bg-[var(--card-ruby)]" style={{ height: (c.expenses / top) * H }} />
                      <i className="block bg-[var(--card-violet)]" style={{ height: (Math.max(0, c.invested) / top) * H }} />
                      <i className="block rounded-t-[5px] bg-[var(--card-amber)]" style={{ height: (Math.max(0, c.lent) / top) * H }} />
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-muted">{c.label}</span>
                  <span className={`text-[10.5px] font-extrabold tabular-nums ${c.saved < 0 ? "text-negative" : c.saved > 0 ? "text-positive" : "text-muted"}`}>{c.cameIn === 0 && c.expenses === 0 ? "–" : c.savedText.replace(/₹[\d,]+/, (m) => formatInrCompact(Number(m.replace(/[₹,]/g, ""))))}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
            <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-accent" />Came in</li>
            {columns.some((c) => c.borrowed > 0) && (
              <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-ocean)]" />Borrowed</li>
            )}
            <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-ruby)]" />Expenses</li>
            <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-violet)]" />Invested</li>
            {columns.some((c) => c.lent > 0) && (
              <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-amber)]" />Lent</li>
            )}
            <li>Under each month: saved</li>
          </ul>
        </>
      )}
    </section>
  );
}
