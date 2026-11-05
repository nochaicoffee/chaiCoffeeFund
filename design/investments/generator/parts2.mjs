// Round 2 widgets: KPI cards that point, the portfolio card, the money-in matrix, the holdings carousel (sparkline cards), the transactions feed.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
const { I, inr, fmt, plural } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, link, hc, tip, col, fillc, symTile, lakhS, sInr, gainCls } = P;

/** A KPI card whose figure points (hover or focus opens a card saying what it means). */
export const kpi = ({ icon, title, value, small = "", pill = "", proposed = false, point }) =>
  `<div class="kpi hov" tabindex="0">${proposed ? `<span class="ptag">Proposed</span>` : ""}<div class="kh"><i>${icon}</i>${title}</div><div class="kv2">${value}${small ? `<small>${small}</small>` : ""}${pill ? `<span class="pillk">${pill}</span>` : ""}</div>${tip(point, { w: 280, x: "l", y: "down", off: -6 })}</div>`;
export function kpiTrio() {
  const dd = H.DRAWDOWN, ddMonth = L.monName(dd.date.slice(0, 7)) + " " + dd.date.slice(0, 4);
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
  ${kpi({ icon: I.trend(15), title: "Total return", value: `${sInr(D.GAIN)}`, pill: spc(D.GAIN_PCT), point: hc({ h: "Total return", t: `${sInr(D.GAIN)} · ${spc(D.GAIN_PCT)}`, d: `${lakh(COST)} put in, ${lakh(VALUE)} today`, rows: [["India: price", sInr(sum(D.byMarket("IND").map((h) => h.gain))), col("teal")], ["US: price", sInr(D.STOCK_GAIN_US), col("sapphire")], ["US: the rupee", sInr(D.RATE_GAIN), col("copper")]], f: "On what you still hold. Gains on shares already sold are apart", w: 280 }) })}
  ${kpi({ icon: I.cal(15), title: "Yearly return", value: `${(H.TWR_YEARLY * 100).toFixed(1)}%`, small: "per year", proposed: true, point: hc({ h: "Yearly return", t: `${(H.TWR_YEARLY * 100).toFixed(1)}% a year`, d: `${spc(H.TWR_TOTAL)} in ${H.YEARS_HELD.toFixed(1)} years`, f: "Time-weighted: money you add later doesn't flatter it. Whether RSU vests count as money added is your call (open question 3)", w: 280 }) })}
  ${kpi({ icon: I.down(15), title: "Deepest fall", value: `${(dd.pct * 100).toFixed(1)}%`, small: `in ${ddMonth}`, proposed: true, point: hc({ h: "Deepest fall", t: `${(dd.pct * 100).toFixed(1)}%`, d: `the worst peak-to-trough drop, to ${L.fmtY(dd.date)}`, f: "Of the time-weighted return, so buying more doesn't hide it. Needs the daily price history", w: 280 }) })}
  </div>`;
}

export function portfolioCard() {
  const rows = D.BUCKETS.map(([b, c]) => `<div class="pf-allo"><span class="n"><i style="background:${col(c)}"></i>${b}<em>${pc(D.bucketValue(b) / VALUE, 0)}</em></span><b>${lakhS(D.bucketValue(b))}</b></div>`).join("");
  return card(`${cardHead("My portfolio", "", `<span class="btn btn-ghost btn-sm" style="min-height:34px">${I.plus(12)} Add trade</span>`)}
  <div><div class="bigv" style="font-size:44px">${lakh(VALUE)}<small class="up">${spc(D.GAIN_PCT, 0)} all-time</small></div><div class="sub2" style="margin-top:6px">${plural(HOLDINGS.length, "holding")} · prices at Friday's close</div></div>
  <div class="stack3"><b style="font-size:13px;color:var(--muted)">Asset allocation</b><div class="strip" style="height:14px">${D.BUCKETS.map(([b, c]) => `<span style="width:${(D.bucketValue(b) / VALUE) * 100}%;background:${fillc(c)};border-radius:4px"></span>`).join("")}</div></div>
  <div>${rows}</div>
  <div class="kv"><span>Put in</span><b>${lakh(COST)}</b></div><div class="kv"><span>Rupee's part of the gain</span><b class="up">${sInr(D.RATE_GAIN)}</b></div><div class="kv"><span>Made on shares sold</span><b>${lakhS(D.REALISED)}</b></div>
  <span class="btn-wide" style="margin-top:auto">${I.invest(15)} See every holding</span>`, { gap: 14 });
}

/** Money in, month by month: one cell a month, a row a year; colour is how it came, depth is how much; a red dot marks a sale. */
export function moneyMatrix({ year = false, kv = 0, cellH = 26 } = {}) {
  const years = [2021, 2022, 2023, 2024, 2025, 2026], MON = "JFMAMJJASOND".split("");
  const cellOf = (y, m) => D.TRADES.filter((t) => t.tradeDate.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`));
  const max = Math.max(...years.flatMap((y) => MON.map((_, m) => sum(cellOf(y, m).filter((t) => t.tradeType === "Buy").map(D.costInr)))));
  const grid = years.map((y) => `<span class="yl" style="--mh:${cellH}px">${y}</span>${MON.map((_, m) => {
    const ts = cellOf(y, m), buys = ts.filter((t) => t.tradeType === "Buy"), sells = ts.filter((t) => t.tradeType === "Sell" && t.source !== "RSU");
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (key > L.TODAY.slice(0, 7)) return `<span class="mc fut"></span>`;
    if (!buys.length && !sells.length) return `<span class="mc"></span>`;
    const by = (s) => sum(buys.filter((t) => t.source === s).map(D.costInr)), tot = by("Market") + by("ESPP") + by("RSU");
    const dom = by("RSU") >= by("Market") && by("RSU") >= by("ESPP") ? "sapphire" : by("ESPP") >= by("Market") ? "violet" : "teal";
    const a = tot ? 0.28 + 0.72 * Math.sqrt(tot / max) : 0;
    const rows = [...buys.filter((t) => t.source !== "RSU").map((t) => [`${D.INSTRUMENTS[t.symbol].name}${t.source === "ESPP" ? " (ESPP)" : ""}`, inr(D.costInr(t))]), ...(by("RSU") ? [["NetApp RSU vest", inr(by("RSU"))]] : []), ...sells.map((t) => [`Sold ${D.INSTRUMENTS[t.symbol].name}`, `−${inr(D.costInr(t))}`])];
    return `<span class="mc on hov${sells.length ? " sell" : ""}" tabindex="0" style="${tot ? `background:color-mix(in oklch,var(--card-${dom}) ${Math.round(a * 100)}%,var(--fill))` : ""}">${tip(hc({ h: `${L.monFull(key)} ${y}`, t: tot ? inr(tot) : "No buys", d: sells.length ? "and a sale" : "put in", rows, w: 230 }), { w: 230 })}</span>`;
  }).join("")}`).join("");
  return card(`${cardHead("Money in", "a cell a month · deeper is more", `<span class="legend2"><span><i style="background:${col("teal")}"></i>Bought</span><span><i style="background:${col("violet")}"></i>ESPP</span><span><i style="background:${col("sapphire")}"></i>RSU</span></span>`)}
  <div class="mx2" style="--mh:${cellH}px"><span></span>${MON.map((m) => `<span class="ml">${m}</span>`).join("")}${grid}</div>
  ${year ? `<div class="stack3"><b style="font-size:13px">Money in by year</b>${years.map((y) => { const v = sum(MON.map((_, m) => sum(cellOf(y, m).filter((t) => t.tradeType === "Buy").map(D.costInr)))); return `<div style="display:grid;grid-template-columns:38px 1fr 64px;gap:10px;align-items:center;font-size:12px;font-weight:700"><span>${y}</span><span class="hbar" style="height:8px"><span style="width:${Math.min(100, (v / 1700000) * 100)}%;background:${fillc("teal")}"></span></span><span style="text-align:right">${lakhS(v)}</span></div>`; }).join("")}</div>` : ""}
  <div class="kv"><span>Months with a buy</span><b>${new Set(D.TRADES.filter((t) => t.tradeType === "Buy").map((t) => t.tradeDate.slice(0, 7))).size} of ${H.DAYS.length ? Math.round(L.daysBetween("2021-09-09", L.TODAY) / 30.4) : 0}</b></div>
  ${kv >= 1 ? `<div class="kv"><span>A month, on average</span><b>${lakhS(sum(D.TRADES.filter((t) => t.tradeType === "Buy").map(D.costInr)) / 62)}</b></div>` : ""}
  <div class="card-note">A red dot is a month you sold. An RSU vest counts at its fair value (open question 3).</div>`, { gap: 14 });
}

