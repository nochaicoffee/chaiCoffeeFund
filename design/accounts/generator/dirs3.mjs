// Directions J–N: J Change ladder, K Money diary, L T-accounts, M Balance slips, N Stacks.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as U from "./uniq.mjs";
const { inr, signed, inrS, fmt, fmtY, fmtDow, monName, monFull, I, btn, iconBtn, rings, grad, mono, desktop, phone, ringCircles } = L;
const { IDS, FACTS, ORDER, panes } = P;

const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const card = (inner, style = "") => `<section class="card glass" style="${style}">${inner}</section>`;
const head = (title, sub = "", right = "") => `<div class="card-h"><span class="card-t">${title}${sub ? `<small>${sub}</small>` : ""}</span>${right}</div>`;
const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const ACTIVE = ORDER.filter((a) => L.isOn(a));
const prevKey = (key) => L.addMonthsUTC(`${key}-01`, -1).slice(0, 7);

// ================= J · Change ladder =================
// The page is about what moved: every account's change as a bar either side of zero, for the period you pick.
const PERIODS = [["last", "Since last balance"], ["month", "This month"], ["year", "Since Jan 1"]];
function changeOf(id, per) {
  const f = FACTS[id];
  if (id === "all") { if (per === "year") return { from: L.yearStart(), to: L.TOTAL, d: L.sinceJan(), label: "Jan 1" }; if (per === "month") { const m = L.monthFlows(L.monthKey(L.TODAY)); return { from: m.start, to: m.end, d: m.delta, label: "Sep 30" }; } const d = ACTIVE.reduce((t, a) => t + (FACTS[a.id].chg ?? 0), 0); return { from: L.TOTAL - d, to: L.TOTAL, d, label: "each one's last" }; }
  const now = f.on ? f.balance : 0;
  if (per === "year") { const s = L.yearStart(id); return { from: s, to: now, d: now - s, label: "Jan 1" }; }
  if (per === "month") { const s = L.atMonth(id, prevKey(L.monthKey(L.TODAY))) ?? 0; return { from: s, to: now, d: now - s, label: "Sep 30" }; }
  return f.prev ? { from: f.prev.balance, to: L.latest(id).balance, d: f.chg, label: fmt(f.prev.date) } : { from: 0, to: now, d: 0, label: "—" };
}
function ladder(prefix, per, { ph = false } = {}) {
  const rows = [...ORDER].map((a) => ({ a, f: FACTS[a.id], c: changeOf(a.id, per) })).sort((x, y) => y.c.d - x.c.d);
  const max = Math.max(...rows.map((r) => Math.abs(r.c.d)), 1);
  const all = changeOf("all", per);
  const bar = (d, color, hatch = false) => { const wpct = (Math.abs(d) / max) * 50; return `<div style="position:relative;height:${ph ? 14 : 18}px"><span style="position:absolute;left:50%;top:-6px;bottom:-6px;width:1.5px;background:var(--fg);opacity:0.35"></span><span style="position:absolute;top:0;bottom:0;${d >= 0 ? `left:50%` : `right:50%`};width:${Math.max(wpct, 0.6)}%;border-radius:${d >= 0 ? "0 8px 8px 0" : "8px 0 0 8px"};background:${hatch ? "repeating-linear-gradient(135deg, var(--warning) 0 3px, var(--warning-tint) 3px 6px)" : color}"></span></div>`; };
  const row = (r) => { const pct = r.c.from ? Math.round((r.c.d / r.c.from) * 1000) / 10 : 0; return `<label for="${prefix}-sel-${r.a.id}" class="acm ac-${r.a.id} lr lr-${r.a.id}" style="display:grid;grid-template-columns:${ph ? "100px 1fr 64px" : "220px 1fr 150px 210px 64px"};gap:${ph ? 8 : 16}px;align-items:center;padding:${ph ? "8px 6px" : "10px 12px"};border-radius:12px;cursor:pointer;transition:background 200ms,opacity 260ms"><span class="row" style="gap:9px;min-width:0">${mono(r.a, ph ? 22 : 28)}<b style="font-size:${ph ? 12 : 13.5}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph ? r.a.bank.split(" ")[0] : r.a.name}</b></span>${bar(r.c.d, r.c.d >= 0 ? `var(--card-${r.a.color})` : `color-mix(in srgb, var(--card-${r.a.color}) 55%, white)`, r.f.stale && per !== "year")}<b class="num" style="font-size:${ph ? 12 : 15}px;text-align:${ph ? "right" : "left"};color:${r.c.d > 0 ? "var(--positive)" : r.c.d < 0 ? "var(--negative)" : "var(--muted)"}">${r.c.d ? signed(r.c.d) : "No change"}</b>${ph ? "" : `<span class="card-note" style="font-size:12px">${inr(r.c.from)} → <b style="color:var(--fg)">${inr(r.c.to)}</b>${r.f.stale && per !== "year" ? ` · <span style="color:var(--warning-text)">read ${fmt(r.f.asOf)}</span>` : !r.f.on ? " · closed" : ""}</span><span class="pill ${r.c.d >= 0 ? "pill-on" : "pill-off"}" style="justify-content:center">${pct > 0 ? "+" : ""}${pct}%</span>`}</label>`; };
  const total = `<label for="${prefix}-sel-all" class="lr lr-all" style="display:grid;grid-template-columns:${ph ? "100px 1fr 64px" : "220px 1fr 150px 210px 64px"};gap:${ph ? 8 : 16}px;align-items:center;padding:${ph ? "10px 6px" : "12px"};border-radius:14px;cursor:pointer;background:var(--fill);margin-bottom:6px"><span class="row" style="gap:9px">${L.allMono(ph ? 22 : 28)}<b style="font-size:${ph ? 12.5 : 14}px">All accounts</b></span><div style="position:relative;height:${ph ? 18 : 24}px"><span style="position:absolute;left:50%;top:-6px;bottom:-6px;width:1.5px;background:var(--fg);opacity:0.35"></span><span style="position:absolute;top:0;bottom:0;${all.d >= 0 ? "left:50%" : "right:50%"};width:${Math.min(50, (Math.abs(all.d) / max) * 50)}%;border-radius:${all.d >= 0 ? "0 10px 10px 0" : "10px 0 0 10px"};background:${grad("emerald", 90)}"></span></div><b class="num" style="font-size:${ph ? 13 : 17}px;text-align:${ph ? "right" : "left"};color:${all.d >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(all.d)}</b>${ph ? "" : `<span class="card-note" style="font-size:12px">${inr(all.from)} → <b style="color:var(--fg)">${inr(all.to)}</b></span><span class="pill pill-ink" style="justify-content:center">${all.from ? `${all.d >= 0 ? "+" : ""}${Math.round((all.d / all.from) * 1000) / 10}%` : ""}</span>`}</label>`;
  return `${total}${rows.map(row).join("")}${ph ? "" : `<div style="display:grid;grid-template-columns:220px 1fr 150px 210px 64px;gap:16px;padding:6px 12px 0"><span></span><div class="between" style="font-size:11px;font-weight:700;color:var(--muted)"><span>went down</span><span>went up</span></div></div>`}`;
}
function movers() {
  const rows = ACTIVE.map((a) => ({ a, f: FACTS[a.id], d: L.sinceJan(a.id), p: L.sinceJan(a.id) / (L.yearStart(a.id) || 1) }));
  const up = rows.reduce((m, r) => (r.d > m.d ? r : m)), down = rows.reduce((m, r) => (r.d < m.d ? r : m));
  const falls = (id) => L.YEAR.filter((k) => (L.atMonth(id, k) ?? 0) < (L.atMonth(id, prevKey(k)) ?? 0)).length;
  const steady = rows.reduce((m, r) => (falls(r.a.id) < falls(m.a.id) ? r : m));
  const jumps = rows.map((r) => { const ks = L.YEAR.map((k) => ({ k, v: (L.atMonth(r.a.id, k) ?? 0) - (L.atMonth(r.a.id, prevKey(k)) ?? 0) })); const b = ks.reduce((m, x) => (Math.abs(x.v) > Math.abs(m.v) ? x : m)); return { ...r, jump: b }; });
  const big = jumps.reduce((m, r) => (Math.abs(r.jump.v) > Math.abs(m.jump.v) ? r : m));
  const tile = (k, r, note, color) => `<label for="j-sel-${r.a.id}" class="glass" style="cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:16px 18px;border-radius:20px"><span class="th">${k}</span><span class="row" style="gap:8px">${mono(r.a, 22)}<b style="font-size:13px">${r.a.name}</b></span><b style="font-size:19px;font-weight:800;color:${color}">${note}</b><span style="color:var(--card-${r.a.color})">${P.spark(r.a.id, { w: 300, h: 34, stroke: "currentColor", width: 1.8, dots: true })}</span></label>`;
  return `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${tile("Rose the most this year", up, signed(up.d), "var(--positive)")}${tile("Fell the most this year", down, signed(down.d), "var(--negative)")}${tile("Steadiest", steady, falls(steady.a.id) ? `${falls(steady.a.id)} falls this year` : "Never fell this year", "var(--fg)")}${tile(`Biggest month · ${monFull(big.jump.k)}`, big, signed(big.jump.v), big.jump.v >= 0 ? "var(--positive)" : "var(--negative)")}</div>`;
}
function changeColumns({ w = 1368, h = 340, ph = false } = {}) {
  const keys = L.YEAR, padL = ph ? 30 : 56, padR = 10, padT = 22, padB = 30;
  const d = keys.map((k) => ACTIVE.concat(L.CLOSED).map((a) => ({ a, v: (L.atMonth(a.id, k) ?? 0) - (L.atMonth(a.id, prevKey(k)) ?? 0) })));
  const ups = d.map((m) => m.filter((x) => x.v > 0).reduce((t, x) => t + x.v, 0)), downs = d.map((m) => m.filter((x) => x.v < 0).reduce((t, x) => t + x.v, 0));
  const top = Math.max(...ups) * 1.1, bot = Math.min(...downs) * 1.1;
  const Y = (v) => padT + ((top - v) / (top - bot)) * (h - padT - padB), slot = (w - padL - padR) / keys.length, bw = Math.min(56, slot * 0.56), X = (i) => padL + slot * i + slot / 2;
  const cols = d.map((m, i) => { let up = 0, dn = 0; return m.map((x) => { if (!x.v) return ""; const y0 = x.v > 0 ? Y(up + x.v) : Y(dn), y1 = x.v > 0 ? Y(up) : Y(dn + x.v); if (x.v > 0) up += x.v; else dn += x.v; return `<rect class="acm ac-${x.a.id}" x="${X(i) - bw / 2}" y="${y0.toFixed(1)}" width="${bw}" height="${Math.max(1, y1 - y0).toFixed(1)}" fill="${x.v > 0 ? `var(--card-${x.a.color})` : `color-mix(in srgb, var(--card-${x.a.color}) 50%, white)`}" stroke="var(--surface)" stroke-width="1"></rect>`; }).join(""); }).join("");
  const net = d.map((m) => m.reduce((t, x) => t + x.v, 0));
  const line = net.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Each month's change by account"><line x1="${padL}" x2="${w - padR}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--fg)" stroke-opacity="0.4"></line>${[top * 0.8, bot * 0.8].map((v) => `<text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${v > 0 ? "+" : "−"}${inrS(Math.abs(v))}</text>`).join("")}${cols}<path class="acm-all" d="${line}" fill="none" stroke="var(--fg)" stroke-width="1.6" stroke-dasharray="4 3"></path>${net.map((v, i) => `<g class="acm-all"><circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="var(--surface)" stroke="var(--fg)" stroke-width="1.8"></circle>${ph ? "" : `<text x="${X(i)}" y="${Y(v) + (v >= 0 ? -10 : 18)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="${v >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(v)}</text>`}</g>`).join("")}${keys.map((k, i) => `<text class="axis-t" x="${X(i)}" y="${h - 8}" text-anchor="middle">${monName(k)}</text>`).join("")}</svg>`;
}
const jSel = (dsel, id) => `${dsel} .lr-${id} { background: var(--accent-tint); }`;
function ladderCard(prefix, { ph = false } = {}) {
  const radios = PERIODS.map(([k], i) => `<input type="radio" class="pk-in" name="${prefix}-per" id="${prefix}-per-${k}"${k === "year" ? " checked" : ""}>`).join("");
  const d = `.${prefix}dir`;
  const css = `<style>${d} .lp { display: none; } ${PERIODS.map(([k]) => `${d}:has(#${prefix}-per-${k}:checked) .lp-${k} { display: block; } ${d}:has(#${prefix}-per-${k}:checked) label[for="${prefix}-per-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join(" ")}</style>`;
  const sw = `<span class="seg">${PERIODS.map(([k, l]) => `<label for="${prefix}-per-${k}" class="seg-i" style="cursor:pointer${ph ? ";padding:6px 9px;font-size:11px" : ""}">${ph ? l.replace("Since last balance", "Last time").replace("Since Jan 1", "This year") : l}</label>`).join("")}</span>`;
  return `${css}${radios}<section class="card glass" style="gap:12px${ph ? ";padding:14px" : ""}">${head(ph ? "What moved" : "What moved", ph ? "" : "every account's change, either side of zero · pick one for what explains it", sw)}${PERIODS.map(([k]) => `<div class="lp lp-${k}">${ladder(prefix, k, { ph })}</div>`).join("")}<div style="border-top:1px solid var(--divider);padding-top:12px">${panes((f) => why(f, { ph }))}</div></section>`;
}
function why(f, { ph = false } = {}) {
  const list = L.YEAR.flatMap((k) => L.monthFlows(k, f.all ? null : f.id).list), other = L.YEAR.reduce((t, k) => t + L.monthFlows(k, f.all ? null : f.id).other, 0);
  const parts = [["Came in", L.sumIn(list), "var(--positive)"], ["Card bills", -L.sumKind(list, "card"), "var(--card-sapphire)"], ["Subscriptions", -L.sumKind(list, "sub"), "var(--card-ruby)"], ["EMIs", -L.sumKind(list, "emi"), "var(--card-copper)"], ["Shares", -L.sumKind(list, "invest"), "var(--card-violet)"], ["Not recorded", other, "var(--muted)"]].filter((x) => x[1]);
  return `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="card-note" style="font-size:12.5px;margin-right:4px"><b style="color:var(--fg)">${f.all ? "All accounts" : f.name}</b> this year, explained:</span>${parts.map(([k, v, c]) => `<span class="chip" style="background:var(--fill);gap:7px"><i style="background:${c}"></i>${k}<b style="font-weight:800">${signed(v)}</b></span>`).join("")}${L.derivedTag("Worked out")}</div>`;
}
export function jDesktop() {
  const pk = P.picker("j", jSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${ladderCard("j")}${movers()}${card(`${head("Change by month", "each month's rises above the line and falls below, by account · the dots are the net change")}${changeColumns()}`, "gap:12px")}${P.historyCard("j", { n: 4 })}${pk.close}` });
}
export function jPhone() {
  const pk = P.picker("jp", jSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${ladderCard("jp", { ph: true })}${card(`${head("Change by month")}${changeColumns({ w: 330, h: 220, ph: true })}`, "padding:16px;gap:10px")}${P.historyCard("jp", { n: 4, ph: true })}${pk.close}` });
}

