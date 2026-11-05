import type { InvestmentMarket, InvestmentTransaction } from "../sheets/types";
import { ISO_DATE_PATTERN } from "../format/date";
import { daysBetween } from "./cardSpend";
import { totalInInr } from "./investments";

/** A dated amount of money, in rupees, from the investor's side: money put in is negative, money taken out (or what it is worth now) is positive. */
export interface CashFlow {
  /** An ISO day. */
  date: string;
  amount: number;
}

const ISO_DAY = ISO_DATE_PATTERN;

/**
 * The yearly rate that makes the flows worth nothing today: XIRR, with a 365-day year and each
 * flow discounted by its days from the first one. `null` when there is no such rate (all the
 * money went one way, no flows, or the span is a single day). A fall of 100% or more has no
 * rate either, so the search runs from -99.99% to 100,000%.
 *
 * Found by bisection: slower than Newton's method but it cannot overshoot or diverge on flows
 * that start with a loss or an odd mix, and a handful of flows is nothing to evaluate.
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  if (flows.some((flow) => !ISO_DAY.test(flow.date) || !Number.isFinite(flow.amount))) throw new RangeError("xirr needs ISO days and finite amounts");
  const ordered = [...flows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!ordered.some((f) => f.amount < 0) || !ordered.some((f) => f.amount > 0)) return null;
  const start = ordered[0].date;
  if (daysBetween(start, ordered[ordered.length - 1].date) === 0) return null;
  const years = ordered.map((flow) => daysBetween(start, flow.date) / 365);
  // Worth today of every flow at rate r, as of the first day. Falls as r rises when money went in first.
  const npv = (rate: number) => ordered.reduce((sum, flow, i) => sum + flow.amount * Math.pow(1 + rate, -years[i]), 0);

  let low = -0.9999;
  let high = 1000;
  const atLow = npv(low);
  const atHigh = npv(high);
  if (!Number.isFinite(atLow) || !Number.isFinite(atHigh) || Math.sign(atLow) === Math.sign(atHigh)) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (low + high) / 2;
    const value = npv(mid);
    if (value === 0) return mid;
    if (Math.sign(value) === Math.sign(atLow)) low = mid;
    else high = mid;
    if (high - low < 1e-13) break;
  }
  return (low + high) / 2;
}

export interface FlowFilter {
  symbol?: string;
  market?: InvestmentMarket;
  /** Only trades on or before this ISO day. */
  asOf?: string;
}

/**
 * The cash flows a trade log makes, in rupees (PRD Q12, answered 2026-11-04). Every Buy is money
 * put in, at its `total`: a market buy at what was paid, an ESPP purchase at the price he paid (the
 * discount shows up as return), and an RSU vest at its fair value on the vest day. Every Sell is
 * money taken out, at its `total` (fees already out of it): so a vest's same-day sell-to-cover
 * cancels part of it, and what is kept stays in at fair value. Dividends aren't trades and aren't
 * here yet (F-IN-03). Fees are in each trade's `total`, so they count as part of cost.
 */
export function investmentFlows(transactions: InvestmentTransaction[], filter: FlowFilter = {}): CashFlow[] {
  if (filter.asOf !== undefined && !ISO_DAY.test(filter.asOf)) throw new RangeError(`investmentFlows needs a day like 2026-04-05, not ${JSON.stringify(filter.asOf)}`);
  return transactions
    .filter((t) => (filter.symbol === undefined || t.symbol === filter.symbol) && (filter.market === undefined || t.market === filter.market))
    .filter((t) => filter.asOf === undefined || t.tradeDate <= filter.asOf)
    .map((t) => ({ date: t.tradeDate, amount: t.tradeType === "Buy" ? -totalInInr(t) : totalInInr(t) }));
}

/** Under this many days of history a yearly rate says nothing: a 3% gain in a month "annualises" to 43%. */
export const MIN_DAYS_FOR_YEARLY_RATE = 365;

export interface YearlyReturn {
  /** The yearly rate, or null when it is too early or there is none. */
  rate: number | null;
  tooEarly: boolean;
  /** Days from the first flow to `asOf`. */
  days: number;
}

/**
 * The yearly return (XIRR) of a set of trades, with what they are worth on `asOf` as the last
 * flow. `tooEarly` is true under a year of history (first trade to today, or to the last sale once
 * it is all sold), and then no rate is given.
 */
export function yearlyReturn(transactions: InvestmentTransaction[], valueNowInr: number, asOf: string, filter: Omit<FlowFilter, "asOf"> = {}): YearlyReturn {
  if (!Number.isFinite(valueNowInr) || valueNowInr < 0) throw new RangeError(`yearlyReturn needs a value of zero or more, not ${valueNowInr}`);
  const flows = investmentFlows(transactions, { ...filter, asOf });
  if (flows.length === 0) return { rate: null, tooEarly: false, days: 0 };
  const dates = flows.map((f) => f.date).sort();
  // The history is from the first trade to today while something is still held, and to the last sale once it is all sold:
  // a position held for three months and sold two years ago has three months of history, not two years.
  const end = valueNowInr > 0 ? asOf : dates[dates.length - 1];
  const days = daysBetween(dates[0], end);
  if (days < MIN_DAYS_FOR_YEARLY_RATE) return { rate: null, tooEarly: true, days };
  return { rate: xirr(valueNowInr > 0 ? [...flows, { date: asOf, amount: valueNowInr }] : flows), tooEarly: false, days };
}

/**
 * A holding's price growth a year from its first buy: (price now ÷ price at the first buy) over
 * the years between, in the trade's own currency, so the rupee isn't in it. `null` under a year, or
 * when either price is zero or below.
 */
export function priceCagr(firstBuyPrice: number, priceNow: number, firstBuyDay: string, asOf: string): number | null {
  const days = daysBetween(firstBuyDay, asOf);
  if (days < MIN_DAYS_FOR_YEARLY_RATE || firstBuyPrice <= 0 || priceNow <= 0) return null;
  return Math.pow(priceNow / firstBuyPrice, 365 / days) - 1;
}
