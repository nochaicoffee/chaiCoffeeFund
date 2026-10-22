// Round 11 (2026-10-22): Prathik picked W1 Movers and asked for changes:
//   1. W1 fits overall.  2. Over time becomes the Scoreboard's over-time chart, glow line first.
//   3. Month over month becomes a money in vs money out widget that shows what was saved each month and what was spent
//      apart from investing (five variations, I1–I5), and the section above the chart covers it too (the band, the strip).
//   4. The Mix gets more variations (M1–M5).  5. Coming up stays as it is.  6. The greeting points, like the other dashboards.
// Every figure is made up; "today" is Oct 21, 2026. All of it is CSS, no script.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as W from "./wparts.mjs";
const { inr, signed, inrS, fmt, monName, monYear, I, btn, mono } = L;
const { card, head, foot, worked, colChart, niceTicks, up, soft, balAt, hc, tip, tgl, variants } = W;
const { ACT, bal, pkey, NOW } = W;
const KEEP = "var(--heat-3)", EXP = "var(--card-sapphire)", INV = "var(--card-violet)", NEG = "oklch(0.62 0.16 25)";

// ---------- The money in, out and saved, per month ----------
/** What came in, what went to expenses (card bills, subscriptions, EMIs), what was invested, and what was saved. */
export function fx(k, id) {
  const m = L.monthFlows(k, id);
  const exp = L.sumKind(m.list, "card") + L.sumKind(m.list, "sub") + L.sumKind(m.list, "emi");
  const inv = L.sumKind(m.list, "invest");
  const inn = m.in;
  return { k, in: inn, exp, inv, saved: inn - exp, kept: inn - exp - inv, rate: inn ? (inn - exp) / inn : null, live: k === NOW };
}
const months = (id, keys = L.YEAR) => keys.map((k) => fx(k, id));
const sum = (ms, f) => ms.reduce((s, m) => s + m[f], 0);
const rateTxt = (r) => (r == null ? "n/a" : `${Math.round(r * 100)}%`);
const sTone = (n) => (n >= 0 ? "var(--positive)" : "var(--negative)");
const hasIn = (ms) => sum(ms, "in") > 0;
/** A month's hover card: in, expenses, invested, saved. */
const mcard = (m, extra = "") => hc({
  h: monYear(m.k), hr: m.live ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">so far</span>` : "",
  t: `${signed(m.saved)} saved`, d: m.in ? `${rateTxt(m.rate)} of what came in` : "nothing came into this account",
  rows: [["Came in", `+${inr(m.in)}`, KEEP], ["Expenses", `−${inr(m.exp)}`, EXP], ["Invested", `−${inr(m.inv)}`, INV], ["Kept in the bank", signed(m.kept), sTone(m.kept)]],
  f: extra || "Expenses are card bills, subscriptions and EMIs; investing isn't counted as an expense", w: 250,
});

// ---------- The greeting, pointing (like Cards and Subscriptions) ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 270, x, y: "down" })}</span>`;
export function pointLede() {
  const st = L.STALE[0], hi = L.rangeIn(null).hi, hiName = hi.k === "2026-03" ? "March" : monYear(hi.k);
  const total = hc({ h: "Where it sits", t: inr(L.TOTAL), d: `${L.ACTIVE.length} active accounts`, rows: ACT.map((a) => [a.name, inr(bal(a.id)), up(a)]), f: "Latest balance of each account" });
  const since = hc({ h: "Up since January", t: signed(L.sinceJan()), d: "each account against its 31 Dec balance", rows: ACT.map((a) => [a.name, signed(bal(a.id) - balAt(a.id, "2025-12")), up(a)]), f: "Closed accounts are left out" });
  const high = hc({ h: `${hiName}, the high point`, t: inr(hi.v), d: "month-end balance, all accounts", rows: ACT.map((a) => [a.name, inr(L.atMonth(a.id, hi.k) ?? 0), up(a)]), f: `${inr(L.TOTAL - hi.v)} below it now`.replace("−", "−") });
  const stale = st ? hc({ h: `${st.name} needs an update`, hr: `<span class="pill" style="padding:2px 8px;font-size:10px;background:var(--warning-tint);color:var(--warning-text)">stale</span>`, t: inr(L.latest(st.id).balance), d: `last updated ${fmt(L.latest(st.id).date)}, ${L.daysBetween(L.latest(st.id).date, L.TODAY)} days ago`, rows: [["Stale after", `${L.STALE_DAYS} days`, ""]], f: "Update it from the Update balances button" }) : "";
  return `Your ${pt(`${L.ACTIVE.length} accounts`, total)} hold ${pt(inr(L.TOTAL), total)}, up ${pt(inr(L.sinceJan()), since)} since January. ${pt(hiName, high)} was the high point at ${pt(inr(hi.v), high)}.${st ? ` ${pt(st.name, stale)} was last updated on ${pt(fmt(L.latest(st.id).date), stale, { x: "c" })}.` : ""}`;
}
const divLede = (h) => h.replace(/<p class="lede">([\s\S]*)<\/p>(<\/div>)/, '<div class="lede">$1</div>$2');
export const pointGreeting = ({ phone = false } = {}) => divLede(`<style>.lede .pt { position: relative; display: inline-block; } .lede .pt > b { cursor: help; border-bottom: 1.5px dotted var(--accent-text); padding-bottom: 1px; transition: background 160ms; border-radius: 4px; } .lede .pt:hover > b, .lede .pt:focus-visible > b { background: var(--accent-tint); } .lede .hc-wrap { font-weight: 500; font-size: 13px; line-height: 1.4; color: var(--fg); }</style>${L.header({ lede: pointLede(), phone, actions: phone ? `${btn("Update balances", { kind: "primary", icon: I.check(12) })}${btn("Add account", { icon: I.plus() })}` : P.greetingActions() })}`);

