"use client";

import type { GreetingCards, StripMonth } from "@/app/subscriptions/views";
import type { SentencePart } from "@/app/cards/summarySentence";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";
import { formatInr } from "@/lib/format/money";
import { Mono } from "./parts";

/** The sentence under the Subscriptions greeting (#126, 7A): its figures point at the cards in `cards`. */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: GreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof GreetingCards]} card={(point) => <CardBody point={point as keyof GreetingCards} cards={cards} />} />;
}

/** The year's months as small bars: what was paid in each, the lit ones in the accent, months still to come dashed. */
function Strip({ months, average }: { months: StripMonth[]; average?: number }) {
  const top = Math.max(1, average ?? 0, ...months.map((m) => m.paid));
  const H = 56;
  return (
    <div className="relative mt-3" aria-hidden="true">
      <div className="flex items-end gap-1" style={{ height: H }}>
        {months.map((m) => (
          <span
            key={m.key}
            className={`flex-1 rounded-t-[4px] rounded-b-[2px] ${m.future ? "border-[1.5px] border-dashed border-fill-strong" : m.lit ? "bg-heat-4" : "bg-heat-2"}`}
            style={{ height: m.future ? 8 : Math.max(3, (m.paid / top) * H) }}
          />
        ))}
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

function CardBody({ point, cards }: { point: keyof GreetingCards; cards: GreetingCards }) {
  if (point === "paid" && cards.paid) {
    return (
      <>
        <CardHead title={cards.paid.title} total={cards.paid.total} />
        <Strip months={cards.paid.months} />
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{cards.paid.note}</div>
      </>
    );
  }
  if (point === "average" && cards.average) {
    return (
      <>
        <CardHead title={cards.average.title} total={cards.average.total} />
        <Strip months={cards.average.months} average={cards.average.average} />
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{cards.average.note}</div>
      </>
    );
  }
  if (point === "biggest" && cards.biggest) {
    return (
      <>
        <CardHead title={cards.biggest.title} total={cards.biggest.total} />
        <Strip months={cards.biggest.months} />
        <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-divider pt-2.5">
          {cards.biggest.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">{r.mark.alias}</span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (point === "next" && cards.next) {
    return (
      <>
        <CardHead title={cards.next.title} total={cards.next.total} />
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {cards.next.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">
                {r.mark.alias} · {r.date} · {r.note}
              </span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}
