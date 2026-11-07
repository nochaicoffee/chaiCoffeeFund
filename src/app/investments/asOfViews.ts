import { investmentOverview, type Overview, type OverviewInput } from "@/lib/aggregate/investmentOverview";
import { goBackIndex, offeredGoBack } from "./stageView";
import { holdingsView, returnsView, type HoldingTableRow, type ReturnCard } from "./views";

/**
 * "Go back to" a day (docs/design/investments.md, K5 Time machine): the Returns row and the holdings table as they stood on that day, so the
 * stage, the returns and the table all go back together. Each is the same overview worked out for that day, so every figure follows its own
 * rules; the table says how each price has moved since, and leaves out what he hadn't bought yet.
 */
export interface AsOfView {
  /** The day, as an ISO date. */
  date: string;
  returns: ReturnCard[];
  holdings: HoldingTableRow[];
}

/** Every day the stage offers going back to (not today), by its key. */
export function asOfViews(input: OverviewInput, now: Overview): Record<string, AsOfView> {
  const out: Record<string, AsOfView> = {};
  for (const key of offeredGoBack(now.series)) {
    if (key === "now") continue;
    const date = now.series[goBackIndex(now.series, key)]?.date;
    if (!date) continue;
    const then = investmentOverview({ ...input, today: date });
    out[key] = { date, returns: returnsView(then), holdings: holdingsView(then, now) };
  }
  return out;
}
