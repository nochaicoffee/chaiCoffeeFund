// The Returns row redrawn for the key metrics (2026-11-04): six cards for Everything, eight stats for one holding, and eight for a day he went back to.
// Only the final page and its phone use these (the exploration boards keep kpiTrio). Sample data, made up; the sums are returns.mjs.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
import * as R from "./returns.mjs";
const { I, inr, fmt } = L;
const { sum, spc, lakh, VALUE, COST } = D;
const { hc, tip, col, lakhS, sInr } = P;

const YEARS = H.YEARS_HELD.toFixed(1);
const tag = (t) => `<span class="ptag">${t}</span>`;
/** A card of the Returns row; the figure points like the greeting's. */
const card6 = ({ icon, title, value, small = "", pill = "", t = "", point }) =>
  `<div class="kpi hov" tabindex="0">${t ? tag(t) : ""}<div class="kh"><i>${icon}</i>${title}</div><div class="kv2">${value}${small ? `<small>${small}</small>` : ""}${pill ? `<span class="pillk">${pill}</span>` : ""}</div>${tip(point, { w: 300, x: "l", y: "down", off: -6 })}</div>`;

/** The holdings' share of the yearly figures, for the cards' hover. */
const byHolding = (fn) => D.HOLDINGS.map((h) => [h.name, fn(h), col(h.color)]);

export function sixCards({ cols = "repeat(3,1fr)" } = {}) {
  const dd = H.DRAWDOWN, ddMonth = `${L.monName(dd.date.slice(0, 7))} ${dd.date.slice(0, 4)}`, g = R.GAP;
  const rsuSales = R.REALISED_RSU, otherSales = R.REALISED_NOW.total - rsuSales;
  const xirr = card6({ icon: I.cal(15), title: "Yearly return", value: R.yr(R.XIRR), small: "a year · XIRR", t: "New",
    point: hc({ h: "Yearly return (XIRR)", t: `${R.yr(R.XIRR)} a year`, d: `what your money earned, over ${YEARS} years and ${R.FLOW_COUNT} cash flows`,
      rows: [["RSU vest", "cash in at fair value"], ["ESPP purchase", "cash in at what you paid"], ["Sale, and shares sold to cover tax", "cash out"], ["Dividend", "cash out, after tax withheld"], ["Worth today", lakh(VALUE), col("emerald")]],
      f: "When money went in matters: a late buy weighs less than an early one. The ESPP discount shows as return, because you paid less than the market. Your answer to question 12", w: 300 }) });
  const gap = card6({ icon: I.trend(15), title: "Against the index", value: R.syr(g.vsNifty), small: "a year · vs Nifty 50", pill: `S&P ${R.syr(g.vsSpx)}`, t: "New",
    point: hc({ h: "Against the index", t: `${g.vsNifty >= 0 ? "ahead of" : "behind"} Nifty 50 by ${R.yr(Math.abs(g.vsNifty))} a year`, d: `your time-weighted yearly return less the index's, over the same ${YEARS} years`,
      rows: [["You", R.yr(g.you), col("emerald")], ["Nifty 50", `${R.yr(g.nifty)} · ${R.syr(g.vsNifty)}`, col("teal")], ["S&P 500 in rupees", `${R.yr(g.spx)} · ${R.syr(g.vsSpx)}`, col("sapphire")], ["Gold", `${R.yr(g.gold)} · ${R.syr(g.vsGold)}`, col("gold")], ["A 7% deposit", `7.0% · ${R.syr(g.vsFd)}`]],
      f: "A comparison, never advice. It's the Race in one figure. Time-weighted, so it ignores when you added money: it says how the holdings did, not what your money earned", w: 300 }) });
  const all = card6({ icon: I.trend(15), title: "Total return", value: sInr(R.ALL_IN), pill: R.syr(R.ALL_IN_PCT), t: "New",
    point: hc({ h: "Total return, all in", t: `${sInr(R.ALL_IN)} · ${R.syr(R.ALL_IN_PCT)}`, d: `on ${lakh(R.MONEY_BOUGHT)} bought over the years`,
      rows: [["Still held: price", sInr(sum(D.byMarket("IND").map((h) => h.gain)) + D.STOCK_GAIN_US), col("teal")], ["Still held: the rupee", sInr(D.RATE_GAIN), col("copper")], ["Made on shares sold", sInr(R.REALISED_NOW.total), col("gold")], ["Dividends, after tax", sInr(R.DIV_TOTAL), col("violet")]],
      f: `What is still held is ${sInr(D.GAIN)} (${spc(D.GAIN_PCT)} on its cost). The % here is on every buy, an RSU vest at its fair value. Net worth counts only what you hold`, w: 300 }) });
  const real = card6({ icon: I.check(15), title: "Made on shares sold", value: sInr(R.REALISED_NOW.total), small: `from ${R.REALISED_NOW.sales} sales`, t: "New",
    point: hc({ h: "Made on shares sold", t: sInr(R.REALISED_NOW.total), d: "proceeds less the average cost of the shares sold",
      rows: [["Shares sold to cover tax at a vest", sInr(R.REALISED_RSU), col("sapphire")], ["Every other sale", sInr(otherSales), col("gold")], ...D.SYMBOLS.filter((s) => R.REALISED_NOW.by[s]).map((s) => [D.INSTRUMENTS[s].name, sInr(R.REALISED_NOW.by[s]), col(D.INSTRUMENTS[s].color)]).slice(0, 3)],
      f: "Not in net worth, and not what you hold. It is in the total return beside it. A sale at a US holding's own rate, so the rupee's part is in it", w: 300 }) });
  const div = card6({ icon: I.cal(15), title: "Dividends", value: L.inr(R.DIV_TOTAL), small: `${R.DIVIDENDS.length} payments`, t: "New",
    point: hc({ h: "Dividends, after tax withheld", t: L.inr(R.DIV_TOTAL), d: `${L.inr(R.DIV_YEAR)} of it in the last twelve months`,
      rows: [...["NTAP", "HDFCBANK", "INFY", "RELIANCE"].map((s) => [D.INSTRUMENTS[s].name, L.inr(sum(R.dividendsUpTo(H.END, s).map((d) => d.inr))), col(D.INSTRUMENTS[s].color)]), ["US tax withheld (25%)", `−${L.inr(R.DIV_WITHHELD_INR)}`]],
      f: "They arrive in a bank account and are found on the statement, as salary is. A US dividend is in dollars with the tax withheld shown. Your Fixed Income interest is on its own page", w: 300 }) });
  const fall = card6({ icon: I.down(15), title: "Deepest fall", value: `${(dd.pct * 100).toFixed(1)}%`, small: `in ${ddMonth}`, t: "Proposed",
    point: hc({ h: "Deepest fall", t: `${(dd.pct * 100).toFixed(1)}%`, d: `the worst peak-to-trough drop, to ${L.fmtY(dd.date)}`, f: "Of the time-weighted return, so buying more doesn't hide it. Needs the daily price history", w: 300 }) });
  return `<div style="display:grid;grid-template-columns:${cols};gap:20px">${xirr}${gap}${all}${real}${div}${fall}</div>`;
}

