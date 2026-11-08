// The Trades page (round 1, 2026-11-08): every trade, like Cards' Statements and Income's Entries. Three takes:
// T1 Tape (every trade by month, filters), T2 Book (one holding: shares and average cost after each trade), T3 Months (a calendar of money in and out).
// Sample data, made up (data.mjs); today is Saturday Oct 31, 2026. Interactive in the browser with no script (radios + :has).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr, fmt, fmtY, btn, seg } = L;
const { sum, usd, qty, num2, INSTRUMENTS, TRADES, costInr } = D;
const { symTile, lakhS } = P;

// ---------- The fold, trade by trade: shares and average cost after each, and what each sale made ----------
// Weighted-average cost in rupees (a US trade at its own frozen rate), same as data.mjs and lib/aggregate.
const AFTER = new Map();
for (const sym of D.SYMBOLS) {
  let q = 0, cost = 0, costUsd = 0;
  for (const t of TRADES.filter((x) => x.symbol === sym)) {
    let made = null;
    if (t.tradeType === "Buy") { q += t.quantity; cost += costInr(t); costUsd += t.market === "US" ? t.total : 0; }
    else { const sold = Math.min(t.quantity, q), f = q ? sold / q : 0, removed = cost * f; made = costInr(t) - removed; cost -= removed; costUsd -= costUsd * f; q -= sold; if (q < 1e-9) { q = 0; cost = 0; costUsd = 0; } }
    AFTER.set(t.id, { q, avg: q ? cost / q : 0, avgUsd: q && t.market === "US" ? costUsd / q : 0, made });
  }
}

// ---------- Rows: an RSU vest and its sell-to-cover are one row, as in Recent trades ----------
const KIND = { buy: ["Buy", "buy"], sell: ["Sell", "sell"], rsu: ["RSU vest", "vest"], espp: ["ESPP", "espp"] };
const fyOf = (iso) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m >= 4 ? y : y - 1; };
const fyLabel = (y) => `FY ${y}-${String(y + 1).slice(2)}`;
const ROWS = (() => {
  const out = [], seen = new Set();
  for (const t of TRADES) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const ins = INSTRUMENTS[t.symbol], us = t.market === "US";
    const base = { id: t.id, date: t.tradeDate, sym: t.symbol, ins, us, broker: t.broker, fy: fyOf(t.tradeDate), month: t.tradeDate.slice(0, 7) };
    if (t.source === "RSU" && t.tradeType === "Buy") {
      const cover = TRADES.find((x) => x.symbol === t.symbol && x.tradeDate === t.tradeDate && x.source === "RSU" && x.tradeType === "Sell");
      if (cover) seen.add(cover.id);
      out.push({ ...base, k: "rsu", t, cover, in: costInr(t), out: cover ? costInr(cover) : 0, after: AFTER.get((cover ?? t).id), made: cover ? AFTER.get(cover.id).made : null });
      continue;
    }
    const k = t.tradeType === "Sell" ? "sell" : t.source === "ESPP" ? "espp" : "buy";
    out.push({ ...base, k, t, in: t.tradeType === "Buy" ? costInr(t) : 0, out: t.tradeType === "Sell" ? costInr(t) : 0, after: AFTER.get(t.id), made: AFTER.get(t.id).made });
  }
  return out.reverse(); // newest first
})();
const FYS = [...new Set(ROWS.map((r) => r.fy))].sort((a, b) => b - a);
const totals = (rows) => ({ in: sum(rows.map((r) => r.in)), out: sum(rows.map((r) => r.out)), made: sum(rows.map((r) => r.made ?? 0)), n: rows.length, sells: rows.filter((r) => r.made != null).length });

// ---------- Small pieces ----------
const badge = (k) => `<span class="bsb ${KIND[k][1]}">${KIND[k][0]}</span>`;
const px = (r, p) => (r.us ? usd(p) : `₹${num2(p)}`);
const amtNative = (r) => (r.us ? usd(r.t.total) : inr(r.t.total));
const madeCell = (m) => (m == null ? `<span class="tr-dim">·</span>` : `<b class="${m >= 0 ? "up" : "dn"}">${m >= 0 ? "+" : "−"}${inr(Math.abs(m))}</b>`);
const detail = (r) => {
  if (r.k === "rsu") return `${qty(r.t.quantity)} vested at ${px(r, r.t.price)} · ${r.cover ? `${qty(r.cover.quantity)} sold to cover tax · ${qty(r.t.quantity - r.cover.quantity)} kept` : "none sold"}`;
  return `${qty(r.t.quantity)} × ${px(r, r.t.price)}${r.us ? ` · ₹${r.t.fxRateToInr} a dollar` : ""}`;
};
const tiles = (items) => `<div class="tr-tiles">${items.map(([k, v, s, cls = ""]) => `<div class="tr-tile glass"><div class="k">${k}</div><div class="v ${cls}">${v}</div><div class="s">${s}</div></div>`).join("")}</div>`;
const summaryTiles = (rows) => { const s = totals(rows); return tiles([["Put in", lakhS(s.in), "buys, ESPP, and RSU vests at their value on the day"], ["Taken out", lakhS(s.out), "sales and shares sold to cover tax"], ["Net put in", lakhS(s.in - s.out), `${L.plural(s.n, "trade")}`], ["Made on shares sold", `${s.made >= 0 ? "+" : "−"}${lakhS(Math.abs(s.made))}`, `${L.plural(rows.filter((r) => r.k === "sell").length, "sale")} and ${L.plural(rows.filter((r) => r.k === "rsu" && r.cover).length, "sell-to-cover")}, at average cost`, s.made >= 0 ? "up" : "dn"]]); };
const head = (title, lede, actions = "") => L.header({ eyebrow: "Investments · Trades", back: true, title, lede, actions: actions || `${btn("Add trade", { icon: I.plus() })}` });
const boardNote = (title, text) => `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>${title}</h2>${L.sampleTag()}</div><p>${text}</p></div>`;
const wrap = (id, radios, note, body) => `<div class="chai-app board tr-b ${id}" style="width:1600px;height:__H__">${radios}${STYLE}${note}${L.desktop({ w: 1504, h: "fit", body: `<div class="pgcol">${body}</div>` })}</div>`;
const radio = (name, keys, def) => keys.map((k) => `<input type="radio" class="pk-in" name="${name}" id="${name}-${k}"${k === def ? " checked" : ""}>`).join("");
const chipRow = (name, items) => `<span class="tr-chips">${items.map(([k, l, n]) => `<label class="tr-chip" for="${name}-${k}" data-for="${name}-${k}">${l}${n != null ? `<em>${n}</em>` : ""}</label>`).join("")}</span>`;
const sentence = (rows) => { const s = totals(rows), first = ROWS.at(-1).date; return `<b>${L.plural(s.n, "trade")}</b> since <b>${fmtY(first)}</b> across <b>${new Set(ROWS.map((r) => r.broker)).size} brokers</b>. You've put in <b>${lakhS(s.in)}</b> and taken out <b>${lakhS(s.out)}</b>, making <b>+${lakhS(s.made)}</b> on what you sold.`; };

