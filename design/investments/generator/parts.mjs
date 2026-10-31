// The widgets shared by every Investments board: the greeting that points, the attention strip, the holdings table, allocation, recent trades,
// movers, the NetApp card and the prices card. Static HTML; hover cards are CSS only.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as R from "./returns.mjs";
import * as CA from "./cash.mjs";
const { I, inr, inrS, fmt, fmtY, plural } = L;
const { HOLDINGS, VALUE, COST, GAIN, pc, spc, usd, qty, lakh, sum } = D;

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 250 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 250, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const grid = (items, gap = 20) => `<div class="g12" style="gap:${gap}px">${items.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });
export const col = (c) => `var(--card-${c})`;
export const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const fillc = (c, a = 90) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${c}) 80%,white),var(--card-${c}))`;
export const gainCls = (x) => (x >= 0 ? "up" : "dn");
export const sInr = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${lakhS(Math.abs(n))}`;
export const lakhS = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));
export const arrow = (x) => (x >= 0 ? I.up(10) : I.down(10));

/** A holding's tile: its ticker on its colour. */
export const symTile = (h, size = 38) => `<span class="symt" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * (h.symbol.length > 5 ? 0.22 : h.symbol.length > 3 ? 0.27 : 0.33))}px;background:${grad(h.color)}">${h.symbol.length > 5 ? h.symbol.slice(0, 4) : h.symbol}</span>`;
export const srcTags = (h) => h.sources.map((s) => `<span class="srcb${s === "ESPP" ? " espp" : ""}">${s}</span>`).join("") + (h.stale ? `<span class="srcb stale">Stale NAV</span>` : "");
export const dchip = (x, d = 2) => `<span class="dchip ${gainCls(x)}">${arrow(x)}${pc(Math.abs(x), d)}</span>`;

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 290, x, y: "down" })}</span>`;
const rowsBy = (fn, list = HOLDINGS) => list.map((h) => [h.name, fn(h), col(h.color)]);
export function pointLede({ returns = false, cash = false } = {}) {
  const ind = D.byMarket("IND"), us = D.byMarket("US"), vIn = sum(ind.map((h) => h.value)), vUs = sum(us.map((h) => h.value));
  const holdings = hc({ h: "Holdings", t: plural(HOLDINGS.length, "holding"), d: "Folded from your trades: nothing is stored as a position", rows: rowsBy((h) => lakhS(h.value)), f: "Sold-out positions drop off. A holding is one symbol, whether you bought it, it vested or the ESPP bought it" });
  const worth = hc({ h: "Worth today", t: lakh(VALUE), d: `at Friday's close and USD/INR ${D.FX_NOW}`, rows: [["India", lakhS(vIn), col("teal")], ["United States", `${lakhS(vUs)} · ${usd(D.US_VALUE_USD, 0)}`, col("sapphire")]], f: "A US holding's value uses today's rate. Its cost uses the rate on each trade's day, which never changes" });
  const gain = hc({ h: "Up on what it cost", t: `${sInr(GAIN)} · ${spc(D.GAIN_PCT)}`, d: `${lakh(COST)} put in, ${lakh(VALUE)} today`, rows: [["India: price moves", sInr(sum(ind.map((h) => h.gain))), col("teal")], ["US: price moves", sInr(D.STOCK_GAIN_US), col("sapphire")], ["US: the rupee against the dollar", sInr(D.RATE_GAIN), col("copper")]], f: `Still held only. ${lakhS(D.REALISED)} was made on shares you've sold (proposed: not in net worth)` });
  const ntap = D.NETAPP;
  const na = hc({ h: "NetApp", hr: `<span class="employer">${I.briefcase(10)} Employer</span>`, t: `${pc(D.share(ntap))} of what you hold`, d: `${lakhS(ntap.value)} · ${ntap.quantity} shares`, rows: [["RSU shares vested", String(D.NTAP_FLOWS.vested)], ["Bought through ESPP", String(D.NTAP_FLOWS.espp)], ["Sold to cover tax", `−${D.NTAP_FLOWS.cover}`], ["Sold", `−${D.NTAP_FLOWS.sold}`]], f: "The biggest holding is also where your salary comes from" });
  const day = hc({ h: "Friday's move", t: `${D.DAY >= 0 ? "+" : "−"}${inr(Math.abs(D.DAY))}`, d: `${spc(D.DAY_PCT, 2)} on yesterday's close`, rows: [...HOLDINGS].sort((a, b) => a.day - b.day).slice(0, 3).map((h) => [h.name, `${h.day >= 0 ? "+" : "−"}${inr(Math.abs(h.day))}`, col(h.color)]), f: "The three that moved it most. A US holding's move includes the rupee's" });
  const fx = hc({ h: "USD/INR", t: `₹${D.FX_NOW}`, d: `from ₹${D.FX_PREV} the day before`, rows: [["What you paid, on average", `₹${(sum(D.byMarket("US").map((h) => h.costInr)) / sum(D.byMarket("US").map((h) => h.costUsd))).toFixed(2)}`], ["Today", `₹${D.FX_NOW}`], ["Lifted your US holdings by", sInr(D.RATE_GAIN)]], f: "Yahoo's USDINR=X, saved with every price" });
  const R_YEARS = (R.GAP.days / 365).toFixed(1);
  const xirrCard = hc({ h: "Yearly return (XIRR)", t: `${R.yr(R.XIRR)} a year`, d: `what your money earned, over ${R_YEARS} years and ${R.FLOW_COUNT} cash flows`, rows: [["RSU vest", "cash in at fair value"], ["ESPP purchase", "cash in at what you paid"], ["Sale, and shares sold to cover tax", "cash out"], ["Dividend", "cash out, after tax withheld"]], f: "When money went in matters. The Returns row below has the rest" });
  const gapCard = hc({ h: "Against the index", t: `${R.syr(R.GAP.vsNifty)} a year vs Nifty 50`, d: "your time-weighted yearly return less the index's, over the same years", rows: [["You", R.yr(R.GAP.you), col("emerald")], ["Nifty 50", R.yr(R.GAP.nifty), col("teal")], ["S&P 500 in rupees", R.yr(R.GAP.spx), col("sapphire")]], f: "A comparison, never advice" });
  const cashCard = hc({ h: "Cash at your brokers", t: `${lakhS(CA.CASH_INR)} not invested`, d: `${plural(CA.CASH.length, "account")}, read from statements and by hand`, w: 290, rows: CA.CASH.map((c) => [`${c.name} · ${fmt(c.asOf)}`, `${CA.cashTxt(c)} · ${inr(c.inr)}`, col(c.color)]), f: `${pc(CA.IDLE)} of the ${lakhS(CA.WITH_CASH)} you have at your brokers. It is not in the worth or the yearly return, and it counts once in net worth` });
  return `Your ${pt(plural(HOLDINGS.length, "holding"), holdings)} are worth ${pt(lakh(VALUE), worth)}, ${pt(`up ${lakh(GAIN)} (${pc(D.GAIN_PCT)})`, gain)} on what they cost. ${pt("NetApp", na)} is ${pc(D.share(ntap))} of it. The markets are shut, so these are Friday's closes: ${pt(`${D.DAY >= 0 ? "up" : "down"} ${inr(Math.abs(D.DAY))}`, day, { x: "r" })} on the day, with ${pt(`USD/INR at ₹${D.FX_NOW}`, fx, { x: "r" })}.${returns ? ` Over ${R_YEARS} years your money has earned ${pt(`${R.yr(R.XIRR)} a year`, xirrCard)}, ${pt(`${R.yr(Math.abs(R.GAP.vsNifty))} a year ${R.GAP.vsNifty >= 0 ? "ahead of" : "behind"} Nifty 50`, gapCard, { x: "r" })}.` : ""}${cash ? ` Another ${pt(`${lakhS(CA.CASH_INR)} waits as cash`, cashCard, { x: "r" })} at ${CA.CASH.length === 2 ? "two" : CA.CASH.length} brokers.` : ""}`;
}
export const greetingActions = () => `${L.btn("Add trade", { icon: I.plus() })}${L.btn("Refresh prices", { kind: "primary", icon: I.refresh() })}`;
export const greeting = (opts = {}) => L.header({ lede: pointLede(opts), actions: greetingActions() });
export const attention = () => {
  const h = D.holding("ICICICORP");
  return `<div class="notice">${I.alert(16)}<div class="grow"><b>${h.name}: the NAV is from ${fmt(h.stale)}.</b> AMFI's file has had no new NAV since, so its ${lakhS(h.value)} is valued at the old one. It will update on its own when the file does.</div><span class="mini-btn ghost">${I.refresh(11)} Try again</span></div>`;
};

