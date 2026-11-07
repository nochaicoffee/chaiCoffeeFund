import { findOversells, holdingsAt } from "../aggregate/investments";
import { formatDate } from "../format/date";
import { parseAmountText } from "../format/money";
import type { Instrument, InvestmentTransaction, TradeType } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The trade forms (docs/design/investments.md, InvForms): Add a trade, Edit, the RSU vest (two trades at once) and the ESPP purchase.
 * Each reads its fields into the rows the repository expects, or plain-word errors by field. A change that would leave a sell asking
 * for more than was held on its day is refused, whichever trade is added, edited or deleted.
 */

export type TradeInput = Omit<InvestmentTransaction, "id">;

/** What the forms know: the instruments to choose from and the trades already saved. */
export interface TradeFormContext {
  instruments: Pick<Instrument, "symbol" | "market" | "name" | "assetType">[];
  trades: InvestmentTransaction[];
  /** The brokerage accounts a trade may be paid from; when given, a trade naming any other is refused. */
  cashAccountIds?: string[];
}

/** A holding as one form value, "US:NTAP". */
export const holdingKey = (market: string, symbol: string) => `${market}:${symbol}`;

/** A number as typed ("1,20,000", "12.5"), not rounded: shares are fractional and a price has more than paise. */
function decimal(f: FieldReader, name: string, opts: { required: string; label: string; positive?: boolean }): number | undefined {
  const text = f.raw(name).trim();
  if (text === "") {
    f.fail(name, opts.required);
    return undefined;
  }
  const value = parseAmountText(text);
  if (value === null || !Number.isFinite(value)) {
    f.fail(name, `Enter the ${opts.label} as a number, like 12.5`);
    return undefined;
  }
  if (value < 0 || (opts.positive && value === 0)) {
    f.fail(name, opts.positive ? `The ${opts.label} has to be more than 0` : `The ${opts.label} can't be negative`);
    return undefined;
  }
  return value;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function holding(f: FieldReader, ctx: TradeFormContext): Pick<Instrument, "symbol" | "market" | "name" | "assetType"> | undefined {
  const value = f.raw("holding").trim();
  const found = ctx.instruments.find((i) => holdingKey(i.market, i.symbol) === value);
  if (!found) f.fail("holding", "Choose the holding");
  return found;
}

function rate(f: FieldReader, market: "IND" | "US" | undefined): number | undefined {
  if (market !== "US") return undefined;
  const value = decimal(f, "fxRateToInr", { required: "Enter the dollar rate on that day", label: "dollar rate", positive: true });
  if (value !== undefined && (value < 20 || value > 500)) f.fail("fxRateToInr", "A dollar rate is rupees to a dollar, like 94.5");
  return value;
}

/**
 * Whether saving `after` instead of `before` would leave a sell larger than was held. `before` is the saved log, `after` the log as it
 * would be; a sell already over in `before` (a history still being filled in) is not counted against this change, only a new one.
 */
export function newOversell(before: InvestmentTransaction[], after: InvestmentTransaction[], names: ReadonlyMap<string, string>): string | null {
  const had = new Set(findOversells(before).map((o) => o.transactionId));
  const fresh = findOversells(after).find((o) => !had.has(o.transactionId));
  if (!fresh) return null;
  const name = names.get(holdingKey(fresh.market, fresh.symbol)) ?? fresh.symbol;
  const held = Math.round(fresh.quantityHeld * 1e4) / 1e4;
  return `You held ${held} ${name} shares on ${formatDate(fresh.tradeDate)}, and this change leaves a sell of ${Math.round(fresh.quantitySold * 1e4) / 1e4}. Check the date, or a buy before it may be missing.`;
}

export const namesOf = (instruments: TradeFormContext["instruments"]): Map<string, string> => new Map(instruments.map((i) => [holdingKey(i.market, i.symbol), i.name]));

const withId = (row: TradeInput, id: string): InvestmentTransaction => ({ ...row, id });

export interface TradeFormInput {
  /** The row to save. */
  row: TradeInput;
}

/**
 * Add a trade, or Edit one (`editing` is its id). `total` is what the broker took or paid including fees; left blank it is the
 * quantity times the price. The source is kept as the trade has it (an RSU or ESPP sell is edited here too).
 */
export function readTradeForm(fields: FormFields, ctx: TradeFormContext, today: string, editing?: string): FormResult<TradeFormInput> {
  const f = new FieldReader(fields);
  const tradeType = f.choice<TradeType>("tradeType", ["Buy", "Sell"], "Choose Buy or Sell");
  const source = f.choice("source", ["Market", "RSU", "ESPP"] as const, "Choose how it came");
  const tradeDate = f.date("tradeDate", "Enter the day of the trade");
  if (tradeDate && tradeDate > today) f.fail("tradeDate", "That day hasn't come yet");
  const held = holding(f, ctx);
  const quantity = decimal(f, "quantity", { required: "Enter the number of shares", label: "number of shares", positive: true });
  const price = decimal(f, "price", { required: "Enter the price", label: "price" });
  const typedTotal = f.raw("total").trim() === "" ? undefined : decimal(f, "total", { required: "", label: "total" });
  const total = typedTotal ?? (quantity !== undefined && price !== undefined ? round6(quantity * price) : undefined);
  const fx = rate(f, held?.market);
  const broker = f.text("broker", "Enter the broker");
  const paidFrom = f.raw("settlementAccountId").trim();
  // The account the trade already has is always allowed, so a trade can be edited whatever that account has since become.
  const saved = editing ? ctx.trades.find((t) => t.id === editing)?.settlementAccountId : undefined;
  if (paidFrom !== "" && paidFrom !== saved && ctx.cashAccountIds && !ctx.cashAccountIds.includes(paidFrom)) f.fail("settlementAccountId", "Choose one of your broker cash accounts, or none");

  if (!f.ok || !tradeType || !source || !tradeDate || !held || quantity === undefined || price === undefined || total === undefined || !broker) return f.result(undefined as never);

  const row: TradeInput = {
    tradeDate, symbol: held.symbol, market: held.market, currency: held.market === "US" ? "USD" : "INR", tradeType, source, quantity, price, total,
    assetType: held.assetType, broker, ...(fx !== undefined && { fxRateToInr: fx }), ...(paidFrom !== "" && { settlementAccountId: paidFrom }),
  };
  const after = [...ctx.trades.filter((t) => t.id !== editing), withId(row, editing ?? "new")];
  const problem = newOversell(ctx.trades, after, namesOf(ctx.instruments));
  if (problem) {
    f.fail("quantity", problem);
    return f.result(undefined as never);
  }
  return f.result({ row });
}

export interface VestInput {
  vest: TradeInput;
  /** The shares sold to cover tax, absent when none were. */
  cover?: TradeInput;
}

/**
 * Record an RSU vest: the shares that vested (a Buy at the day's fair value, PRD Q12) and, when some were sold to cover tax, a Sell on
 * the same day. `editing` holds the ids of the two trades being edited, so they aren't counted twice.
 */
export function readVestForm(fields: FormFields, ctx: TradeFormContext, today: string, editing: string[] = []): FormResult<VestInput> {
  const f = new FieldReader(fields);
  const tradeDate = f.date("tradeDate", "Enter the vest day");
  if (tradeDate && tradeDate > today) f.fail("tradeDate", "That day hasn't come yet");
  const held = holding(f, ctx);
  const vested = decimal(f, "sharesVested", { required: "Enter the shares that vested", label: "shares vested", positive: true });
  const fairValue = decimal(f, "fairValue", { required: "Enter the fair value a share on the vest day", label: "fair value", positive: true });
  const sold = f.raw("sharesSold").trim() === "" ? 0 : decimal(f, "sharesSold", { required: "", label: "shares sold for tax" });
  if (vested !== undefined && sold !== undefined && sold > vested) f.fail("sharesSold", "More shares were sold for tax than vested");
  const soldAt = f.raw("soldAt").trim() === "" ? fairValue : decimal(f, "soldAt", { required: "", label: "sale price", positive: true });
  const fx = rate(f, held?.market);
  const broker = f.text("broker", "Enter the broker");
  if (!f.ok || !tradeDate || !held || vested === undefined || fairValue === undefined || sold === undefined || soldAt === undefined || !broker) return f.result(undefined as never);

  const base = { tradeDate, symbol: held.symbol, market: held.market, currency: held.market === "US" ? "USD" : "INR", source: "RSU", assetType: held.assetType, broker, ...(fx !== undefined && { fxRateToInr: fx }) } as const;
  const vest: TradeInput = { ...base, tradeType: "Buy", quantity: vested, price: fairValue, total: round6(vested * fairValue) };
  const cover: TradeInput | undefined = sold > 0 ? { ...base, tradeType: "Sell", quantity: sold, price: soldAt, total: round6(sold * soldAt) } : undefined;
  const after = [...ctx.trades.filter((t) => !editing.includes(t.id)), withId(vest, "new-vest"), ...(cover ? [withId(cover, "new-cover")] : [])];
  const problem = newOversell(ctx.trades, after, namesOf(ctx.instruments));
  if (problem) {
    f.fail("sharesSold", problem);
    return f.result(undefined as never);
  }
  return f.result({ vest, ...(cover && { cover }) });
}

/** Record an ESPP purchase: one Buy at the price he paid, the discounted one (PRD Q12). The market price that day is only for show. */
export function readEsppForm(fields: FormFields, ctx: TradeFormContext, today: string): FormResult<TradeInput> {
  const f = new FieldReader(fields);
  const tradeDate = f.date("tradeDate", "Enter the purchase day");
  if (tradeDate && tradeDate > today) f.fail("tradeDate", "That day hasn't come yet");
  const held = holding(f, ctx);
  const quantity = decimal(f, "quantity", { required: "Enter the shares bought", label: "shares bought", positive: true });
  const price = decimal(f, "price", { required: "Enter the price you paid", label: "price you paid", positive: true });
  const fx = rate(f, held?.market);
  const broker = f.text("broker", "Enter the broker");
  if (!f.ok || !tradeDate || !held || quantity === undefined || price === undefined || !broker) return f.result(undefined as never);
  return f.result({
    tradeDate, symbol: held.symbol, market: held.market, currency: held.market === "US" ? "USD" : "INR", tradeType: "Buy", source: "ESPP", quantity, price,
    total: round6(quantity * price), assetType: held.assetType, broker, ...(fx !== undefined && { fxRateToInr: fx }),
  });
}

/** Whether deleting these trades would leave a sell larger than was held: deleting a buy can. Returns the message, or null. */
export function deleteProblem(ctx: TradeFormContext, ids: string[]): string | null {
  return newOversell(ctx.trades, ctx.trades.filter((t) => !ids.includes(t.id)), namesOf(ctx.instruments));
}

/** What was held of a holding on a day, for the form to say "you hold 191 NetApp shares". */
export function heldOn(trades: InvestmentTransaction[], market: string, symbol: string, day: string): number {
  return holdingsAt(trades, day).find((h) => h.market === market && h.symbol === symbol)?.quantity ?? 0;
}
