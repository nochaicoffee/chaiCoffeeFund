import { formatInrCompact } from "@/lib/format/money";

/**
 * The pieces inside a greeting figure's card (the pointing sentence's cards), shared by the dashboards: a list of
 * rows with a colour dot, a name, a note and an amount, and a year of small month bars. Plain data in, already
 * formatted by the page's greetingView.
 */

export interface GreetingRowData {
  key: string;
  name: string;
  /** A colour token key: `var(--card-<key>)`. */
  colorKey: string;
  amount: string;
  note?: string;
  /** 0–1: a bar beside the amount. */
  fraction?: number;
  warn?: boolean;
}

export interface GreetingMonthData {
  key: string;
  label: string;
  total: number;
  lit: boolean;
}

/** The small line of text at the foot of a card. */
export const GREETING_NOTE = "mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted";

/** Month totals as small bars; `lit` months are in the accent, the rest quiet. */
export function GreetingMonths({ months }: { months: GreetingMonthData[] }) {
  const top = Math.max(1, ...months.map((m) => m.total));
  return (
    <div className="mt-3" aria-hidden="true">
      <div className="flex h-14 items-end gap-1">
        {months.map((m) => (
          <i key={m.key} className={`block flex-1 rounded-t-[4px] rounded-b-[2px] ${m.lit ? "bg-accent" : "bg-heat-2"}`} style={{ height: Math.max(3, (m.total / top) * 56) }} />
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-center text-[9.5px] font-bold text-muted">
        {months.map((m) => (
          <span key={m.key} className="flex-1">
            {m.label}
          </span>
        ))}
      </div>
      <div className="sr-only">{months.map((m) => `${m.label} ${formatInrCompact(m.total)}`).join(", ")}</div>
    </div>
  );
}

export function GreetingRows({ rows }: { rows: GreetingRowData[] }) {
  return (
    <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-divider pt-2.5">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
          <i aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: `var(--card-${r.colorKey})` }} />
          <span className="min-w-0 flex-1">
            <b className="block truncate font-extrabold">{r.name}</b>
            {r.note && <span className={`block text-[10.5px] ${r.warn ? "font-extrabold text-warning-text" : "text-muted"}`}>{r.note}</span>}
          </span>
          {r.fraction !== undefined && (
            <span aria-hidden="true" className="h-[5px] w-[54px] shrink-0 overflow-hidden rounded-full bg-fill">
              <i className="block h-full rounded-full" style={{ width: `${r.fraction * 100}%`, background: `var(--card-${r.colorKey})` }} />
            </span>
          )}
          <b className={`min-w-[62px] text-right font-extrabold tabular-nums ${r.warn ? "text-warning-text" : ""}`}>{r.amount}</b>
        </li>
      ))}
    </ul>
  );
}
