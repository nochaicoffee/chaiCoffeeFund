import type { Flows } from "@/lib/aggregate/accountFlows";
import { formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";

/**
 * The Invested tile on Accounts: money sent to brokers less money they sent back (Transfers). A stretch that took more back than it
 * sent says "Taken back" with the difference, rather than a negative "Invested". The note under it gives both sides.
 */
export function investedTile(f: Pick<Flows, "invested" | "sent" | "takenBack">): { label: string; value: string; note: string } {
  const both = `${formatInr(f.sent)} sent · ${formatInr(f.takenBack)} back`;
  if (f.invested < 0) return { label: "Taken back", value: formatInr(-f.invested), note: both };
  return { label: "Invested", value: formatInr(f.invested), note: f.takenBack > 0 ? both : f.sent > 0 ? "Sent to your brokers" : "Nothing sent to brokers" };
}

/** The Came in tile: income only. Money borrowed, and a friend's money held for him, are named under it, since neither is income. */
export function cameInTile(f: Pick<Flows, "cameIn" | "borrowed" | "held">): { label: string; value: string; note: string } {
  const apart = [f.borrowed > 0 ? `${formatInr(f.borrowed)} borrowed` : "", f.held > 0 ? `${formatInr(f.held)} held for others` : ""].filter(Boolean);
  return { label: "Came in", value: formatInr(f.cameIn), note: apart.length > 0 ? `Income, plus ${apart.join(" and ")}` : "Income received" };
}

/**
 * The Spent tile: the expenses the records explain (card bills, subscriptions, EMIs, big spends) plus the cash and UPI the balances
 * say left with no record. `cashUpi` is the balance change nothing explains: negative is money out, so it counts as spending; positive
 * is money that came in with no record, which is not spending and is named under In the bank now instead.
 */
export function spentTile(f: Pick<Flows, "expenses" | "out">, cashUpi: number): { label: string; value: string; note: string } {
  const unrecorded = Math.max(0, -cashUpi);
  const recorded = f.out["Big spends"] > 0 ? "Card bills, subscriptions, EMIs, big spends" : "Card bills, subscriptions, EMIs";
  return { label: "Spent", value: formatInr(f.expenses + unrecorded), note: unrecorded > 0 ? `${formatInr(f.expenses)} recorded, ${formatInr(unrecorded)} cash and UPI` : recorded };
}

/**
 * The In the bank now tile: what the bank accounts hold now, from their recorded balances, with how far that moved since the period began
 * (the figure the month columns add up to). The note gives the move and the balance it began from. The footnote says so
 * when it is exactly that difference (an account first read inside the period counts from its first balance, so then it says why not),
 * and names money that came in with no record. Money lent out is a row of its own (moneyShares.ts).
 */
export function leftTile(left: number, cashUpi: number, banks: { start: number; end: number; from: string }): { label: string; value: string; note: string; footnote: string; tone?: "positive" } {
  const matches = Math.abs(banks.end - banks.start - left) < 0.5;
  const footnote = [matches ? "Matches your balances, to the rupee" : "Accounts first read in this period count from their first balance", ...(cashUpi > 0 ? [`${formatInr(cashUpi)} came in with no record`] : [])].join(" · ");
  const change = `${left >= 0 ? "Up" : "Down"} ${formatInr(Math.abs(left))} since ${formatShortDate(banks.from)}`;
  return {
    label: "In the bank now",
    value: formatInr(banks.end),
    note: `${change}, from ${formatInrCompact(banks.start)}`,
    footnote,
    tone: left >= 0 ? "positive" : undefined,
  };

}

/** The note under Saved: what stayed in the bank once brokers and loans are counted, or the plain rule when neither moved money. */
export function savedNote(f: Pick<Flows, "invested" | "borrowed" | "lent" | "moved" | "keptInBank">): string {
  if (f.invested === 0 && f.borrowed === 0 && f.lent === 0 && f.moved === 0) return "Came in less expenses";
  const kept = f.keptInBank >= 0 ? `${formatInr(f.keptInBank)} kept in the bank` : `${formatInr(-f.keptInBank)} more left the bank than you saved`;
  return f.lent > 0 ? `${kept} · ${formatInr(f.lent)} lent out` : kept;
}