// ---------- Shared small parts ----------
const legend = (...x) => `<div class="row" style="gap:14px;flex-wrap:wrap">${x.map(([c, t]) => `<span class="wok-lg"><i style="background:${c}"></i>${t}</span>`).join("")}</div>`;
const LG = legend([KEEP, "Came in"], [EXP, "Expenses"], [INV, "Invested"]);
/** Four figures for the year so far, for one pick. */
function figures(ms) {
  const inn = sum(ms, "in"), exp = sum(ms, "exp"), inv = sum(ms, "inv"), saved = inn - exp;
  const f = (label, v, c, sub) => `<div style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="card-note" style="font-weight:700">${label}</span><b class="num" style="font-size:22px;letter-spacing:-0.02em;color:${c}">${v}</b><span class="card-note">${sub}</span></div>`;
  return [f("Came in", inr(inn), "var(--positive)", `${ms.length} months, ${inrS(inn / ms.length)} a month`), f("Expenses", inr(exp), "var(--fg)", `card bills, subscriptions, EMIs`), f("Invested", inr(inv), "var(--fg)", `${inv ? "shares bought" : "nothing bought"}`), f("Saved", signed(saved), sTone(saved), inn ? `${rateTxt(saved / inn)} of what came in` : "no income here")];
}

// =====================================================================================================================
// The band above the chart: this year's money in, expenses, invested and saved, and one bar that splits what came in.
// =====================================================================================================================
export function savedBand(prefix, { ph = false } = {}) {
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id), inn = sum(ms, "in"), exp = sum(ms, "exp"), inv = sum(ms, "inv"), kept = inn - exp - inv;
    const best = ms.filter((m) => m.in).sort((a, b) => b.saved - a.saved)[0];
    const bar = inn ? [[exp, EXP, "Expenses"], [inv, INV, "Invested"], [Math.max(kept, 0), KEEP, "Kept in the bank"]].map(([v, c, n]) => `<span class="hov rt" tabindex="0" style="flex:${Math.max(v, 1)} 1 0;background:linear-gradient(180deg, color-mix(in oklch, ${c} 78%, white), ${c});height:100%;border-radius:8px">${tip(hc({ h: n, t: inr(v), d: `${L.pct(v, inn)} of what came in`, w: 210 }), { w: 210, y: "up" })}</span>`).join("") : `<span style="flex:1;background:var(--fill);border-radius:8px"></span>`;
    return `<div style="display:grid;grid-template-columns:${ph ? "1fr 1fr" : "repeat(4,minmax(0,1fr)) minmax(0,1.5fr)"};gap:${ph ? 14 : 22}px;align-items:center">${figures(ms).join("")}<div style="${ph ? "grid-column:1/-1;" : ""}display:flex;flex-direction:column;gap:8px"><div style="display:flex;gap:3px;height:28px">${bar}</div><span class="card-note">${inn ? `Of every ₹100 that came in: <b>₹${Math.round((exp / inn) * 100)}</b> expenses, <b>₹${Math.round((inv / inn) * 100)}</b> invested, <b>₹${Math.max(0, Math.round((kept / inn) * 100))}</b> kept` : "Nothing came into this account, so there's nothing to split"}${best ? ` · best month <b>${monName(best.k)}</b> (${signed(best.saved)})` : ""}</span></div></div>`;
  });
  return card(`${head("This year, in and out", "January to today · saved is what came in minus expenses, so money invested counts as saved", "", ph)}${body}${foot("Expenses leave out investing on purpose", worked("Worked out from the recorded flows"))}`, { gap: 14, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// A strip under the chart: one pill per month, the amount saved, tinted by the share of income saved.
// =====================================================================================================================
export function savedStrip(prefix) {
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id), top = Math.max(...ms.map((m) => Math.abs(m.saved)), 1);
    return `<div style="display:grid;grid-template-columns:repeat(${ms.length},minmax(0,1fr));gap:10px">${ms.map((m) => `<span class="hov rt-i" tabindex="0" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:${m.saved >= 0 ? `color-mix(in oklch, ${KEEP} ${Math.round(14 + Math.min(1, m.saved / top) * 40)}%, white)` : "var(--negative-tint)"};border:1px solid var(--surface-line)"><span class="card-note" style="font-weight:800">${monName(m.k)}${m.live ? " · so far" : ""}</span><b class="num" style="font-size:16px;color:${sTone(m.saved)}">${signed(m.saved)}</b><span class="card-note">${m.in ? `${rateTxt(m.rate)} saved` : "no income"}</span>${tip(mcard(m), { w: 250, x: "c", y: "up" })}</span>`).join("")}</div>`;
  });
  return card(`${head("Saved, month by month", "what came in minus expenses · hover a month", "", false)}${body}${foot("Saved includes what you invested", worked("Worked out"))}`, { gap: 12 });
}

