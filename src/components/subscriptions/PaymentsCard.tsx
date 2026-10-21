"use client";

import { useState } from "react";
import type { ChargedToRow, PaymentRowView, PaymentsView, PickView } from "@/app/subscriptions/views";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { ArrowIcon, RenewIcon } from "./icons";
import { ChargedTo, Mono, Segmented } from "./parts";
import { RenewalsLink } from "./RenewalsLink";
import { useSize } from "./useSize";

/**
 * Payments for the pick (#126): the latest six, with what changed from the one before
 * and where each was charged, or with All picked the latest across every subscription.
 * Price history draws what each payment cost.
 */

const STATUS_PILL: Record<PaymentRowView["status"], string> = {
  Paid: "bg-accent-tint text-accent-text",
  Skipped: "bg-fill text-muted",
  Pending: "bg-warning-tint text-warning-text",
};

function Status({ status }: { status: PaymentRowView["status"] }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_PILL[status]}`}>{status}</span>;
}

function Change({ change }: { change: PaymentRowView["change"] }) {
  if (!change) return <span className="text-muted">—</span>;
  return (
    <span className={`inline-flex items-center gap-[3px] text-[11px] font-bold whitespace-nowrap ${change.up ? "text-negative" : "text-positive"}`}>
      <ArrowIcon up={change.up} />
      {change.text}
    </span>
  );
}

const ALL_COLUMNS = "md:grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr]";
const ONE_COLUMNS = "md:grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr]";

function Table({ payments, all }: { payments: PaymentsView; all: boolean }) {
  const columns = all ? ALL_COLUMNS : ONE_COLUMNS;
  const heads = all ? ["Subscription", "Paid on", "Amount", "Charged to", "Status"] : ["Paid on", "Amount", "Change", "Charged to", "Status"];
  if (payments.rows.length === 0) return <p className="py-10 text-center text-[13px] font-medium text-muted">No payments recorded yet.</p>;
  return (
    <div role="table" aria-label="Payments">
      <div role="row" className={`hidden text-[10px] font-bold tracking-[0.03em] text-muted uppercase md:grid ${columns}`}>
        {heads.map((h, i) => (
          <span role="columnheader" key={h} className={i === heads.length - 1 ? "text-right" : ""}>
            {h}
          </span>
        ))}
      </div>
      {payments.rows.map((r) => (
        <div role="row" key={r.key} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-divider py-[9px] text-[13px] md:gap-x-0 md:py-[11px] ${columns}`}>
          {all ? (
            <span role="cell" className="flex min-w-0 items-center gap-2.5">
              <Mono mark={r.mark} size={24} />
              <b className="truncate font-bold">{r.mark.alias}</b>
            </span>
          ) : null}
          <span role="cell" className={`font-semibold ${all ? "text-muted md:text-fg" : ""}`}>
            {r.date}
          </span>
          <b role="cell" className="text-right font-extrabold tabular-nums md:text-left">
            {r.amount}
          </b>
          {!all && (
            <span role="cell" className="max-md:hidden">
              <Change change={r.change} />
            </span>
          )}
          <span role="cell" className="min-w-0 max-md:hidden">
            {r.chargedTo ? <ChargedTo chip={r.chargedTo} /> : <span className="text-muted">—</span>}
          </span>
          <span role="cell" className="text-right max-md:hidden">
            <Status status={r.status} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** What each payment cost, as a step line in the pick's colour, drawn at the card's own width so its labels stay readable. */
