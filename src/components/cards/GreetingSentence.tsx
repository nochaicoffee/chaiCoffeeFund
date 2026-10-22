"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingCards, GreetingRow, StripMonth } from "@/app/cards/greetingView";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";
import { formatInr } from "@/lib/format/money";

/**
 * The sentence under the Cards greeting (Prathik's pick A, design/cards-greeting): its figures
 * point at a card each, as on Subscriptions: the period's months stacked by card, the average
 * across them, what made up the highest month, and the pending bills with how soon each is due.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: GreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof GreetingCards]} card={(point) => <CardBody point={point as keyof GreetingCards} cards={cards} />} />;
}

const NOTE = "mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted";

/**
 * The period's months as small bars (as the design draws them): `stack` has every month in its
 * cards' colours, `plain` has them all in one shade with the average across them as a dashed
 * line, and `lit` has only that month in colour. Months still to come this year are dashed.
 */
function Strip({ months, mode, average, lit }: { months: StripMonth[]; mode: "stack" | "plain" | "lit"; average?: number; lit?: string }) {
  const H = 56;
  const top = Math.max(1, average ?? 0, ...months.map((m) => m.total));
  return (
    <div className="relative mt-3" aria-hidden="true">
      <div className="flex items-end gap-1" style={{ height: H }}>
        {months.map((m) =>
          m.future ? (
            <span key={m.key} className="h-2 flex-1 rounded-[4px] border-[1.5px] border-dashed border-fill-strong" />
          ) : m.total === 0 ? (
            // A month with no statements draws nothing, in every mode, rather than a stub that reads as small spend.
            <span key={m.key} className="flex-1" />
          ) : (
            <span key={m.key} className="flex flex-1 flex-col-reverse gap-px">
              {mode === "stack" || (mode === "lit" && m.key === lit) ? (
                m.segments.map((s) => <i key={s.cardId} className="block rounded-[2px] first:rounded-b-[2px] last:rounded-t-[4px]" style={{ height: Math.max(2, (s.amount / top) * H), background: s.color }} />)
              ) : (
                <i className="block rounded-t-[4px] rounded-b-[2px] bg-heat-2" style={{ height: Math.max(3, (m.total / top) * H) }} />
              )}
            </span>
          ),
        )}
      </div>
      {average !== undefined && (
        <span className="absolute inset-x-0 border-t-2 border-dashed border-accent-text" style={{ bottom: 16 + (average / top) * H }}>
          <span className="absolute -top-[18px] right-0 rounded bg-surface px-1 text-[10px] font-extrabold text-accent-text">{formatInr(average)}</span>
        </span>
      )}
      <div className="mt-1 flex gap-1 text-center text-[9.5px] font-bold text-muted">
        {months.map((m) => (
          <span key={m.key} className="flex-1">
            {m.initial}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A card's initial on its colour, the little tile beside a bill. */
function Mono({ row }: { row: GreetingRow }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-extrabold text-on-card shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_2px_6px_oklch(0_0_0/0.18)]"
      style={{ background: row.swatch }}
    >
      {row.initial}
    </span>
  );
}

function CardBody({ point, cards }: { point: keyof GreetingCards; cards: GreetingCards }) {
  if (point === "spent" && cards.spent) {
    const { title, total, months, legend, note } = cards.spent;
    return (
      <>
        <CardHead title={title} total={total} />
        <Strip months={months} mode="stack" />
        {legend.length > 1 && (
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-muted">
            {legend.map((l) => (
              <span key={l.name} className="inline-flex items-center gap-1.5">
                <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: l.swatch }} />
                {l.name}
              </span>
            ))}
          </div>
        )}
        <div className={NOTE}>{note}</div>
      </>
    );
  }
  if (point === "average" && cards.average) {
    const { title, total, months, average, note } = cards.average;
    return (
      <>
        <CardHead title={title} total={total} />
        <Strip months={months} mode="plain" average={average} />
        <div className={NOTE}>{note}</div>
      </>
    );
  }
  if (point === "highest" && cards.highest) {
    const { title, total, months, lit, rows } = cards.highest;
    return (
      <>
        <CardHead title={title} total={total} />
        <Strip months={months} mode="lit" lit={lit} />
        {rows.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-divider pt-2.5">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
                <i aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: r.swatch }} />
                <span className="min-w-0 flex-1 truncate text-muted">{r.name}</span>
                <span aria-hidden="true" className="h-[5px] w-[54px] shrink-0 overflow-hidden rounded-full bg-fill">
                  <i className="block h-full rounded-full" style={{ width: `${(r.fraction ?? 0) * 100}%`, background: r.swatch }} />
                </span>
                <b className="min-w-[62px] text-right font-extrabold tabular-nums">{r.amount}</b>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
  if (point === "pending" && cards.pending) {
    const { title, total, rows, more } = cards.pending;
    return (
      <>
        <CardHead title={title} total={total} />
        <ul className="mt-2.5 flex flex-col gap-2 border-t border-divider pt-2.5">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono row={r} />
              <span className="min-w-0 flex-1">
                <b className="block truncate font-extrabold">{r.name}</b>
                <span className={`block text-[10.5px] ${r.urgent ? "font-extrabold text-negative" : "text-muted"}`}>{r.note}</span>
              </span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
        {more && <div className={NOTE}>{more}</div>}
      </>
    );
  }
  return null;
}
