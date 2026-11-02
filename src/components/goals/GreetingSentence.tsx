"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { GoalsGreetingCards, GoalsPoint } from "@/app/goals/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/** The sentence under the Goals greeting (the same pointing sentence as the other dashboards): what's set aside, what each schedule takes, what you plan, and what's next. */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: GoalsGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as GoalsPoint]} card={(point) => <CardBody point={point as GoalsPoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: GoalsPoint; cards: GoalsGreetingCards }) {
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