// =====================================================================================================================
// I1 Paired columns: each month a column for what came in beside one for what went out (expenses, then invested), and the saved amount under it.
// =====================================================================================================================
export function inOutCols(prefix, { ph = false } = {}) {
  const keys = ph ? L.YEAR.slice(-6) : L.YEAR;
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id, keys), ticks = niceTicks(0, Math.max(...ms.map((m) => Math.max(m.in, m.exp + m.inv)), 1000)), hi = ticks.at(-1);
    const col = (i, Pc) => { const m = ms[i]; return `<span class="wk-stack" style="bottom:0;left:0;right:52%;height:${Pc(m.in)}%"><i style="background:linear-gradient(180deg, color-mix(in oklch, ${KEEP} 78%, white), ${KEEP});flex:1"></i></span><span class="wk-stack" style="bottom:0;left:52%;right:0;height:${Pc(m.exp + m.inv)}%"><i style="flex:${m.exp} 1 0;background:linear-gradient(180deg, color-mix(in oklch, ${EXP} 78%, white), ${EXP})"></i>${m.inv ? `<i style="flex:${m.inv} 1 0;background:${INV}"></i>` : ""}</span>`; };
    const chart = colChart({ n: keys.length, hi, ticks, col, card: (i) => mcard(ms[i]), labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH: ph ? 210 : 250, gap: 0.2 });
    const saved = `<div style="display:grid;grid-template-columns:var(--g,54px) repeat(${ms.length},minmax(0,1fr));align-items:center;margin-top:4px"><span class="card-note" style="font-weight:800;text-align:right;padding-right:8px">Saved</span>${ms.map((m) => `<span style="text-align:center"><b class="num" style="font-size:${ph ? 10.5 : 12.5}px;white-space:nowrap;color:${sTone(m.saved)}">${m.in ? `${m.saved < 0 ? "−" : "+"}${inrS(Math.abs(m.saved))}` : "–"}</b></span>`).join("")}</div>`;
    return `<div class="wpane" style="gap:10px"><div class="row" style="gap:14px;flex-wrap:wrap;justify-content:space-between">${LG}<span class="card-note"><b style="color:${sTone(sum(ms, "saved"))}">${signed(sum(ms, "saved"))}</b> saved in ${ms.length} months${hasIn(ms) ? ` · ${rateTxt(sum(ms, "saved") / sum(ms, "in"))}` : ""}</span></div>${chart}${saved}</div>`;
  }, {}, { flex: true });
  return card(`${head("Money in and money out", "this year · what came in, what went out, and what was saved", "", ph)}${body}${foot("Saved = came in − expenses; investing counts as saved", worked())}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// I2 Month ledger: pick a month; a bridge from what came in, down through expenses and investing, to what was kept.
// =====================================================================================================================
export function inOutLedger(prefix) {
  const keys = L.YEAR, t = tgl(prefix, "lg", keys.map((k) => [k, monName(k)]), { def: keys.at(-2), size: 11.5, pad: "5px 9px" });
  const pane = (f, k) => {
    const m = fx(k, f.all ? null : f.id), top = Math.max(m.in, m.exp + m.inv, 1), lo = Math.min(0, m.kept), Pc = (v) => ((v - lo) / (top - lo)) * 100;
    const bar = (label, a, b, c, val, sub) => `<div class="hov" tabindex="0" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 0;min-width:0"><div style="position:relative;height:210px;width:100%"><span class="rt" style="position:absolute;left:14%;right:14%;bottom:${Pc(Math.min(a, b))}%;height:${Math.max(Math.abs(Pc(b) - Pc(a)), 1)}%;border-radius:10px;background:linear-gradient(180deg, color-mix(in oklch, ${c} 78%, white), ${c})"></span></div><b class="num" style="font-size:15px">${val}</b><span class="card-note" style="text-align:center">${label}<br>${sub}</span></div>`;
    const steps = `<div style="position:relative;display:flex;gap:10px;align-items:flex-end;flex:1 1 auto">${bar("Came in", 0, m.in, KEEP, `+${inr(m.in)}`, "salary and the rest")}${bar("Expenses", m.in, m.in - m.exp, EXP, `−${inr(m.exp)}`, "bills, subscriptions, EMIs")}${bar("Invested", m.in - m.exp, m.kept, INV, `−${inr(m.inv)}`, m.inv ? "shares bought" : "nothing bought")}${bar("Kept", 0, m.kept, m.kept >= 0 ? KEEP : NEG, signed(m.kept), "left in the bank")}</div>`;
    const side = `<div style="display:flex;flex-direction:column;gap:10px;min-width:210px;padding:16px;border-radius:18px;background:var(--accent-tint)"><span class="card-note" style="font-weight:800">${monYear(k)} saved</span><b class="num" style="font-size:30px;letter-spacing:-0.02em;color:${sTone(m.saved)}">${signed(m.saved)}</b><span class="card-note">${m.in ? `${rateTxt(m.rate)} of ${inr(m.in)} that came in` : "nothing came into this account"}</span><div style="height:1px;background:var(--divider)"></div><span class="card-note">Spent on expenses <b>${inr(m.exp)}</b></span><span class="card-note">Invested <b>${inr(m.inv)}</b></span>${m.live ? `<span class="pill pill-off" style="align-self:flex-start;font-size:10px;padding:2px 8px">so far, to Oct 21</span>` : ""}</div>`;
    return `<div style="display:flex;gap:24px;align-items:stretch">${steps}${side}</div>`;
  };
  const body = P.panes((f) => `<div class="wpane" style="gap:12px">${variants(t, (k) => pane(f, k))}</div>`, {}, { flex: true });
  return card(`${t.css}${t.radios}${head("Month ledger", "pick a month · from what came in to what you kept", t.ui)}${body}${foot("Each step steps down from the one before", worked())}`, { gap: 12 });
}

