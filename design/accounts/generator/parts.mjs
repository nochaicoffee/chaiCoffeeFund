// Building blocks shared by the Accounts directions: what a pick shows, the radios that hold it,
// covers and tiles, the hero captions, "Where it sits", balance history and the money-out card.
import * as L from "./lib.mjs";
const { inr, signed, inrL, inrS, fmt, fmtY, fmtSmart, ago, monYear, monName, I, btn, iconBtn, rings, grad, mono, allMono, chg, freshPill, derivedTag } = L;

// ---------- The pick ----------
/** All at the centre, then active accounts by balance, then closed ones. */
export const ORDER = [...L.ACTIVE].sort((a, b) => (L.latest(b.id)?.balance ?? 0) - (L.latest(a.id)?.balance ?? 0)).concat(L.CLOSED);
export const IDS = ["all", ...ORDER.map((a) => a.id)];
const lastUpdated = () => L.ACTIVE.map((a) => L.latest(a.id)?.date).sort().at(-1);

/** Everything a hero or panel shows, for All or one account. */
export function facts(id) {
  if (id === "all") {
    const r = L.rangeIn(null);
    const oct = L.monthFlows(L.monthKey(L.TODAY));
    return { all: true, id, name: "All accounts", short: "All", color: "emerald", on: true, balance: L.TOTAL, count: L.ACTIVE.length, sinceJan: L.sinceJan(), asOf: lastUpdated(), range: r, stale: false, staleList: L.STALE, month: oct, fresh: L.ACTIVE.length - L.STALE.length };
  }
  const a = L.acc(id), l = L.latest(id), p = L.previous(id);
  return { all: false, id, a, name: a.name, short: a.name, bank: a.bank, color: a.color, on: L.isOn(a), stale: L.isStale(a), purpose: a.purpose, type: a.accountType,
    balance: l?.balance ?? null, asOf: l?.date ?? null, prev: p, chg: L.change(id), sinceJan: L.sinceJan(id), range: L.rangeIn(id, L.isOn(a) ? L.YEAR : L.HISTORY), share: L.isOn(a) && l ? l.balance / L.TOTAL : 0,
    snaps: L.snapsOf(id).length, opened: a.startDate, closedOn: L.closedOn(a), interval: L.lastInterval(id) };
}
export const FACTS = Object.fromEntries(IDS.map((id) => [id, facts(id)]));

// ---------- The green stage, and selection in the pick's own colour ----------
// Prathik likes the green background (2026-10-21), and the selection has to stand out on it: the picked item takes
// its account's colour; All, being green itself, is picked out in white on the green and in emerald on paper.
export const hue = (id) => (id === "all" ? "emerald" : FACTS[id].color);
export const selSoft = (id) => (id === "all" ? "oklch(0.98 0.01 140)" : `color-mix(in srgb, var(--card-${hue(id)}) 72%, white)`);
export const selTint = (id, p = 16) => `color-mix(in srgb, var(--card-${hue(id)}) ${p}%, transparent)`;
export const GREEN_BG = "radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-emerald-from), var(--card-emerald-to))";
export function greenStage(inner, { ph = false, pad, gap = 16, style = "" } = {}) {
  return `<section class="card glass textured stage-dark" style="gap:${gap}px;padding:${pad ?? (ph ? "16px" : "22px 24px 24px")};background:${GREEN_BG};overflow:hidden;${style}">${rings(1400, 700, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${inner}</section>`;
}

/** Selector items carry inline styles, so the picked item's rules are marked !important to win over them. */
export const important = (css) => css.replace(/\{([^{}]*)\}/g, (m, body) => `{${body.split(";").map((d) => (d.trim() && !d.includes("!important") ? `${d} !important` : d)).join(";")}}`);
/**
 * The radios that hold the pick, plus CSS: the picked hero pane shows, and `selCss(dsel, id)` adds a
 * direction's own rules for that pick. Marks in the charts carry `acm ac-<id>`, and fade unless picked.
 */
