"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { IncomeGreetingCards } from "@/app/income/views";
import { GREETING_NOTE, GreetingMonths, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Income greeting (the same pointing sentence as the other dashboards): what's been
 * received and from whom, about a month split into regular pay, bonuses and one-offs, against last year by source,
 * the biggest month, what's late, and what's coming in the next 30 days.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: IncomeGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof IncomeGreetingCards]} card={(point) => <CardBody point={point as keyof IncomeGreetingCards} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: keyof IncomeGreetingCards; cards: IncomeGreetingCards }) {
  const card = cards[point];
  if (!card) return null;
  return (
    <>
      <CardHead title={card.title} total={card.total} />
      {"months" in card && <GreetingMonths months={card.months} />}
      <GreetingRows rows={card.rows} />
      {"note" in card && <div className={GREETING_NOTE}>{card.note}</div>}
    </>
  );
}