// ================= K · Money diary =================
// A feed of what happened, newest first, in plain sentences: balances you recorded, income, bills, EMIs, and what's overdue.
const KICON = { snap: I.check(13), income: I.down(13), card: I.cards(13), sub: I.subs(13), emi: I.loans(13), invest: I.invest(13), other: I.link(12), stale: I.clock(13) };
function events(from = "2026-09-29") {
  const out = [];
  for (const a of ACTIVE) {
    const e = U.entries(a.id, L.snapsOf(a.id).filter((s) => s.date <= from).at(-1)?.date ?? from);
    for (const r of e.rows) {
      if (r.date <= from) continue;
      if (r.kind === "snap") { const s = L.snapsOf(a.id), i = s.findIndex((x) => x.date === r.date), p = s[i - 1]; out.push({ date: r.date, a, kind: "snap", text: `You recorded <b>${a.name}</b> at <b>${inr(r.bal)}</b>${p ? `, ${r.bal >= p.balance ? "up" : "down"} ${inr(Math.abs(r.bal - p.balance))} since ${fmt(p.date)}` : ""}.`, amount: r.bal }); }
      else if (r.kind === "other") out.push({ date: r.date, a, kind: "other", text: `<b>${inr(r.wd ?? r.dep)}</b> ${r.wd ? "went out of" : "came into"} ${a.name} that nothing in the app explains: UPI, transfers or cash.`, amount: r.wd ? -r.wd : r.dep, derived: true });
      else if (r.kind === "income") out.push({ date: r.date, a, kind: "income", text: `<b>${r.text}</b> landed in ${a.name}.`, amount: r.dep });
      else out.push({ date: r.date, a, kind: r.kind, ref: r.ref, text: `<b>${r.text}</b> ${r.kind === "card" ? "paid" : r.kind === "invest" ? "settled" : "charged"} from ${a.name}.`, amount: -r.wd });
    }
  }
  for (const a of L.STALE) out.push({ date: L.TODAY, a, kind: "stale", text: `<b>${a.name}</b> hasn't been updated for <b>${L.daysBetween(L.latest(a.id).date, L.TODAY)} days</b>. Its ${inr(L.latest(a.id).balance)} is still counted.`, action: true });
  const rank = { stale: 0, snap: 1, other: 2 };
  return out.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : (rank[x.kind] ?? 3) - (rank[y.kind] ?? 3)));
}
export function feed(prefix, { ph = false, limit = 40 } = {}) {
  const ev = events().slice(0, limit);
  const days = [...new Set(ev.map((e) => e.date))];
  const color = (e) => (e.kind === "stale" ? "var(--warning)" : e.kind === "income" ? "var(--positive)" : e.kind === "snap" ? `var(--card-${e.a.color})` : e.kind === "card" ? `var(--card-${L.CARDS[e.ref]?.color ?? "sapphire"})` : e.kind === "other" ? "var(--muted)" : L.KINDS[e.kind]?.color ?? "var(--muted)");
  const row = (e) => `<label for="${prefix}-sel-${e.a.id}" class="acm ac-${e.a.id}" style="display:grid;grid-template-columns:30px 1fr ${ph ? "" : "120px"};gap:12px;align-items:center;padding:9px 0;cursor:pointer"><span style="width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${e.kind === "other" ? "var(--fill)" : `color-mix(in srgb, ${color(e)} 16%, var(--surface))`};color:${color(e)};${e.kind === "other" ? "border:1px dashed var(--fill-strong)" : ""}">${KICON[e.kind]}</span><span style="font-size:${ph ? 12.5 : 13.5}px;line-height:1.5;font-weight:500;color:${e.derived ? "var(--muted)" : "var(--fg)"}">${e.text}${e.derived ? ` <span class="pill pill-derived" style="padding:1px 7px;font-size:10px">worked out</span>` : ""}${e.action ? ` <span class="btn btn-primary btn-xs" style="margin-left:4px">Update</span>` : ""}${ph && e.amount && e.kind !== "snap" ? ` <b class="num" style="color:${e.amount > 0 ? "var(--positive)" : "var(--fg)"}">${signed(e.amount)}</b>` : ""}</span>${ph ? "" : `<b class="num" style="text-align:right;font-size:13.5px;color:${e.kind === "snap" ? "var(--fg)" : e.amount > 0 ? "var(--positive)" : e.kind === "other" ? "var(--muted)" : "var(--fg)"}">${e.kind === "stale" ? "" : e.kind === "snap" ? inr(e.amount) : signed(e.amount)}</b>`}</label>`;
  return days.map((d) => `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "120px 1fr"};gap:${ph ? 4 : 18}px;padding:${ph ? "8px 0" : "12px 0"};border-top:1px solid var(--divider)"><div style="display:flex;${ph ? "align-items:center;justify-content:space-between" : "flex-direction:column;gap:4px"}"><b style="font-size:13px">${d === L.TODAY ? "Today" : fmtDow(d)}</b><span class="sub2">total ${inr(L.totalOn(d))}</span></div><div>${ev.filter((e) => e.date === d).map(row).join("")}</div></div>`).join("");
}
function thread({ w = 860, h = 150, ph = false } = {}) {
  const from = "2026-09-29", pts = []; for (let d = from; d <= L.TODAY; d = L.addDays(d, 1)) pts.push({ d, v: L.totalOn(d) });
  const vals = pts.map((p) => p.v), hi = Math.max(...vals), lo = Math.min(...vals), padL = 8, padR = 8, padT = 16, padB = 22;
  const t = (iso) => Date.parse(`${iso}T00:00:00Z`), X = (d) => padL + ((t(d) - t(from)) / (t(L.TODAY) - t(from))) * (w - padL - padR), Y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (h - padT - padB);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const pins = events().filter((e) => e.kind !== "other" && e.kind !== "stale").map((e) => `<circle class="acm ac-${e.a.id}" cx="${X(e.date)}" cy="${Y(L.totalOn(e.date))}" r="${e.kind === "snap" ? 4.5 : 3.5}" fill="${e.kind === "snap" ? "var(--surface)" : e.kind === "income" ? "var(--positive)" : "var(--card-sapphire)"}" stroke="${e.kind === "snap" ? `var(--card-${e.a.color})` : "var(--surface)"}" stroke-width="2"></circle>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Your total, day by day, with each event on it"><path d="${line} L${X(L.TODAY)},${h - padB} L${padL},${h - padB} Z" fill="url(#a-emerald)"></path><path d="${line}" fill="none" stroke="var(--accent-text)" stroke-width="2"></path>${pins}${["2026-09-30", "2026-10-07", "2026-10-14", "2026-10-21"].map((d) => `<text class="axis-t" x="${X(d)}" y="${h - 6}" text-anchor="middle">${fmt(d)}</text>`).join("")}${ph ? "" : `<text x="${X(L.TODAY)}" y="${Y(vals.at(-1)) - 10}" text-anchor="end" font-size="11" font-weight="800" fill="var(--fg)">${inr(vals.at(-1))}</text>`}</svg>`;
}
function nowCard(prefix, { ph = false } = {}) {
  const rows = IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="kn kn-${id}" style="display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:center;padding:8px 8px;border-radius:10px;cursor:pointer">${f.all ? L.allMono(26) : mono(f.a, 26)}<span style="min-width:0"><b style="display:block;font-size:13px">${f.short}</b><span class="sub2">${f.all ? `${f.count} active` : !f.on ? "closed" : f.stale ? `<span style="color:oklch(0.9 0.11 85)">${L.daysBetween(f.asOf, L.TODAY)} days since an update</span>` : `updated ${fmt(f.asOf)}`}</span></span><b class="num" style="font-size:13px">${f.on ? inr(f.balance) : "₹0"}</b></label>`; }).join("");
  return P.greenStage(`${head("Now", "pick one to follow it in the diary")}<div style="display:flex;flex-direction:column;margin:0 -8px">${rows}</div><div class="row foot" style="gap:8px">${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11), style: "background:white;color:var(--card-emerald-to)" })}${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div>`, { ph, gap: 12 });
}
export function comingUp({ ph = false } = {}) {
  const axis = FACTS.axis;
  const items = [
    { d: "2026-11-01", icon: I.down(13), color: "var(--positive)", text: "<b>Salary</b> is due in HDFC Salary", amt: "+₹1,38,500", note: "the usual monthly amount" },
    { d: "2026-11-05", icon: I.loans(13), color: "var(--negative)", text: "<b>Car loan EMI</b> goes out of Axis EMI", amt: "₹22,450", note: `<span style="color:var(--negative);font-weight:700">Axis EMI has ${inr(axis.balance)}: ${inr(22450 - axis.balance)} short</span>` },
    { d: "2026-11-12", icon: I.cards(13), color: "var(--card-teal)", text: "<b>Millennia bill</b> usually paid from HDFC Salary", amt: "about ₹38k", note: "from the card's usual account" },
  ];
  return card(`${head("Coming up", "from your loan schedule, income and cards")}${items.map((x) => `<div style="display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid var(--divider)"><span style="width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${x.color} 14%, var(--surface));color:${x.color}">${x.icon}</span><span style="font-size:13px;line-height:1.45;font-weight:500">${x.text}<span class="sub2" style="white-space:normal">${fmtDow(x.d)} · ${x.note}</span></span><b class="num" style="font-size:13px">${x.amt}</b></div>`).join("")}`, ph ? "padding:16px;gap:6px" : "gap:6px");
}
const kSel = (dsel, id) => `${dsel} .kn-${id} { background: ${id === "all" ? "oklch(1 0 0 / 0.16)" : P.selTint(id, 60)}; box-shadow: inset 4px 0 0 ${P.selSoft(id)}; }`;
export function kDesktop() {
  const pk = P.picker("k", kSel);
  const filters = `<span class="row" style="gap:6px">${["Everything", "Balances", "Income", "Bills", "EMIs", "Shares"].map((x, i) => `<span class="chip${i === 0 ? " on" : ""}">${x}</span>`).join("")}</span>`;
  const diary = card(`${head("Money diary", "what happened, newest first · the line is your total, with each event on it", filters)}${thread()}${feed("k")}<div class="between" style="padding-top:12px;border-top:1px solid var(--divider)"><span class="card-note">Since Sep 30 · ${events().length} entries</span><span class="link">Earlier ${I.chev(11)}</span></div>`, "gap:10px");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}<div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:20px;align-items:stretch">${diary}<div class="stack-col">${nowCard("k")}${comingUp()}${card(`${head("October so far", "worked out")}${(() => { const m = L.monthFlows("2026-10"); return [["Came in", signed(m.in)], ["Went to bills and more", signed(-m.out)], ["Not recorded", signed(m.other)], ["Change", signed(m.delta)]].map(([k, v]) => `<div class="between" style="padding:7px 0;border-bottom:1px solid var(--divider);font-size:13px"><span class="muted" style="font-weight:600">${k}</span><b class="num">${v}</b></div>`).join(""); })()}`, "gap:6px")}${P.outCard("k")}</div></div>${pk.close}` });
}
export function kPhone() {
  const pk = P.picker("kp", kSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${comingUp({ ph: true })}${card(`${head("Money diary")}${thread({ w: 330, h: 120, ph: true })}${feed("kp", { ph: true, limit: 16 })}`, "padding:16px;gap:8px")}${nowCard("kp", { ph: true })}${pk.close}` });
}

// ================= L · T-accounts =================
// Each account as a ledger T for one month: brought forward and what came in on the left, what went out and carried forward on the right.
export function tAccount(prefix, a, key, { ph = false } = {}) {
  const f = FACTS[a.id], m = L.monthFlows(key, a.id), bf = m.start, cf = m.end;
  const ins = Object.values(m.list.filter((x) => L.KINDS[x.kind].dir === "in").reduce((o, x) => { (o[x.label] ??= { label: x.label, v: 0 }).v += x.amount; return o; }, {}));
  const outs = Object.values(m.list.filter((x) => L.KINDS[x.kind].dir === "out").reduce((o, x) => { (o[x.label] ??= { label: x.label, v: 0 }).v += x.amount; return o; }, {}));
  const left = [{ label: "Brought forward", v: bf, em: true }, ...ins, ...(m.other > 0 ? [{ label: "Not recorded", v: m.other, other: true }] : [])];
  const right = [...outs, ...(m.other < 0 ? [{ label: "Not recorded", v: -m.other, other: true }] : []), { label: "Carried forward", v: cf, em: true }];
  const total = left.reduce((t, x) => t + x.v, 0);
  const n = Math.max(left.length, right.length);
  const line = (x) => (x ? `<div class="between" style="padding:5px 0;font-size:12.5px;gap:8px;${x.other ? "color:var(--muted);font-style:italic" : ""}"><span style="font-weight:${x.em ? 800 : 600};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.label}</span><b style="${MONO};font-size:12px;font-weight:${x.em ? 800 : 600}">${Math.round(x.v).toLocaleString("en-IN")}</b></div>` : `<div style="padding:5px 0;font-size:12.5px">&nbsp;</div>`);
  const col = (arr) => Array.from({ length: n }, (_, i) => line(arr[i])).join("");
  const staleNote = f.stale && key > L.monthKey(f.asOf) ? `<span class="pill pill-stale" style="font-size:10px">${I.clock(9)} No reading this month · carried</span>` : "";
  return `<label for="${prefix}-sel-${a.id}" class="tac tac-${a.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:16px 18px;border-radius:20px;background:var(--surface);border:1px solid var(--surface-line);box-shadow:var(--soft-shadow);transition:box-shadow 200ms">
    <div class="between"><span class="row" style="gap:9px;min-width:0">${mono(a, 26)}<span style="min-width:0"><b style="display:block;font-size:13.5px">${a.name}</b><span class="sub2">${a.bank} · ${monFull(key)}</span></span></span>${staleNote}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:2.5px solid var(--fg);flex:1 1 auto"><div style="padding:6px 12px 8px 0;border-right:2.5px solid var(--fg)"><span class="th" style="display:block;text-align:center;margin-bottom:2px">In</span>${col(left)}</div><div style="padding:6px 0 8px 12px"><span class="th" style="display:block;text-align:center;margin-bottom:2px">Out</span>${col(right)}</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px"><b style="${MONO};font-size:12.5px;text-align:right;border-top:1px solid var(--fg);border-bottom:3px double var(--fg);padding:3px 0">${Math.round(total).toLocaleString("en-IN")}</b><b style="${MONO};font-size:12.5px;text-align:right;border-top:1px solid var(--fg);border-bottom:3px double var(--fg);padding:3px 0">${Math.round(total).toLocaleString("en-IN")}</b></div>
    <div class="between" style="padding-top:4px"><span class="card-note">${f.on ? `Balance ${inr(f.balance)} · read ${fmt(f.asOf)}` : "closed"}</span><span class="btn btn-soft btn-xs">${I.check(10)} Update</span></div></label>`;
}
export function trialBalance(key, { ph = false, dark = false } = {}) {
  const m = L.monthFlows(key), up = dark ? "var(--on-card-lime)" : "var(--positive)";
  const cell = (k, v, s, c = "var(--fg)") => `<div class="hstat"><span class="k">${k}</span><b class="v" style="font-size:${ph ? 16 : 22}px;color:${c}">${v}</b><span class="s">${s}</span></div>`;
  const op = (x) => `<span style="font-size:${ph ? 16 : 22}px;font-weight:800;color:var(--muted);align-self:center">${x}</span>`;
  return `<div style="display:flex;${ph ? "flex-wrap:wrap;gap:12px" : "gap:22px;align-items:flex-start"}">${cell("Brought forward", inr(m.start), "Aug 31, every account")}${op("+")}${cell("Came in", inr(m.in), "recorded income", up)}${op("−")}${cell("Went out", inr(m.out), "bills, EMIs, shares")}${op(m.other < 0 ? "−" : "+")}${cell("Not recorded", inr(Math.abs(m.other)), "what closes the gap", "var(--muted)")}${op("=")}${cell("Carried forward", inr(m.end), "Sep 30, every account")}</div>`;
}
export function ledgerColumns(f, { w = 1368, h = 300, ph = false } = {}) {
  const keys = L.YEAR, padL = ph ? 30 : 56, padR = 10, padT = 18, padB = 28;
  const ms = keys.map((k) => L.monthFlows(k, f.all ? null : f.id));
  const top = Math.max(...ms.map((m) => m.in + Math.max(m.other, 0)), 1) * 1.1, bot = -Math.max(...ms.map((m) => m.out + Math.max(-m.other, 0)), 1) * 1.1;
  const Y = (v) => padT + ((top - v) / (top - bot)) * (h - padT - padB), slot = (w - padL - padR) / keys.length, bw = Math.min(40, slot * 0.36), X = (i) => padL + slot * i + slot / 2;
  const bars = ms.map((m, i) => { const up = m.in, upO = Math.max(m.other, 0), dn = m.out, dnO = Math.max(-m.other, 0); return `<rect x="${X(i) - bw - 2}" y="${Y(up)}" width="${bw}" height="${Y(0) - Y(up)}" rx="5" fill="var(--heat-3)"></rect>${upO ? `<rect x="${X(i) - bw - 2}" y="${Y(up + upO)}" width="${bw}" height="${Y(up) - Y(up + upO)}" fill="url(#hatch-grey)"></rect>` : ""}<rect x="${X(i) + 2}" y="${Y(0)}" width="${bw}" height="${Y(-dn) - Y(0)}" rx="5" fill="${f.all ? "var(--card-sapphire)" : `var(--card-${f.color})`}"></rect>${dnO ? `<rect x="${X(i) + 2}" y="${Y(-dn)}" width="${bw}" height="${Y(-dn - dnO) - Y(-dn)}" fill="url(#hatch-grey)" stroke="var(--muted)" stroke-opacity="0.4"></rect>` : ""}`; }).join("");
  const net = ms.map((m) => m.delta), line = net.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: in and out by month"><line x1="${padL}" x2="${w - padR}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--fg)" stroke-opacity="0.45"></line>${bars}<path d="${line}" fill="none" stroke="var(--fg)" stroke-width="1.8"></path>${net.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="var(--surface)" stroke="var(--fg)" stroke-width="1.8"></circle>`).join("")}${[top * 0.8, bot * 0.8].map((v) => `<text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${v > 0 ? "+" : "−"}${inrS(Math.abs(v))}</text>`).join("")}${keys.map((k, i) => `<text class="axis-t" x="${X(i)}" y="${h - 8}" text-anchor="middle">${ph && i % 2 ? "" : monName(k)}</text>`).join("")}</svg>`;
}
const lSel = (dsel, id) => `${dsel} .tac-${id} { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5.5px var(--card-${P.hue(id)}), var(--soft-shadow); background: color-mix(in srgb, var(--card-${P.hue(id)}) 5%, var(--surface)); }`;
export function lDesktop() {
  const pk = P.picker("l", lSel), key = "2026-09";
  const tb = P.greenStage(`${head("Trial balance · September 2026", "every account together · the month's books close to the rupee", `<span class="row" style="gap:8px">${L.seg([{ label: "‹ Aug" }, { label: "Sep 2026", on: true }, { label: "Oct so far ›" }])}${L.derivedTag("Worked out")}</span>`)}${trialBalance(key, { dark: true })}`, { gap: 16, pad: "26px 28px" });
  const ts = `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch">${ACTIVE.map((a) => tAccount("l", a, key)).join("")}<div class="addtile" style="min-height:220px;border-radius:20px">${I.plus(16)}Open a new account<span class="card-note">${L.CLOSED.length} closed: ${L.CLOSED.map((a) => a.name).join(", ")}</span></div></div>`;
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${tb}${ts}${card(`${head("In and out, month by month", "green came in, colour went out, hatched is what isn't recorded · the line is the change", P.panes((f) => `<span class="chip" style="gap:8px">${f.all ? L.allMono(18) : mono(f.a, 18)}${f.short}</span>`))}${panes((f) => ledgerColumns(f))}`, "gap:12px")}${pk.close}` });
}
export function lPhone() {
  const pk = P.picker("lp", lSel), key = "2026-09";
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${P.greenStage(`${head("Trial balance", "Sep 2026")}${trialBalance(key, { ph: true, dark: true })}`, { ph: true, gap: 12 })}${ACTIVE.slice(0, 3).map((a) => tAccount("lp", a, key, { ph: true })).join("")}<span class="link" style="align-self:center">2 more accounts ${I.chev(11)}</span>${card(`${head("In and out")}${panes((f) => ledgerColumns(f, { w: 330, h: 200, ph: true }))}`, "padding:16px;gap:10px")}${pk.close}` });
}