// =====================================================================================================================
// I3 Where each ₹100 went: a bar a month, split into expenses, invested and kept; its length is what came in.
// =====================================================================================================================
export function inOutHundred(prefix) {
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id), top = Math.max(...ms.map((m) => Math.max(m.in, m.exp + m.inv)), 1);
    const row = (m) => { const tot = Math.max(m.in, m.exp + m.inv, 1), seg = (v, c) => (v > 0 ? `<i class="rt" style="flex:${v} 1 0;background:linear-gradient(180deg, color-mix(in oklch, ${c} 78%, white), ${c});border-radius:6px;min-width:3px"></i>` : ""); return `<div class="hov" tabindex="0" style="display:grid;grid-template-columns:44px minmax(0,1fr) 150px;gap:14px;align-items:center;padding:3px 0"><span class="card-note" style="font-weight:800">${monName(m.k)}</span><span style="display:flex;gap:2px;height:22px;width:${(tot / top) * 100}%">${seg(m.exp, EXP)}${seg(m.inv, INV)}${seg(Math.max(m.kept, 0), KEEP)}</span><span style="display:flex;gap:8px;justify-content:flex-end;align-items:baseline"><b class="num" style="font-size:13px;color:${sTone(m.saved)}">${signed(m.saved)}</b><span class="card-note" style="min-width:34px;text-align:right">${rateTxt(m.rate)}</span></span>${tip(mcard(m), { w: 250, x: "c", y: "up" })}</div>`; };
    return `<div class="wpane" style="gap:6px"><div class="row" style="justify-content:space-between;gap:14px;flex-wrap:wrap">${legend([EXP, "Expenses"], [INV, "Invested"], [KEEP, "Kept"])}<span class="card-note">Bar length is what came in · amount saved and share on the right</span></div>${ms.map(row).join("")}</div>`;
  }, {}, { flex: true });
  return card(`${head("Where each ₹100 went", "this year · expenses, invested and kept, month by month", "")}${body}${foot("A month that spent more than came in has no green", worked())}`, { gap: 12 });
}