// ---------- T1 Tape: every trade, newest first, by month ----------
function tapeRow(r) {
  return `<div class="tr-row" data-k="${r.k}" data-m="${r.us ? "us" : "in"}"><span class="d">${fmt(r.date)}<small>${L.dow(r.date)}</small></span><span class="h">${symTile({ symbol: r.sym, color: r.ins.color }, 32)}<span><b class="bk">${r.ins.name}<i>${I.arrowR(11)}</i></b><small>${r.sym} · ${r.us ? "US" : "India"}</small></span></span><span>${badge(r.k)}</span><span class="dt">${detail(r)}</span><span class="n">${r.k === "sell" ? "−" : ""}${amtNative(r)}${r.us ? `<small>${r.k === "sell" ? "−" : ""}${inr(r.k === "sell" ? r.out : r.in)}</small>` : ""}</span><span class="n">${madeCell(r.made)}</span><span class="br">${r.broker}</span><span class="ed">${I.pencil(13)}</span></div>`;
}
export function tape() {
  const months = [...new Set(ROWS.map((r) => r.month))];
  const list = months.map((m) => { const rs = ROWS.filter((r) => r.month === m), s = totals(rs); return `<div class="tr-mon" data-fy="${rs[0].fy}" data-ks="${[...new Set(rs.map((r) => r.k))].join(" ")}" data-ms="${[...new Set(rs.map((r) => (r.us ? "us" : "in")))].join(" ")}"><div class="tr-mh"><b>${L.monFull(m)} ${m.slice(0, 4)}</b><span>${s.in ? `in ${inr(s.in)}` : ""}${s.in && s.out ? " · " : ""}${s.out ? `out ${inr(s.out)}` : ""}</span></div>${rs.map(tapeRow).join("")}</div>`; }).join("");
  const kinds = [["all", "Everything", ROWS.length], ...["buy", "sell", "rsu", "espp"].map((k) => [k, KIND[k][0] === "Buy" ? "Buys" : KIND[k][0] === "Sell" ? "Sales" : KIND[k][0] === "RSU vest" ? "RSU vests" : "ESPP", ROWS.filter((r) => r.k === k).length])];
  const years = [["all", "All years"], ...FYS.map((y) => [String(y), fyLabel(y)])];
  const sums = `<div class="tr-sums"><div data-fy="all">${summaryTiles(ROWS)}</div>${FYS.map((y) => `<div data-fy="${y}">${summaryTiles(ROWS.filter((r) => r.fy === y))}</div>`).join("")}</div>`;
  const filters = `<section class="card glass tr-filt"><div class="tr-fr">${chipRow("tk", kinds)}<span class="grow"></span>${chipRow("tm", [["all", "India and US"], ["in", "India"], ["us", "US"]])}</div><div class="tr-fr">${chipRow("ty", years)}<span class="grow"></span>${L.select({ value: "Every holding", options: [{ label: "Every holding", on: true }, "-", ...D.SYMBOLS.map((s) => ({ label: INSTRUMENTS[s].name, meta: s }))] })}${L.select({ value: "Every broker", options: [{ label: "Every broker", on: true }, ...["Zerodha", "Coin", "Schwab", "Vested"].map((b) => ({ label: b }))] })}<span class="sbox">${I.search(13)}<span>Search a name or symbol</span></span></div></section>`;
  const table = `<section class="card glass tr-tape"><div class="tr-row tr-th"><span>Date</span><span>Holding</span><span>Kind</span><span>Shares and price</span><span class="n">Amount</span><span class="n">Made on sale</span><span>Broker</span><span></span></div>${list}<div class="card-note" style="padding-top:12px">A US trade shows dollars, with rupees under it at that day's saved rate. An RSU vest and the shares sold to cover its tax are one row; it opens both trades. Pick any row to edit or delete it.</div></section>`;
  const radios = `${radio("tk", ["all", "buy", "sell", "rsu", "espp"], "all")}${radio("tm", ["all", "in", "us"], "all")}${radio("ty", ["all", ...FYS.map(String)], "all")}`;
  const note = boardNote("FINAL · Trades: every trade (T1 Tape, picked 2026-11-08)", `Picked with T2 as its holding view. Reached from <b>All trades</b> on Recent trades. Pick a holding's name (or one in Every holding) and its book opens (T2). <b>Every trade</b>, newest first, grouped by month with that month's money in and out. Filter by kind (buys, sales, RSU vests, ESPP), by India or US, and by <b>financial year</b> (April to March, as your Indian brokers report it); the four tiles follow the year. A sale shows <b>what it made</b> at average cost. Every chip here is live.`);
  return wrap("t1", radios, note, `${head("Trades", sentence(ROWS))}${sums}${filters}${table}`);
}