// ================= M · Balance slips =================
// Each balance written up like a cheque leaf, amount in words and all; the counterfoils on the left pick the account.
const dateBoxes = (iso) => { const s = `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`; return `<span class="row" style="gap:3px">${[...s].map((c, i) => `<span style="width:22px;height:28px;border:1.5px solid oklch(0.4 0.04 260 / 0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;${MONO};font-size:14px;font-weight:700;margin-left:${i === 2 || i === 4 ? 6 : 0}px">${c}</span>`).join("")}</span>`; };
function slip(f, { ph = false } = {}) {
  const c = f.all ? "emerald" : f.color, amt = f.on ? f.balance : 0, date = f.all ? f.asOf : f.on ? f.asOf : f.closedOn;
  const iv = f.all ? L.monthFlows("2026-10") : f.interval;
  const stamp = f.stale ? `<span style="position:absolute;right:${ph ? 14 : 60}px;top:${ph ? 120 : 110}px;transform:rotate(-12deg);padding:8px 16px;border:3px solid var(--warning-text);border-radius:10px;color:var(--warning-text);${MONO};font-size:${ph ? 13 : 17}px;font-weight:800;letter-spacing:0.1em;opacity:0.85;text-align:center;line-height:1.3">STALE<br><span style="font-size:${ph ? 9 : 11}px;letter-spacing:0.04em">${L.daysBetween(f.asOf, L.TODAY)} DAYS OLD</span></span>` : !f.on ? `<span style="position:absolute;left:8%;right:8%;top:45%;transform:rotate(-8deg);border-top:3px double var(--negative);border-bottom:3px double var(--negative);color:var(--negative);${MONO};font-size:${ph ? 14 : 20}px;font-weight:800;letter-spacing:0.3em;text-align:center;padding:4px 0;opacity:0.75">CANCELLED · CLOSED</span>` : "";
  const micr = `⑈${(f.all ? "000000" : String(L.snapsOf(f.id).length).padStart(6, "0"))}⑈ ${date.replace(/-/g, "").slice(2)}⑆ ${String(Math.round(amt)).padStart(8, "0")}⑈ ${f.all ? "ALL" : f.bank.split(" ")[0].toUpperCase()}`;
  return `<div style="position:relative;isolation:isolate;overflow:hidden;border-radius:${ph ? 16 : 20}px;padding:${ph ? "16px" : "24px 30px 18px"};background:linear-gradient(120deg, color-mix(in srgb, var(--card-${c}) 13%, white), color-mix(in srgb, var(--card-${c}) 5%, white) 60%, color-mix(in srgb, var(--card-${c}) 16%, white));border:1px solid color-mix(in srgb, var(--card-${c}) 30%, transparent);box-shadow:var(--card-shadow);display:flex;flex-direction:column;gap:${ph ? 10 : 14}px">${rings(900, 380, { stroke: `var(--card-${c})`, opacity: 0.12, first: 20, step: 9, dx: -460, dy: -200 })}
    <div class="between" style="align-items:flex-start;gap:12px;flex-wrap:wrap"><span><span style="${MONO};font-size:10.5px;font-weight:700;letter-spacing:0.1em;color:color-mix(in srgb, var(--card-${c}) 80%, black);text-transform:uppercase">chaiCoffeeFund · Balance slip</span><b style="display:block;font-size:${ph ? 16 : 20}px;margin-top:4px">${f.name}</b><span class="sub2">${f.all ? `${f.count} active accounts` : `${f.bank} · ${f.on ? f.type : "Closed"} · ${L.purposeName(f.purpose)}`}</span></span>${ph ? `<b style="${MONO};font-size:13px">${date.split("-").reverse().join("/")}</b>` : dateBoxes(date)}</div>
    <div style="display:grid;grid-template-columns:${ph ? "1fr" : "1fr 250px"};gap:16px;align-items:end"><div style="border-bottom:1.5px solid oklch(0.4 0.04 260 / 0.45);padding-bottom:6px;font-size:${ph ? 14 : 18}px;font-weight:700;font-style:italic;line-height:1.5;font-family:Georgia,'Times New Roman',serif">${U.inWords(amt)}</div><div style="border:1.5px solid oklch(0.4 0.04 260 / 0.55);border-radius:8px;padding:8px 14px;background:oklch(1 0 0 / 0.7);${MONO};font-size:${ph ? 20 : 24}px;font-weight:800;text-align:right">₹ ${Math.round(amt).toLocaleString("en-IN")}/-</div></div>
    <div class="row" style="gap:${ph ? 10 : 24}px;flex-wrap:wrap;font-size:12.5px;font-weight:600;color:var(--muted)">${f.all ? `<span>${signed(f.sinceJan)} since Jan 1</span><span>${inr(iv.out)} out to bills in October · worked out</span>` : f.on ? `<span>${signed(f.chg)} since ${fmt(f.prev.date)}</span>${iv ? `<span>${inr(iv.out)} out to bills since then · worked out</span>` : ""}` : `<span>Closed ${fmtY(f.closedOn)}</span>`}</div>
    <div class="between" style="gap:12px;flex-wrap:wrap"><span style="${MONO};font-size:${ph ? 11 : 15}px;letter-spacing:0.12em;color:oklch(0.3 0.02 260 / 0.75)">${micr}</span><span class="row" style="gap:8px">${P.actions(f).replace(/Update balance(?!s)/, "Write a new slip")}</span></div>${stamp}</div>`;
}
function stubs(prefix, { ph = false } = {}) {
  return IDS.map((id) => { const f = FACTS[id], c = f.all ? "emerald" : f.color; return `<label for="${prefix}-sel-${id}" class="stub stub-${id} on-paper" style="cursor:pointer;position:relative;display:grid;grid-template-columns:6px 1fr;gap:12px;padding:10px 14px 10px 0;border-radius:12px;background:var(--surface);border:1px solid var(--surface-line);${ph ? "min-width:170px" : ""};transition:transform 200ms var(--ease-out), box-shadow 200ms"><span style="border-radius:12px 0 0 12px;background:${grad(c, 180)}"></span><span style="display:flex;flex-direction:column;gap:2px;min-width:0;border-right:2px dotted var(--fill-strong);padding-right:10px"><span class="between"><b style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.short}</b><span style="${MONO};font-size:10.5px;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${f.asOf ? fmt(f.all ? f.asOf : f.on ? f.asOf : f.closedOn) : ""}</span></span><b style="${MONO};font-size:13px">${f.on ? inr(f.balance) : "₹0"}</b><span class="sub2">${f.all ? "all slips" : !f.on ? "cancelled" : f.stale ? `<span style="color:var(--warning-text)">stale</span>` : signed(f.chg)}</span></span></label>`; }).join("");
}
function ribbons({ w = 1368, rowH = 54, ph = false } = {}) {
  const ids = ORDER.map((a) => a.id), dates = []; for (let d = "2026-01-01"; d < L.TODAY; d = L.addDays(d, 5)) dates.push(d); dates.push(L.TODAY);
  const max = Math.sqrt(L.latest("sbi").balance * 1.05), padL = ph ? 70 : 170, padR = ph ? 10 : 120, h = ids.length * rowH + 26;
  const t = (iso) => Date.parse(`${iso}T00:00:00Z`), X = (d) => padL + ((t(d) - t("2026-01-01")) / (t(L.TODAY) - t("2026-01-01"))) * (w - padL - padR);
  const lanes = ids.map((id, r) => { const a = L.acc(id), mid = r * rowH + rowH / 2, half = (v) => (Math.sqrt(v) / max) * (rowH / 2 - 4); const vs = dates.map((d) => L.balanceOn(id, d) ?? 0); const top = vs.map((v, i) => `${X(dates[i]).toFixed(1)},${(mid - half(v)).toFixed(1)}`), bot = vs.map((v, i) => `${X(dates[i]).toFixed(1)},${(mid + half(v)).toFixed(1)}`).reverse(); const f = FACTS[id]; return `<g class="acm ac-${id}"><line x1="${padL}" x2="${w - padR}" y1="${mid}" y2="${mid}" stroke="var(--divider)"></line><polygon points="${top.join(" ")} ${bot.join(" ")}" fill="url(#g-${a.color})"></polygon>${f.stale ? `<rect x="${X(f.asOf)}" y="${mid - half(f.balance) - 1}" width="${X(L.TODAY) - X(f.asOf)}" height="${half(f.balance) * 2 + 2}" fill="url(#hatch)"></rect>` : ""}<text x="${padL - 12}" y="${mid + 4}" text-anchor="end" font-size="${ph ? 10.5 : 12.5}" font-weight="800" fill="var(--fg)">${ph ? a.bank.split(" ")[0] : a.name}</text>${ph ? "" : `<text x="${w - padR + 12}" y="${mid + 4}" font-size="12.5" font-weight="800" fill="var(--fg)">${f.on ? inr(f.balance) : "closed"}</text>`}</g>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Each account as a ribbon, as wide as its balance">${lanes}${L.YEAR.map((k) => `<text class="axis-t" x="${X(`${k}-01`)}" y="${h - 6}" text-anchor="middle">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("")}</svg>`;
}
const mSel = (dsel, id) => `${dsel} .stub-${id} { transform: translateY(8px); box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.6), 0 0 0 6px ${P.selSoft(id)}, var(--soft-shadow); }`;
export function mDesktop() {
  const pk = P.picker("m", mSel);
  const hero = P.greenStage(`${head("Balance slips", "every balance written up like a cheque leaf · the counterfoils pick the account · a balance goes stale, like a cheque")}<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px">${stubs("m")}</div><div class="on-paper" style="position:relative;padding:4px 40px 0">${panes((f) => slip(f))}</div>`, { gap: 16 });
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${card(`${head("Ribbons", "this year · each account a ribbon as wide as its balance (on a square-root scale, so small ones show)")}${ribbons()}`, "gap:12px")}${two(P.outCard("m"), P.historyCard("m", { n: 5, title: "Counterfoils" }))}${pk.close}` });
}
export function mPhone() {
  const pk = P.picker("mp", mSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${P.greenStage(`<div style="display:flex;gap:8px;overflow-x:auto;margin:0 -16px;padding:4px 16px 8px;scrollbar-width:none">${stubs("mp", { ph: true })}</div><div class="on-paper">${panes((f) => slip(f, { ph: true }))}</div>`, { ph: true, gap: 10, pad: "14px 16px" })}${card(`${head("Ribbons")}${ribbons({ w: 330, rowH: 40, ph: true })}`, "padding:16px;gap:10px")}${P.historyCard("mp", { n: 4, ph: true, title: "Counterfoils" })}${pk.close}` });
}

