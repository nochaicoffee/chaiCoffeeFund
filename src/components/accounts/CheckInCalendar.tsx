"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CheckInsView } from "@/app/accounts/views";
import { colorGradient } from "@/lib/format/subscriptionLabels";

/**
 * The check-in calendar (docs/design/accounts.md): accounts by months, a dot in a cell for
 * each time that account's balance was read that month, a hatched cell for a month it never
 * was, a dashed one for the month still going. Press a cell to see the readings behind it,
 * a name to open that account. It covers the last 12 months of the page's period.
 */

const MAX_DOTS = 4;

export function CheckInCalendar({ view, pickId, onPick }: { view: CheckInsView; pickId: string; onPick: (id: string) => void }) {
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  if (view.rows.length === 0) return <div className="flex min-h-56 flex-1 items-center justify-center rounded-[22px] bg-fill px-6 text-center text-sm font-semibold text-muted">No accounts yet.</div>;
  const picked = cell ? view.rows[cell[0]]?.cells[cell[1]] : undefined;
  const row = cell ? view.rows[cell[0]] : undefined;
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        {view.facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="truncate text-[10px] font-extrabold tracking-wider text-muted uppercase">{f.label}</dt>
            <dd className={`mt-0.5 truncate text-lg leading-tight font-extrabold tabular-nums ${f.warn ? "text-[var(--card-copper)]" : ""}`}>{f.value}</dd>
            {f.note && <dd className="truncate text-[11px] font-semibold text-muted">{f.note}</dd>}
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <div role="grid" aria-label="When each account's balance was read" className="grid min-w-[420px] content-start gap-1" style={{ gridTemplateColumns: `minmax(112px, 1.4fr) repeat(${view.months.length}, minmax(0, 1fr))` }}>
          <span />
          {view.months.map((m) => (
            <span key={m.key} className="pb-0.5 text-center text-[10px] font-bold tracking-wider text-muted uppercase">
              {m.label}
            </span>
          ))}
          {view.rows.map((r, j) => (
            <div key={r.accountId} role="row" className="contents">
              <button type="button" onClick={() => onPick(r.accountId)} aria-label={`Open ${r.name}`} className={`flex min-w-0 items-center gap-2 rounded-xl py-0.5 pr-1 pl-0.5 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent ${r.accountId === pickId ? "bg-fill ring-1 ring-fg/25" : ""} ${r.closed ? "grayscale" : ""}`}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold text-on-card" style={{ background: colorGradient(r.colorKey) }}>
                  {r.initial}
                </span>
                <span className="min-w-0 leading-tight">
                  <b className="block truncate text-xs font-extrabold">{r.name.split(" ")[0]}</b>
                  <small className="block truncate text-[10px] font-semibold text-muted">{r.purpose}</small>
                </span>
              </button>
              {r.cells.map((c, k) => (
                <button
                  key={c.month}
                  type="button"
                  role="gridcell"
                  disabled={c.state === "none"}
                  onClick={() => setCell([j, k])}
                  aria-label={`${r.name}, ${c.monthText}: ${c.state === "read" ? `${c.readings.length} reading${c.readings.length === 1 ? "" : "s"}` : c.state === "missed" ? "not read" : c.state === "open" ? "not read yet" : "no account then"}`}
                  className={`flex h-[34px] items-center justify-center gap-[3px] rounded-[9px] transition-[transform,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-accent ${c.state === "none" ? "" : "motion-safe:hover:scale-110"} ${
                    c.state === "missed"
                      ? "bg-[repeating-linear-gradient(135deg,transparent_0_4px,oklch(0_0_0/0.075)_4px_5px)] bg-fill"
                      : c.state === "open"
                        ? "border border-dashed border-muted/60"
                        : c.state === "none"
                          ? "bg-fill/40"
                          : "bg-fill"
                  } ${cell && cell[0] === j && cell[1] === k ? "shadow-[inset_0_0_0_2px_var(--fg)]" : ""}`}
                >
                  {c.readings.slice(0, MAX_DOTS).map((x, i) => (
                    <i key={x.dateText + i} className={`size-1.5 rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none ${shown ? "scale-100" : "scale-0"}`} style={{ background: `var(--card-${r.colorKey})`, transitionDelay: `${(j + k) * 14}ms` } as CSSProperties} />
                  ))}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto rounded-2xl bg-fill px-4 py-3 text-[12.5px] leading-relaxed font-medium text-muted" aria-live="polite">
        {picked && row ? (
          picked.readings.length > 0 ? (
            <>
              <b className="text-fg">
                {row.name}, {picked.monthText}.
              </b>{" "}
              Read on {picked.readings.map((x) => `${x.dateText} (${x.balanceText})`).join(", ")}.
            </>
          ) : (
            <>
              <b className="text-fg">
                {row.name}, {picked.monthText}.
              </b>{" "}
              {picked.state === "open" ? "Not read yet this month." : "The balance was not read this month."}
            </>
          )
        ) : (
          <>
            <b className="text-fg">Pick a month</b> to see the readings behind a cell. A hatched cell is a month this account&apos;s balance was never read; a dashed one is the month still going.
          </>
        )}
      </div>
    </>
  );
}
