"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { AccountsGreetingCards, GreetingRow } from "@/app/accounts/views";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";
import { formatInrCompact } from "@/lib/format/money";

/**
 * The sentence under the Accounts greeting (the same pointing sentence as Cards and
 * Subscriptions): its figures point at a card each: the accounts and their shares, what's
 * held with the months it came to, the change since the period began and who moved it, the
 * high-point month, and the account that hasn't been updated lately.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: AccountsGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof AccountsGreetingCards]} card={(point) => <CardBody point={point as keyof AccountsGreetingCards} cards={cards} />} />;
}

const NOTE = "mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted";

/** Month-end totals as small bars; `lit` months are in the accent, the rest quiet. */
function Months({ months }: { months: { key: string; label: string; total: number; lit: boolean }[] }) {
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

function Rows({ rows }: { rows: GreetingRow[] }) {
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

function CardBody({ point, cards }: { point: keyof AccountsGreetingCards; cards: AccountsGreetingCards }) {
  if (point === "accounts" && cards.accounts) {
    return (
      <>
        <CardHead title={cards.accounts.title} total={cards.accounts.total} />
        <Rows rows={cards.accounts.rows} />
      </>
    );
  }
  if (point === "total" && cards.total) {
    return (
      <>
        <CardHead title={cards.total.title} total={cards.total.total} />
        <Months months={cards.total.months} />
        <div className={NOTE}>{cards.total.note}</div>
      </>
    );
  }
  if (point === "since" && cards.since) {
    return (
      <>
        <CardHead title={cards.since.title} total={cards.since.total} />
        <Rows rows={cards.since.rows} />
      </>
    );
  }
  if (point === "high" && cards.high) {
    return (
      <>
        <CardHead title={cards.high.title} total={cards.high.total} />
        <Months months={cards.high.months} />
        <div className={NOTE}>{cards.high.note}</div>
      </>
    );
  }
  if (point === "attention" && cards.attention) {
    return (
      <>
        <div className="text-xs font-bold text-muted">{cards.attention.title}</div>
        <Rows rows={cards.attention.rows} />
        <div className={NOTE}>Your Sheet keeps its balance until you choose.</div>
      </>
    );
  }
  if (point === "stale" && cards.stale) {
    return (
      <>
        <div className="text-xs font-bold text-muted">{cards.stale.title}</div>
        <Rows rows={cards.stale.rows} />
      </>
    );
  }
  return null;
}
