// Round 2's widgets: the records card, financial year, what's ahead, by category, pay changes, and the
// pick-follow rules that make every widget answer the hero's source chips.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { I, inr, inrS, signed, fmt, col, mono } = L;
const { hc, tip, card, cardHead, link, tgl, variants } = P;

/** When a source chip is picked in the hero, every widget that can follows it: other sources' rows fade or hide. */
export function pickCss() {
  const per = L.SOURCES.map((s) => `.i4dir:has(#i4-sel-${s.id}:checked) .srow[class*="sr-"]:not(.sr-${s.id}) { opacity: 0.22; }
.i4dir:has(#i4-sel-${s.id}:checked) .rhy:not(.rh-${s.id}) { opacity: 0.22; }
.i4dir:has(#i4-sel-${s.id}:checked) .chip2:not(.cc-${s.id}) { opacity: 0.2; }
.i4dir:has(#i4-sel-${s.id}:checked) .erow.er.er-${s.id} { display: grid; }`).join("\n");
  return `<style>.srow, .rhy, .chip2 { transition: opacity 240ms; }
.erow.xtra { display: none; }
.i4dir:not(:has(#i4-sel-all:checked)) .erow.er { display: none; }
${per}</style>`;
}

// ---------- Pay changes (a payment 2% or more off the one before it) ----------
const prevOf = (e) => L.ENTRIES.filter((x) => x.sourceId === e.sourceId && x.tag === e.tag && x.expectedDate < e.expectedDate).sort((p, q) => (p.expectedDate < q.expectedDate ? 1 : -1))[0];
export function changes(n = 8) {
  return L.ENTRIES.filter((e) => e.receivedDate).map((e) => ({ e, p: prevOf(e) })).filter(({ e, p }) => p && Math.abs((e.amount - p.amount) / p.amount) >= 0.02)
    .sort((a, b) => (a.e.receivedDate < b.e.receivedDate ? 1 : -1)).slice(0, n);
}
const changeRow = ({ e, p }, cols) => {
  const s = L.src(e.sourceId), d = e.amount - p.amount, pc = (d / p.amount) * 100, up = d > 0;
  return `<div class="erow er er-${s.id}" style="grid-template-columns:${cols}"><div class="cell-name">${mono(s, 32)}<div><b>${s.alias}${e.tag === "Bonus" && s.id === "salary" ? " bonus" : ""}</b><small>from ${fmt(e.expectedDate)}${e.expectedDate.startsWith("2025") ? ", 2025" : ""}</small></div></div><div class="dim" style="font-weight:600">${inr(p.amount)} <span style="color:var(--muted)">→</span> <b style="color:var(--fg)">${inr(e.amount)}</b></div><div style="font-weight:800;color:${up ? "var(--positive)" : "var(--negative)"};display:inline-flex;align-items:center;gap:4px">${up ? I.up(11) : I.down(11)}${inr(Math.abs(d))}</div><div style="justify-self:end"><span class="pill ${up ? "pill-on" : "pill-late"}">${up ? "+" : "−"}${Math.abs(pc).toFixed(1)}%</span></div></div>`;
};
export function payChangesCard({ n = 6 } = {}) {
  const cols = "2fr 2fr 1.1fr .9fr";
  return card(`${cardHead("Pay changes", "a payment 2% or more off the one before it")}<div>${changes(n).map((c) => changeRow(c, cols)).join("")}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px"><span>A raise, a bigger bonus or a lower dividend, in one list</span>${P.worked("Worked out")}</div>`, { gap: 6 });
}