// ================= N · Stacks =================
// Every month's balance as an isometric stack of notes, a row per account: the city your money has built this year.
function stacks(prefix, { w = 1368, ph = false } = {}) {
  const keys = L.YEAR, rows = ORDER.map((a) => a.id), sn = 0.866;
  const cw = ph ? 14 : 40, gap = ph ? 5 : 12, rd = ph ? 14 : 32, rgap = ph ? 6 : 16, maxH = ph ? 110 : 250;
  const stepI = cw + gap, stepJ = rd + rgap, ni = keys.length, nj = rows.length;
  const maxV = Math.max(...rows.flatMap((id) => keys.map((k) => L.atMonth(id, k) ?? 0)));
  const drawW = (ni * stepI + nj * stepJ) * sn + (ph ? 70 : 250);
  const ox = Math.max(ph ? 30 : 60, (w - drawW) / 2) + (nj * stepJ) * sn, oy = maxH + (ph ? 16 : 30);
  const h = Math.ceil(oy + (ni * stepI + nj * stepJ) * 0.5 + (ph ? 26 : 40));
  const pos = (i, j) => [ox + i * stepI * sn - j * stepJ * sn, oy + i * stepI * 0.5 + j * stepJ * 0.5];
  const cells = []; rows.forEach((id, j) => keys.forEach((k, i) => cells.push({ id, k, i, j })));
  cells.sort((a, b) => a.i * stepI + a.j * stepJ - (b.i * stepI + b.j * stepJ));
  const body = cells.map(({ id, k, i, j }) => {
    const a = L.acc(id), f = FACTS[id], v = L.atMonth(id, k) ?? 0, hh = Math.max(1.5, (v / maxV) * maxH), [x, y] = pos(i, j);
    const staleCell = f.stale && k > L.monthKey(f.asOf), closedCell = !f.on && k > L.monthKey(f.closedOn);
    if (closedCell) return U.prism(x, y, cw, rd, 1.5, { top: "var(--fill-strong)", left: "var(--fill)", right: "var(--fill)", cls: `acm ac-${id}` });
    if (staleCell) return U.prism(x, y, cw, rd, hh, { top: "oklch(0.95 0.05 85 / 0.7)", left: "url(#hatch)", right: "url(#hatch)", stroke: "var(--warning)", cls: `acm ac-${id}` });
    return U.prism(x, y, cw, rd, hh, { top: `color-mix(in srgb, var(--card-${a.color}) 62%, white)`, left: `var(--card-${a.color})`, right: `var(--card-${a.color}-from)`, cls: `acm ac-${id}`, bands: ph ? 0 : 8 });
  }).join("");
  // Each row is named where it ends, past this month, where nothing stands in front of it.
  const ends = rows.map((id, j) => { const f = FACTS[id], [x, y] = pos(ni, j), v = L.atMonth(id, keys.at(-1)) ?? 0; return `<g class="acm ac-${id}"><text x="${x + (ph ? 4 : 10)}" y="${y + rd * 0.25 + (ph ? 3 : 4)}" font-size="${ph ? 9.5 : 12.5}" font-weight="800" fill="var(--fg)">${ph ? L.acc(id).bank.split(" ")[0] : L.acc(id).name}${ph ? "" : ` <tspan font-weight="700" fill="${f.stale ? "var(--warning-text)" : "var(--muted)"}">${f.on ? inr(v) : "closed"}${f.stale ? " · carried" : ""}</tspan>`}</text></g>`; }).join("");
  const months = keys.map((k, i) => { const [x, y] = pos(i, nj); return ph && i % 3 ? "" : `<text x="${x + cw * sn * 0.5 - 6}" y="${y + (ph ? 12 : 22)}" text-anchor="middle" font-size="${ph ? 9 : 11}" font-weight="800" fill="${k === L.monthKey(L.TODAY) ? "var(--fg)" : "var(--muted)"}">${monName(k)}</text>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Each month's balance as a stack, a row per account">${body}${ends}${months}</svg>`;
}
function stackTable(prefix, { ph = false } = {}) {
  const rows = ORDER.map((a) => { const f = FACTS[a.id], jan = L.yearStart(a.id); return `<label for="${prefix}-sel-${a.id}" class="sr sr-${a.id}" style="display:grid;grid-template-columns:${ph ? "1fr auto" : "1.4fr 1fr 1fr 1fr auto"};gap:12px;align-items:center;padding:10px 8px;border-radius:12px;cursor:pointer;border-bottom:1px solid var(--divider)"><span class="cell-name">${mono(a, 28)}<span><b>${a.name}</b><small>${f.on ? (f.stale ? `<span style="color:var(--warning-text)">${I.clock(9)} read ${fmt(f.asOf)}</span>` : `read ${fmt(f.asOf)}`) : "closed Mar 31"}</small></span></span>${ph ? "" : `<span class="num">${inr(jan)}<span class="sub2">Jan 1</span></span><span class="num">${f.on ? inr(f.balance) : "₹0"}<span class="sub2">now</span></span><span>${L.chg((f.on ? f.balance : 0) - jan)}</span>`}<span class="row" style="gap:6px">${ph ? `<b class="num">${f.on ? inr(f.balance) : "₹0"}</b>` : ""}${f.on ? btn("Update", { kind: f.stale ? "primary" : "soft", cls: "btn-xs" }) : btn("Reopen", { kind: "soft", cls: "btn-xs" })}</span></label>`; }).join("");
  return card(`${head("The stacks, in numbers", "pick a row to light up its stacks")}<div style="display:flex;flex-direction:column;margin:0 -8px">${rows}</div>`, ph ? "padding:16px;gap:6px" : "gap:6px");
}
const nSel = (dsel, id) => `${dsel} .sr-${id} { background: var(--accent-tint); }`;
export function nDesktop() {
  const pk = P.picker("n", nSel);
  const hero = card(`${head("Stacks", "each month's balance as a stack of notes, a row per account · hatched stacks were never read, only carried", `<span class="row" style="gap:8px"><label for="n-sel-all" class="chip" style="cursor:pointer">${L.allMono(18)}All · ${inr(L.TOTAL)}</label>${L.seg([{ label: "This year", on: true }, { label: "12 months" }])}</span>`)}${stacks("n")}`, "gap:6px;background:linear-gradient(180deg, var(--surface), color-mix(in srgb, var(--card-onyx) 6%, var(--surface)))");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${two(stackTable("n"), P.outCard("n"), "1.3fr 1fr")}${pk.close}` });
}
export function nPhone() {
  const pk = P.picker("np", nSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${card(`${head("Stacks")}${stacks("np", { w: 330, ph: true })}`, "padding:14px;gap:6px")}${stackTable("np", { ph: true })}${P.outCard("np", { ph: true })}${pk.close}` });
}

export const DIRS3 = [
  { k: "j", name: "Change ladder", blurb: "The page is about what moved: every account's change as a bar either side of zero, since its last balance, this month or since Jan 1. Movers beside it; each month's rises and falls below." },
  { k: "k", name: "Money diary", blurb: "A feed of what happened, newest first, in plain sentences: balances recorded, salary in, bills and EMIs out, and what's overdue. Coming up warns when an EMI is bigger than its account." },
  { k: "l", name: "T-accounts", blurb: "Each account as a ledger T for the month: brought forward and what came in on the left, what went out and carried forward on the right, both sides totalling. A trial balance across the top." },
  { k: "m", name: "Balance slips", blurb: "Every balance written up like a cheque leaf, the amount in words, with counterfoils down the side to pick the account. A stale balance is stamped, like a stale cheque; a closed one is cancelled." },
  { k: "n", name: "Stacks", blurb: "Each month's balance as an isometric stack of notes, a row per account: the year as a small city. Pick a row to light it up; hatched stacks were carried, not read." },
];