// ---------- T2 Book: one holding, shares and average cost after every trade ----------
const BOOK = ["NTAP", "NIFTYBEES", "INFY", "VOO"];
function stepChart(sym, W = 900, Hh = 230) {
  const rows = ROWS.filter((r) => r.sym === sym).slice().reverse();
  const t0 = Date.parse(rows[0].date), t1 = Date.parse(L.TODAY), ml = 40, mr = 14, mt = 16, mb = 26;
  const maxQ = Math.max(...rows.map((r) => Math.max(r.after.q, r.k === "rsu" ? r.after.q + (r.cover?.quantity ?? 0) : r.after.q))) * 1.12;
  const x = (iso) => ml + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - ml - mr), y = (q) => mt + (1 - q / maxQ) * (Hh - mt - mb);
  let d = `M${x(rows[0].date)},${y(0)}`, prev = 0;
  for (const r of rows) { d += ` H${x(r.date).toFixed(1)} V${y(r.after.q).toFixed(1)}`; prev = r.after.q; }
  d += ` H${W - mr}`;
  const area = `${d} V${y(0)} H${x(rows[0].date)} Z`;
  const col = { buy: "var(--gain)", sell: "var(--loss)", rsu: "oklch(0.55 0.15 258)", espp: "oklch(0.55 0.17 300)" };
  const yrs = []; for (let yv = +rows[0].date.slice(0, 4) + 1; yv <= 2026; yv++) yrs.push(yv);
  const ticks = [0, 0.5, 1].map((f) => Math.round((maxQ / 1.12) * f));
  return `<svg class="tr-step" viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" preserveAspectRatio="none"><defs><linearGradient id="sg-${sym}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--card-${INSTRUMENTS[sym].color})" stop-opacity=".32"/><stop offset="1" stop-color="var(--card-${INSTRUMENTS[sym].color})" stop-opacity=".02"/></linearGradient></defs>${ticks.map((q) => `<line x1="${ml}" x2="${W - mr}" y1="${y(q)}" y2="${y(q)}" stroke="var(--divider)"/><text x="${ml - 8}" y="${y(q) + 4}" text-anchor="end" class="ax">${q}</text>`).join("")}${yrs.map((yv) => `<text x="${x(`${yv}-01-01`)}" y="${Hh - 6}" text-anchor="middle" class="ax">${yv}</text>`).join("")}<path d="${area}" fill="url(#sg-${sym})"/><path d="${d}" fill="none" stroke="var(--card-${INSTRUMENTS[sym].color})" stroke-width="2.4"/>${rows.map((r) => `<circle cx="${x(r.date)}" cy="${y(r.after.q)}" r="5" fill="${col[r.k]}" stroke="white" stroke-width="2"><title>${fmtY(r.date)} · ${KIND[r.k][0]} · ${qty(r.after.q)} held after</title></circle>`).join("")}</svg>`;
}
function cameIn(sym) {
  const h = D.holding(sym), own = TRADES.filter((t) => t.symbol === sym);
  const by = (s) => sum(own.filter((t) => t.source === s && t.tradeType === "Buy").map((t) => t.quantity));
  const sold = sum(own.filter((t) => t.tradeType === "Sell").map((t) => t.quantity));
  const parts = [["Bought", by("Market"), "var(--gain)"], ["ESPP", by("ESPP"), "oklch(0.55 0.17 300)"], ["RSU vested", by("RSU"), "oklch(0.55 0.15 258)"]].filter((p) => p[1] > 0);
  const tot = sum(parts.map((p) => p[1]));
  return `<div class="tr-came"><div class="bar">${parts.map(([l, q, c]) => `<span style="flex:${q};background:${c}" title="${l} ${qty(q)}"></span>`).join("")}</div>${parts.map(([l, q, c]) => `<div class="between"><span><i style="background:${c}"></i>${l}</span><b>${qty(q)}</b></div>`).join("")}${sold ? `<div class="between"><span><i style="background:var(--loss)"></i>Sold, and sold to cover tax</span><b>−${qty(sold)}</b></div>` : `<div class="between"><span class="tr-dim">Nothing sold yet</span><b></b></div>`}<div class="between tot"><span>Held today</span><b>${qty(h.quantity)} of ${qty(tot)}</b></div></div><div class="tr-paid"><div class="card-t" style="font-size:14px">What a share cost, by how it came<small>in rupees, on the day</small></div>${[["Market", "Bought"], ["ESPP", "ESPP, at what you paid"], ["RSU", "RSU, at its value on the day"]].map(([src, l]) => { const b = own.filter((t) => t.source === src && t.tradeType === "Buy"); if (!b.length) return ""; const q = sum(b.map((t) => t.quantity)), c = sum(b.map(costInr)); return `<div class="between"><span>${l}</span><b>₹${num2(c / q)}</b></div>`; }).join("")}<div class="between"><span>Price today</span><b>₹${num2(h.price * (h.market === "US" ? D.FX_NOW : 1))}</b></div><div class="between tot"><span>Average across all</span><b>₹${num2(h.avgCost)}</b></div></div>`;
}
function bookPane(sym) {
  const h = D.holding(sym), ins = INSTRUMENTS[sym], us = ins.market === "US";
  const rows = ROWS.filter((r) => r.sym === sym), s = totals(rows);
  const avgTxt = `₹${num2(h.avgCost)}`;
  const table = rows.map((r, i) => {
    const prevAvg = rows[i + 1]?.after.avg, dAvg = prevAvg != null && r.after.q ? r.after.avg - prevAvg : 0;
    const qtyCell = r.k === "rsu" ? `+${qty(r.t.quantity)} <small>−${qty(r.cover?.quantity ?? 0)}</small>` : `${r.k === "sell" ? "−" : "+"}${qty(r.t.quantity)}`;
    return `<div class="tr-brow" data-k="${r.k}"><span class="d">${fmtY(r.date)}</span><span>${badge(r.k)}</span><span class="n">${qtyCell}</span><span class="n">${px(r, r.t.price)}${us ? `<small>₹${r.t.fxRateToInr}</small>` : ""}</span><span class="n">${inr(r.k === "sell" ? r.out : r.in)}</span><span class="n run"><b>${qty(r.after.q)}</b></span><span class="n">${r.after.q ? `₹${num2(r.after.avg)}` : "·"}<small>${Math.abs(dAvg) > 0.005 ? `<em class="${dAvg > 0 ? "rs" : "fl"}">${dAvg > 0 ? "▲" : "▼"} ₹${num2(Math.abs(dAvg))}</em>` : r.k === "sell" ? "unchanged by a sale" : rows[i + 1] ? "" : "first trade"}${us && r.after.q ? ` · ${usd(r.after.avgUsd)}` : ""}</small></span><span class="n">${madeCell(r.made)}</span><span class="ed">${I.pencil(13)}</span></div>`;
  }).join("");
  return `<div class="tr-pane" data-sym="${sym}"><div class="g12" style="gap:20px"><section class="card glass" style="grid-column:span 8;gap:12px"><div class="row" style="gap:14px">${symTile(h, 48)}<div class="grow"><div class="card-t" style="font-size:19px">${ins.name}<small>${sym} · ${us ? "US" : "India"} · since ${fmtY(h.since)}</small></div></div>${P.srcTags(h)}</div><div class="tr-kp">${[["You hold", qty(h.quantity), "shares"], ["Average cost", avgTxt, us ? `${usd(h.avgCostNative)} a share` : "a share"], ["Put in", lakhS(s.in), `out ${lakhS(s.out)}`], ["Made on sales", s.sells ? `${s.made >= 0 ? "+" : "−"}${lakhS(Math.abs(s.made))}` : "·", `${L.plural(rows.filter((r) => r.k === "sell").length, "sale")}, ${L.plural(rows.filter((r) => r.k === "rsu" && r.cover).length, "sell-to-cover")}`]].map(([k, v, x]) => `<div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${x}</div></div>`).join("")}</div><div class="card-h" style="margin-top:4px"><div class="card-t" style="font-size:14px">Shares held<small>a step at every trade</small></div><span class="tr-leg">${["buy", "espp", "rsu", "sell"].filter((k) => rows.some((r) => r.k === k)).map((k) => `<span><i class="${k}"></i>${KIND[k][0]}</span>`).join("")}</span></div>${stepChart(sym)}</section><section class="card glass" style="grid-column:span 4;gap:12px">${P.cardHead("How the shares came in", `${L.plural(rows.length, "trade")}`)}${cameIn(sym)}<div class="card-note">Average cost is weighted: a sale takes shares at the average, so it never moves the average; a buy does. That's why it can differ from your broker's per-lot cost.</div></section></div><section class="card glass tr-book" style="gap:0">${P.cardHead("Every trade in it", "newest first · shares and average cost after each one", P.link("Back to all trades"))}<div class="tr-brow tr-th"><span>Date</span><span>Kind</span><span class="n">Shares</span><span class="n">Price</span><span class="n">Amount</span><span class="n">Held after</span><span class="n">Average cost after</span><span class="n">Made on sale</span><span></span></div>${table}</section></div>`;
}
export function book() {
  const counts = Object.fromEntries(BOOK.map((s) => [s, ROWS.filter((r) => r.sym === s).length]));
  const picker = `<section class="card glass tr-filt"><div class="tr-fr"><span class="tr-chip">${I.chevL(11)} All trades</span><span class="sub2" style="margin:0 0 0 6px;font-weight:800">Holding</span>${chipRow("bk", BOOK.map((s) => [s.toLowerCase(), INSTRUMENTS[s].name, counts[s]]))}<span class="grow"></span><span class="tr-dim" style="font-size:12px;font-weight:700">and ${D.SYMBOLS.length - BOOK.length} more ${I.chev()}</span></div></section>`;
  const lede = (sym) => { const h = D.holding(sym); return `<b>${counts[sym]} trades</b> in ${INSTRUMENTS[sym].name} since <b>${fmtY(h.since)}</b>. You hold <b>${qty(h.quantity)}</b> at an average of <b>₹${num2(h.avgCost)}</b> a share.`; };
  const heads = BOOK.map((s) => `<div class="tr-pane" data-sym="${s}">${head(`Trades · ${INSTRUMENTS[s].name}`, lede(s))}</div>`).join("");
  const note = boardNote("FINAL · Trades for one holding (T2 Book, picked 2026-11-08)", `The Trades page with one holding picked (<b>/investments/trades?holding=NTAP</b>), reached from a holding's name on the list, the stage's holding header or the holdings table. <b>All trades</b> goes back. Every trade in one holding with the <b>shares held</b> and the <b>average cost after it</b>, with how much a buy moved the average. A step chart of shares held, every trade a dot. <b>How the shares came in</b> splits bought, ESPP and RSU from what was sold. Pick a holding: the chips are live.`);
  return wrap("t2", radio("bk", BOOK.map((s) => s.toLowerCase()), "ntap"), note, `${heads}${picker}${BOOK.map(bookPane).join("")}`);
}

