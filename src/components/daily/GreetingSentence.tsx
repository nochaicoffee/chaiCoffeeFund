"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { DailyGreetingCards, DailyPoint } from "@/app/daily/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Daily greeting (the same pointing sentence as the other dashboards): what was spent in the month, on UPI and on
 * credit cards, a day, and the pace. A figure with nothing behind it stays plain bold.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: DailyGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as DailyPoint]} card={(point) => <CardBody point={point as DailyPoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: DailyPoint; cards: DailyGreetingCards }) {
  const card = cards[point];
  if (!card) return null;
  return (
    <>
      <CardHead title={card.title} total={card.total} />
      {card.rows.length > 0 && <GreetingRows rows={card.rows} />}
      {card.note && <div className={GREETING_NOTE}>{card.note}</div>}
    </>
  );
}
