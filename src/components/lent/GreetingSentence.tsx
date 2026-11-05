"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { LentGreetingCards, LentPoint } from "@/app/lent/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Lent out greeting (the same pointing sentence as the other dashboards): what is out, the loans, what it earns a day,
 * the interest piling up, the payouts that haven't reached him, and the next payout. A figure with nothing behind it stays plain bold.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: LentGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as LentPoint]} card={(point) => <CardBody point={point as LentPoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: LentPoint; cards: LentGreetingCards }) {
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
