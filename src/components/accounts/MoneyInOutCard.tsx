import type { PickDetail } from "@/app/accounts/detailView";
import { formatInr, formatInrCompact } from "@/lib/format/money";

const H = 150;

/**
 * Money in and out (docs/design/accounts.md): paired columns for each month, what came in beside
 * the expenses with what was invested stacked on top, and the saved amount under the month.
 * It scrolls sideways when there are many months.
 */
export function MoneyInOutCard({ detail }: { detail: PickDetail }) {
  const { columns } = detail;
  const top = Math.max(1, ...columns.map((c) => Math.max(c.cameIn, c.expenses + c.invested)));
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
                <div key={c.key} className="flex min-w-[44px] flex-1 flex-col items-center gap-1" title={`${c.label}: came in ${formatInr(c.cameIn)}, expenses ${formatInr(c.expenses)}, invested ${formatInr(c.invested)}`}>
                  <div className="flex items-end gap-1" style={{ height: H }}>
                    <i className="block w-3.5 rounded-t-[5px] bg-accent" style={{ height: Math.max(c.cameIn > 0 ? 3 : 0, (c.cameIn / top) * H) }} />
                    <span className="flex w-3.5 flex-col-reverse">
                      <i className="block rounded-b-[2px] bg-[var(--card-ruby)]" style={{ height: (c.expenses / top) * H }} />
                      <i className="block rounded-t-[5px] bg-[var(--card-violet)]" style={{ height: (c.invested / top) * H }} />
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
            <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-ruby)]" />Expenses</li>
            <li className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2 rounded-[3px] bg-[var(--card-violet)]" />Invested</li>
            <li>Under each month: saved</li>
          </ul>
        </>
      )}
    </section>
  );
}
