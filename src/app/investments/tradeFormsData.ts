import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";

/** What the trade forms need from the page: today, the holdings to choose from, the saved trades and the brokers already used. */
export interface TradeFormsData {
  today: string;
  instruments: Pick<Instrument, "symbol" | "market" | "name" | "assetType">[];
  trades: InvestmentTransaction[];
  brokers: string[];
}

export function tradeFormsData(trades: InvestmentTransaction[], instruments: Instrument[], today: string): TradeFormsData {
  const brokers = [...new Set(trades.map((t) => t.broker))].sort();
  return {
    today,
    instruments: instruments.map(({ symbol, market, name, assetType }) => ({ symbol, market, name, assetType })).sort((a, b) => a.name.localeCompare(b.name)),
    trades,
    brokers,
  };
}

/**
 * Which form a saved trade opens: an RSU trade opens the vest form with both trades of that day (the Buy and its sell-to-cover), an
 * ESPP purchase the ESPP form, anything else the trade form. `ids` are the rows the form edits.
 */
export type EditTarget = { kind: "trade"; ids: [string] } | { kind: "vest"; ids: string[]; vest: string; cover?: string } | { kind: "espp"; ids: [string] };

export function editTarget(trades: InvestmentTransaction[], id: string): EditTarget | null {
  const trade = trades.find((t) => t.id === id);
  if (!trade) return null;
  if (trade.source === "RSU") {
    const sameDay = trades.filter((t) => t.source === "RSU" && t.symbol === trade.symbol && t.market === trade.market && t.tradeDate === trade.tradeDate);
    const vest = sameDay.find((t) => t.tradeType === "Buy");
    const cover = sameDay.find((t) => t.tradeType === "Sell");
    if (vest) return { kind: "vest", ids: [vest.id, ...(cover ? [cover.id] : [])], vest: vest.id, ...(cover && { cover: cover.id }) };
    return { kind: "trade", ids: [trade.id] };
  }
  if (trade.source === "ESPP" && trade.tradeType === "Buy") return { kind: "espp", ids: [trade.id] };
  return { kind: "trade", ids: [trade.id] };
}
