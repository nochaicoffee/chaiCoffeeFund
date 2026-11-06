"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { InvestmentsGreetingCards, InvestmentsPoint } from "@/app/investments/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Investments greeting (the same pointing sentence as the other dashboards): what it is worth, what it has made,
 * the biggest holding, the yearly return and the gap to Nifty. Each figure opens a card that says what is behind it.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: InvestmentsGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as InvestmentsPoint]} card={(point) => <CardBody point={point as InvestmentsPoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: InvestmentsPoint; cards: InvestmentsGreetingCards }) {
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