export function picker(prefix, selCss = () => "", sel = "all", { extraRadios = "" } = {}) {
  const d = `.${prefix}dir`;
  const radios = IDS.map((id) => `<input type="radio" class="pk-in" name="${prefix}-sel" id="${prefix}-sel-${id}"${id === sel ? " checked" : ""} aria-label="${FACTS[id].name}">`).join("") + extraRadios;
  const css = `<style>
    ${IDS.map((id) => `${d}:has(#${prefix}-sel-${id}:checked) .hp-${id} { display: block; }
    ${d}:has(#${prefix}-sel-${id}:checked) .hpf.hp-${id} { display: flex; }`).join("\n")}
    ${IDS.filter((id) => id !== "all").map((id) => `${d}:has(#${prefix}-sel-${id}:checked) .acm:not(.ac-${id}) { opacity: 0.14; }
    ${d}:has(#${prefix}-sel-${id}:checked) .acm-all { opacity: 0 !important; }`).join("\n")}
    ${d}:has(#${prefix}-sel-all:checked) .acm-one { opacity: 0 !important; }
    ${important(IDS.map((id) => selCss(`${d}:has(#${prefix}-sel-${id}:checked)`, id)).join("\n"))}
  </style>`;
  return { css, open: `<div class="${prefix}dir" style="display:flex;flex-direction:column;gap:20px">${radios}`, close: "</div>" };
}
/** One pane per pick; only the picked one shows. */
export const panes = (render, opts = {}, { flex = false, style = "" } = {}) => IDS.map((id) => `<div class="hp${flex ? " hpf" : ""} hp-${id}"${flex || style ? ` style="${flex ? "flex-direction:column;flex:1 1 auto;" : ""}${style}"` : ""}>${render(FACTS[id], opts)}</div>`).join("");
/** A selector item: a label for the pick's radio. */
export const item = (prefix, id, inner, { cls = "", style = "" } = {}) => `<label for="${prefix}-sel-${id}" class="sx sx-${id} ${cls}" style="${style}">${inner}</label>`;

// ---------- Greeting ----------
export function lede() {
  const st = L.STALE[0];
  return `Your <b>${L.ACTIVE.length} accounts</b> hold <b>${inr(L.TOTAL)}</b>, up <b>${inr(L.sinceJan())}</b> since January. <b>${L.rangeIn(null).hi.k === "2026-03" ? "March" : monYear(L.rangeIn(null).hi.k)}</b> was the high point at <b>${inr(L.rangeIn(null).hi.v)}</b>.${st ? ` <b>${st.name}</b> was last updated on <b>${fmt(L.latest(st.id).date)}</b>.` : ""}`;
}
export const greetingActions = () => `${L.periodPill()}${btn("Update balances", { icon: I.check(12) })}${btn("Add account", { kind: "primary", icon: I.plus() })}`;
export const greeting = ({ phone: ph = false } = {}) => L.header({ lede: lede(), phone: ph, actions: ph ? `${btn("Update balances", { kind: "primary", icon: I.check(12) })}${btn("Add account", { icon: I.plus() })}` : greetingActions() });

// ---------- Small charts ----------
/** A small line of an account's (or the total's) balance over the history, for tiles and rows. */
export function spark(id, { w = 120, h = 32, keys = L.LAST12, stroke = "currentColor", fill = "", width = 1.8, dots = false } = {}) {
  const vals = keys.map((k) => (id === "all" ? L.totalAtMonth(k) : L.atMonth(id, k)));
  const known = vals.filter((v) => v != null);
  if (known.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const lo = Math.min(...known), hi = Math.max(...known), pad = 3;
  const X = (i) => pad + (i / (keys.length - 1)) * (w - pad * 2), Y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  let d = "", first = -1;
  vals.forEach((v, i) => { if (v == null) return; d += `${first < 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)} `; if (first < 0) first = i; });
  const lastI = vals.length - 1 - [...vals].reverse().findIndex((v) => v != null);
  const area = fill ? `<path d="${d} L${X(lastI).toFixed(1)},${h} L${X(first).toFixed(1)},${h} Z" fill="${fill}"></path>` : "";
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block;overflow:visible">${area}<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"></path>${dots ? `<circle cx="${X(lastI)}" cy="${Y(vals[lastI])}" r="2.6" fill="${stroke}"></circle>` : ""}</svg>`;
}

// ---------- Covers (direction A) and tiles (direction B) ----------
const tileBg = (f) => (f.all ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),${grad("emerald", 150)}` : grad(f.color));
export function cover(f, w = 220, h = 156, { reflect = true, small = false } = {}) {
  const top = f.all ? (f.count ? `${f.count} active` : "")  : f.on ? L.purposeName(f.purpose) : "Closed";
  const foot = f.all ? (f.count ? `${f.fresh} of ${f.count} updated this month` : "No accounts yet") : f.balance == null ? "Add its first balance" : !f.on ? `Closed ${fmtSmart(f.closedOn)}` : f.stale ? `${I.clock(10)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)}d ago` : `Updated ${fmt(f.asOf)}`;
  return `<div class="cov textured" style="width:${w}px;height:${h}px;border-radius:${small ? 14 : 18}px;padding:${small ? "10px 12px" : "14px 16px"};color:var(--on-card);background:${tileBg(f)};display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 18px 30px oklch(0 0 0 / 0.28);${reflect ? "-webkit-box-reflect:below 6px linear-gradient(transparent 62%, oklch(1 0 0 / 0.22));" : ""}${f.on ? "" : "filter:grayscale(0.85)"}">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
    <div class="between"><span style="width:${small ? 24 : 30}px;height:${small ? 24 : 30}px;border-radius:9px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${small ? 11 : 13}px">${f.all ? I.accounts(small ? 12 : 15) : L.esc(f.bank[0])}</span><span style="font-size:10px;font-weight:700;color:var(--on-card-faint)">${top}</span></div>
    <div><b style="display:block;font-size:${small ? 13 : 17}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.short}</b><span style="display:block;font-size:${small ? 12 : 15}px;font-weight:800;margin-top:1px">${f.balance == null ? "No balance yet" : inr(f.balance)}</span>${small ? "" : `<span style="display:flex;align-items:center;gap:4px;margin-top:3px;font-size:10px;font-weight:700;color:${f.stale ? "oklch(0.9 0.11 85)" : "var(--on-card-faint)"}">${foot}</span>`}</div></div>`;
}

