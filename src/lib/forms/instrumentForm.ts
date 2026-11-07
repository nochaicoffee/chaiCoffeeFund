import { INVESTMENT_ASSET_TYPES, type Instrument, type InvestmentAssetType, type InvestmentMarket } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Add a holding form (docs/design/investments.md, InvForms "Add an instrument"): what a holding is and where its price comes from
 * (ADR 0013). A holding he trades has to be one of these first, so the trade forms can offer it. Plain-word errors by field.
 */

export type InstrumentInput = Omit<Instrument, "id" | "color">;

/** The price ticker to start from: a US share is its symbol, an Indian one is Yahoo's `.NS`. A mutual fund's is an AMFI scheme code he has to give. */
export function suggestTicker(market: InvestmentMarket | undefined, assetType: InvestmentAssetType | undefined, symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === "" || market === undefined) return "";
  if (market === "US") return s;
  return assetType === "Mutual-Fund" || assetType === "Debt-Fund" ? "" : `${s}.NS`;
}

const isSchemeCode = (ticker: string) => /^\d+$/.test(ticker);

/** What the form posts, read into a row: `existing` are the holdings already saved, so the same symbol in the same market isn't added twice. */
export function readInstrumentForm(fields: FormFields, existing: Pick<Instrument, "symbol" | "market" | "name">[]): FormResult<InstrumentInput> {
  const f = new FieldReader(fields);
  const market = f.choice<InvestmentMarket>("market", ["IND", "US"], "Choose India or the US");
  const symbolText = f.text("symbol", "Enter the symbol, like NTAP");
  const name = f.text("name", "Enter the name");
  const assetType = f.choice<InvestmentAssetType>("assetType", INVESTMENT_ASSET_TYPES, "Choose what it is");
  const ticker = f.text("priceTicker", "Enter the price ticker, or the scheme code for a mutual fund")?.toUpperCase();

  const symbol = symbolText?.toUpperCase();
  if (symbol && /\s/.test(symbol)) f.fail("symbol", "A symbol has no spaces, like NTAP");
  const dup = market && symbol ? existing.find((i) => i.market === market && i.symbol.toUpperCase() === symbol) : undefined;
  if (dup) f.fail("symbol", `You already have ${dup.symbol} (${dup.name}) in ${market === "US" ? "the US" : "India"}`);
  if (ticker && /\s/.test(ticker)) f.fail("priceTicker", "A ticker has no spaces, like NIFTYBEES.NS");
  if (ticker && market === "US" && isSchemeCode(ticker)) f.fail("priceTicker", "A scheme code is for an Indian mutual fund; a US share has a ticker like NTAP");
  if (ticker && isSchemeCode(ticker) && (assetType === "Equity" || assetType === "ETF")) f.fail("priceTicker", "A scheme code prices a mutual fund. A share or an ETF's ticker ends in .NS or .BO, like NIFTYBEES.NS");
  if (ticker && market === "IND" && !isSchemeCode(ticker) && !/\.(NS|BO)$/.test(ticker)) f.fail("priceTicker", "An Indian share's ticker ends in .NS (NSE) or .BO (BSE), like NIFTYBEES.NS; a mutual fund's is its scheme code");

  if (!f.ok || !market || !symbol || !name || !assetType || !ticker) return f.result(undefined as never);
  return f.result({ symbol, market, name, assetType, priceTicker: ticker });
}