/** A sparkline of the last 90 days of a holding's price. */
export const spark = (sym, { w = 170, h = 64, color = "oklch(0.82 0.17 150)" } = {}) => {
  const e = H.lastIdx, s = e - 90, vals = H.PRICE[sym].slice(s, e + 1), lo = Math.min(...vals), hi = Math.max(...vals);
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 10)]);
  const up = vals.at(-1) >= vals[0], c = up ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)", d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" "), id = `sp-${sym}`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".38"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w},${h} L0,${h}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="3.4" fill="${c}"/></svg>`;
};
export function carousel({ title = "Your holdings", small = "last three months · scroll for more" } = {}) {
  const cards = HOLDINGS.map((h) => `<div class="hcard"><div class="t">${symTile(h, 36)}<div><b>${h.symbol}</b><small>${h.name}</small></div></div>${spark(h.symbol, { w: 168, h: 132 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">You hold ${qty(h.quantity)} · ${spc(h.gainPct, 0)} on cost</div><div><div class="p">${h.market === "US" ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="c ${gainCls(h.dayPct)}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div></div>`).join("");
  return card(`${cardHead(title, small, link("View all"))}<div class="crs">${cards}</div>`, { gap: 10 });
}
export function txFeed({ n = 5, title = "Transactions", note = "" } = {}) {
  const seen = new Set(), out = [];
  for (const t of [...D.TRADES].reverse()) {
    if (seen.has(t.id)) continue; seen.add(t.id); const h = D.holding(t.symbol), ins = D.INSTRUMENTS[t.symbol];
    if (t.source === "RSU") { const pair = D.TRADES.filter((x) => x.symbol === t.symbol && x.tradeDate === t.tradeDate && x.source === "RSU"); pair.forEach((p) => seen.add(p.id)); const v = pair.find((p) => p.tradeType === "Buy"), s = pair.find((p) => p.tradeType === "Sell"); out.push({ h, t: t.symbol, k: "RSU vest", a: `+${v.quantity} sh`, as: `${s.quantity} sold to cover`, d: t.tradeDate, c: "" }); continue; }
    const cash = D.costInr(t); out.push({ h, t: t.symbol, k: `${t.tradeType}${t.source === "ESPP" ? " · ESPP" : ""}`, a: `${t.tradeType === "Buy" ? "−" : "+"}${inr(cash)}`, as: fmt(t.tradeDate), d: t.tradeDate, c: t.tradeType === "Buy" ? "" : "up" });
  }
  return card(`${cardHead(title, "", link("View all"))}<div>${out.slice(0, n).map((x) => `<div class="txr">${symTile(x.h, 40)}<div><b>${x.t}</b><small>${x.k}</small></div><div class="a ${x.c}">${x.a}<small>${x.k === "RSU vest" ? x.as : fmt(x.d)}</small></div></div>`).join("")}</div>${note ? `<div class="card-note">${note}</div>` : ""}`, { gap: 6 });
}
