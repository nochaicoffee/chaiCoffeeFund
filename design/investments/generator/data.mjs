// The sample portfolio for the Investments canvas, and the sums every board reads. Every trade, price and rate is made up.
// "Today" is Saturday Oct 31, 2026, so the markets are shut and every price is Friday's close.
// The fold is lib/aggregate/investments.ts (weighted-average cost, same-day trades Buy first, a US trade costed at its own frozen rate);
// valueHolding and the rate split below are what F-IV-03 will hold. Nothing here is read from the Sheet (its tabs are empty).
import * as L from "./lib.mjs";

export const FX_NOW = 90.15;     // USD→INR, Friday's close (Yahoo USDINR=X)
export const FX_PREV = 90.02;    // the day before
export const PRICES_AS_OF = "2026-10-30";

/** symbol → what the Instruments tab would hold (proposed): name, market, assetType, bucket, colour, price source, today's price and the day before, 52-week range. */
export const INSTRUMENTS = {
  NTAP: { name: "NetApp", market: "US", assetType: "Equity", bucket: "US equity", color: "sapphire", src: "Yahoo", price: 118.4, prev: 119.55, lo: 79.8, hi: 128.6 },
  VOO: { name: "Vanguard S&P 500 ETF", market: "US", assetType: "ETF", bucket: "US equity", color: "indigo", src: "Yahoo", price: 631.4, prev: 629.9, lo: 512.3, hi: 640.2 },
  QQQ: { name: "Invesco QQQ Trust", market: "US", assetType: "ETF", bucket: "US equity", color: "sky", src: "Yahoo", price: 668.2, prev: 671.9, lo: 521.4, hi: 689.5 },
  HDFCBANK: { name: "HDFC Bank", market: "IND", assetType: "Equity", bucket: "India equity", color: "ruby", src: "Yahoo", price: 1012, prev: 1004, lo: 866, hi: 1048 },
  INFY: { name: "Infosys", market: "IND", assetType: "Equity", bucket: "India equity", color: "violet", src: "Yahoo", price: 1486, prev: 1497, lo: 1352, hi: 1938 },
  RELIANCE: { name: "Reliance Industries", market: "IND", assetType: "Equity", bucket: "India equity", color: "copper", src: "Yahoo", price: 2540, prev: 2556, lo: 2310, hi: 3024 },
  NIFTYBEES: { name: "Nippon Nifty 50 BeES", market: "IND", assetType: "ETF", bucket: "India equity", color: "teal", src: "Yahoo", price: 289.4, prev: 288.1, lo: 241.2, hi: 292.8 },
  PPFAS: { name: "Parag Parikh Flexi Cap", market: "IND", assetType: "Mutual-Fund", bucket: "India equity", color: "emerald", src: "AMFI", price: 84.62, prev: 84.31, lo: 68.9, hi: 85.4 },
  ICICICORP: { name: "ICICI Pru Corporate Bond", market: "IND", assetType: "Debt-Fund", bucket: "Debt", color: "forest", src: "AMFI", price: 28.31, prev: 28.3, lo: 26.1, hi: 28.34, stale: "2026-10-28" },
  GOLDBEES: { name: "Nippon Gold BeES", market: "IND", assetType: "Gold", bucket: "Gold", color: "gold", src: "Yahoo", price: 108.6, prev: 107.2, lo: 74.5, hi: 112.9 },
};
export const BUCKETS = [["India equity", "teal"], ["US equity", "sapphire"], ["Debt", "forest"], ["Gold", "gold"]];