/** An account tile, as the Cards tiles: bank, name, balance, a line of the last 12 months, freshness. */
export function tile(f, { w = 268, h = 186, ph = false } = {}) {
  const right = f.all ? `${f.count} accounts` : f.bank;
  const pill = f.all && !f.count ? `<span class="t-pill">No accounts yet</span>` : !f.all && f.balance == null ? `<span class="t-pill">No balance yet</span>` : f.all ? `<span class="t-pill">${f.staleList.length ? `${f.fresh} of ${f.count} up to date` : "All up to date"}</span>` : !f.on ? `<span class="t-pill">${I.lock(9)} Closed ${fmt(f.closedOn)}</span>` : f.stale ? `<span class="t-pill stale">${I.clock(9)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)}d</span>` : `<span class="t-pill">Updated ${fmt(f.asOf)}</span>`;
  const delta = f.all ? (f.count ? f.sinceJan : null) : f.on ? f.chg : null;
  const deltaTxt = delta == null ? "" : `<span class="t-faint" style="color:${delta >= 0 ? "var(--on-card-lime)" : "oklch(0.85 0.09 30)"};font-weight:800">${signed(delta)}</span>`;
  return `<div class="atile${f.on ? "" : " off"}" style="width:${w}px;height:${h}px;background:${tileBg(f)}">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.06, count: 9 })}
    <div class="between"><span class="bank">${f.all ? I.accounts(14) : L.esc(f.bank[0])}</span><span class="t-faint">${right}</span></div>
    <div><div style="font-size:${ph ? 14 : 15}px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div><div style="font-size:${ph ? 18 : 21}px;font-weight:800;letter-spacing:-0.01em;margin-top:2px">${f.balance == null ? "—" : inr(f.balance)}</div>
    <div style="margin:6px 0 8px;color:${f.all ? "var(--on-card-lime)" : "oklch(1 0 0 / 0.75)"}">${f.all && !f.count ? `<svg width="${w - 32}" height="${ph ? 18 : 22}"></svg>` : spark(f.id, { w: w - 32, h: ph ? 18 : 22, stroke: "currentColor", fill: "oklch(1 0 0 / 0.08)", width: 1.6 })}</div>
    <div class="between">${pill}${deltaTxt}</div></div></div>`;
}
export const addTile = (w = 200, h = 186, label = "Add account") => `<div class="addtile" style="width:${w}px;height:${h}px">${I.plus(16)}${label}</div>`;

