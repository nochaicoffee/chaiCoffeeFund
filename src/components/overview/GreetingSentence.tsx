"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingCard, OverviewGreetingCards, OverviewPoint } from "@/app/overview/views";
import { GREETING_NOTE, GreetingRows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Overview's greeting (the same pointing sentence as the other dashboards): what you're worth, how it moved, what is
 * still to pay this month and what to keep in mind. A figure with nothing behind it stays plain bold.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: OverviewGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as OverviewPoint]} card={(point) => <CardBody card={cards[point as OverviewPoint]} />} />;
}

function CardBody({ card }: { card: GreetingCard | undefined }) {
  if (!card) return null;
  return (
    <>
      <CardHead title={card.title} total={card.total} />
      {card.rows.length > 0 && <GreetingRows rows={card.rows} />}
      {card.note && <div className={GREETING_NOTE}>{card.note}</div>}
    </>
  );
}