// ---------- The holdings table ----------
export function holdingsTable({ title = "Holdings", note = "folded from the trade log · India in rupees, the US in dollars at today's rate" } = {}) {
  const cols = "2.6fr 0.8fr 1.1fr 1.2fr 1.1fr 1.2fr 1.7fr 1.2fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="hrow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Holding")}${th("Quantity", 1)}${th("Average cost", 1)}${th("Price", 1)}${th("Today", 1)}${th("Value", 1)}${th("Gain", 1)}${th("Share")}</div>`;
  const row = (h) => {
    const us = h.market === "US";
    return `<div class="hrow" style="grid-template-columns:${cols}"><div class="cell-name">${symTile(h, 38)}<div class="nm2"><b>${h.name}${srcTags(h)}</b><small>${h.symbol} · ${h.assetType.replace("-", " ")}${h.since ? ` · since ${fmtY(h.since).split(", ")[1]}` : ""}</small></div></div>
    <div class="r"><b class="num">${qty(h.quantity)}</b></div>
    <div class="r"><b class="num">${us ? usd(h.avgCostNative) : L.inr(h.avgCostNative).replace(/\.\d+/, "")}</b>${us ? `<small>at ₹${h.avgFx.toFixed(2)}</small>` : ""}</div>
    <div class="r"><b class="num">${us ? usd(h.price) : `₹${D.num2(h.price)}`}</b><small>${h.src}${h.stale ? ` · ${fmt(h.stale)}` : ""}</small></div>
    <div class="r">${dchip(h.dayPct)}</div>
    <div class="r"><b class="num">${inr(h.value)}</b>${us ? `<small>${usd(h.valueNative, 0)}</small>` : ""}</div>
    <div class="r"><b class="num ${gainCls(h.gain)}">${h.gain >= 0 ? "+" : "−"}${inr(Math.abs(h.gain))}</b><small class="${gainCls(h.gain)}">${spc(h.gainPct)}${us ? ` · rupee ${spc(h.rateGain / h.costInr)}` : ""}</small></div>
    <div><b style="font-size:12.5px">${pc(D.share(h))}</b><div class="shbar"><span style="width:${Math.min(100, D.share(h) * 250)}%;background:${fillc(h.color)}"></span></div></div></div>`;
  };
  const grp = (label, list, extra) => `<div class="hgrp"><span>${label}</span><b>${extra}</b></div>${list.map(row).join("")}`;
  const ind = D.byMarket("IND"), us = D.byMarket("US");
  return card(`${cardHead(title, note, `<span class="row" style="gap:8px">${L.seg([{ label: "All", on: true, count: HOLDINGS.length }, { label: "India", count: ind.length }, { label: "US", count: us.length }])}</span>`)}<div>${head}${grp("India · INR", ind, `${plural(ind.length, "holding")} · ${lakhS(sum(ind.map((h) => h.value)))}`)}${grp("United States · USD", us, `${plural(us.length, "holding")} · ${usd(D.US_VALUE_USD, 0)} · ${lakhS(sum(us.map((h) => h.value)))}`)}</div>`, { gap: 6 });
}