// ---------- The trade log ----------
let n = 0;
const r2 = (x) => Math.round(x * 100) / 100;
/** One InvestmentTransaction row: [date, symbol, type, source, quantity, price, fxRateToInr (US only), broker]. */
const T = (date, symbol, tradeType, source, quantity, price, fx, broker) => {
  const m = INSTRUMENTS[symbol].market;
  return { id: `t${String(++n).padStart(3, "0")}`, tradeDate: date, symbol, market: m, currency: m === "US" ? "USD" : "INR", tradeType, source, quantity, price, total: r2(quantity * price), assetType: INSTRUMENTS[symbol].assetType, broker, fxRateToInr: m === "US" ? fx : undefined };
};
const VESTS = [["2024-02-12", 88.2, 82.9], ["2024-05-13", 99.6, 83.4], ["2024-08-12", 103.4, 83.9], ["2024-11-12", 109.8, 84.4], ["2025-02-12", 121.7, 86.7], ["2025-05-12", 90.5, 85.4], ["2025-08-12", 98.9, 87.6], ["2025-11-12", 111.0, 88.5], ["2026-02-12", 119.2, 89.8], ["2026-05-12", 112.3, 91.0], ["2026-08-12", 116.4, 89.9]];
export const TRADES = [
  ...[["2021-09-09", 35, 1720], ["2024-01-22", 30, 1640]].map(([d, q, p]) => T(d, "INFY", "Buy", "Market", q, p, undefined, "Zerodha")),
  T("2025-06-17", "INFY", "Sell", "Market", 20, 1830, undefined, "Zerodha"),
  ...[["2022-01-18", 60, 780], ["2023-04-12", 40, 830], ["2025-02-05", 50, 905]].map(([d, q, p]) => T(d, "HDFCBANK", "Buy", "Market", q, p, undefined, "Zerodha")),
  ...[["2022-11-03", 30, 2520], ["2024-05-14", 20, 2910]].map(([d, q, p]) => T(d, "RELIANCE", "Buy", "Market", q, p, undefined, "Zerodha")),
  ...[["2024-01-05", 400, 238], ["2024-07-05", 350, 262], ["2025-01-06", 300, 246], ["2025-07-04", 300, 271], ["2026-03-06", 250, 262], ["2026-08-05", 200, 281]].map(([d, q, p]) => T(d, "NIFTYBEES", "Buy", "Market", q, p, undefined, "Zerodha")),
  ...[["2022-04-04", 612.345, 48.99], ["2023-03-06", 521.7, 57.5], ["2024-03-05", 395.2, 75.9], ["2025-03-05", 410.3, 73.1], ["2026-03-05", 380.3, 78.9]].map(([d, q, p]) => T(d, "PPFAS", "Buy", "Market", q, p, undefined, "Coin")),
  ...[["2023-06-12", 1420.5, 24.1], ["2025-01-10", 1100.2, 26.6]].map(([d, q, p]) => T(d, "ICICICORP", "Buy", "Market", q, p, undefined, "Coin")),
  ...[["2024-04-15", 600, 56.8], ["2025-04-22", 400, 82.0]].map(([d, q, p]) => T(d, "GOLDBEES", "Buy", "Market", q, p, undefined, "Zerodha")),
  ...[["2023-05-15", 22, 62.2, 82.1], ["2023-11-15", 20, 63.4, 83.1], ["2024-05-15", 19, 84.7, 83.4], ["2024-11-15", 17, 93.0, 84.4], ["2025-05-15", 20, 76.9, 85.5], ["2025-11-17", 18, 93.8, 88.4], ["2026-05-15", 16, 95.2, 91.0]].map(([d, q, p, f]) => T(d, "NTAP", "Buy", "ESPP", q, p, f, "Schwab")),
  ...VESTS.flatMap(([d, p, f]) => [T(d, "NTAP", "Buy", "RSU", 14, p, f, "Schwab"), T(d, "NTAP", "Sell", "RSU", 5, p, f, "Schwab")]),
  T("2025-03-10", "NTAP", "Sell", "Market", 40, 118.0, 87.0, "Schwab"),
  ...[["2023-07-10", 8, 391.2, 82.3], ["2024-06-10", 6, 480.5, 83.5], ["2025-06-09", 6, 522.0, 85.9], ["2026-04-08", 5, 598.0, 90.1]].map(([d, q, p, f]) => T(d, "VOO", "Buy", "Market", q, p, f, "Vested")),
  ...[["2024-03-11", 8, 438.0, 83.0], ["2025-09-08", 6, 585.0, 88.1]].map(([d, q, p, f]) => T(d, "QQQ", "Buy", "Market", q, p, f, "Vested")),
].sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : (a.tradeType === "Buy" ? 0 : 1) - (b.tradeType === "Buy" ? 0 : 1)));