// ---------- Latest entries: the records widget (like Subscriptions' Payments) ----------
export function latestEntries({ n = 7, wide = false, title = "Entries", hint = "" } = {}) {
  const t = tgl("i4", "recs", [["ent", "Entries"], ["chg", "Pay changes"]]);
  const list = [...L.PENDING, ...L.ENTRIES.filter((e) => e.receivedDate).sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1))];
  const cols = wide ? "2.2fr 1.2fr 1.1fr 1.5fr 1.6fr 1.5fr" : "2.2fr 1.1fr 1.1fr 1.5fr";
  const heads = wide ? ["Source", "Landed on", "Amount", "Status", "Landed in", "Tag"] : ["Source", "Landed on", "Amount", "Status"];
  const row = (e, i) => {
    const s = L.src(e.sourceId);
    return `<div class="erow er er-${s.id}${i >= n ? " xtra" : ""}" style="grid-template-columns:${cols}"><div class="cell-name">${mono(s, 32)}<div><b>${s.alias}${e.tag === "Bonus" && s.id === "salary" ? " bonus" : ""}</b><small>${s.frequency}${e.tag === "Bonus" ? "" : ""}</small></div></div><div><span style="font-weight:700">${e.receivedDate ? fmt(e.receivedDate) : `expected ${fmt(e.expectedDate)}`}</span>${e.receivedDate ? `<span class="sub2">${L.delay(e) > 0 ? `${L.delay(e)} day${L.delay(e) === 1 ? "" : "s"} after expected` : "on the day"}</span>` : `<span class="sub2" style="color:var(--negative);font-weight:700">${L.delay(e)} days ago</span>`}</div><div style="font-weight:800">${inr(e.amount)}</div><div>${P.stateChip(e)}</div>${wide ? `${L.acctChip(e.accountId)}<div><span class="tag ${e.tag.toLowerCase()}">${e.tag}</span></div>` : ""}</div>`;
  };
  const head = `<div class="erow" style="grid-template-columns:${cols};padding:0 0 8px">${heads.map((h) => `<span class="th">${h}</span>`).join("")}</div>`;
  const chgCols = "2fr 2fr 1.1fr .9fr";
  const chgHead = `<div class="erow" style="grid-template-columns:${chgCols};padding:0 0 8px"><span class="th">Source</span><span class="th">Before → after</span><span class="th">Change</span><span class="th" style="text-align:right">%</span></div>`;
  const body = `<div class="v-recs-ent" style="--d:block">${head}${[...list.slice(0, n), ...L.SOURCES.flatMap((sc) => list.slice(n).filter((e) => e.sourceId === sc.id).slice(0, 5))].map(row).join("")}</div><div class="v-recs-chg" style="--d:block">${chgHead}${changes(n).map((c) => changeRow(c, chgCols)).join("")}</div>`;
  return card(`${t.css}${t.radios}${cardHead(title, "all sources · newest first", t.ui)}<div class="spread">${body}</div>${hint ? `<div class="row foot" style="gap:10px;font-size:12px;color:var(--muted);font-weight:600"><label for="i4-sel-all" class="chip ch-all" style="cursor:pointer">All sources</label>${hint}</div>` : ""}<div class="between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px;margin-top:${hint ? "0" : "auto"}"><span class="v-recs-ent" style="--d:inline">The ${n} most recent of ${L.received(2026).length + L.received(2025).length + L.PENDING.length} entries since Jan 2025</span><span class="v-recs-chg" style="--d:inline">The ${n} latest changes of more</span>${link("All entries")}</div>`, { gap: 6 });
}