// ---------- T3 Months: a calendar of money in and out; pick a month for its trades ----------
export function months() {
  const ys = [2021, 2022, 2023, 2024, 2025, 2026], MON = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const byM = {}; for (const r of ROWS) (byM[r.month] ??= []).push(r);
  const maxIn = Math.max(...Object.values(byM).map((rs) => totals(rs).in)), maxOut = Math.max(...Object.values(byM).map((rs) => totals(rs).out));
  const keys = Object.keys(byM).sort();
  const def = keys.at(-1);
  const col = { buy: "var(--gain)", espp: "oklch(0.55 0.17 300)", rsu: "oklch(0.55 0.15 258)" };
  const cell = (m) => {
    const rs = byM[m]; if (!rs) return `<span class="tr-cell empty${m > L.TODAY.slice(0, 7) ? " future" : ""}"></span>`;
    const s = totals(rs), stack = ["buy", "espp", "rsu"].map((k) => [k, sum(rs.filter((r) => r.k === k).map((r) => r.in))]).filter((p) => p[1] > 0);
    const hIn = Math.max(5, Math.sqrt(s.in / maxIn) * 40), hOut = s.out ? Math.max(4, Math.sqrt(s.out / maxOut) * 22) : 0;
    return `<label class="tr-cell" for="mo-${m}" data-for="mo-${m}"><span class="cnt">${rs.length}</span><span class="up" style="height:${hIn}px">${stack.map(([k, v]) => `<i style="flex:${v};background:${col[k]}"></i>`).join("")}</span><span class="axl"></span><span class="dn" style="height:${hOut}px"></span><span class="tip"><b>${L.monFull(m)} ${m.slice(0, 4)}</b>${L.plural(rs.length, "trade")}<br>in ${inr(s.in)}${s.out ? ` · out ${inr(s.out)}` : ""}</span></label>`;
  };
  const grid = `<div class="tr-cal"><span></span>${MON.map((m) => `<span class="ml">${L.monName(`2026-${m}`)}</span>`).join("")}<span class="ml">Year</span>${ys.map((y) => { const rs = ROWS.filter((r) => r.date.startsWith(String(y))), s = totals(rs); return `<span class="yl">${y}</span>${MON.map((m) => cell(`${y}-${m}`)).join("")}<span class="yt"><b>${lakhS(s.in)}</b><small>${s.out ? `out ${lakhS(s.out)}` : "nothing out"}</small></span>`; }).join("")}</div>`;
  const panes = keys.map((m) => { const rs = byM[m], s = totals(rs); return `<div class="tr-mp" data-m="${m}"><div class="card-h"><div class="card-t" style="font-size:17px">${L.monFull(m)} ${m.slice(0, 4)}<small>${L.plural(rs.length, "trade")} · in ${inr(s.in)}${s.out ? ` · out ${inr(s.out)}` : ""}${s.sells ? ` · made ${s.made >= 0 ? "+" : "−"}${inr(Math.abs(s.made))}` : ""}</small></div></div>${rs.map((r) => `<div class="tradeln">${symTile({ symbol: r.sym, color: r.ins.color }, 34)}<div><b>${r.ins.name} ${badge(r.k)}</b><small>${fmt(r.date)} · ${detail(r)} · ${r.broker}</small></div><div class="a">${r.k === "sell" ? "−" : ""}${inr(r.k === "sell" ? r.out : r.in)}${r.made != null ? `<small class="${r.made >= 0 ? "up" : "dn"}">made ${r.made >= 0 ? "+" : "−"}${inr(Math.abs(r.made))}</small>` : r.us ? `<small>${amtNative(r)}</small>` : ""}</div></div>`).join("")}</div>`; }).join("");
  const legend = `<span class="tr-leg"><span><i class="buy"></i>Bought</span><span><i class="espp"></i>ESPP</span><span><i class="rsu"></i>RSU vested</span><span><i class="sell"></i>Taken out (below the line)</span></span>`;
  const note = boardNote("T3 Months: a calendar of money in and out", `Each square is a month: the bar above the line is what went in (bought, ESPP, RSU vested), the bar below is what came out (sales, sell-to-cover). Six years at a glance: the quarterly RSU rhythm, the March fund top-ups, the one big NetApp sale. <b>Pick a month</b> and its trades open on the right. Hover a month for its sums. Each year's total sits at the row's end. The months are live.`);
  return wrap("t3", radio("mo", keys, def), note, `${head("Trades", sentence(ROWS))}${summaryTiles(ROWS)}<div class="g12" style="gap:20px"><section class="card glass" style="grid-column:span 7;gap:14px">${P.cardHead("Month by month", "pick one", legend)}${grid}</section><section class="card glass tr-mps" style="grid-column:span 5;gap:6px">${panes}<div class="card-note" style="padding-top:8px">Pick a trade to edit or delete it.</div><div class="tr-big">${P.cardHead("The biggest months", "by money in")}${keys.map((m) => [m, totals(byM[m])]).sort((a, b) => b[1].in - a[1].in).slice(0, 5).map(([m, t], i) => `<label class="tr-bigr" for="mo-${m}" data-for="mo-${m}"><span class="rk">${i + 1}</span><span><b>${L.monFull(m)} ${m.slice(0, 4)}</b><small>${L.plural(byM[m].length, "trade")} · ${[...new Set(byM[m].map((r) => r.ins.name))].slice(0, 2).join(", ")}</small></span><b class="n">${lakhS(t.in)}</b></label>`).join("")}${btn("Show every trade as a list", { icon: I.receipt(13), style: "align-self:flex-start;margin-top:6px" })}</div></section></div>`);
}


