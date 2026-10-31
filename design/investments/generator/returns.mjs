// The return figures added on 2026-11-04 (PRD F-IV-15 to F-IV-17, F-IN-03, F-IV-04): XIRR, a holding's price CAGR, the gap to an index, realised
// gain and dividends. Sample data, made up. In the app each of these is a pure function in lib/aggregate/ with a test; this file is the picture of them.
//
// How money counts (PRD Q12, answered 2026-11-04):
//   a market buy                 cash in, at its cost (a US trade at its own frozen rate)
//   an RSU vest                  cash in at the fair value on the vest day (the trade's price)
//   its sell-to-cover            cash out (the same day, at the same price)
//   an ESPP purchase             cash in at what he paid (the trade's price, not the market's), so the discount shows as return
//   a sale                       cash out
//   a dividend                   cash out of the holding, after tax withheld (a US one in dollars at that day's rate)
//   today (or the day he picks)  what everything is worth, as the last cash out
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
const { sum } = D;

/** XIRR: the yearly rate r at which the dated flows (negative in, positive out) add to zero. Bisection, so it always ends and never wanders off. */
export function xirr(flows) {
  const f = flows.filter((x) => x.amount !== 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (f.length < 2 || !f.some((x) => x.amount < 0) || !f.some((x) => x.amount > 0)) return null;
  const t0 = f[0].date, yrs = f.map((x) => L.daysBetween(t0, x.date) / 365);
  const npv = (r) => f.reduce((s, x, i) => s + x.amount / Math.pow(1 + r, yrs[i]), 0);
  let lo = -0.95, hi = 5;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

// ---------- Dividends (F-IN-03): made up, a payment per share on a date; a US one has 25% withheld ----------
const WITHHELD = 0.25;
/** [date, symbol, per share (native)] */
const DIV_SCHEDULE = [
  ...["2023-07-21", "2023-10-20", "2024-01-19", "2024-04-19", "2024-07-19", "2024-10-18"].map((d, i) => [d, "NTAP", i < 3 ? 0.5 : 0.52]),
  ...["2025-01-24", "2025-04-25", "2025-07-25", "2025-10-24", "2026-01-23", "2026-04-24", "2026-07-24"].map((d, i) => [d, "NTAP", i < 4 ? 0.52 : 0.54]),
  ["2023-08-18", "HDFCBANK", 19], ["2024-08-09", "HDFCBANK", 19.5], ["2025-08-08", "HDFCBANK", 22],
  ["2024-05-31", "INFY", 20], ["2024-11-08", "INFY", 21], ["2025-05-30", "INFY", 22], ["2025-11-07", "INFY", 23],
  ["2023-08-18", "RELIANCE", 9], ["2024-08-23", "RELIANCE", 10], ["2025-08-22", "RELIANCE", 10],
];
const idxOnOrBefore = (iso) => { let k = -1; for (let i = 0; i < H.DAYS.length; i++) { if (H.DAYS[i] <= iso) k = i; else break; } return k; };
/** Each dividend with what was held that day: gross and tax withheld in its own currency, and the rupees that arrived. */
export const DIVIDENDS = DIV_SCHEDULE.map(([date, symbol, per]) => {
  const i = idxOnOrBefore(date), q = H.BYSYM[symbol].q[i] ?? 0, us = D.INSTRUMENTS[symbol].market === "US", fx = us ? H.FX[i] : 1;
  const gross = q * per, withheld = us ? gross * WITHHELD : 0;
  return { date, symbol, per, q, us, gross, withheld, net: gross - withheld, inr: (gross - withheld) * fx };
}).filter((d) => d.q > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
export const dividendsUpTo = (iso, sym = null) => DIVIDENDS.filter((d) => d.date <= iso && (!sym || d.symbol === sym));
export const DIV_TOTAL = sum(DIVIDENDS.map((d) => d.inr));
export const DIV_WITHHELD_INR = sum(DIVIDENDS.filter((d) => d.us).map((d) => d.withheld * H.FX[idxOnOrBefore(d.date)]));
export const DIV_YEAR = sum(DIVIDENDS.filter((d) => d.date > L.addDays(H.END, -365)).map((d) => d.inr));

// ---------- The cash flows ----------
/** Every flow for one holding (or all of them) up to a day, with what it is worth that day as the last one. i is a day index; the default is today. */
export function flows(sym = null, i = H.lastIdx) {
  const iso = H.DAYS[i], mine = (x) => !sym || x.symbol === sym;
  const out = D.TRADES.filter((t) => mine(t) && t.tradeDate <= iso).map((t) => ({ date: t.tradeDate, amount: (t.tradeType === "Buy" ? -1 : 1) * D.costInr(t), what: t.source === "RSU" ? (t.tradeType === "Buy" ? "RSU vest at fair value" : "Sold to cover tax") : t.source === "ESPP" ? "ESPP at what you paid" : t.tradeType === "Buy" ? "Bought" : "Sold" }));
  for (const d of dividendsUpTo(iso, sym)) out.push({ date: d.date, amount: d.inr, what: "Dividend" });
  const value = sym ? H.BYSYM[sym].v[i] : H.VAL[i];
  out.push({ date: iso, amount: value, what: "Worth" });
  return out;
}
export const XIRR = xirr(flows());
export const XIRR_AT = (i, sym = null) => xirr(flows(sym, i));
export const FLOW_COUNT = flows().length - 1;
export const XIRR_BY = Object.fromEntries(D.HOLDINGS.map((h) => [h.symbol, xirr(flows(h.symbol))]));
/** A holding's price grown a year, since its first trade: the clean CAGR, because it is one price to another (a staggered buy is not). */
export const PRICE_CAGR = Object.fromEntries(D.HOLDINGS.map((h) => {
  const first = h.trades[0], yrs = L.daysBetween(first.tradeDate, H.END) / 365;
  return [h.symbol, { cagr: Math.pow(h.price / first.price, 1 / yrs) - 1, from: first.price, years: yrs, since: first.tradeDate }];
}));

// ---------- Against the index (F-IV-16): the time-weighted return less the index's, over the same days ----------
const ann = (a, b, days) => Math.pow(b / a, 365 / days) - 1;
/** Yearly time-weighted return, and each index's, from day index i to today. */
export function yearlyFrom(i = H.FIRST_IDX) {
  const days = L.daysBetween(H.DAYS[i], H.END);
  return { days, you: ann(H.IDX[i], H.IDX[H.lastIdx], days), nifty: ann(H.NIFTY[i], H.NIFTY[H.lastIdx], days), spx: ann(H.SPX_INR[i], H.SPX_INR[H.lastIdx], days), gold: ann(H.GOLD[i], H.GOLD[H.lastIdx], days), fd: 0.07 };
}
export const GAP = (() => { const y = yearlyFrom(); return { ...y, vsNifty: y.you - y.nifty, vsSpx: y.you - y.spx, vsGold: y.you - y.gold, vsFd: y.you - y.fd }; })();
/** What each did since day index i, not annualised (for a short stretch a yearly rate would mislead). */
export function sinceFrom(i) {
  const r = (s) => s[H.lastIdx] / s[i] - 1;
  return { you: r(H.IDX), nifty: r(H.NIFTY), spx: r(H.SPX_INR), gap: r(H.IDX) - r(H.NIFTY) };
}

// ---------- Realised gain (F-IV-17): proceeds less the weighted-average cost removed, up to a day ----------
export function realisedAt(iso = H.END, sym = null) {
  let total = 0, sales = 0; const by = {};
  for (const s of D.SYMBOLS.filter((x) => !sym || x === sym)) {
    let q = 0, cost = 0, r = 0;
    for (const t of D.TRADES.filter((x) => x.symbol === s && x.tradeDate <= iso)) {
      if (t.tradeType === "Buy") { q += t.quantity; cost += D.costInr(t); continue; }
      const sold = Math.min(t.quantity, q), f = q ? sold / q : 0, removed = cost * f;
      r += D.costInr(t) - removed; cost -= removed; q -= sold; sales++;
      if (q < 1e-9) { q = 0; cost = 0; }
    }
    by[s] = r; total += r;
  }
  return { total, sales, by };
}
export const REALISED_NOW = realisedAt();
/** Made on the RSU sell-to-cover sales (tiny: sold the day they vested) and on every other sale. */
export const REALISED_RSU = sum(D.SYMBOLS.map((s) => { const own = D.TRADES.filter((t) => t.symbol === s); let q = 0, cost = 0, r = 0; for (const t of own) { if (t.tradeType === "Buy") { q += t.quantity; cost += D.costInr(t); continue; } const sold = Math.min(t.quantity, q), f = q ? sold / q : 0, removed = cost * f; if (t.source === "RSU") r += D.costInr(t) - removed; cost -= removed; q -= sold; if (q < 1e-9) { q = 0; cost = 0; } } return r; }));

// ---------- All in: what is still held, what sales made, what dividends paid ----------
export const ALL_IN = D.GAIN + REALISED_NOW.total + DIV_TOTAL;
export const MONEY_BOUGHT = sum(D.TRADES.filter((t) => t.tradeType === "Buy").map(D.costInr));
export const ALL_IN_PCT = ALL_IN / MONEY_BOUGHT;
export const allInAt = (i) => { const iso = H.DAYS[i]; return { unrealised: H.VAL[i] - H.COSTD[i], realised: realisedAt(iso).total, dividends: sum(dividendsUpTo(iso).map((d) => d.inr)) }; };

// ---------- Format ----------
export const yr = (x, d = 1) => `${x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)}%`;
export const syr = (x, d = 1) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)}%`;