// ---------- Financial year (Apr to Mar) ----------
export function fyCard() {
  const max = 400000, h = 112, scale = h / max;
  const cols = L.fyMonths.map((k) => {
    const rec = L.monthReceived(k), pend = L.PENDING.filter((e) => L.monthKey(e.expectedDate) === k), up = L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k && u.expectedDate <= L.FY.end);
    const segs = [];
    if (rec) segs.push(`<div class="mseg rt" style="height:${Math.max(3, rec * scale)}px;background:${L.fill("emerald", 180)}"></div>`);
    for (const e of pend) segs.push(`<div class="mseg pend" style="height:${Math.max(8, e.amount * scale)}px"></div>`);
    const upSum = up.reduce((t, u) => t + u.amount, 0);
    if (upSum) segs.push(`<div class="mseg ghost" style="--c:var(--card-emerald);height:${Math.max(8, upSum * scale)}px"></div>`);
    const total = rec + upSum + pend.reduce((t, e) => t + e.amount, 0), nowc = k === L.NOW_KEY, future = k > L.NOW_KEY;
    const card2 = hc({ h: L.monYear(k), t: inr(future ? upSum : rec), d: future ? "expected, at the usual amounts" : nowc ? `${inr(pend.reduce((t, e) => t + e.amount, 0))} still pending` : "received", w: 220 });
    return `<div class="mcol hov${nowc ? " nowcol" : ""}" tabindex="0"><div style="flex:1"></div><div class="mval${future ? " muted" : ""}">${total ? inrS(total) : "–"}</div><div class="mstack">${segs.join("")}</div><div class="mlab${nowc ? " now" : ""}">${L.monName(k)}</div>${tip(card2, { w: 220, x: "c", y: "up" })}</div>`;
  }).join("");
  const done = L.FY_RECEIVED / L.FY_PROJECTED * 100, pend = L.FY_PENDING / L.FY_PROJECTED * 100;
  const dSame = (L.FY_RECEIVED - L.FY_LAST_SAME) / L.FY_LAST_SAME * 100;
  return card(`${cardHead(L.FY.name, "Apr 1 to Mar 31", P.worked("Worked out"))}<div class="between" style="align-items:flex-end;gap:16px"><div><div class="hk">Received so far</div><div style="font-size:34px;font-weight:800;letter-spacing:-0.02em;line-height:1.1">${inr(L.FY_RECEIVED)}</div></div><span class="delta">${I.up(11)} ${dSame.toFixed(0)}% on the same point of ${L.FY.prevName}</span></div><div><div class="stack" style="height:14px;gap:3px;display:flex"><span class="rt" style="flex:${L.FY_RECEIVED};background:${L.fill("emerald", 90)};border-radius:7px"></span><span style="flex:${L.FY_PENDING};background:repeating-linear-gradient(135deg,oklch(0.9 0.08 85) 0 4px,oklch(0.96 0.04 85) 4px 8px);border:1px dashed oklch(0.72 0.14 75);border-radius:7px;min-width:5px"></span><span style="flex:${L.FY_EXPECTED};border:1.5px dashed var(--card-emerald);border-radius:7px;background:color-mix(in oklch,var(--card-emerald) 12%,transparent)"></span></div><div class="between" style="font-size:12px;font-weight:600;color:var(--muted);margin-top:8px"><span>${done.toFixed(0)}% of the year's expected income is in</span><span>${inr(L.FY_PROJECTED)} by Mar 31</span></div></div><div class="mb" style="height:${h + 62}px;gap:8px;padding-left:0">${cols}</div><div class="foot" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;border-top:1px solid var(--divider);padding-top:14px"><div class="hfig"><span class="k">Still expected</span><span class="v" style="font-size:17px">${inr(L.FY_EXPECTED + L.FY_PENDING)}</span><span class="s">${L.plural(L.UPCOMING.filter((u) => u.expectedDate <= L.FY.end).length + 1, "payment")} to Mar 31</span></div><div class="hfig"><span class="k">Projected</span><span class="v" style="font-size:17px">${inr(L.FY_PROJECTED)}</span><span class="s">${((L.FY_PROJECTED / L.FY_LAST - 1) * 100).toFixed(1)}% on ${L.FY.prevName}</span></div><div class="hfig"><span class="k">${L.FY.prevName}</span><span class="v" style="font-size:17px">${inr(L.FY_LAST)}</span><span class="s">the whole year</span></div></div><div class="card-note">Each source counts at its usual amount and no bonus is assumed, so the projection is a floor, not a promise.</div>`);
}

