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