// ---------- Phone (final, 2026-11-08): the list and one holding's book ----------
const phone = (body) => `<div class="chai-app ph" style="width:390px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div></div>`;
const phHead = (title, lede) => `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow"><span style="display:inline-flex;align-items:center;gap:6px">${I.chevL(11)}Investments · Trades</span></div><h1>${title}</h1><div class="lede">${lede}</div></div><div class="pg-actions">${btn("Add trade", { icon: I.plus() })}</div></header>`;
const phRow = (r) => `<div class="tr-prow">${symTile({ symbol: r.sym, color: r.ins.color }, 32)}<div class="mid"><b>${r.ins.name}</b><small>${badge(r.k)} ${fmt(r.date)} · ${r.k === "rsu" ? `${qty(r.t.quantity)} vested, ${qty(r.cover?.quantity ?? 0)} sold` : `${qty(r.t.quantity)} × ${px(r, r.t.price)}`}</small></div><div class="n">${r.k === "sell" ? "−" : ""}${inr(r.k === "sell" ? r.out : r.in)}${r.made != null ? `<small class="${r.made >= 0 ? "up" : "dn"}">made ${r.made >= 0 ? "+" : "−"}${inr(Math.abs(r.made))}</small>` : r.us ? `<small>${amtNative(r)}</small>` : ""}</div></div>`;
export function phoneBoard() {
  const s = totals(ROWS), months = [...new Set(ROWS.map((r) => r.month))].slice(0, 4);
  const ptiles = `<div class="tr-ptiles">${[["Put in", lakhS(s.in)], ["Taken out", lakhS(s.out)], ["Net put in", lakhS(s.in - s.out)], ["Made on sales", `+${lakhS(s.made)}`, "up"]].map(([k, v, c = ""]) => `<div class="tr-tile glass"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`).join("")}</div>`;
  const chipsScroll = (items, on) => `<div class="tr-pscroll">${items.map((l) => `<span class="tr-chip${l === on ? " on" : ""}">${l}</span>`).join("")}</div>`;
  const list = months.map((m) => { const rs = ROWS.filter((r) => r.month === m); return `<div class="tr-pmon"><div class="tr-mh" style="padding:8px 2px 4px"><b>${L.monFull(m)} ${m.slice(0, 4)}</b></div>${rs.map(phRow).join("")}</div>`; }).join("");
  const p1 = phone(`${phHead("Trades", sentence(ROWS))}${ptiles}${chipsScroll(["Everything", "Buys", "Sales", "RSU vests", "ESPP"], "Everything")}${chipsScroll(["All years", ...FYS.map(fyLabel)], "All years")}<section class="card glass" style="gap:0;padding:8px 14px 12px">${list}<span class="link" style="justify-content:center;padding-top:10px">Older trades${I.chev(12)}</span></section>`);
  const h = D.holding("NTAP"), rows = ROWS.filter((r) => r.sym === "NTAP");
  const bookRows = rows.slice(0, 6).map((r, i) => { const prev = rows[i + 1]?.after.avg, dA = prev != null ? r.after.avg - prev : 0; return `<div class="tr-prow bk"><div class="mid"><b>${fmtY(r.date)} ${badge(r.k)}</b><small>${r.k === "rsu" ? `+${qty(r.t.quantity)} −${qty(r.cover?.quantity ?? 0)}` : `${r.k === "sell" ? "−" : "+"}${qty(r.t.quantity)}`} · held <b>${qty(r.after.q)}</b> after</small></div><div class="n">₹${num2(r.after.avg)}<small>${Math.abs(dA) > 0.005 ? `<em class="${dA > 0 ? "rs" : "fl"}">${dA > 0 ? "▲" : "▼"} ₹${num2(Math.abs(dA))}</em>` : r.made != null ? `<span class="up">made +${inr(r.made)}</span>` : ""}</small></div></div>`; }).join("");
  const p2 = phone(`${phHead("NetApp", `<b>${rows.length} trades</b> since <b>${fmtY(h.since)}</b>. You hold <b>${qty(h.quantity)}</b> at an average of <b>₹${num2(h.avgCost)}</b>.`)}<div class="tr-pscroll"><span class="tr-chip">${I.chevL(11)} All trades</span><span class="tr-chip on">NetApp</span><span class="tr-chip">Nippon Nifty 50 BeES</span><span class="tr-chip">Infosys</span></div><div class="tr-kp" style="grid-template-columns:1fr 1fr">${[["You hold", qty(h.quantity), "shares"], ["Average cost", `₹${num2(h.avgCost)}`, `${usd(h.avgCostNative)} a share`], ["Put in", lakhS(totals(rows).in), `out ${lakhS(totals(rows).out)}`], ["Made on sales", `+${lakhS(totals(rows).made)}`, "1 sale, 11 sell-to-covers"]].map(([k, v, x]) => `<div><div class="k">${k}</div><div class="v" style="font-size:17px">${v}</div><div class="s">${x}</div></div>`).join("")}</div><section class="card glass" style="gap:8px;padding:14px">${P.cardHead("Shares held", "a step at every trade")}${stepChart("NTAP", 340, 170)}</section><section class="card glass" style="gap:0;padding:8px 14px 12px">${P.cardHead("Every trade in it", "average cost after")}${bookRows}<span class="link" style="justify-content:center;padding-top:10px">13 more${I.chev(12)}</span></section><section class="card glass" style="gap:10px;padding:14px">${P.cardHead("How the shares came in", "")}${cameIn("NTAP")}</section>`);
  const note = boardNote("FINAL · Trades on a phone", `The same order as the page. <b>All trades</b>: the four tiles two by two, kind and year as chips that scroll sideways, then a trade per row (holding, kind, date, amount, and what a sale made). Holding, broker and India/US sit behind a <b>Filter</b> sheet (not drawn: the page's controls stacked). <b>One holding</b>: the holding chips scroll, the four figures two by two, the step chart, then each trade with shares held and average cost after it, and How the shares came in last. A row opens the same edit sheet as the Investments page.`);
  return `<div class="chai-app board tr-b" style="width:1000px;height:__H__">${STYLE}${note}<div style="display:flex;gap:40px;align-items:flex-start">${[["All trades", p1], ["One holding", p2]].map(([l, p]) => `<div><div class="frame-l">${l}</div>${p}</div>`).join("")}</div></div>`;
}