// ---------- Hero captions (direction A's coloured stage) ----------
const stat = (k, v, s = "") => `<div class="hstat"><span class="k">${k}</span><b class="v">${v}</b>${s ? `<span class="s">${s}</span>` : ""}</div>`;
/** The bar under the balance: for All, each account's share; for an account, where it sits in its year's range. */
export function heroBar(f, { ph = false } = {}) {
  const h = ph ? 8 : 10;
  if (f.all) {
    const segs = ORDER.filter((a) => L.isOn(a)).map((a) => { const b = L.latest(a.id).balance; return `<span title="${a.name}" style="flex:${b};background:color-mix(in oklch, var(--card-${a.color}) 62%, white)"></span>`; }).join("");
    return `<div style="display:flex;gap:3px;height:${h}px;border-radius:999px;overflow:hidden">${segs}</div><div class="between" style="margin-top:7px;font-size:11.5px;font-weight:700;color:var(--muted)"><span>${ORDER.filter((a) => L.isOn(a)).slice(0, ph ? 3 : 5).map((a) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><i style="width:8px;height:8px;border-radius:3px;background:color-mix(in oklch, var(--card-${a.color}) 62%, white)"></i>${a.bank.split(" ")[0]} ${L.pct(L.latest(a.id).balance, L.TOTAL)}</span>`).join("")}</span>${ph ? "" : `<span>${inr(L.TOTAL)} in all</span>`}</div>`;
  }
  if (!f.on) return `<div style="height:${h}px;border-radius:999px;background:var(--fill)"></div><div class="between" style="margin-top:7px;font-size:11.5px;font-weight:700;color:var(--muted)"><span>Opened ${fmtY(f.opened)}</span><span>Closed ${fmtY(f.closedOn)}</span></div>`;
  const { lo, hi, avg } = f.range;
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo.v) / (hi.v - lo.v || 1)) * 100));
  return `<div style="position:relative;height:${h}px;border-radius:999px;background:var(--fill)"><div class="pk-bar" style="width:${Math.max(pos(f.balance), 3)}%;height:100%;border-radius:inherit;background:var(--accent)"></div><span style="position:absolute;left:${pos(avg)}%;top:-5px;bottom:-5px;width:2px;border-radius:2px;background:var(--fg);opacity:0.55"></span></div><div class="between" style="margin-top:7px;font-size:11.5px;font-weight:700;color:var(--muted)"><span>Low ${inrS(lo.v)} · ${monName(lo.k)}</span><span>avg ${inrS(avg)}</span><span>High ${inrS(hi.v)} · ${monName(hi.k)}</span></div>`;
}
export function actions(f, { cls = "btn-sm" } = {}) {
  if (f.all) return `${btn("Update balances", { kind: "primary", cls, icon: I.check(11) })}${btn("Add account", { kind: "soft", cls, icon: I.plus(11) })}`;
  if (!f.on) return `${btn("Reopen", { kind: "primary", cls, icon: I.play(10) })}${btn("Edit", { kind: "soft", cls, icon: I.edit(11) })}`;
  return `${btn("Update balance", { kind: "primary", cls: `${cls}${f.stale ? " pulse-btn" : ""}`, icon: I.check(11) })}${btn("Edit", { kind: "soft", cls, icon: I.edit(11) })}${iconBtn(I.more(), "Close account")}`;
}
export function whenLine(f) {
  if (f.all) return `${signed(f.sinceJan)} since Jan 1 · latest update ${fmt(f.asOf)}`;
  if (!f.on) return `Closed ${fmtY(f.closedOn)} · its final balance`;
  if (f.balance == null) return "No balance yet";
  if (f.stale) return `<span class="pill pill-stale pulse">${I.clock(10)} Last updated ${fmt(f.asOf)} · ${ago(f.asOf)}</span>`;
  return `Updated ${fmt(f.asOf)} · ${signed(f.chg)} since ${fmt(f.prev.date)}`;
}
export function heroCaption(f, { ph = false } = {}) {
  const eyebrow = f.all ? `Everything · ${f.count} active accounts` : `${L.purposeName(f.purpose)} · ${f.bank} · ${f.on ? f.type : "Closed"}`;
  const out = f.all ? f.month : null;
  const stats = f.all
    ? [stat("This month", signed(f.month.delta), "since Sep 30"), stat("High point", inr(f.range.hi.v), monYear(f.range.hi.k)), stat("Out to bills", inr(f.month.out), "in October · worked out"), stat("Up to date", `${f.fresh} of ${f.count}`, f.staleList.length ? `${f.staleList[0].name}: ${fmt(L.latest(f.staleList[0].id).date)}` : "all this month")]
    : !f.on
      ? [stat("Was open", `${fmtY(f.opened).slice(-4)} – ${fmtY(f.closedOn).slice(-4)}`, `${f.snaps} balances recorded`), stat("Highest", inr(f.range.hi.v), monYear(f.range.hi.k)), stat("First balance", inr(L.snapsOf(f.id)[0].balance), monYear(L.snapsOf(f.id)[0].date.slice(0, 7))), stat("Counts in totals", "Until it closed", "₹0 from Mar 31")]
      : [stat("Since Jan 1", signed(f.sinceJan), `from ${inr(L.yearStart(f.id))}`), stat("Share", L.pct(f.balance, L.TOTAL), `of ${inr(L.TOTAL)}`), stat("Out to bills", inr(f.interval?.out ?? 0), `since ${fmt(f.prev.date)} · worked out`), f.stale ? stat("Updated", ago(f.asOf), "older than a month") : stat("Updated", fmt(f.asOf), `${f.snaps} balances since ${fmtY(L.snapsOf(f.id)[0].date).slice(-4)}`)];
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:${ph ? 8 : 10}px;text-align:center;padding:${ph ? "6px 0 0" : "4px 0 0"}">
    <span class="eyebrow" style="font-size:${ph ? 10.5 : 12}px">${eyebrow}</span>
    <b style="font-size:${ph ? 34 : 46}px;font-weight:800;letter-spacing:-0.015em;line-height:1">${f.balance == null ? "—" : inr(f.balance)}</b>
    <span style="font-size:${ph ? 12.5 : 13.5}px;font-weight:700;color:var(--muted)">${f.all ? "" : `<b style="color:var(--fg)">${f.name}</b> · `}${whenLine(f)}</span>
    <div style="width:${ph ? "100%" : "560px"};margin-top:${ph ? 4 : 8}px;text-align:left">${heroBar(f, { ph })}</div>
    <div style="display:grid;grid-template-columns:repeat(${ph ? 2 : 4},minmax(0,1fr));gap:${ph ? "12px 16px" : "0"};width:${ph ? "100%" : "700px"};margin-top:${ph ? 6 : 10}px;text-align:left">${stats.map((s, i) => `<div style="${ph ? "" : `padding:0 18px;${i ? "border-left:1px solid var(--divider)" : ""}`}">${s}</div>`).join("")}</div>
    <div class="row" style="gap:8px;margin-top:${ph ? 6 : 8};justify-content:center">${actions(f)}</div></div>`;
}