// ---------- The fold: lib/aggregate/investments.ts ----------
export const costInr = (t) => (t.market === "IND" ? t.total : t.total * t.fxRateToInr);
export const sum = (a) => a.reduce((s, x) => s + x, 0);
const EPS = 1e-9;
/** One position's trades folded oldest first: quantity, cost (INR, and USD for a US one), what was sold and the realised gain on it. */
function fold(group, upTo = "9999") {
  let q = 0, cost = 0, costUsd = 0, realised = 0, proceeds = 0, bought = 0;
  for (const t of group.filter((x) => x.tradeDate <= upTo)) {
    if (t.tradeType === "Buy") { q += t.quantity; cost += costInr(t); costUsd += t.market === "US" ? t.total : 0; bought += costInr(t); continue; }
    const sold = Math.min(t.quantity, q), f = q > 0 ? sold / q : 0;
    const removed = cost * f; realised += costInr(t) - removed; proceeds += costInr(t);
    cost -= removed; costUsd -= costUsd * f; q -= sold;
    if (q < EPS) { q = 0; cost = 0; costUsd = 0; }
  }
  return { q, cost, costUsd, realised, proceeds, bought };
}
const bySym = {}; for (const t of TRADES) (bySym[t.symbol] ??= []).push(t);
export const SYMBOLS = Object.keys(INSTRUMENTS);

/** A holding with its price: value, gain, the day's move and the share of the whole. US value uses today's rate, never the trade's. */
export const HOLDINGS = SYMBOLS.map((symbol) => {
  const ins = INSTRUMENTS[symbol], f = fold(bySym[symbol]), us = ins.market === "US", rate = us ? FX_NOW : 1, prevRate = us ? FX_PREV : 1;
  const value = ins.price * rate * f.q, prevValue = ins.prev * prevRate * f.q, valueNative = ins.price * f.q;
  const avgFx = us && f.costUsd ? f.cost / f.costUsd : 1;
  const gain = value - f.cost;
  const stockGain = us ? (valueNative - f.costUsd) * avgFx : gain;   // price move at the rate you paid
  const rateGain = us ? valueNative * (FX_NOW - avgFx) : 0;          // the rupee's move on what it is worth now
  const own = bySym[symbol], first = own[0];
  return { symbol, ...ins, quantity: f.q, costInr: f.cost, costUsd: f.costUsd, avgCost: f.q ? f.cost / f.q : 0, avgCostNative: us ? (f.q ? f.costUsd / f.q : 0) : (f.q ? f.cost / f.q : 0), avgFx, value, valueNative, prevValue, day: value - prevValue, dayPct: ins.price / ins.prev - 1, gain, gainPct: f.cost ? gain / f.cost : 0, stockGain, rateGain, realised: f.realised, since: first.tradeDate,
    sources: [...new Set(own.map((t) => t.source))].filter((s) => s !== "Market"), trades: own };
}).filter((h) => h.quantity > 0).sort((a, b) => b.value - a.value);
export const holding = (s) => HOLDINGS.find((h) => h.symbol === s);

