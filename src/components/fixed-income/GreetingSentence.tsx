"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { FixedIncomeGreetingCards, FixedIncomePoint } from "@/app/fixed-income/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Fixed Income greeting (the same pointing sentence as the other dashboards): what it is all worth, EPF, the
 * deposits, what it earns a day, the interest built up and not credited, and the next deposit to mature.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: FixedIncomeGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as FixedIncomePoint]} card={(point) => <CardBody point={point as FixedIncomePoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: FixedIncomePoint; cards: FixedIncomeGreetingCards }) {
  const card = cards[point];
  if (!card) return null;
  return (
    <>
      <CardHead title={card.title} total={card.total} />
      <GreetingRows rows={card.rows} />
      {card.note && <div className={GREETING_NOTE}>{card.note}</div>}
    </>
  );
}