// ---------- Where it sits (a treemap of balances) ----------
/** Squarified treemap in percent, so it fills whatever box it's in. */
export function squarify(items, x = 0, y = 0, w = 100, h = 100) {
  const total = items.reduce((t, i) => t + i.v, 0);
  const out = [];
  let rest = items.map((i) => ({ ...i, a: (i.v / total) * w * h }));
  while (rest.length) {
    const short = Math.min(w, h);
    let row = [rest[0]], best = Infinity;
    for (let k = 1; k <= rest.length; k++) {
      const r = rest.slice(0, k), s = r.reduce((t, i) => t + i.a, 0);
      const worst = Math.max(...r.map((i) => Math.max((short * short * i.a) / (s * s), (s * s) / (short * short * i.a))));
      if (worst > best) break;
      best = worst; row = r;
    }
    const s = row.reduce((t, i) => t + i.a, 0);
    if (w >= h) { const cw = s / h; let cy = y; for (const i of row) { const ch = i.a / cw; out.push({ ...i, x, y: cy, w: cw, h: ch }); cy += ch; } x += cw; w -= cw; }
    else { const rh = s / w; let cx = x; for (const i of row) { const cw = i.a / rh; out.push({ ...i, x: cx, y, w: cw, h: rh }); cx += cw; } y += rh; h -= rh; }
    rest = rest.slice(row.length);
  }
  return out;
}
export function sitsMap(prefix, { h = 380, gap = 6, ph = false, pickable = true } = {}) {
  const items = ORDER.filter((a) => L.isOn(a)).map((a) => ({ id: a.id, v: L.latest(a.id).balance, a }));
  const blocks = squarify(items, 0, 0, 100, 100).map((b) => {
    const f = FACTS[b.id];
    const big = b.w > 30 && b.h > 30, tiny = b.w < 14 || b.h < 16;
    const inner = `${rings(400, 300, { stroke: "var(--rings-light)", opacity: 0.06, count: 10 })}<span class="tb-p">${L.pct(b.v, L.TOTAL)}</span><div>${tiny ? `<b style="font-size:12px">${f.bank.split(" ")[0]}</b>` : `<b>${f.name}</b><div class="tb-s">${L.purposeName(f.purpose)} · ${f.bank}</div>`}</div>${tiny ? `<span class="tb-s" style="font-weight:800;color:var(--on-card)">${inrS(b.v)}</span>` : `<div><div class="tb-v" style="font-size:${big ? 24 : 17}px">${inr(b.v)}</div>${big || b.h > 26 ? `<div class="tb-s" style="margin-top:2px">${f.stale ? `${I.clock(10)} Updated ${fmt(f.asOf)} · older than a month` : `Updated ${fmt(f.asOf)} · ${signed(f.chg)}`}</div>` : ""}</div>`}`;
    const style = `left:calc(${b.x}% + ${gap / 2}px);top:calc(${b.y}% + ${gap / 2}px);width:calc(${b.w}% - ${gap}px);height:calc(${b.h}% - ${gap}px);background:${grad(f.color)};${tiny ? "padding:8px 10px;" : ""}`;
    return pickable && !ph ? `<label for="${prefix}-sel-${b.id}" class="tblock acm ac-${b.id}" style="${style}">${inner}</label>` : `<div class="tblock" style="${style}">${inner}</div>`;
  }).join("");
  return `<div class="tmap" style="height:${h}px;margin:-${gap / 2}px">${blocks}</div>`;
}
export function sitsCard(prefix, { minH = 0 } = {}) {
  const groups = L.PURPOSES.map((p) => ({ p, v: L.ACTIVE.filter((a) => a.purpose === p).reduce((t, a) => t + L.latest(a.id).balance, 0) })).filter((g) => g.v);
  return `<section class="card glass"${minH ? ` style="min-height:${minH}px"` : ""}><div class="card-h"><span class="card-t">Where it sits<small>sized by balance · pick one to see its history</small></span>${L.seg([{ label: "By account", on: true }, { label: "By purpose" }])}</div>
    <div style="flex:1 1 auto;display:flex;flex-direction:column;min-height:300px"><div style="flex:1 1 auto;position:relative">${sitsMap(prefix, { h: 0 }).replace('style="height:0px;', 'style="position:absolute;inset:0;')}</div></div>
    <div class="legend">${groups.map((g) => `<span>${L.purposeIcon(g.p, 12)}${L.purposeName(g.p)} <b>${inr(g.v)}</b> ${L.pct(g.v, L.TOTAL)}</span>`).join("")}</div>
    <div class="row" style="gap:8px;border-top:1px solid var(--divider);padding-top:12px"><span class="card-note">Not in the map:</span>${L.CLOSED.map((a) => `<label for="${prefix}-sel-${a.id}" class="chip" style="cursor:pointer">${mono(a, 18)}${a.name}<em>closed</em></label>`).join("")}</div></section>`;
}