const kd = (k, v, s, cls = "lt") => `<div class="${`kd ${cls}`}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
const fmv = (x) => (x < 0 ? "−" : "") + lakhS(Math.abs(x));

/** Eight cards for a day he went back to: worth, put in, added, the market since; then the yearly return then, sales, dividends, against Nifty since. */
export function asofRows(a) {
  const w0 = H.VAL[a.i], c0 = H.COSTD[a.i], added = sum(H.FLOW.slice(a.i + 1)), since = VALUE - w0 - added, label = `as of ${L.fmtY(H.DAYS[a.i])}`;
  const x = R.XIRR_AT(a.i), s = R.sinceFrom(a.i), at = R.allInAt(a.i);
  return `<div class="kdrow" style="grid-template-columns:repeat(4,1fr)">${kd("Worth then", lakh(w0), label)}${kd("Put in then", lakh(c0), `${sInr(w0 - c0)} · ${spc(w0 / c0 - 1)}`)}${kd("Added since", lakh(added), "buys less sales")}${kd("The market since", sInr(since), `${spc(H.IDX[H.lastIdx] / H.IDX[a.i] - 1)} time-weighted`)}${kd("Yearly return then", x == null ? "—" : R.yr(x), `XIRR to ${label.slice(6)}`)}${kd("Made on sales then", fmv(at.realised), "up to that day")}${kd("Dividends then", L.inr(at.dividends), "after tax withheld")}${kd("Against Nifty since", R.syr(s.gap), `you ${R.syr(s.you)} · Nifty ${R.syr(s.nifty)}`)}</div>`;
}

/** Eight stats for one holding. A yearly figure needs a year of history: under one, the card says so and leaves the plain gain. */
export function holdingStats(h, { size } = {}) {
  const us = h.market === "US", px = (v) => (us ? D.usd(v, 0) : `₹${Math.round(v).toLocaleString("en-IN")}`);
  const x = R.XIRR_BY[h.symbol], c = R.PRICE_CAGR[h.symbol], real = R.realisedAt(H.END, h.symbol).total, divs = sum(R.dividendsUpTo(H.END, h.symbol).map((d) => d.inr));
  const young = c.years < 1;
  return `<div class="kdrow" style="grid-template-columns:repeat(4,1fr)">${kd("You hold", D.qty(h.quantity), h.assetType.includes("Fund") ? "units" : "shares")}${kd("You paid", us ? D.usd(h.avgCostNative) : `₹${D.num2(h.avgCostNative)}`, us ? `a share, at ₹${h.avgFx.toFixed(2)}` : "a share, on average")}${kd("Worth", lakhS(h.value), `${D.pc(D.share(h))} of what you hold`)}${kd("Gain", `${h.gain >= 0 ? "+" : "−"}${lakhS(Math.abs(h.gain))}`, `${spc(h.gainPct)}${us ? ` · rupee ${sInr(h.rateGain)}` : ""}`)}${kd("Yearly return", young || x == null ? "Too early" : R.yr(x), young ? "needs a year of history" : "XIRR: what your money earned")}${kd("Price a year", young ? "Too early" : R.syr(c.cagr), `since ${fmt(c.since)}: ${px(c.from)} to ${px(h.price)}`)}${kd("Made on sales", real ? fmv(real) : "none", divs ? `and ${L.inr(divs)} in dividends` : h.stale ? `price from ${fmt(h.stale)}` : `price from ${h.src}`)}${kd("52-week range", `${px(h.lo)} – ${px(h.hi)}`, `${Math.round(((h.price - h.lo) / (h.hi - h.lo)) * 100)}% of the way up`)}</div>`;
}