// ---------- States (final, 2026-11-08) ----------
const frame = (label, note, inner) => `<div class="tr-frame"><div class="frame-l">${label}</div>${note ? `<div class="card-note" style="margin:-4px 0 12px;max-width:1100px">${note}</div>` : ""}<div class="tr-fbox">${inner}</div></div>`;
const notice = (html, act = "", cls = "") => `<div class="notice ${cls}">${I.alert(16)}<div class="grow">${html}</div>${act}</div>`;
export function statesBoard() {
  const zeroTiles = tiles([["Put in", "₹0", "nothing yet"], ["Taken out", "₹0", "nothing yet"], ["Net put in", "₹0", "0 trades"], ["Made on shares sold", "·", "no sales yet"]]);
  const emptyC = (icon, c, t, d, b) => `<div class="tr-empc"><span class="symt" style="width:42px;height:42px;border-radius:13px;background:${P.grad(c)}">${icon}</span><b>${t}</b><p>${d}</p>${btn(b, { icon: I.plus() })}</div>`;
  const a = `${head("Trades", "No trades yet. Add your first and it shows here, and on the Investments page.")}${zeroTiles}<section class="card glass"><div class="tr-emp">${emptyC(I.plus(18), "teal", "Add a trade", "A buy or a sell of a share, an ETF or a fund, in India or the US.", "Add trade")}${emptyC(I.briefcase(18), "sapphire", "Record an RSU vest", "The shares that vested and the ones sold to cover tax, as one row.", "Record a vest")}${emptyC(I.invest(18), "violet", "Record an ESPP purchase", "The shares the plan bought, at the price you paid.", "Record a purchase")}</div></section>`;
  const b = `<section class="card glass tr-filt"><div class="tr-fr"><span class="tr-chips"><span class="tr-chip">Everything<em>48</em></span><span class="tr-chip">Buys<em>28</em></span><span class="tr-chip">Sales<em>2</em></span><span class="tr-chip">RSU vests<em>11</em></span><span class="tr-chip on">ESPP<em>7</em></span></span><span class="grow"></span></div><div class="tr-fr"><span class="tr-chips"><span class="tr-chip">All years</span><span class="tr-chip">FY 2026-27</span><span class="tr-chip">FY 2025-26</span><span class="tr-chip">FY 2024-25</span><span class="tr-chip">FY 2023-24</span><span class="tr-chip">FY 2022-23</span><span class="tr-chip on">FY 2021-22</span></span></div></section><section class="card glass"><div class="tr-none"><b>No ESPP purchases in FY 2021-22.</b><p>Your first ESPP purchase was on May 15, 2023.</p><div class="row" style="gap:8px;justify-content:center">${btn("Clear the filters")}${btn("Go to FY 2023-24", { kind: "primary" })}</div></div></section>`;
  const nt = ROWS.find((r) => r.k === "sell" && r.sym === "NTAP");
  const c = `${notice(`<b>NetApp: a sale is more than you held.</b> On Mar 10, 2025 you sold 60 shares, but only 40 were held that day. It's counted as selling the 40, so what came after may be off.`, `<span class="mini-btn ok">${I.pencil(11)} Fix the trade</span>`)}<section class="card glass tr-tape"><div class="tr-mh"><b>March 2025</b><span>out ${inr(nt.out * 1.5)}</span></div><div class="tr-row fix" data-k="sell"><span class="d">Mar 10<small>Mon</small></span><span class="h">${symTile({ symbol: "NTAP", color: "sapphire" }, 32)}<span><b>NetApp</b><small>NTAP · US</small></span></span><span>${badge("sell")}</span><span class="dt"><b class="dn">asks for 60 · only 40 held</b> · 60 × $118.00 · ₹87 a dollar</span><span class="n">−$7,080.00<small>−₹6,15,960</small></span><span class="n"><span class="tr-dim">counted for 40</span></span><span class="br">Schwab</span><span class="ed">${I.pencil(13)}</span></div></section><div class="card-note">In the holding's book the row reads <b>Held after 0 · over by 20</b> in red. The page never hides it, and never stops.</div>`;
  const so = [["Jun 17, 2025", "sell", "−45", "₹1,830.00", "₹82,350", "0", "·", "+₹6,600"], ["Jan 22, 2024", "buy", "+15", "₹1,640.00", "₹24,600", "45", "₹1,683.33", ""], ["Sep 9, 2021", "buy", "+30", "₹1,705.00", "₹51,150", "30", "₹1,705.00", ""]];
  const d = `<section class="card glass" style="gap:12px"><div class="row" style="gap:14px">${symTile({ symbol: "TCS", color: "ruby" }, 48)}<div class="grow"><div class="card-t" style="font-size:19px">Tata Consultancy Services<small>TCS · India · Sep 9, 2021 to Jun 17, 2025</small></div></div><span class="srcb stale">Sold out</span></div><div class="tr-kp">${[["You hold", "0", "sold out on Jun 17, 2025"], ["Average cost", "·", "was ₹1,683.33 before the sale"], ["Put in", "₹75,750", "out ₹82,350"], ["Made on sales", "+₹6,600", "1 sale"]].map(([k, v, x]) => `<div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${x}</div></div>`).join("")}</div></section><section class="card glass tr-book" style="gap:0"><div class="tr-brow tr-th"><span>Date</span><span>Kind</span><span class="n">Shares</span><span class="n">Price</span><span class="n">Amount</span><span class="n">Held after</span><span class="n">Average cost after</span><span class="n">Made on sale</span><span></span></div>${so.map(([dt, k, q, p, am, ha, av, md]) => `<div class="tr-brow"><span class="d">${dt}</span><span>${badge(k)}</span><span class="n">${q}</span><span class="n">${p}</span><span class="n">${am}</span><span class="n run"><b>${ha}</b></span><span class="n">${av}</span><span class="n">${md ? `<b class="up">${md}</b>` : `<span class="tr-dim">·</span>`}</span><span class="ed">${I.pencil(13)}</span></div>`).join("")}</section><div class="card-note">A holding you've sold out of keeps its book: its trades and what they made. It leaves the Investments page's holdings, and shows under <b>Sold out</b> in the holding picker. (TCS is made up for this state.)</div>`;
  const e = `${notice(`<b>That holding isn't in your trades any more</b>, so every trade is shown. It may have been renamed, or its trades deleted.`)}${tiles([["Put in", lakhS(s0.in), "buys, ESPP, and RSU vests at their value on the day"], ["Taken out", lakhS(s0.out), "sales and shares sold to cover tax"], ["Net put in", lakhS(s0.in - s0.out), `${ROWS.length} trades`], ["Made on shares sold", `+${lakhS(s0.made)}`, "2 sales and 11 sell-to-covers", "up"]])}`;
  const f = `${notice(`<b>2 rows in InvestmentTransactions couldn't be read</b> (rows 14 and 52: a quantity that isn't a number). They're left out of every sum here until they're fixed in the Sheet.`, `<span class="mini-btn ghost">Show the rows</span>`)}`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>FINAL · Trades: states</h2>${L.sampleTag()}</div><p>What the Trades page shows when there's nothing, when a filter matches nothing, when a trade needs fixing, when a holding is sold out, and when the link or the Sheet is off.</p></div>${frame("A · No trades yet", "", a)}${frame("B · The filters match nothing", "Says what's missing and offers the nearest year that has some.", b)}${frame("C · A sale more than was held", "Same rule as the Investments page: shown as something to fix, never hidden.", c)}${frame("D · A holding sold out (its book)", "", d)}${frame("E · ?holding= names one that isn't there", "", e)}${frame("F · Rows in the Sheet that couldn't be read", "The app's usual skipped-rows notice, under the header.", f)}`;
  return `<div class="chai-app board tr-b" style="width:1600px;height:__H__">${STYLE}${body}</div>`;
}
const s0 = totals(ROWS);