// ---------- Balance history ----------
function snapRows(f, n, { ph = false, allCols = false } = {}) {
  const rows = f.all ? L.SNAPSHOTS.filter((s) => L.isOn(L.acc(s.accountId))).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n) : L.snapsOf(f.id).slice().reverse().slice(0, n);
  return rows.map((s) => {
    const a = L.acc(s.accountId), list = L.snapsOf(a.id), i = list.findIndex((x) => x.date === s.date), p = list[i - 1];
    const d = p ? s.balance - p.balance : null, gap = p ? L.daysBetween(p.date, s.date) : null;
    return `<div class="snaprow" style="display:grid;grid-template-columns:${f.all ? (ph ? "1.4fr 1fr" : "1.6fr 0.8fr 1fr 0.9fr 0.8fr 20px") : ph ? "1fr 1fr 0.8fr" : "1fr 1fr 1fr 0.9fr 20px"};align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider);font-size:13px">
      ${f.all ? `<span class="cell-name">${mono(a, 26)}<span style="min-width:0"><b>${a.name}</b>${ph ? `<small>${fmtSmart(s.date)}</small>` : ""}</span></span>${ph ? "" : `<span style="font-weight:600">${fmtSmart(s.date)}</span>`}` : `<span style="font-weight:600">${fmtSmart(s.date)}</span>`}
      <b class="num"${ph && f.all ? ' style="text-align:right"' : ""}>${inr(s.balance)}${ph && f.all ? `<span class="sub2" style="text-align:right">${d == null ? "first" : chg(d)}</span>` : ""}</b>
      ${ph && f.all ? "" : `<span>${d == null ? `<span class="muted" style="font-size:12px;font-weight:600">First balance</span>` : chg(d)}</span>`}
      ${ph ? "" : `<span class="muted" style="font-size:12px;font-weight:600">${gap == null ? "—" : `${gap} days`}</span><span class="muted" style="display:flex;justify-content:flex-end">${I.edit(13)}</span>`}</div>`;
  }).join("");
}
export function historyPane(f, { n = 6, ph = false } = {}) {
  const head = f.all ? (ph ? ["Account", "Balance"] : ["Account", "Date", "Balance", "Change", "Gap"]) : ph ? ["Date", "Balance", "Change"] : ["Date", "Balance", "Change", "Gap"];
  const cols = f.all ? (ph ? "1.4fr 1fr" : "1.6fr 0.8fr 1fr 0.9fr 0.8fr 20px") : ph ? "1fr 1fr 0.8fr" : "1fr 1fr 1fr 0.9fr 20px";
  const stale = !f.all && f.stale ? `<div class="notice" style="margin-bottom:6px">${I.clock(14)}<span class="grow">No balance since <b>${fmt(f.asOf)}</b>. Its ${inr(f.balance)} is still counted in your total until you update it.</span>${btn("Update", { kind: "primary", cls: "btn-xs" })}</div>` : "";
  const closed = !f.all && !f.on ? `<div class="notice" style="margin-bottom:6px;background:var(--fill);color:var(--muted)">${I.lock(13)}<span class="grow" style="color:var(--muted)">Closed on <b style="color:var(--fg)">${fmtY(f.closedOn)}</b> with a final balance of ₹0. Its history stays.</span></div>` : "";
  const count = f.all ? L.SNAPSHOTS.length : f.snaps;
  return `${stale}${closed}<div style="display:grid;grid-template-columns:${cols};gap:12px;padding-bottom:8px;border-bottom:1px solid var(--divider)">${head.map((h, i) => `<span class="th"${ph && f.all && i === 1 ? ' style="text-align:right"' : ""}>${h}</span>`).join("")}${ph ? "" : "<span></span>"}</div><div class="spread" style="gap:0;justify-content:flex-start">${snapRows(f, n, { ph })}</div>
    <div class="between foot" style="padding-top:12px"><span class="card-note">${f.all ? `The ${n} latest of ${count} balances` : `${count} balances since ${fmtY(L.snapsOf(f.id)[0].date)}`}</span><span class="link">${f.all ? "All balances" : "All of its balances"} ${I.arrowR()}</span></div>`;
}
export function historyCard(prefix, { n = 6, title = "Balance history", ph = false } = {}) {
    return `<section class="card glass" style="gap:10px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t row" style="gap:10px">${title} <span class="muted" style="font-weight:600">·</span> ${panes((f) => (f.all ? "All accounts" : `<span class="row" style="gap:8px">${mono(f.a, 22)}${f.name}</span>`))}</span>${ph ? "" : btn("Update balance", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div>${panes((f) => historyPane(f, { n, ph }), {}, { flex: true })}</section>`;
}

