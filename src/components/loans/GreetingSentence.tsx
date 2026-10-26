"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { LoanGreetingCards } from "@/app/loans/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Loans greeting (the same pointing sentence as the other dashboards): what's still owed,
 * the EMIs a month, how much is repaid, the interest still to come, the next EMI and the debt-free date.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: LoanGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof LoanGreetingCards]} card={(point) => <CardBody point={point as keyof LoanGreetingCards} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: keyof LoanGreetingCards; cards: LoanGreetingCards }) {
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
