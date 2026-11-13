import type { Flows } from "@/lib/aggregate/accountFlows";
import { formatInr } from "@/lib/format/money";

/**
 * The Invested tile on Accounts: money sent to brokers less money they sent back (Transfers). A stretch that took more back than it
 * sent says "Taken back" with the difference, rather than a negative "Invested". The note under it gives both sides.
 */
export function investedTile(f: Pick<Flows, "invested" | "sent" | "takenBack">): { label: string; value: string; note: string } {
  const both = `${formatInr(f.sent)} sent · ${formatInr(f.takenBack)} back`;
  if (f.invested < 0) return { label: "Taken back", value: formatInr(-f.invested), note: both };
  return { label: "Invested", value: formatInr(f.invested), note: f.takenBack > 0 ? both : f.sent > 0 ? "Sent to your brokers" : "Nothing sent to brokers" };
}

/** The Came in tile: income only. Money borrowed into the accounts in the stretch is named under it, since it isn't income. */
export function cameInTile(f: Pick<Flows, "cameIn" | "borrowed">): { label: string; value: string; note: string } {
  return { label: "Came in", value: formatInr(f.cameIn), note: f.borrowed > 0 ? `Income, plus ${formatInr(f.borrowed)} borrowed` : "Income received" };
}

/** The note under Saved: what stayed in the bank once brokers and loans are counted, or the plain rule when neither moved money. */
export function savedNote(f: Pick<Flows, "invested" | "borrowed" | "lent" | "moved" | "keptInBank">): string {
  if (f.invested === 0 && f.borrowed === 0 && f.lent === 0 && f.moved === 0) return "Came in less expenses";
  const kept = f.keptInBank >= 0 ? `${formatInr(f.keptInBank)} kept in the bank` : `${formatInr(-f.keptInBank)} more left the bank than you saved`;
  return f.lent > 0 ? `${kept} · ${formatInr(f.lent)} lent out` : kept;
}