// ---------- Styles (the board's own, all prefixed tr-) ----------
const kindsCss = ["all", "buy", "sell", "rsu", "espp"].filter((k) => k !== "all").map((k) => `.tr-b:has(#tk-${k}:checked) .tr-row[data-k]:not(.tr-th):not([data-k="${k}"]) { display: none; } .tr-b:has(#tk-${k}:checked) .tr-mon:not([data-ks~="${k}"]) { display: none; }`).join("\n");
const mktCss = ["in", "us"].map((m) => `.tr-b:has(#tm-${m}:checked) .tr-row[data-m]:not(.tr-th):not([data-m="${m}"]) { display: none; } .tr-b:has(#tm-${m}:checked) .tr-mon:not([data-ms~="${m}"]) { display: none; }`).join("\n");
const fyCss = ["all", ...FYS].map((y) => `.tr-b:has(#ty-${y}:checked) .tr-sums > [data-fy="${y}"] { display: block; }${y === "all" ? "" : ` .tr-b:has(#ty-${y}:checked) .tr-mon:not([data-fy="${y}"]) { display: none; }`}`).join("\n");
const chipOn = (ids) => ids.map((id) => `.tr-b:has(#${id}:checked) [data-for="${id}"]`).join(",\n");
const allChipIds = [...["all", "buy", "sell", "rsu", "espp"].map((k) => `tk-${k}`), ...["all", "in", "us"].map((k) => `tm-${k}`), ...["all", ...FYS].map((y) => `ty-${y}`), ...BOOK.map((s) => `bk-${s.toLowerCase()}`)];
const bookCss = BOOK.map((s) => `.tr-b:has(#bk-${s.toLowerCase()}:checked) .tr-pane[data-sym="${s}"] { display: block; }`).join("\n");
const monKeys = [...new Set(ROWS.map((r) => r.month))];
const monCss = monKeys.map((m) => `.tr-b:has(#mo-${m}:checked) .tr-mp[data-m="${m}"] { display: block; } .tr-b:has(#mo-${m}:checked) [data-for="mo-${m}"] { outline: 2.5px solid var(--fg); outline-offset: 1px; } .tr-b:has(#mo-${m}:checked) .tr-bigr[data-for="mo-${m}"] { outline: 0; background: var(--accent-tint); }`).join("\n");
const STYLE = `<style>
.tr-b .main { gap: 20px; }
.tr-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.tr-tile { border-radius: 22px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.tr-tile .k { font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
.tr-tile .v { font-size: 26px; font-weight: 800; letter-spacing: -.02em; } .tr-tile .s { font-size: 12px; font-weight: 600; color: var(--muted); }
.tr-b .up { color: var(--gain); } .tr-b .dn { color: var(--loss); } .tr-dim { color: var(--muted); }
.tr-sums > div { display: none; }
${fyCss}
.tr-filt { gap: 12px; padding: 14px 18px; } .tr-fr { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tr-chips { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.tr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: var(--fill, oklch(0.95 0.005 250)); font-size: 12.5px; font-weight: 700; cursor: pointer; color: var(--fg); }
.tr-chip em { font-style: normal; font-size: 11px; font-weight: 800; color: var(--muted); }
${chipOn(allChipIds)} { background: var(--fg); color: var(--bg, white); }
${chipOn(allChipIds).split(",\n").map((s) => `${s} em`).join(",\n")} { color: inherit; opacity: .7; }
.sbox { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--divider); font-size: 12.5px; font-weight: 600; color: var(--muted); min-width: 220px; }
.tr-tape { gap: 0; padding: 8px 18px 18px; }
.tr-row { display: grid; grid-template-columns: 70px minmax(220px, 1.3fr) 92px minmax(260px, 2fr) 130px 120px 80px 24px; gap: 14px; align-items: center; padding: 10px 6px; border-top: 1px solid var(--divider); border-radius: 10px; }
.tr-row:not(.tr-th):hover { background: var(--fill, oklch(0.96 0.005 250)); }
.tr-th { font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border-top: 0; }
.tr-row .d { font-size: 13px; font-weight: 800; } .tr-row .d small, .tr-row .h small, .tr-row .n small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.tr-row .h { display: flex; align-items: center; gap: 10px; min-width: 0; } .tr-row .h b { font-size: 13px; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tr-row .h b.bk { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; cursor: pointer; } .tr-row .h b.bk i { opacity: 0; color: var(--accent-text); display: inline-flex; } .tr-row:hover .h b.bk { color: var(--accent-text); } .tr-row:hover .h b.bk i { opacity: 1; }
.tr-row .dt { font-size: 12px; font-weight: 600; color: var(--muted); } .tr-row .br { font-size: 12px; font-weight: 700; color: var(--muted); }
.tr-b .n { text-align: right; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
.tr-b .ed { color: var(--muted); opacity: .55; display: inline-flex; justify-content: center; }
.tr-mh { display: flex; justify-content: space-between; align-items: baseline; padding: 18px 6px 8px; } .tr-mh b { font-size: 14px; font-weight: 800; } .tr-mh span { font-size: 12px; font-weight: 700; color: var(--muted); }
${kindsCss}
${mktCss}
.bsb.espp { background: oklch(0.94 0.04 300); color: oklch(0.45 0.15 300); }
.tr-pane { display: none; } ${bookCss}
.t2 .tr-pane { margin-bottom: 0; } .t2 .pgcol > .tr-pane + .tr-pane { margin-top: 0; }
.tr-kp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tr-kp > div { background: var(--fill, oklch(0.965 0.005 250)); border-radius: 16px; padding: 12px 14px; } .tr-kp .k { font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); } .tr-kp .v { font-size: 19px; font-weight: 800; margin-top: 4px; white-space: nowrap; } .tr-kp .s { font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.tr-step .ax { font-size: 10px; font-weight: 700; fill: var(--muted); }
.tr-leg { display: inline-flex; gap: 12px; flex-wrap: wrap; font-size: 11.5px; font-weight: 700; color: var(--muted); } .tr-leg span { display: inline-flex; align-items: center; gap: 5px; }
.tr-leg i, .tr-came i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 6px; } .tr-leg i.buy { background: var(--gain); } .tr-leg i.sell { background: var(--loss); } .tr-leg i.rsu { background: oklch(0.55 0.15 258); } .tr-leg i.espp { background: oklch(0.55 0.17 300); }
.tr-paid { display: flex; flex-direction: column; gap: 10px; font-size: 13px; font-weight: 600; border-top: 1px solid var(--divider); padding-top: 14px; } .tr-paid .between { display: flex; justify-content: space-between; } .tr-paid .tot { font-weight: 800; }
.tr-came { display: flex; flex-direction: column; gap: 10px; font-size: 13px; font-weight: 600; } .tr-came .bar { display: flex; gap: 3px; height: 16px; border-radius: 8px; overflow: hidden; } .tr-came .between { display: flex; justify-content: space-between; } .tr-came .tot { border-top: 1px solid var(--divider); padding-top: 10px; font-weight: 800; }
.tr-book { padding: 16px 18px 18px; } .tr-book .card-h { margin-bottom: 8px; }
.tr-brow { display: grid; grid-template-columns: 120px 96px 110px 120px 130px 110px 150px 130px 24px; gap: 14px; align-items: center; padding: 10px 6px; border-top: 1px solid var(--divider); justify-content: space-between; }
.tr-brow .d { font-size: 13px; font-weight: 800; } .tr-brow small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.tr-brow .run { background: var(--fill, oklch(0.965 0.005 250)); border-radius: 8px; padding: 4px 8px; } .tr-brow .run.mv { background: var(--accent-tint); color: var(--accent-text); }
.tr-brow.tr-th .run { background: none; } .tr-brow em { font-style: normal; font-weight: 800; } .tr-brow em.rs { color: var(--warning-text); } .tr-brow em.fl { color: var(--gain); }
.tr-cal { display: grid; grid-template-columns: 44px repeat(12, 1fr) 96px; gap: 6px; align-items: stretch; }
.tr-cal .ml { font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); text-align: center; } .tr-cal .yl { font-size: 13px; font-weight: 800; align-self: center; } .tr-cal .yt { align-self: center; text-align: right; font-size: 13px; font-weight: 800; } .tr-cal .yt small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); }
.tr-cell { position: relative; height: 84px; border-radius: 12px; background: var(--fill, oklch(0.965 0.005 250)); display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; padding: 0 8px; }
.tr-cell.empty { background: transparent; border: 1px dashed var(--divider); cursor: default; } .tr-cell.future { opacity: .35; }
.tr-cell .cnt { position: absolute; top: 5px; left: 7px; font-size: 10px; font-weight: 800; color: var(--muted); }
.tr-cell .up { width: 60%; display: flex; flex-direction: column-reverse; border-radius: 4px 4px 0 0; overflow: hidden; margin-top: 10px; } .tr-cell .up i { display: block; }
.tr-cell .axl { width: 80%; height: 1.5px; background: var(--fg); opacity: .25; } .tr-cell .dn { width: 60%; background: var(--loss); border-radius: 0 0 4px 4px; }
.tr-cell .tip { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: var(--fg); color: var(--bg, white); font-size: 11.5px; font-weight: 600; line-height: 1.45; padding: 8px 11px; border-radius: 10px; white-space: nowrap; z-index: 5; } .tr-cell .tip b { display: block; }
.tr-cell:hover .tip { display: block; } .tr-cell:hover { background: var(--accent-tint); }
.tr-big { margin-top: auto; border-top: 1px solid var(--divider); padding-top: 14px; display: flex; flex-direction: column; gap: 4px; } .tr-bigr { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; align-items: center; padding: 8px 6px; border-radius: 12px; cursor: pointer; } .tr-bigr:hover { background: var(--fill, oklch(0.965 0.005 250)); } .tr-bigr .rk { width: 24px; height: 24px; border-radius: 8px; background: var(--fill, oklch(0.95 0.005 250)); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; } .tr-bigr b { font-size: 13px; font-weight: 800; display: block; } .tr-bigr small { font-size: 11px; font-weight: 600; color: var(--muted); }
.tr-chip.on { background: var(--fg); color: var(--bg, white); } .tr-chip.on em { color: inherit; opacity: .7; }
.tr-ptiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .tr-ptiles .tr-tile { padding: 12px 14px; border-radius: 18px; } .tr-ptiles .v { font-size: 20px; }
.tr-pscroll { display: flex; gap: 6px; overflow: hidden; margin: 0 -16px; padding: 0 16px; white-space: nowrap; } .tr-pscroll .tr-chip { flex-shrink: 0; }
.tr-prow { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; padding: 10px 0; border-top: 1px solid var(--divider); } .tr-prow.bk { grid-template-columns: 1fr auto; }
.tr-pmon .tr-prow:first-of-type { border-top: 0; }
.tr-prow .mid { min-width: 0; } .tr-prow .mid > b { display: block; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .tr-prow small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 3px; } .tr-prow small b { color: var(--fg); }
.tr-prow .bsb { padding: 1px 6px; font-size: 9px; } .tr-prow em { font-style: normal; font-weight: 800; } .tr-prow em.rs { color: var(--warning-text); } .tr-prow em.fl { color: var(--gain); }
.tr-frame { display: flex; flex-direction: column; } .tr-fbox { display: flex; flex-direction: column; gap: 16px; padding: 28px; border-radius: 28px; background: var(--bg, white); border: 1px solid var(--divider); }
.tr-emp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; } .tr-empc { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 18px; border-radius: 18px; background: var(--fill, oklch(0.965 0.005 250)); } .tr-empc b { font-size: 15px; font-weight: 800; } .tr-empc p { font-size: 13px; color: var(--muted); font-weight: 500; line-height: 1.5; }
.tr-none { text-align: center; padding: 36px 0; display: flex; flex-direction: column; gap: 8px; } .tr-none b { font-size: 16px; font-weight: 800; } .tr-none p { font-size: 13px; color: var(--muted); font-weight: 600; margin-bottom: 8px; }
.tr-row.fix { background: var(--loss-tint); }
.tr-mp { display: none; } ${monCss}
</style>`;