export const VALUE = sum(HOLDINGS.map((h) => h.value));
export const COST = sum(HOLDINGS.map((h) => h.costInr));
export const GAIN = VALUE - COST;
export const GAIN_PCT = GAIN / COST;
export const DAY = sum(HOLDINGS.map((h) => h.day));
export const DAY_PCT = DAY / (VALUE - DAY);
export const REALISED = sum(HOLDINGS.map((h) => h.realised));
export const STOCK_GAIN_US = sum(HOLDINGS.filter((h) => h.market === "US").map((h) => h.stockGain));
export const RATE_GAIN = sum(HOLDINGS.map((h) => h.rateGain));
export const share = (h) => h.value / VALUE;
export const byMarket = (m) => HOLDINGS.filter((h) => h.market === m);
export const bucketValue = (b) => sum(HOLDINGS.filter((h) => h.bucket === b).map((h) => h.value));
export const bucketCost = (b) => sum(HOLDINGS.filter((h) => h.bucket === b).map((h) => h.costInr));
export const US_VALUE_USD = sum(byMarket("US").map((h) => h.valueNative));
export const NETAPP = holding("NTAP");

/** Counts on NetApp shares by how they came: RSU vested, ESPP bought, shares sold to cover tax, sold in the market. */
export const NTAP_FLOWS = (() => {
  const t = bySym.NTAP, q = (f) => sum(t.filter(f).map((x) => x.quantity));
  return { vested: q((x) => x.source === "RSU" && x.tradeType === "Buy"), espp: q((x) => x.source === "ESPP"), cover: q((x) => x.source === "RSU" && x.tradeType === "Sell"), sold: q((x) => x.source === "Market" && x.tradeType === "Sell"), vests: t.filter((x) => x.source === "RSU" && x.tradeType === "Buy").length, purchases: t.filter((x) => x.source === "ESPP").length };
})();
export const SALARY_YEAR = 1662000;   // his NetApp salary over the last twelve months, from Income (made up)

// ---------- Cost over time (what the log can show: money in, not value: past prices aren't kept yet) ----------
export const MONTHS = L.monthsFrom("2021-09", 62);
export const monthEnd = (key) => { const d = `${key}-01`; return L.addDays(L.addMonthsUTC(d, 1), -1); };
export const COST_SERIES = SYMBOLS.map((symbol) => ({ symbol, color: INSTRUMENTS[symbol].color, points: MONTHS.map((m) => fold(bySym[symbol], monthEnd(m)).cost) }));
export const COST_TOTAL = MONTHS.map((_, i) => sum(COST_SERIES.map((s) => s.points[i])));
/** Money in by calendar year: every buy's cost (an RSU vest at its fair value), less every sell's proceeds. */
export const YEARS = [2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
  const t = TRADES.filter((x) => x.tradeDate.startsWith(String(y)));
  const by = (f) => sum(t.filter(f).map(costInr));
  return { y, market: by((x) => x.tradeType === "Buy" && x.source === "Market"), espp: by((x) => x.source === "ESPP"), rsu: by((x) => x.source === "RSU" && x.tradeType === "Buy"), out: by((x) => x.tradeType === "Sell") };
});

// ---------- The market strip ----------
export const MARKETS = [["Nifty 50", "25,918.4", 0.42], ["Sensex", "84,602.1", 0.38], ["S&P 500", "6,774.3", 0.19], ["Nasdaq", "23,904.7", -0.34], ["USD/INR", FX_NOW.toFixed(2), FX_NOW / FX_PREV * 100 - 100], ["Gold (MCX)", "1,21,840", 0.9]];

// ---------- Formatting ----------
export const pc = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
export const spc = (x, d = 1) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)}%`;
export const usd = (n, d = 2) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const qty = (x) => (Number.isInteger(x) ? String(x) : x.toLocaleString("en-IN", { maximumFractionDigits: 3 }));
export const num2 = (x) => x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Crore/lakh figures in full where it reads better: ₹56.32L. */
export const lakh = (n) => `${n < 0 ? "−" : ""}₹${(Math.abs(n) / 100000).toFixed(2)}L`;
export const money = (h, x) => (h.market === "US" ? usd(x) : L.inr(x));