// =====================================================================================================================
// I4 Mirror: what came in grows up from the line, what went out hangs below it, and a dot marks what was saved.
// =====================================================================================================================
export function inOutMirror(prefix, { ph = false } = {}) {
  const keys = ph ? L.YEAR.slice(-6) : L.YEAR;
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id, keys), maxIn = Math.max(...ms.map((m) => m.in), 1000), maxOut = Math.max(...ms.map((m) => m.exp + m.inv), 1000);
    const up2 = niceTicks(0, maxIn).at(-1), dn = niceTicks(0, maxOut).at(-1), lo = -dn, hi = up2, span = hi - lo, Pc = (v) => ((v - lo) / span) * 100;
    const ticks = [...niceTicks(0, maxOut).map((v) => -v), ...niceTicks(0, maxIn)].filter((v, i, a) => a.indexOf(v) === i);
    const col = (i) => { const m = ms[i]; return `<span class="wk-stack" style="bottom:${Pc(0)}%;height:${(m.in / span) * 100}%;left:12%;right:12%"><i style="background:linear-gradient(180deg, color-mix(in oklch, ${KEEP} 78%, white), ${KEEP});flex:1"></i></span><span class="wk-stack dn" style="top:${100 - Pc(0)}%;height:${((m.exp + m.inv) / span) * 100}%;left:12%;right:12%;flex-direction:column"><i style="flex:${m.exp} 1 0;background:linear-gradient(180deg, ${EXP}, color-mix(in oklch, ${EXP} 78%, white))"></i>${m.inv ? `<i style="flex:${m.inv} 1 0;background:${INV}"></i>` : ""}</span><i title="saved" style="position:absolute;left:50%;margin-left:-7px;bottom:calc(${Pc(Math.max(Math.min(m.saved, hi), lo))}% - 7px);width:14px;height:14px;border-radius:50%;background:var(--surface);border:3px solid ${m.saved >= 0 ? "var(--accent-text)" : NEG};box-shadow:0 2px 6px oklch(0 0 0 / 0.2)"></i>`; };
    const chart = colChart({ n: keys.length, lo, hi, ticks, col, card: (i) => mcard(ms[i]), labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH: ph ? 250 : 320, gap: 0.14, zero: true, fy: (v) => (v ? `${v < 0 ? "−" : ""}${inrS(Math.abs(v))}` : "0") });
    return `<div class="wpane" style="gap:10px"><div class="row" style="gap:14px;flex-wrap:wrap;justify-content:space-between">${legend([KEEP, "Came in (above the line)"], [EXP, "Expenses (below)"], [INV, "Invested (below)"])}<span class="row card-note" style="gap:6px"><i style="width:12px;height:12px;border-radius:50%;border:3px solid var(--accent-text);display:inline-block"></i>Saved: where the dot sits</span></div>${chart}</div>`;
  }, {}, { flex: true });
  return card(`${head("Money in, money out", "this year · what came in above the line, what went out below it, the dot is what was saved", "", ph)}${body}${foot("The dot rises above the line when you spent less than came in", worked())}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// I5 Scoreboard tiles: a tile a month with the amount saved big, tinted by how much of the income it was, and the year's total above.
// =====================================================================================================================
export function inOutTiles(prefix) {
  const body = P.panes((f) => {
    const ms = months(f.all ? null : f.id), best = ms.filter((m) => m.in).sort((a, b) => b.saved - a.saved)[0], worst = ms.filter((m) => m.in).sort((a, b) => a.saved - b.saved)[0];
    const heat = (m) => (!m.in ? "var(--fill)" : m.rate < 0 ? "var(--negative-tint)" : `var(--heat-${Math.max(1, Math.min(5, Math.ceil((m.rate / 0.7) * 5)))})`);
    const ink = (m) => (m.in && m.rate >= 0.5 ? "var(--on-accent)" : "var(--heat-ink)");
    const tile = (m) => `<span class="hov ${m.in && m.rate >= 0.5 ? "rt" : "rt-i"}" tabindex="0" style="display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:16px;background:${heat(m)};color:${ink(m)};min-height:104px;${best && m.k === best.k ? "box-shadow:0 0 0 2.5px var(--accent-text);" : ""}"><span style="font-size:11px;font-weight:800;opacity:0.85">${monName(m.k)}${best && m.k === best.k ? " · best" : worst && m.k === worst.k ? " · lowest" : ""}</span><b class="num" style="font-size:19px;letter-spacing:-0.02em">${m.in ? signed(m.saved) : "–"}</b><span style="font-size:11px;font-weight:700;opacity:0.9">${m.in ? `${rateTxt(m.rate)} of ${inrS(m.in)}` : "no income"}</span><span style="display:flex;gap:2px;height:6px;margin-top:auto"><i style="flex:${m.exp || 0.01} 1 0;background:${EXP};border-radius:3px"></i><i style="flex:${m.inv || 0.01} 1 0;background:${INV};border-radius:3px"></i></span>${tip(mcard(m), { w: 250, x: "c", y: "up" })}</span>`;
    const tot = figures(ms);
    return `<div class="wpane" style="gap:14px"><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding-bottom:14px;border-bottom:1px solid var(--divider)">${tot.join("")}</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px">${ms.map(tile).join("")}</div><span class="card-note">Darker green = a bigger share of what came in was saved · the thin bar is expenses and invested · outlined = best month</span></div>`;
  }, {}, { flex: true });
  return card(`${head("Saved, month by month", "this year · each tile is a month", "")}${body}${foot("Saved = came in − expenses; investing counts as saved", worked())}`, { gap: 12 });
}

// =====================================================================================================================
// The Mix, more ways. Each follows the hero's pick: the picked account's piece stays, the others dim.
// =====================================================================================================================
const PURP = ["Emergency-Fund", "Spending", "Investment", "Loan-Payments"];
const pTot = (p) => ACT.filter((a) => a.purpose === p).reduce((t, a) => t + bal(a.id), 0);
const byPurp = PURP.flatMap((p) => ACT.filter((a) => a.purpose === p));
const mxCss = (prefix) => `<style>.${prefix}dir:not(:has(#${prefix}-sel-all:checked)) .mxs { opacity: 0.32; filter: saturate(0.6); } ${ACT.map((a) => `.${prefix}dir:has(#${prefix}-sel-${a.id}:checked) .mxs.mx-${a.id} { opacity: 1; filter: none; box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px ${up(a)}; z-index: 2; }`).join(" ")} .mxs { transition: opacity 200ms, filter 200ms, transform 200ms; } .mxs:hover { transform: translateY(-2px); } .mxl { cursor: pointer; }</style>`;
const mxCard = (a) => hc({ h: a.name, t: inr(bal(a.id)), d: `${L.pct(bal(a.id), L.TOTAL)} of the total · ${L.purposeName(a.purpose)}`, rows: [], f: "Latest balance", w: 210 });
const mxHead = (n, title, sub) => head(`<span class="pill pill-ink" style="font-size:11px;padding:3px 9px;margin-right:8px">${n}</span>${title}`, sub);
const mxFoot = () => foot("Latest balances of active accounts · pick a bank in the hero to hold its piece", `<span class="row" style="gap:6px;flex-wrap:wrap">${L.CLOSED.map((a) => `<label for="x" class="chip" style="padding:4px 10px 4px 5px">${mono(a, 16)}${a.name}<em>closed, ₹0</em></label>`).join("")}</span>`);

/** A squarified treemap: `items` ({k, v}) into the box; returns {k: {x, y, w, h}}. */
function squarify(items, x, y, w, h) {
  const out = {}, list = items.filter((i) => i.v > 0).sort((p, q) => q.v - p.v);
  let rest = list.slice(), total = rest.reduce((t, i) => t + i.v, 0);
  const worst = (row, side, scale) => { const sum = row.reduce((t, i) => t + i.v, 0) * scale, mx = Math.max(...row.map((i) => i.v)) * scale, mn = Math.min(...row.map((i) => i.v)) * scale; return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn)); };
  while (rest.length) {
    const scale = (w * h) / total, side = Math.min(w, h);
    let row = [rest[0]], i = 1;
    while (i < rest.length && worst([...row, rest[i]], side, scale) <= worst(row, side, scale)) row.push(rest[i++]);
    const sum = row.reduce((t, r) => t + r.v, 0), thick = (sum * scale) / side;
    let o = 0;
    for (const r of row) { const len = (r.v * scale) / thick; out[r.k] = w >= h ? { x, y: y + o, w: thick, h: len } : { x: x + o, y, w: len, h: thick }; o += len; }
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    total -= sum; rest = rest.slice(row.length);
  }
  return out;
}

/**
 * M2 The mix as blocks, in the Subscriptions cost map's style: a treemap with a toggle. By account, each account is a block sized by
 * its balance; By purpose, the blocks glide into their purpose's tile, take its colour, and the tile's name and total sit at its top.
 * The layout is worked out here for both and the toggle moves the blocks between them (CSS only).
 */
export function mixBlocks(prefix, { h = 330, w = 640, ph = false } = {}) {
  const Wd = w, Hd = h, HEAD = 36, PAD = 4;
  const accts = ACT.slice().sort((a, b) => bal(b.id) - bal(a.id));
  const each = squarify(accts.map((a) => ({ k: a.id, v: bal(a.id) })), 0, 0, Wd, Hd);
  const floor = L.TOTAL * 0.035;
  const tiles = squarify(PURP.filter((p) => pTot(p)).map((p) => ({ k: p, v: Math.max(pTot(p), floor) })), 0, 0, Wd, Hd);
  const grp = {};
  for (const p of PURP) {
    const t = tiles[p]; if (!t) continue;
    const head = t.h > HEAD + 44 && t.w > 110;
    const inner = { x: t.x + PAD, y: t.y + (head ? HEAD : PAD), w: t.w - PAD * 2, h: t.h - (head ? HEAD : PAD) - PAD };
    Object.assign(grp, squarify(ACT.filter((a) => a.purpose === p).map((a) => ({ k: a.id, v: bal(a.id) })), inner.x, inner.y, inner.w, inner.h));
    t.head = head;
  }
  const t = tgl(prefix, "mxv", [["acct", "By account"], ["purp", "By purpose"]], { def: "acct", size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 13px" });
  const pc = (p) => L.PURPOSE_COLOR[p];
  const pg = (p) => `linear-gradient(158deg, var(--card-${pc(p)}-from), var(--card-${pc(p)}-to))`;
  const pos = (b) => `left:${((b.x / Wd) * 100).toFixed(3)}%;top:${((b.y / Hd) * 100).toFixed(3)}%;width:${((b.w / Wd) * 100).toFixed(3)}%;height:${((b.h / Hd) * 100).toFixed(3)}%`;
  const d = `.${prefix}dir:has(#${prefix}-mxv-purp:checked)`;
  const css = `<style>
.${prefix}mm .mb { position: absolute; padding: 3px; transition: left 520ms cubic-bezier(0.2, 0.8, 0.2, 1), top 520ms cubic-bezier(0.2, 0.8, 0.2, 1), width 520ms cubic-bezier(0.2, 0.8, 0.2, 1), height 520ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.${prefix}mm .mb > label { position: relative; isolation: isolate; overflow: hidden; display: flex; width: 100%; height: 100%; flex-direction: column; justify-content: space-between; color: #fff; border: 1px solid oklch(1 0 0 / 0.14); border-top-color: oklch(1 0 0 / 0.26); }
.${prefix}mm .mo { position: absolute; inset: -1px; z-index: -2; opacity: 0; transition: opacity 500ms; pointer-events: none; }
.${prefix}mm .pt { position: absolute; padding: 3px; opacity: 0; pointer-events: none; transition: opacity 400ms; }
.${prefix}mm .pt > span { display: block; width: 100%; height: 100%; border-radius: 20px; border: 1px solid oklch(1 0 0 / 0.1); }
.${prefix}mm .ph { position: absolute; z-index: 3; display: flex; flex-direction: column; gap: 1px; padding: 9px 14px; color: #fff; opacity: 0; pointer-events: none; transition: opacity 400ms 200ms; }
.${prefix}mm .mc-purp { display: none; } .${prefix}mm .mc-acct { display: contents; }
.${prefix}mm:has(.mxs:hover) .mxs:not(:hover) { opacity: 0.75; filter: saturate(0.55); }
${d} .pt, ${d} .ph { opacity: 1; } ${d} .mo { opacity: 1; } ${d} .mc-acct { display: none; } ${d} .mc-purp { display: contents; }
${accts.map((a) => `${d} .mb-${a.id} { ${pos(grp[a.id]).split(";").map((x) => `${x} !important`).join(";")}; }`).join("\n")}
</style>`;
  const nameFor = (b) => (b.w > 74 && b.h > 28);
  const block = (a) => {
    const e = each[a.id], g = grp[a.id], big = e.w > 150 && e.h > 110, mid = e.w > 82 && e.h > 62, tiny = e.w < 64 || e.h < 52;
    const val = bal(a.id), share = L.pct(val, L.TOTAL);
    const accHtml = tiny ? `<span style="margin:auto;text-align:center;line-height:1.15"><b style="font-size:13px">${a.name[0]}</b><span style="display:block;font-size:10px;font-weight:800">${inrS(val)}</span></span>` : `<span style="padding:${big ? 16 : 10}px ${big ? 16 : 10}px 0"><span style="display:block;font-weight:800;font-size:${big ? 17 : 12}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</span>${mid ? `<span style="display:block;margin-top:3px;font-weight:600;font-size:${big ? 12 : 10.5}px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${big ? `${a.bank} · ${L.purposeName(a.purpose)}` : L.purposeName(a.purpose)}</span>` : ""}</span><span style="padding:0 ${big ? 16 : 10}px ${big ? 14 : 8}px"><b class="num" style="display:block;font-size:${big ? (e.w > 230 ? 26 : 20) : 13}px;line-height:1.1;white-space:nowrap">${inrS(val)}${big ? ` <span style="font-size:12px;font-weight:600;opacity:0.75">${share}</span>` : ""}</b></span>`;
    const small = g.w < 64 || g.h < 44;
    const purpHtml = small ? `<span style="margin:auto;font-size:12px;font-weight:800">${a.name[0]}</span>` : `<span></span><span style="padding:0 9px 7px;font-size:10.5px;font-weight:700;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}${g.w > 120 ? ` · <b class="num">${inrS(val)}</b>` : ""}</span>`;
    return `<div class="mb mb-${a.id}" style="${pos(e)}"><label for="${prefix}-sel-${a.id}" class="mxs mx-${a.id} hov" tabindex="0" style="border-radius:${big ? 18 : 12}px;background:${S_GRAD(a)};cursor:pointer"><span class="mo" style="background:${pg(a.purpose)}"></span><span class="mc-acct">${accHtml}</span><span class="mc-purp">${purpHtml}</span>${tip(mxCard(a), { w: 210, x: "c", y: "up" })}</label></div>`;
  };
  const tileHtml = PURP.filter((p) => tiles[p]).map((p) => { const tl = tiles[p]; return `<div class="pt" style="${pos(tl)}"><span style="background:${pg(p)}"></span></div>${tl.head ? `<div class="ph" style="left:${((tl.x / Wd) * 100).toFixed(3)}%;top:${((tl.y / Hd) * 100).toFixed(3)}%;width:${((tl.w / Wd) * 100).toFixed(3)}%"><span class="row" style="gap:6px;font-size:13px;font-weight:800">${L.purposeIcon(p, 13)}${L.purposeName(p)}</span><span style="font-size:12px;font-weight:700;opacity:0.8"><b class="num">${inrS(pTot(p))}</b> · ${L.pct(pTot(p), L.TOTAL)}</span></div>` : ""}`; }).join("");
  const map = `<div class="${prefix}mm" style="position:relative;flex:1 1 auto;min-height:${Hd}px">${tileHtml}${accts.map(block).join("")}</div>`;
  return `<section class="card glass" style="gap:12px${ph ? ";padding:16px" : ""}">${t.css}${t.radios}${css}${mxCss(prefix)}${head(ph ? "The mix" : `<span class="pill pill-ink" style="font-size:11px;padding:3px 9px;margin-right:8px">M2</span>The mix`, "each account sized by its balance · By purpose groups them", t.ui, ph)}${map}${ph ? "" : mxFoot()}</section>`;
}
const S_GRAD = (a) => `linear-gradient(158deg, var(--card-${a.color}-from), var(--card-${a.color}-to))`;

/** M3 Vault bar: one long bar split by account, with purpose brackets under it and what's liquid against invested. */
export function mixBar(prefix) {
  const seg = byPurp.map((a) => `<label for="${prefix}-sel-${a.id}" class="mxs mx-${a.id} mxl hov" tabindex="0" style="flex:${bal(a.id)} 1 0;min-width:6px;height:74px;border-radius:14px;background:linear-gradient(180deg, color-mix(in oklch, ${up(a)} 78%, white), ${up(a)});display:flex;align-items:flex-end;padding:8px 10px;color:var(--on-accent);font-size:11.5px;font-weight:800;overflow:hidden;white-space:nowrap">${bal(a.id) / L.TOTAL > 0.09 ? a.name : ""}${tip(mxCard(a), { w: 210, x: "c", y: "up" })}</label>`).join("");
  const br = PURP.filter((p) => pTot(p)).map((p) => `<div style="flex:${pTot(p)} 1 0;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:6px"><i style="height:9px;border:2px solid var(--divider);border-top:none;border-radius:0 0 8px 8px"></i><span class="row" style="gap:6px;font-size:12px;font-weight:800;white-space:nowrap">${L.purposeIcon(p, 13)}<span style="overflow:hidden;text-overflow:ellipsis">${L.purposeName(p)}</span></span><b class="num" style="font-size:16px">${inrS(pTot(p))}</b><span class="card-note">${L.pct(pTot(p), L.TOTAL)}</span></div>`).join("");
  const liquid = pTot("Spending") + pTot("Emergency-Fund"), invested = pTot("Investment");
  const ratio = `<div class="row" style="gap:12px;align-items:center"><span class="card-note" style="font-weight:800;white-space:nowrap">Ready to use vs growing</span><span style="display:flex;flex:1;height:12px;border-radius:999px;overflow:hidden;background:var(--fill)"><i style="flex:${liquid} 1 0;background:var(--heat-3)"></i><i style="flex:${invested} 1 0;background:var(--card-violet)"></i></span><span class="card-note"><b>${L.pct(liquid, L.TOTAL)}</b> ready · <b>${L.pct(invested, L.TOTAL)}</b> in investing</span></div>`;
  return `<section class="card glass" style="gap:16px">${mxCss(prefix)}${mxHead("M3", "The mix, as one bar", "every account in a line, the purposes bracketed underneath")}<div style="display:flex;gap:4px">${seg}</div><div style="display:flex;gap:4px">${br}</div>${ratio}${mxFoot()}</section>`;
}

/** M4 Bubbles: a circle per account, its area the balance, packed together. */
export function mixBubbles(prefix, { w = 560, h = 300 } = {}) {
  const items = ACT.slice().sort((a, b) => bal(b.id) - bal(a.id)).map((a) => ({ a, r: Math.sqrt(bal(a.id)) }));
  const placed = [];
  for (const it of items) {
    for (let t = 0; ; t += 0.08) {
      const rad = 3.2 * t * Math.sqrt(t + 1), x = Math.cos(t * 2.4) * rad * 1.5, y = Math.sin(t * 2.4) * rad * 0.9;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + it.r)) { placed.push({ ...it, x, y }); break; }
      if (t > 400) { placed.push({ ...it, x: 0, y: 0 }); break; }
    }
  }
  const x0 = Math.min(...placed.map((p) => p.x - p.r)), x1 = Math.max(...placed.map((p) => p.x + p.r)), y0 = Math.min(...placed.map((p) => p.y - p.r)), y1 = Math.max(...placed.map((p) => p.y + p.r));
  const k = Math.min((w - 24) / (x1 - x0), (h - 24) / (y1 - y0)), ox = (w - (x1 - x0) * k) / 2 - x0 * k, oy = (h - (y1 - y0) * k) / 2 - y0 * k;
  const bubs = placed.map((p) => { const d = p.r * 2 * k; return `<label for="${prefix}-sel-${p.a.id}" class="mxs mx-${p.a.id} mxl hov" tabindex="0" style="position:absolute;left:${(p.x * k + ox - d / 2).toFixed(1)}px;top:${(p.y * k + oy - d / 2).toFixed(1)}px;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:var(--on-accent);background:radial-gradient(circle at 32% 26%, color-mix(in oklch, ${up(p.a)} 55%, white), ${up(p.a)} 68%);box-shadow:inset 0 -8px 16px oklch(0 0 0 / 0.12);text-align:center;overflow:visible">${d > 64 ? `<span style="font-size:${d > 120 ? 13 : 11}px;font-weight:800;line-height:1.1;padding:0 6px">${p.a.name}</span><b class="num" style="font-size:${d > 120 ? 17 : 12}px">${inrS(bal(p.a.id))}</b>` : ""}${tip(mxCard(p.a), { w: 210, x: "c", y: "up" })}</label>`; }).join("");
  const lg = PURP.filter((p) => pTot(p)).map((p) => `<div class="row" style="gap:10px;font-size:13px;font-weight:700"><i style="width:10px;height:10px;border-radius:50%;background:${`var(--card-${L.PURPOSE_COLOR[p]})`}"></i>${L.purposeName(p)}<b class="num" style="margin-left:auto">${inrS(pTot(p))}</b><span class="card-note" style="min-width:34px;text-align:right">${L.pct(pTot(p), L.TOTAL)}</span></div>`).join("");
  return `<section class="card glass" style="gap:12px">${mxCss(prefix)}${mxHead("M4", "The mix, as bubbles", "a bubble for each account · its area is the balance")}<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div style="position:relative;width:${w}px;height:${h}px;flex-shrink:0">${bubs}</div><div style="flex:1 1 200px;display:flex;flex-direction:column;gap:10px">${lg}</div></div>${mxFoot()}</section>`;
}

/** M5 Hundred squares: ₹100 as a 10 by 10 grid, a square per rupee, coloured by account, grouped by purpose. */
export function mixWaffle(prefix) {
  const share = byPurp.map((a) => ({ a, exact: (bal(a.id) / L.TOTAL) * 100 }));
  share.forEach((s) => { s.n = Math.floor(s.exact); });
  let left = 100 - share.reduce((t, s) => t + s.n, 0);
  share.slice().sort((x, y) => y.exact - y.n - (x.exact - x.n)).forEach((s) => { if (left-- > 0) s.n += 1; });
  const sq = share.flatMap((s) => Array.from({ length: s.n }, () => `<i class="mxs mx-${s.a.id} wf-${s.a.id}" style="background:linear-gradient(180deg, color-mix(in oklch, ${up(s.a)} 78%, white), ${up(s.a)});border-radius:6px"></i>`)).join("");
  const hov = `<style>${ACT.map((a) => `.${prefix}wf:has(.wl-${a.id}:hover) .mxs:not(.wf-${a.id}) { opacity: 0.2; } .${prefix}wf:has(.wl-${a.id}:hover) .wf-${a.id} { transform: scale(1.12); }`).join(" ")}</style>`;
  const rows = byPurp.map((a) => `<label for="${prefix}-sel-${a.id}" class="wl-${a.id} mxl row" style="gap:10px;padding:7px 10px;border-radius:12px;font-size:13px;font-weight:700"><i style="width:11px;height:11px;border-radius:4px;background:${up(a)}"></i>${a.name}<span class="card-note">${L.purposeName(a.purpose)}</span><b class="num" style="margin-left:auto">${inrS(bal(a.id))}</b><span class="card-note" style="min-width:34px;text-align:right">${share.find((s) => s.a.id === a.id).n}</span></label>`).join("");
  return `<section class="card glass ${prefix}wf" style="gap:12px">${mxCss(prefix)}${hov}${mxHead("M5", "The mix, as a hundred squares", "each square is ₹1 of every ₹100 · grouped by purpose, hover an account to find its squares")}<div style="display:flex;gap:28px;align-items:center;flex-wrap:wrap"><div style="display:grid;grid-template-columns:repeat(10,1fr);gap:5px;width:300px;height:300px;flex-shrink:0">${sq}</div><div style="flex:1 1 220px;display:flex;flex-direction:column;gap:2px"><span class="card-note" style="margin-bottom:6px">Every ₹100 you hold, and where it sits</span>${rows}</div></div>${mxFoot()}</section>`;
}

/** The ring texture on marks: faint circles from the bottom-right corner, white on dark marks and ink on light ones (RingTexture in the app). */
export const RT = `<style>
.wk-stack > i, .rt, .rt-i, .mxs { position: relative; }
.wk-stack > i::after, .rt::after, .rt-i::after, .mxs::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.26) 0 1px, transparent 1px 15px); }
.rt-i::after { background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(0.42 0.1 152 / 0.16) 0 1px, transparent 1px 15px); }
</style>`;
