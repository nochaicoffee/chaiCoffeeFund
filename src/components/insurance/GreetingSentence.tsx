"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { InsuranceGreetingCards, InsurancePoint } from "@/app/insurance/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Insurance greeting (the same pointing sentence as the other dashboards): how many policies, the cover
 * of each kind, what a year costs, what left this year, the next renewal and any financed thing with no policy.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: InsuranceGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as InsurancePoint]} card={(point) => <CardBody point={point as InsurancePoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: InsurancePoint; cards: InsuranceGreetingCards }) {
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
