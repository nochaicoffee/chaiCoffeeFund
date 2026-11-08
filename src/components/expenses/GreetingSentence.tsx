"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { ExpenseGreetingCards, ExpensePoint } from "@/app/expenses/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Expenses greeting (the same pointing sentence as the other dashboards): what was spent, the cash and UPI in it, what went
 * into investments, what stayed, and the big spends; or, for a month not worked out, what's recorded. A figure with nothing behind it stays plain bold.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: ExpenseGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as ExpensePoint]} card={(point) => <CardBody point={point as ExpensePoint} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: ExpensePoint; cards: ExpenseGreetingCards }) {
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