// ---------- What's ahead: the next six months, from each schedule ----------
export function aheadCard() {
  const months = L.monthsFrom("2026-11", 6), max = 400000, h = 150, scale = h / max;
  const total = months.reduce((t, k) => t + L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k).reduce((a, u) => a + u.amount, 0), 0);
  const cols = months.map((k) => {
    const ups = L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k), sum = ups.reduce((t, u) => t + u.amount, 0);
    const segs = ups.map((u) => { const s = L.src(u.sourceId); return `<div class="mseg" style="--c:${col(s)};height:${Math.max(8, u.amount * scale)}px;border:1.5px dashed ${col(s)};background:color-mix(in oklch,${col(s)} 26%,transparent)"></div>`; }).join("");
    const card2 = hc({ h: L.monYear(k), t: inr(sum), d: "expected, at the usual amounts", rows: ups.map((u) => [`${L.src(u.sourceId).alias} · ${fmt(u.expectedDate)}`, inr(u.amount), col(L.src(u.sourceId))]), w: 250 });
    return `<div class="mcol hov" tabindex="0"><div style="flex:1"></div><div class="mval">${inrS(sum)}</div><div class="mstack">${segs}</div><div class="mlab">${L.monName(k)}${k.endsWith("01") ? ` ’${k.slice(2, 4)}` : ""}</div>${tip(card2, { w: 250, x: "c", y: "up" })}</div>`;
  }).join("");
  const big = L.UPCOMING.filter((u) => u.expectedDate >= "2026-11-01" && u.expectedDate <= "2027-04-30" && u.amount >= 100000 && u.sourceId !== "salary");
  const lumpy = months.map((k) => [k, L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k).reduce((a, u) => a + u.amount, 0)]).sort((a, b) => b[1] - a[1]);
  return card(`${cardHead("What's ahead", "the next six months, from each source's schedule", P.worked("Expected"))}<div class="row" style="gap:28px"><div class="hfig"><span class="k">Next six months</span><span class="v">${inr(total)}</span><span class="s">${L.plural(L.UPCOMING.filter((u) => u.expectedDate <= "2027-04-30").length, "payment")}</span></div><div class="hfig"><span class="k">Biggest month</span><span class="v">${L.monFull(lumpy[0][0])}</span><span class="s">${inr(lumpy[0][1])} · RSU vest Nov 15</span></div><div class="hfig"><span class="k">Quietest</span><span class="v">${L.monFull(lumpy.at(-1)[0])}</span><span class="s">${inr(lumpy.at(-1)[1])}</span></div></div><div class="mb" style="height:${h + 60}px;gap:12px;padding-left:0">${cols}</div><div class="foot row" style="gap:8px;flex-wrap:wrap;border-top:1px solid var(--divider);padding-top:12px;font-size:12px;font-weight:600;color:var(--muted)"><span>The lumpy ones:</span>${big.map((u) => `<span class="chip" style="cursor:default"><i style="background:${col(L.src(u.sourceId))}"></i>${L.src(u.sourceId).alias} ${fmt(u.expectedDate)} <em>${inr(u.amount)}</em></span>`).join("")}</div>`);
}

