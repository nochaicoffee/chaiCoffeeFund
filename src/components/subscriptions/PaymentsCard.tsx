"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
 *
 * At xl the map beside this column is as tall as it, and lays its blocks out at that
 * height, so the card keeps one height whatever's picked or shown: room for six rows in
 * either view, and the line under them. Otherwise the map moved its blocks on every pick.
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

/** Six rows as tall as real ones, laid out unseen under the table to hold its height. */
const SPACER: PaymentsView = {
  rows: Array.from({ length: 6 }, (_, i) => ({
    key: `spacer-${i}`,
    subscriptionId: "",
    mark: { alias: "—", initial: "—", color: "onyx", muted: false },
    date: "—",
    amount: "—",
    change: { text: "—", up: true },
    chargedTo: { kind: "card", name: "—", color: "onyx" },
    status: "Paid",
  })),
  empty: "",
  footer: "",
  history: null,
};

const ALL_COLUMNS = "md:grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr]";
const ONE_COLUMNS = "md:grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr]";

/**
 * The payments table. 3A: hovering a row points at its subscription's block in the map
 * (`onPoint`); with All shown, a block hovered in the map (`lit`) lights its rows and steps
 * the rest back.
 */
function Table({ payments, all, lit = null, onPoint }: { payments: PaymentsView; all: boolean; lit?: string | null; onPoint?: (id: string | null) => void }) {
  const spot = all && lit !== null;
  const columns = all ? ALL_COLUMNS : ONE_COLUMNS;
  const heads = all ? ["Subscription", "Paid on", "Amount", "Charged to", "Status"] : ["Paid on", "Amount", "Change", "Charged to", "Status"];
  if (payments.rows.length === 0) return <p className="py-10 text-center text-[13px] font-medium text-muted">{payments.empty}</p>;
  return (
    <div role="table" aria-label="Payments" onPointerLeave={() => onPoint?.(null)}>
      <div role="row" className={`hidden text-[10px] font-bold tracking-[0.03em] text-muted uppercase md:grid ${columns}`}>
        {heads.map((h, i) => (
          <span role="columnheader" key={h} className={i === heads.length - 1 ? "text-right" : ""}>
            {h}
          </span>
        ))}
      </div>
      {payments.rows.map((r) => (
        <div
          role="row"
          key={r.key}
          onPointerEnter={(e) => e.pointerType !== "touch" && onPoint?.(r.subscriptionId)}
          className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-divider py-[9px] text-[13px] hover:bg-fill motion-safe:transition-[opacity,background-color] motion-safe:duration-200 md:gap-x-0 md:py-[11px] ${columns} ${spot ? (r.subscriptionId === lit ? "bg-fill" : "opacity-40") : ""}`}
        >
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

export function PaymentsCard({ pick, payments, onAll, lit = null, onPoint }: { pick: PickView; payments: PaymentsView; onAll: () => void; lit?: string | null; onPoint?: (id: string | null) => void }) {
  const [view, setView] = useState<"payments" | "history">("payments");
  const all = pick.status === "All";
  return (
    <section aria-labelledby="payments-title" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      {/* On one line at xl, where a long name truncates instead of wrapping the toggle onto a second line, which would change the card's height. */}
      <div className="flex flex-wrap items-center justify-between gap-3 xl:flex-nowrap">
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
        <Segmented
          label="Show"
          value={view}
          onChange={(v) => {
            setView(v);
            // The table goes, and with it any row being pointed at.
            onPoint?.(null);
          }}
          options={[{ value: "payments", label: "Payments" }, { value: "history", label: "Price history" }]}
        />
      </div>

      <div className="flex flex-1 flex-col">
        {/* One column that can be narrower than its content, so Price history measures the card's width rather than its own. */}
        <div className="grid grid-cols-[minmax(0,1fr)] *:[grid-area:1/1]">
          <div aria-hidden="true" inert className="invisible max-xl:hidden">
            <Table payments={SPACER} all={all} />
          </div>
          <div>
            {view === "payments" ? (
              <Table payments={payments} all={all} lit={lit} onPoint={onPoint} />
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
                  {payments.history.earlier && <span>{payments.history.earlier}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
          {payments.footer && <p className="text-xs font-medium text-muted">{payments.footer}</p>}
          <span className="ml-auto">
            <RenewalsLink subscriptionId={all ? undefined : pick.id} />
          </span>
        </div>
      </div>

      {/* Always there, as tall as the button, so picking one doesn't change the card's height. */}
      <div className="flex min-h-7 items-center gap-2 max-md:hidden">
        {all ? (
          <span className="text-xs font-medium text-muted">Pick a block in the map for one subscription&apos;s payments</span>
        ) : (
          <>
            <button type="button" onClick={onAll} className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              <RenewIcon size={11} />
              All subscriptions
            </button>
            <span className="text-xs font-medium text-muted">or pick a block in the map</span>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Where everything's charged, a month. Hovering or focusing a row (3B) lights its
 * subscriptions in the map (`onPoint`) and splits its bar into them; its light card (7B)
 * lists them and what lands next there: a card's next statement, or an account's next
 * renewals. The card sits over the row and glides between rows, so the page around it
 * never changes size, and the map beside it stays where it is.
 */
export function ChargedToCard({ rows, onPoint }: { rows: ChargedToRow[]; onPoint?: (ids: ReadonlySet<string> | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const rowEls = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<string | null>(null);
  // What the card shows: the last row hovered, kept while it fades out so it doesn't empty first.
  const [shown, setShown] = useState<string | null>(null);
  const row = rows.find((r) => r.key === shown) ?? null;

  function show(key: string | null) {
    setActive(key);
    if (key) setShown(key);
    const r = rows.find((x) => x.key === key);
    onPoint?.(r ? new Set(r.members.map((m) => m.id)) : null);
  }

  // Over its row, or under it near the top of the window; placed once its content has rendered, so its size is known.
  useLayoutEffect(() => {
    const card = tip.current, outer = box.current, el = active ? rowEls.current.get(active) : null;
    if (!card || !outer) return;
    if (!el) {
      delete card.dataset.open;
      return;
    }
    const o = outer.getBoundingClientRect(), t = el.getBoundingClientRect();
    const above = t.top - card.offsetHeight - 10 >= 8;
    const y = above ? t.top - o.top - card.offsetHeight - 10 : t.bottom - o.top + 10;
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--y", `${y}px`);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  }, [active]);

  return (
    <section aria-labelledby="charged-to-title" className="relative flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-[22px] shadow-[var(--card-shadow)] max-md:hidden">
      <h2 id="charged-to-title" className="text-[15px] font-extrabold text-fg">
        Charged to<small className="ml-2 text-xs font-semibold text-muted">a month</small>
      </h2>
      <div
        ref={box}
        className="relative flex flex-1 flex-col justify-between gap-3.5"
        onPointerLeave={(e) => e.pointerType !== "touch" && show(null)}
        onBlur={(e) => !box.current?.contains(e.relatedTarget as Node | null) && show(null)}
        onKeyDown={(e) => e.key === "Escape" && show(null)}
      >
        {rows.length === 0 ? (
          <p className="text-[13px] font-medium text-muted">Nothing is charged anywhere yet.</p>
        ) : (
          rows.map((r) => {
            const on = active === r.key;
            return (
              <div
                key={r.key}
                ref={(el) => {
                  if (el) rowEls.current.set(r.key, el);
                  else rowEls.current.delete(r.key);
                }}
                tabIndex={0}
                aria-describedby={on ? "charged-to-card" : undefined}
                onPointerEnter={(e) => e.pointerType !== "touch" && show(r.key)}
                onPointerDown={(e) => e.pointerType === "touch" && show(on ? null : r.key)}
                onFocus={() => show(r.key)}
                className={`-m-1.5 flex flex-col gap-[7px] rounded-[12px] p-1.5 focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-colors motion-safe:duration-150 ${on ? "bg-fill" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <ChargedTo chip={r.chip} />
                  <span className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold whitespace-nowrap text-muted">
                      {r.count} {r.count === 1 ? "subscription" : "subscriptions"}
                    </span>
                    <b className="font-extrabold tabular-nums">{formatInr(r.monthly)}</b>
                  </span>
                </div>
                {/* 3B: on hover the bar splits into its subscriptions, in their colours. */}
                <div className="relative h-1.5 overflow-hidden rounded-full bg-fill">
                  <span className={`absolute inset-y-0 left-0 rounded-[inherit] motion-safe:transition-opacity motion-safe:duration-200 ${on ? "opacity-0" : ""}`} style={{ width: `${r.fraction * 100}%`, background: `var(--card-${r.chip.color})` }} />
                  <span className={`absolute inset-y-0 left-0 flex gap-0.5 motion-safe:transition-opacity motion-safe:duration-200 ${on ? "" : "opacity-0"}`} style={{ width: `${r.fraction * 100}%` }} aria-hidden="true">
                    {r.members.map((m) => (
                      <i key={m.id} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: m.monthly, background: `var(--card-${m.color})` }} />
                    ))}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div
          ref={tip}
          id="charged-to-card"
          role="tooltip"
          aria-hidden={!active}
          className="pointer-events-none absolute top-0 right-0 left-0 z-20 rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translateY(var(--y,0px))_scale(0.97)] data-open:opacity-100 data-open:[transform:translateY(var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
        >
          {row && <NextCard row={row} />}
        </div>
      </div>
      <p className="mt-auto text-xs font-medium text-muted">Charges on a card are part of that card&apos;s statement, so they&apos;re never counted twice.</p>
    </section>
  );
}

function NextCard({ row }: { row: ChargedToRow }) {
  const { next } = row;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <ChargedTo chip={row.chip} />
        <span className="text-xs font-semibold text-muted">
          <b className="font-extrabold text-fg tabular-nums">{formatInr(row.monthly)}</b> a month
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1">
        {row.members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-xs font-semibold">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: `var(--card-${m.color})` }} />
            <span className="min-w-0 flex-1 truncate text-muted">{m.alias}</span>
            <span className="font-extrabold tabular-nums">{formatInr(m.monthly)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-divider pt-2.5">
        <div className="flex items-center justify-between gap-3 text-xs font-extrabold">
          <span>{next.title}</span>
          {next.total && <span className="tabular-nums">{next.total}</span>}
        </div>
        {next.rows.length === 0 ? (
          <p className="mt-1.5 text-[11px] font-semibold text-muted">{next.empty}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {next.rows.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-xs font-semibold">
                <Mono mark={c.mark} size={18} />
                <span className="min-w-0 flex-1 truncate text-muted">
                  {c.mark.alias} · {c.date} · {c.note}
                </span>
                <b className="font-extrabold tabular-nums">{c.amount}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