// ---------- Smaller widgets ----------
export function allocation({ extra = 0 } = {}) {
  const bs = D.BUCKETS.map(([b, c]) => ({ b, c, v: D.bucketValue(b), cost: D.bucketCost(b) }));
  const rows = bs.map((x) => `<div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--divider)"><span class="row" style="gap:8px;font-size:13px;font-weight:700"><i style="width:10px;height:10px;border-radius:3px;background:${col(x.c)};display:inline-block"></i>${x.b}</span><b style="font-size:13px;text-align:right">${lakhS(x.v)}</b><span class="sub2" style="margin:0">${pc(x.v / VALUE)} of the whole</span><span class="sub2 ${gainCls(x.v - x.cost)}" style="margin:0;text-align:right">${spc((x.v - x.cost) / x.cost)}</span></div>`).join("");
  const mk = [["India", sum(D.byMarket("IND").map((h) => h.value)), "teal"], ["US", sum(D.byMarket("US").map((h) => h.value)), "sapphire"]];
  return card(`${cardHead("Allocation", "where it sits, today's value")}<div class="strip">${bs.map((x) => `<span title="${x.b}" style="width:${(x.v / VALUE) * 100}%;background:${fillc(x.c)}"></span>`).join("")}</div>${rows}
  <div class="between" style="font-size:12px;font-weight:700"><span>By market</span><span>${mk.map(([n, v]) => `${n} ${pc(v / VALUE, 0)}`).join(" · ")}</span></div>
  <div class="strip" style="height:10px">${mk.map(([, v, c]) => `<span style="width:${(v / VALUE) * 100}%;background:${fillc(c)}"></span>`).join("")}</div>
  <div class="kv"><span>Put in, all kinds</span><b>${lakh(COST)}</b></div>${extra >= 2 ? `<div class="kv"><span>Up on cost</span><b class="up">${sInr(GAIN)} · ${spc(D.GAIN_PCT)}</b></div>` : ""}${extra >= 3 ? `<div class="kv"><span>The rupee's part of the gain</span><b class="up">${sInr(D.RATE_GAIN)}</b></div>` : ""}${extra >= 1 ? `<div class="kv"><span>Biggest kind</span><b>US equity · ${pc(D.bucketValue("US equity") / VALUE, 0)}</b></div>` : ""}<div class="card-note">A share is a fact about today's value, not a target: the app suggests no split.</div>`, { gap: 10 });
}
export function recentTrades({ n = 7 } = {}) {
  const lines = []; const seen = new Set();
  for (const t of [...D.TRADES].reverse()) {
    if (seen.has(t.id)) continue;
    const h = D.holding(t.symbol), ins = D.INSTRUMENTS[t.symbol], us = t.market === "US";
    if (t.source === "RSU") {
      const pair = D.TRADES.filter((x) => x.symbol === t.symbol && x.tradeDate === t.tradeDate && x.source === "RSU"); pair.forEach((p) => seen.add(p.id));
      const v = pair.find((p) => p.tradeType === "Buy"), s = pair.find((p) => p.tradeType === "Sell");
      lines.push({ d: t.tradeDate, tile: h, tag: `<span class="bsb vest">RSU vest</span>`, title: `${ins.name}: ${v.quantity} vested`, sub: `${s.quantity} sold to cover tax · ${usd(v.price)} · rate ₹${v.fxRateToInr}`, a: inr(D.costInr(v)), as: `${v.quantity - s.quantity} kept` });
      continue;
    }
    seen.add(t.id);
    lines.push({ d: t.tradeDate, tile: h, tag: `<span class="bsb ${t.tradeType === "Buy" ? "buy" : "sell"}">${t.tradeType}</span>`, title: `${ins.name}${t.source === "ESPP" ? `<span class="srcb espp">ESPP</span>` : ""}`, sub: `${qty(t.quantity)} × ${us ? usd(t.price) : `₹${D.num2(t.price)}`}${us ? ` · rate ₹${t.fxRateToInr}` : ""}`, a: inr(D.costInr(t)), as: t.broker });
  }
  const rows = lines.slice(0, n).map((x) => `<div class="tradeln">${symTile(x.tile, 34)}<div><b>${x.title} ${x.tag}</b><small>${x.sub}</small></div><div class="a">${x.a}<small>${fmt(x.d)} · ${x.as}</small></div></div>`).join("");
  return card(`${cardHead("Recent trades", "buys, sells, vests and ESPP", link("All trades"))}<div>${rows}</div>`, { gap: 6 });
}
export function movers({ n = 4, extra = 0 } = {}) {
  const s = [...HOLDINGS].sort((a, b) => b.day - a.day), max = Math.max(...HOLDINGS.map((h) => Math.abs(h.day)));
  const pick = [...s.slice(0, n), ...s.slice(-n).reverse()].filter((h, i, a) => a.indexOf(h) === i);
  const rows = pick.sort((a, b) => b.day - a.day).map((h) => `<div class="mvr">${symTile(h, 28)}<div><div style="font-size:12.5px;font-weight:800">${h.name}</div><div class="bar" style="margin-top:5px"><i style="${h.day >= 0 ? `left:50%;width:${(Math.abs(h.day) / max) * 50}%;background:${fillc("emerald")}` : `right:50%;width:${(Math.abs(h.day) / max) * 50}%;background:${fillc("ruby")}`}"></i><span style="position:absolute;left:50%;top:-3px;bottom:-3px;width:1.5px;background:var(--ink);opacity:.4"></span></div></div><div style="text-align:right"><b class="${gainCls(h.day)}" style="font-size:12.5px">${h.day >= 0 ? "+" : "−"}${inr(Math.abs(h.day))}</b><div class="sub2" style="margin:0">${spc(h.dayPct, 2)}</div></div></div>`).join("");
  return card(`${cardHead("Friday's movers", "change in value since Thursday's close")}<div>${rows}</div><div class="kv"><span>All ten together</span><b class="${gainCls(D.DAY)}">${D.DAY >= 0 ? "+" : "−"}${inr(Math.abs(D.DAY))} · ${spc(D.DAY_PCT, 2)}</b></div>${extra ? `<div class="kv"><span>USD/INR</span><b>₹${D.FX_NOW} · +${((D.FX_NOW / D.FX_PREV - 1) * 100).toFixed(2)}%</b></div>` : ""}<div class="card-note">A US holding's move includes the rupee's: USD/INR rose ${((D.FX_NOW / D.FX_PREV - 1) * 100).toFixed(2)}%.</div>`, { gap: 8 });
}
export function netappCard() {
  const h = D.NETAPP, f = D.NTAP_FLOWS, total = f.vested + f.espp;
  const seg = (v, c) => `<span style="width:${(v / total) * 100}%;background:${c}"></span>`;
  return card(`${cardHead("NetApp shares", "how they came, and what's left", `<span class="employer" style="margin:0">${I.briefcase(10)} Employer</span>`)}
  <div class="row" style="gap:14px">${symTile(h, 48)}<div><div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.1">${lakhS(h.value)}</div><div class="sub2" style="margin:2px 0 0">${h.quantity} shares · ${pc(D.share(h))} of what you hold · ${spc(h.gainPct)}</div></div></div>
  <div class="stack3"><div class="strip" style="height:16px">${seg(f.vested, "var(--card-sapphire)")}${seg(f.espp, "var(--card-violet)")}</div><div class="legend2"><span><i style="background:var(--card-sapphire)"></i>RSU vested ${f.vested} · ${plural(f.vests, "vest")}</span><span><i style="background:var(--card-violet)"></i>ESPP bought ${f.espp} · ${plural(f.purchases, "purchase")}</span></div></div>
  <div class="kv"><span>Sold to cover tax at each vest</span><b>−${f.cover}</b></div><div class="kv"><span>Sold in the market</span><b>−${f.sold}</b></div><div class="kv"><span>Held now</span><b>${h.quantity}</b></div><div class="kv"><span>Average cost a share</span><b>${usd(h.avgCostNative)} at ₹${h.avgFx.toFixed(2)}</b></div><div class="kv"><span>Price today</span><b>${usd(h.price)} · ${spc(h.price / h.avgCostNative - 1)}</b></div><div class="kv"><span>Salary from NetApp, last 12 months</span><b>${lakhS(D.SALARY_YEAR)}</b></div>
  <div class="card-note">RSU vests and ESPP purchases are trades, not income: they live here, and only their dividends would count as income.</div>`, { gap: 10 });
}
export function pricesCard({ extra = 0 } = {}) {
  const row = (ok, name, a, b) => `<div class="kv" style="gap:10px"><span style="display:flex;align-items:center;gap:8px;color:var(--fg);font-weight:700"><i class="dot" style="background:${ok ? "var(--positive)" : "var(--warning)"}"></i>${name}</span><span style="text-align:right;color:var(--muted);font-weight:600"><b style="color:${ok ? "var(--fg)" : "var(--warning-text)"}">${a}</b><br>${b}</span></div>`;
  return card(`${cardHead("Prices and rates", "where today's figures came from", `<span class="mini-btn ghost">${I.refresh(11)} Refresh</span>`)}
  ${row(true, "Yahoo: stocks, ETFs, USD/INR", "Fri Oct 30 close", "8 of 8 fetched · 2 s")}${row(false, "AMFI: mutual fund NAVs", "1 of 2 stale", "Corporate Bond fund: Oct 28")}${row(true, "Frankfurter: a past day's rate", "for the trade form", "prefills USD/INR, editable")}${row(true, "Trades checked", "no oversells", "every sell was of shares held")}
  <div class="kv"><span>Price log</span><b>one a day, since Jun 14</b></div><div class="kv"><span>Last refreshed</span><b>Fri Oct 30, 9:14 pm</b></div><div class="kv"><span>Old prices in use</span><b style="color:var(--warning-text)">1 of 10</b></div><div class="kv"><span>Next refresh</span><b>when you open the page</b></div>${extra ? `<div class="kv"><span>Rate saved with each price</span><b>USD/INR ₹${D.FX_NOW}</b></div>` : ""}
  <div class="card-note">When a source is down the last saved price is used and marked stale. The log is also what a value-over-time chart is drawn from, together with each holding's daily history (to be checked against Yahoo and AMFI).</div>`, { gap: 8 });
}
/** The widget rows under a hero. */
export const rest = ({ table = true } = {}) => `${table ? grid([[12, holdingsTable()]]) : ""}${grid([[4, allocation()], [4, recentTrades()], [4, netappCard()]])}${grid([[6, movers()], [6, pricesCard()]])}`;