// ---------- By category: salary and stock, what your investments pay, one-offs ----------
export function categoryCard() {
  const cats = [["Salary", "Salary and stock", "NetApp salary, RSUs and ESPP", "sapphire"], ["Investment", "Investments", "FD interest and dividends", "teal"], ["Other", "One-offs", "The tax refund", "ruby"]];
  const ytd = (c) => L.SOURCES.filter((s) => s.category === c).reduce((t, s) => t + L.ytdOf(s.id), 0), usual = (c) => L.SOURCES.filter((s) => s.category === c).reduce((t, s) => t + L.monthlyEq(s), 0);
  const r = 62, circ = 2 * Math.PI * r; let off = 0;
  const arcs = cats.map(([c, , , color]) => { const v = ytd(c), len = (v / L.YTD) * circ; const a = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--card-${color})" stroke-width="22" stroke-dasharray="${Math.max(len - 3, 2)} ${circ}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"></circle>`; off += len; return a; }).join("");
  const donut = `<svg width="170" height="170" viewBox="0 0 160 160" style="flex-shrink:0"><circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--fill)" stroke-width="22"></circle>${arcs}<text x="80" y="76" text-anchor="middle" style="font-size:9.5px;font-weight:800;letter-spacing:.05em;fill:var(--muted)">THIS YEAR</text><text x="80" y="95" text-anchor="middle" style="font-size:16px;font-weight:800;fill:var(--fg)">${inrS(L.YTD)}</text></svg>`;
  const rows = cats.map(([c, name, sub, color]) => `<div class="between"><span class="row" style="gap:10px"><i style="width:10px;height:10px;border-radius:3px;background:var(--card-${color});display:inline-block"></i><span><b style="font-size:13px">${name}</b><span class="sub2">${sub}</span></span></span><span style="text-align:right"><b style="font-size:14px">${inr(ytd(c))}</b><span class="sub2">${L.pctOf(ytd(c), L.YTD)}% · ${usual(c) ? `usual ${inr(usual(c))} a month` : "one time"}</span></span></div>`).join("");
  const inv = usual("Investment");
  return card(`${cardHead("Salary, investments and one-offs", "this year, by category")}<div class="row" style="gap:22px;align-items:center">${donut}<div class="spread" style="gap:14px">${rows}</div></div><div class="foot between" style="padding:12px 14px;border-radius:14px;background:var(--accent-tint);color:var(--accent-text);font-size:13px;font-weight:700;gap:14px"><span>Your investments pay about <b>${inr(inv)} a month</b>, ${(inv / L.RUN_RATE * 100).toFixed(1)}% of a usual month.</span>${P.worked("Worked out")}</div>`);
}

// ---------- This year and last, with a switch: running total, or month by month ----------
export function yoyParts({ w = 700, h = 270, title = "This year, and last" } = {}) {
  const lines = P.yoyCard({ w, h, title }).replace(/^<section[^>]*>/, "").replace(/<\/section>$/, "");
  const at = lines.indexOf('<svg class="chart"'), end = lines.indexOf("</svg>", at) + 6;
  const sv = lines.slice(at, end);
  const foot = lines.slice(end);
  const hh = h - 44, scale = hh / 400000;
  const cols = L.YEAR.map((k, i) => {
    const k25 = `2025-${k.slice(5)}`, a = L.monthReceived(k25), future = k > L.NOW_KEY, b = future ? L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k).reduce((x, u) => x + u.amount, 0) : L.monthReceived(k), d = a ? ((b - a) / a) * 100 : 0;
    const card2 = hc({ h: L.monYear(k), t: inr(b), d: `${inr(a)} in ${monName25(k)}`, rows: [["2026" + (future ? " (expected)" : ""), inr(b), "var(--card-emerald)"], ["2025", inr(a), "oklch(0.7 0.02 260)"]], f: future ? "from each source's schedule" : `${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(0)}% on last year`, w: 230 });
    return `<div class="mcol hov${k === L.NOW_KEY ? " nowcol" : ""}" tabindex="0"><div style="flex:1"></div><div class="mval${future ? " muted" : ""}" style="color:${future ? "" : d >= 0 ? "var(--positive)" : "var(--negative)"}">${future ? "exp." : `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(0)}%`}</div><div style="display:flex;gap:3px;align-items:flex-end"><div class="mseg" style="flex:1;height:${Math.max(3, a * scale)}px;background:oklch(0.82 0.012 260)"></div>${future ? `<div class="mseg ghost" style="flex:1;--c:var(--card-emerald);height:${Math.max(6, b * scale)}px"></div>` : `<div class="mseg rt" style="flex:1;height:${Math.max(3, b * scale)}px;background:${L.fill("emerald", 180)}"></div>`}</div><div class="mlab${k === L.NOW_KEY ? " now" : ""}">${L.monName(k)}</div>${tip(card2, { w: 230, x: "c", y: "up" })}</div>`;
  }).join("");
  const bars = `<div class="mb" style="height:${hh + 70}px;gap:10px;padding-left:0">${cols}</div><div class="row" style="gap:16px;flex-wrap:wrap"><span class="lg"><i style="background:var(--card-emerald)"></i>2026</span><span class="lg"><i style="background:oklch(0.82 0.012 260)"></i>2025</span><span class="lg"><i class="dash"></i>Expected</span></div>`;
  return { sv, foot, bars };
}