function PriceLine({ points, color }: { points: { date: string; amount: number }[]; color: string }) {
  const [box, size] = useSize<HTMLDivElement>({ w: 520, h: 0 });
  const W = Math.max(200, size.w);
  const H = 190;
  const pad = 30;
  if (points.length === 0) return <p className="py-10 text-center text-[13px] font-medium text-muted">Nothing has been charged yet.</p>;
  const t = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const t0 = t(points[0].date);
  const t1 = Math.max(t(points.at(-1)!.date), t0 + 1);
  const lo = Math.min(...points.map((p) => p.amount));
  const hi = Math.max(...points.map((p) => p.amount));
  const x = (d: string) => pad + ((t(d) - t0) / (t1 - t0)) * (W - pad * 2);
  // A price that never changed sits halfway up.
  const y = (a: number) => (hi === lo ? H / 2 : H - pad - ((a - lo) / (hi - lo)) * (H - pad * 2));
  const path = points.map((p, i) => `${i ? `H${x(p.date).toFixed(1)}V` : `M${x(p.date).toFixed(1)},`}${y(p.amount).toFixed(1)}`).join(" ");
  return (
    <div ref={box}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Price history: from ${formatInr(points[0].amount)} to ${formatInr(points.at(-1)!.amount)}`}>
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--divider)" />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(p.date)} cy={y(p.amount)} r={3.5} fill="var(--surface)" stroke={color} strokeWidth={2} />
      ))}
      {[...new Set([lo, hi])].map((a) => (
        <text key={a} x={pad} y={y(a) - 8} fontSize={11} fontWeight={700} fill="var(--muted)">
          {formatInr(a)}
        </text>
      ))}
      <text x={pad} y={H - 8} fontSize={11} fontWeight={600} fill="var(--muted)">
        {formatDate(points[0].date)}
      </text>
      <text x={W - pad} y={H - 8} fontSize={11} fontWeight={600} fill="var(--muted)" textAnchor="end">
        {formatShortDate(points.at(-1)!.date)}
      </text>
    </svg>
    </div>
  );
}

export function PaymentsCard({ pick, payments, onAll }: { pick: PickView; payments: PaymentsView; onAll: () => void }) {
  const [view, setView] = useState<"payments" | "history">("payments");
  const all = pick.status === "All";
  return (
    <section aria-labelledby="payments-title" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="payments-title" className="flex min-w-0 items-center gap-2.5 text-[15px] font-extrabold text-fg">
          Payments <span className="font-semibold text-muted">·</span>
          {all ? (
            "All subscriptions"
          ) : (
            <span className="inline-flex min-w-0 items-center gap-2">
              <Mono mark={pick} size={22} />
              <span className="truncate">{pick.alias}</span>
            </span>
          )}
        </h2>
        <Segmented label="Show" value={view} onChange={setView} options={[{ value: "payments", label: "Payments" }, { value: "history", label: "Price history" }]} />
      </div>

      <div className="flex flex-1 flex-col">
        {view === "payments" ? (
          <Table payments={payments} all={all} />
        ) : all || !payments.history ? (
          <p className="py-10 text-center text-xs font-medium text-muted">Pick a subscription to see what each of its payments cost.</p>
        ) : (
          <div className="flex flex-col gap-3 pt-1.5">
            <PriceLine points={payments.history.points} color={`var(--card-${pick.color})`} />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
              {payments.history.points.length === 0 ? null : payments.history.changes.length ? (
                payments.history.changes.map((c, i) => (
                  <b key={i} className="font-bold text-fg">
                    {c}
                  </b>
                ))
              ) : (
                <span>The price hasn&apos;t changed.</span>
              )}
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
          {payments.footer && <p className="text-xs font-medium text-muted">{payments.footer}</p>}
          <span className="ml-auto">
            <RenewalsLink subscriptionId={all ? undefined : pick.id} />
          </span>
        </div>
      </div>

      {!all && (
        <div className="flex items-center gap-2 max-md:hidden">
          <button type="button" onClick={onAll} className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
            <RenewIcon size={11} />
            All subscriptions
          </button>
          <span className="text-xs font-medium text-muted">or pick a block in the map</span>
        </div>
      )}
    </section>
  );
}

export function ChargedToCard({ rows }: { rows: ChargedToRow[] }) {
  return (
    <section aria-labelledby="charged-to-title" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-[22px] shadow-[var(--card-shadow)] max-md:hidden">
      <h2 id="charged-to-title" className="text-[15px] font-extrabold text-fg">
        Charged to<small className="ml-2 text-xs font-semibold text-muted">a month</small>
      </h2>
      <div className="flex flex-1 flex-col justify-between gap-3.5">
        {rows.length === 0 ? (
          <p className="text-[13px] font-medium text-muted">Nothing is charged anywhere yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.key} className="flex flex-col gap-[7px]">
              <div className="flex items-center justify-between gap-3">
                <ChargedTo chip={r.chip} />
                <span className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold whitespace-nowrap text-muted">
                    {r.count} {r.count === 1 ? "subscription" : "subscriptions"}
                  </span>
                  <b className="font-extrabold tabular-nums">{formatInr(r.monthly)}</b>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fill">
                <span className="block h-full rounded-[inherit]" style={{ width: `${r.fraction * 100}%`, background: `var(--card-${r.chip.color})` }} />
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-auto text-xs font-medium text-muted">Charges on a card are part of that card&apos;s statement, so they&apos;re never counted twice.</p>
    </section>
  );
}
