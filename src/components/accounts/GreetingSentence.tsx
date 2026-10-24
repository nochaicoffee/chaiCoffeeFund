"use client";

import type { SentencePart } from "@/app/cards/summarySentence";
import type { AccountsGreetingCards } from "@/app/accounts/views";
import { GREETING_NOTE as NOTE, GreetingMonths as Months, GreetingRows as Rows } from "@/components/shell/GreetingParts";
import { CardHead, PointingSentence } from "@/components/shell/PointingSentence";

/**
 * The sentence under the Accounts greeting (the same pointing sentence as Cards and
 * Subscriptions): its figures point at a card each: the accounts and their shares, what's
 * held with the months it came to, the change since the period began and who moved it, the
 * high-point month, and the account that hasn't been updated lately.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: AccountsGreetingCards }) {
  return <PointingSentence parts={parts} has={(point) => !!cards[point as keyof AccountsGreetingCards]} card={(point) => <CardBody point={point as keyof AccountsGreetingCards} cards={cards} />} />;
}

function CardBody({ point, cards }: { point: keyof AccountsGreetingCards; cards: AccountsGreetingCards }) {
  if (point === "accounts" && cards.accounts) {
    return (
      <>
        <CardHead title={cards.accounts.title} total={cards.accounts.total} />
        <Rows rows={cards.accounts.rows} />
      </>
    );
  }
  if (point === "total" && cards.total) {
    return (
      <>
        <CardHead title={cards.total.title} total={cards.total.total} />
        <Months months={cards.total.months} />
        <div className={NOTE}>{cards.total.note}</div>
      </>
    );
  }
  if (point === "since" && cards.since) {
    return (
      <>
        <CardHead title={cards.since.title} total={cards.since.total} />
        <Rows rows={cards.since.rows} />
      </>
    );
  }
  if (point === "high" && cards.high) {
    return (
      <>
        <CardHead title={cards.high.title} total={cards.high.total} />
        <Months months={cards.high.months} />
        <div className={NOTE}>{cards.high.note}</div>
      </>
    );
  }
  if (point === "attention" && cards.attention) {
    return (
      <>
        <div className="text-xs font-bold text-muted">{cards.attention.title}</div>
        <Rows rows={cards.attention.rows} />
        <div className={NOTE}>Your Sheet keeps its balance until you choose.</div>
      </>
    );
  }
  if (point === "stale" && cards.stale) {
    return (
      <>
        <div className="text-xs font-bold text-muted">{cards.stale.title}</div>
        <Rows rows={cards.stale.rows} />
      </>
    );
  }
  return null;
}