// ---------- Money out (worked out from the rest of the app) ----------
export function outPane(f, { ph = false, keys = L.YEAR } = {}) {
  const ids = f.all ? L.ACCOUNTS.map((a) => a.id) : [f.id];
  const months = keys.map((k) => L.monthFlows(k, f.all ? null : f.id));
  const list = months.flatMap((m) => m.list);
  const rows = [
    { k: "card", name: "Card bills", v: L.sumKind(list, "card"), sub: Object.keys(L.CARDS).map((c) => ({ c, v: list.filter((x) => x.ref === c).reduce((t, x) => t + x.amount, 0) })).filter((x) => x.v).map((x) => `${L.CARDS[x.c].name} ${inrS(x.v)}`).join(" · ") },
    { k: "sub", name: "Subscriptions", v: L.sumKind(list, "sub"), sub: [...new Set(list.filter((x) => x.kind === "sub").map((x) => x.label))].join(", ") + (L.sumKind(list, "sub") ? " · charged straight here" : "") },
    { k: "emi", name: "Loan EMIs", v: L.sumKind(list, "emi"), sub: list.some((x) => x.kind === "emi") ? `Car loan · ${list.filter((x) => x.kind === "emi").length} EMIs` : "" },
    { k: "invest", name: "Investments", v: L.sumKind(list, "invest"), sub: list.some((x) => x.kind === "invest") ? `${list.filter((x) => x.kind === "invest").length} buys` : "" },
  ].filter((r) => r.v);
  const other = months.reduce((t, m) => t + m.other, 0), inn = L.sumIn(list);
  const max = Math.max(...rows.map((r) => r.v), Math.abs(other), 1);
  const bar = (v, color, dashed = false) => `<div class="track" style="height:7px"><span style="width:${(Math.abs(v) / max) * 100}%;background:${dashed ? `repeating-linear-gradient(135deg, var(--fill-strong) 0 5px, transparent 5px 9px)` : color}"></span></div>`;
  const body = rows.length ? rows.map((r) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="between" style="font-size:13px"><span class="row" style="gap:9px;min-width:0"><i style="width:9px;height:9px;border-radius:3px;background:${L.KINDS[r.k].color};flex-shrink:0"></i><b style="font-weight:700">${r.name}</b>${ph ? "" : `<span class="muted" style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.sub}</span>`}</span><b class="num">${inr(r.v)}</b></div>${bar(r.v, L.KINDS[r.k].color)}</div>`).join("") : `<p class="card-note" style="padding:10px 0">Nothing recorded goes out of ${f.name}: no card bills, subscriptions or EMIs are paid from it.</p>`;
  const otherRow = `<div style="display:flex;flex-direction:column;gap:6px"><div class="between" style="font-size:13px"><span class="row" style="gap:9px"><i style="width:9px;height:9px;border-radius:3px;background:repeating-linear-gradient(135deg, var(--muted) 0 2px, transparent 2px 4px);flex-shrink:0"></i><b style="font-weight:700">Everything else</b>${ph ? "" : `<span class="muted" style="font-size:12px;font-weight:600">UPI, transfers, cash: what the change leaves over</span>`}</span><b class="num" style="color:var(--muted)">${signed(other)}</b></div>${bar(other, "", true)}</div>`;
  return `<div class="spread" style="gap:14px">${body}${f.on || f.all ? otherRow : ""}</div><div class="between foot" style="padding-top:10px;border-top:1px solid var(--divider)"><span class="card-note">${inn ? `Came in: <b style="color:var(--fg)">${inr(inn)}</b> recorded income · ` : ""}${f.all ? "between your own accounts, transfers cancel out" : "this year"}</span>${derivedTag("Worked out, not a statement")}</div>`;
}
export function outCard(prefix, { ph = false, title = "Money out" } = {}) {
  return `<section class="card glass" style="gap:12px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">${title}<small>this year · from your card bills, subscriptions and EMIs</small></span></div>${panes((f) => outPane(f, { ph }), {}, { flex: true })}</section>`;
}