export function yoyCardSw({ w = 700, h = 270, title = "This year, and last" } = {}) {
  const t = tgl("i4", "yoy", [["tot", "Running total"], ["mon", "Month by month"]]);
  const lines = P.yoyCard({ w, h, title }).replace(/^<section[^>]*>/, "").replace(/<\/section>$/, "");
  const at = lines.indexOf('<svg class="chart"'), end = lines.indexOf("</svg>", at) + 6;
  const sv = lines.slice(at, end);
  const foot = lines.slice(end);
  const hh = h - 44, scale = hh / 400000;
  const cols = L.YEAR.map((k, i) => {
    const k25 = `2025-${k.slice(5)}`, a = L.monthReceived(k25), future = k > L.NOW_KEY, b = future ? L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k).reduce((x, u) => x + u.amount, 0) : L.monthReceived(k), d = a ? ((b - a) / a) * 100 : 0;
    const card2 = hc({ h: L.monYear(k), t: inr(b), d: `${inr(a)} in ${monName25(k)}`, rows: [["2026" + (future ? " (expected)" : ""), inr(b), "var(--card-emerald)"], ["2025", inr(a), "oklch(0.7 0.02 260)"]], f: future ? "from each source's schedule" : `${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(0)}% on last year`, w: 230 });
    return `<div class="mcol hov${k === L.NOW_KEY ? " nowcol" : ""}" tabindex="0"><div style="flex:1"></div><div class="mval${future ? " muted" : ""}" style="color:${future ? "" : d >= 0 ? "var(--positive)" : "var(--negative)"}">${future ? "exp." : `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(0)}%`}</div><div style="display:flex;gap:3px;align-items:flex-end"><div class="mseg" style="flex:1;height:${Math.max(3, a * scale)}px;background:oklch(0.82 0.012 260)"></div>${future ? `<div class="mseg ghost" style="flex:1;--c:var(--card-emerald);height:${Math.max(6, b * scale)}px"></div>` : `<div class="mseg rt" style="flex:1;height:${Math.max(3, b * scale)}px;background:${L.fill("emerald", 180)}"></div>`}</div><div class="mlab${k === L.NOW_KEY ? " now" : ""}">${L.monName(k)}</div>${tip(card2, { w: 230, x: "c", y: "up" })}</div>`;
  }).join("");
  const bars = `<div class="mb" style="height:${hh + 70}px;gap:10px;padding-left:0">${cols}</div><div class="row" style="gap:16px;flex-wrap:wrap"><span class="lg"><i style="background:var(--card-emerald)"></i>2026</span><span class="lg"><i style="background:oklch(0.82 0.012 260)"></i>2025</span><span class="lg"><i class="dash"></i>Expected</span></div>`;
  const head = `<div class="card-h"><div class="card-t">${title}<small>money received, month by month or adding up</small></div>${t.ui}</div>`;
  return card(`${t.css}${t.radios}${head}<div class="v-yoy-tot" style="--d:flex;flex:1;flex-direction:column;gap:16px"><div style="display:flex;flex-direction:column;gap:16px;flex:1">${sv}${foot}</div></div><div class="v-yoy-mon" style="--d:flex;flex:1;flex-direction:column;justify-content:space-between;gap:16px">${bars}</div>`);
}
const monName25 = (k) => `${L.monName(k)} 2025`;
