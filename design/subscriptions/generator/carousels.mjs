// Directions S1–S6: circular carousels that grew out of S (cover flow). All sits at the centre with the
// subscriptions on both sides, in renewal order clockwise; picking one turns it to the front.
// Each has a colour band like the Cards details header, a hero, and a chart widget that follows the pick.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./c.mjs";
import * as CORE from "./core.mjs";
import * as SC from "./selcore.mjs";
import * as S1 from "./sel1.mjs";
import * as CH from "./charts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, I, btn, iconBtn, rings, desktop, phone } = L;
const { facts, subOf, IDS, ORDER, STOPPED, icon, grad, actions, whenLine, changeText, viaText, stat, item } = SC;
const N = IDS.length, TH = 360 / N;
export const wrap = (i, k) => { let d = i - k; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };
const rad = (deg) => (deg * Math.PI) / 180;
const EASE = "transition: transform 700ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity 450ms, filter 450ms;";

/** Transform rules for every card, for the pick `id`. place(d) gives the card d steps from the front. */
export const placeRules = (dsel, id, place) => IDS.map((jid, i) => { const p = place(wrap(i, IDS.indexOf(id))); return `${dsel} .sx-${jid} { transform: ${p.t}; z-index: ${p.z}; opacity: ${p.o};${p.f ? ` filter: ${p.f};` : ""} }`; }).join("\n");
export const navRules = (dsel, id) => `${dsel} .cnav-${id} { display: flex; }`;

/** Previous / next arrows: one pair per pick, so stepping wraps round the circle. */
export function nav(prefix, { vertical = false, inset = 14, bottom = null } = {}) {
  return IDS.map((id, k) => {
    const prev = IDS[(k - 1 + N) % N], next = IDS[(k + 1) % N];
    const arrow = (to, dir) => `<label for="${prefix}-sel-${to}" class="btn btn-icon" style="pointer-events:auto;width:42px;min-height:42px;box-shadow:var(--pop-shadow)" aria-label="${dir === "prev" ? "Previous" : "Next"}: ${facts(subOf(to)).alias}">${vertical ? (dir === "prev" ? I.chevR(14).replace("9 6 15 12 9 18", "6 15 12 9 18 15") : I.chev(14)) : dir === "prev" ? I.chevR(14).replace("9 6 15 12 9 18", "15 6 9 12 15 18") : I.chevR(14)}</label>`;
    return `<div class="cnav cnav-${id}" style="position:absolute;${vertical ? `left:50%;top:${inset}px;bottom:${inset}px;flex-direction:column;transform:translateX(-50%)` : bottom != null ? `left:${inset}px;right:${inset}px;bottom:${bottom}px` : `left:${inset}px;right:${inset}px;top:50%;transform:translateY(-50%)`};justify-content:space-between;pointer-events:none;z-index:80">${arrow(prev, "prev")}${arrow(next, "next")}</div>`;
  }).join("");
}
export const NAV_CSS = `<style>.cnav { display: none; }</style>`;

/** The cover, as on S. */
export function tile(f, w, h, { reflect = false, small = false } = {}) {
  return `<div class="cov textured" style="width:${w}px;height:${h}px;border-radius:${small ? 14 : 18}px;padding:${small ? "10px 12px" : "14px 16px"};color:var(--on-card);background:${f.all ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),${grad(f, 150)}` : grad(f)};display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 18px 30px oklch(0 0 0 / 0.28);${reflect ? "-webkit-box-reflect:below 6px linear-gradient(transparent 62%, oklch(1 0 0 / 0.22));" : ""}${f.all || f.on ? "" : "filter:grayscale(0.8)"}">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
    <div class="between"><span style="width:${small ? 24 : 30}px;height:${small ? 24 : 30}px;border-radius:9px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${small ? 11 : 13}px">${f.all ? I.subs(small ? 12 : 14) : f.alias[0]}</span><span style="font-size:10px;font-weight:700;color:var(--on-card-faint)">${f.all ? `${L.ACTIVE.length} active` : f.on ? f.cycle : f.status}</span></div>
    <div><b style="display:block;font-size:${small ? 13.5 : 18}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.alias}</b><span style="font-size:${small ? 11 : 12}px;font-weight:600;color:var(--on-card-muted)">${inr(f.all ? f.monthly : f.amount)} / ${f.all ? "month" : f.cycleWord}</span></div></div>`;
}
export const cards = (prefix, render, { ph = false, base = "" } = {}) => IDS.map((id) => item(prefix, id, render(facts(subOf(id))), { ph, style: `position:absolute;${base}${EASE}` })).join("");

// ---------- The colour band, like the Cards details header ----------
const BAND_CSS = `<style>@keyframes band-in { from { opacity: 0.35; transform: scale(0.995); } } .cband { animation: band-in 480ms var(--ease-out); } @media (prefers-reduced-motion: reduce) { .cband { animation: none; } }</style>`;
export function band(f, { ph = false, compact = false } = {}) {
  const bg = f.all ? `radial-gradient(circle at 92% 0%, var(--card-emerald-glow), transparent 40%),${grad(f, 150)}` : `radial-gradient(circle at 92% 0%, oklch(1 0 0 / 0.16), transparent 42%),${grad(f, 150)}`;
  const frac = f.all ? f.frac : f.on ? f.share : 0;
  const big = inr(f.monthly);
  const suffix = f.all ? `a month · ${L.ACTIVE.length} active` : f.on ? `a month · ${Math.round(f.share * 100)}% of what you pay` : `a month while it ran · ${f.status.toLowerCase()}`;
  const right = f.all ? `${inr(SC.paidNow)} of ${inr(SC.paidNow + SC.toCome)} paid in October` : f.on ? `Renews ${fmtDow(f.next)} · ${rel(f.next)}` : whenLine(f);
  const left = f.all ? "October" : f.on ? `${inr(f.monthly)} of ${inr(L.MONTHLY)}` : "Not counted";
  return `<div class="cband textured" style="border-radius:${compact ? 18 : 22}px;padding:${ph ? "16px 18px" : compact ? "18px 20px" : "22px 28px"};color:var(--on-card);background:${bg};box-shadow:var(--tile-shadow);display:flex;flex-direction:column;gap:${ph ? 8 : 10}px;${f.all || f.on ? "" : "filter:grayscale(0.75)"}">${rings(1400, 170, { stroke: "var(--rings-light)", opacity: 0.07, first: 60, step: 34 })}
    <div class="between" style="gap:12px"><span class="row" style="gap:10px;font-size:13px;font-weight:700;color:var(--on-card-muted)"><span style="width:22px;height:22px;border-radius:7px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--on-card)">${f.all ? I.subs(11) : f.alias[0]}</span>${f.all ? "All subscriptions" : `${f.name} · ${f.category}`}</span>${ph ? "" : `<span style="font-size:12px;font-weight:700;padding:4px 11px;border-radius:999px;background:var(--on-card-fill)${f.on && !f.all && f.left <= 3 ? ";animation:due-pulse 2.2s ease-in-out infinite" : ""}">${right}</span>`}</div>
    <div class="row" style="gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font-size:${ph ? 32 : 44}px;font-weight:800;line-height:1;letter-spacing:-0.01em">${big}</b><span style="font-size:${ph ? 13 : 16}px;font-weight:600;color:var(--on-card-muted)">${suffix}</span></div>
    <div><div style="height:${ph ? 8 : 10}px;border-radius:999px;background:var(--on-card-fill);overflow:hidden"><div style="width:${Math.max(frac * 100, f.on || f.all ? 1.5 : 0)}%;height:100%;border-radius:inherit;background:var(--on-card-lime)"></div></div>${ph ? `<span style="display:block;margin-top:6px;font-size:11.5px;font-weight:700;color:var(--on-card-muted)">${right}</span>` : `<div class="between" style="margin-top:6px;font-size:11.5px;font-weight:700;color:var(--on-card-faint)"><span>${left}</span><span>${f.all ? `${inr(SC.toCome)} still to renew` : f.on ? `${inr(f.yearly)} a year` : ""}</span></div>`}</div></div>`;
}
const bandPanes = (opts) => `${BAND_CSS}${SC.heroPanes((f) => band(f, opts))}`;

// ---------- Facts beside a carousel (S4, S6) ----------
function sideFacts(f, { ph = false } = {}) {
  const rows = f.all ? [["Renews next", `${f.nextSub.alias} · ${fmtDow(f.next)}`], ["A year", inr(f.yearly)], ["Paid this year", `${inr(f.paidSoFar)} · ${f.payCount} payments`], ["Prices", changeText(f)], ["Charged to", viaText(f)]]
    : [["Status", whenLine(f)], ["A year", inr(f.yearly)], ["Paid so far", `${inr(f.paidSoFar)} · ${f.payCount} payments`], ["Price", changeText(f)], ["Charged to", viaText(f)], ["Since", fmtY(f.since)]];
  return `<div style="display:flex;flex-direction:column;gap:12px;height:100%"><div class="spread" style="gap:0">${rows.map(([k, v]) => `<div class="between" style="padding:10px 0;border-bottom:1px solid var(--divider);font-size:13.5px"><span class="muted" style="font-weight:600">${k}</span><b style="text-align:right">${v}</b></div>`).join("")}</div><div class="row" style="gap:8px">${actions(f)}</div></div>`;
}
const flexPanes = (render, opts) => SC.heroPanes(render, opts).replace(/class="hp hp-/g, 'style="flex:1 1 auto" class="hp hpf hp-');
const FLEX_CSS = (dsel, id) => `${dsel} .hpf.hp-${id} { display: flex; flex-direction: column; }`;

// ---------- Phone page with All picked ----------
export function phoneAllPayments() {
  return `<section class="card glass" style="padding:16px;gap:4px"><div class="between"><span class="card-t">Latest payments</span><span class="link" style="font-size:12px">All renewals ${I.arrowR(11)}</span></div>${L.PAYMENTS.slice(0, 5).map((p) => { const s = L.sub(p.subId); return `<div class="row" style="gap:10px;padding:9px 0;border-bottom:1px solid var(--divider);font-size:13px">${mono(s, 26)}<b class="grow" style="font-weight:700">${s.alias}</b><span class="muted" style="font-weight:600">${fmt(p.date)}</span><b class="num">${inr(p.amount)}</b></div>`; }).join("")}</section>`;
}
function phonePage(prefix, { selCss, selector, hero = "", chart }) {
  const fa = facts(null);
  return phone({ h: "auto", body: `${NAV_CSS}${BAND_CSS}<style>${SC.importantCss(selCss(`.phsel-${prefix}`, "all"))}</style><div class="phsel-${prefix}" style="display:flex;flex-direction:column;gap:16px">${CORE.greeting({ phone: true })}${selector}${band(fa, { ph: true })}${hero}</div>${chart}${CORE.phoneMap()}${phoneAllPayments()}` });
}
const chartCard = (title, sub, body, extra = "") => `<section class="card glass" style="gap:10px"><div class="card-h"><span class="card-t">${title}<small>${sub}</small></span>${extra}</div>${body}</section>`;

// ================= S1 · Cover-flow ring =================
export const s1Place = ({ near = 160, step = 80, rot = 55 } = {}) => (d) => { const a = Math.abs(d), sg = Math.sign(d); return d === 0 ? { t: "translateX(-50%) translateZ(70px)", z: 50, o: 1 } : { t: `translateX(calc(-50% + ${sg * (near + (a - 1) * step)}px)) rotateY(${-sg * rot}deg) scale(0.84)`, z: 50 - a, o: a >= 6 ? 0 : 1 }; };
export const s1Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--sel-ring, var(--accent)), 0 24px 40px oklch(0 0 0 / 0.35); }`;
export function s1Desktop() {
  const stage = `<div style="position:relative;height:262px;perspective:1300px;overflow:hidden;margin:0 -22px">${cards("s1", (f) => tile(f, 220, 156, { reflect: true }), { base: "left:50%;top:24px;" })}${nav("s1", { inset: 28 })}</div>`;
  const top = `${NAV_CSS}<section class="card glass" style="gap:6px;padding:8px 22px 24px;background:linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 62%)">${stage}${SC.heroPanes(S1.sHero)}</section>${bandPanes()}`;
  const mid = SC.two(chartCard("2026, round the clock", "each month's spend · the pick is drawn inside", `<div style="display:flex;justify-content:center;flex:1 1 auto;align-items:center">${SC.heroPanes((f) => CH.radialClock(f, { size: 470 }))}</div>`, `<span class="legend"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-4)"></i>Expected</span></span>`), P.renewalsPanel({ n: 9 }), "1.05fr 1fr");
  return SC.page("s1", { selCss: s1Sel(s1Place()), top, mid, sel: "all", second: "changes" });
}
export const s1Phone = () => phonePage("s1", { selCss: s1Sel(s1Place({ near: 110, step: 46, rot: 58 })), selector: `<section class="card glass" style="padding:4px 16px 16px;gap:4px;background:linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 62%)"><div style="position:relative;height:184px;perspective:900px;overflow:hidden;margin:0 -16px">${cards("s1", (f) => tile(f, 150, 106, { reflect: true, small: true }), { ph: true, base: "left:50%;top:14px;" })}</div>${S1.sHero(facts(null), { ph: true })}</section>`, chart: chartCard("2026, round the clock", "", `<div style="display:flex;justify-content:center">${CH.radialClock(facts(null), { size: 320 })}</div>`) });

// ================= S2 · 3D ring =================
const s2Place = ({ R = 440 } = {}) => (d) => { const a = Math.abs(d); return { t: `translateX(-50%) rotateY(${d * TH}deg) translateZ(${R}px)`, z: 50 - a, o: [1, 0.96, 0.86, 0.66, 0.44, 0.24, 0][a], f: `brightness(${1 - a * 0.07})` }; };
const s2Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--accent), 0 26px 40px oklch(0 0 0 / 0.35); }\n${CH.sankeyCss(dsel, id)}`;
function ringStage(prefix, { R, w, h, ph = false, height }) {
  return `<div style="position:relative;height:${height}px;perspective:${ph ? 900 : 1700}px;perspective-origin:50% 0%;overflow:hidden;margin:0 ${ph ? -16 : -22}px">
    <div style="position:absolute;left:50%;top:${ph ? 64 : 96}px;width:${2 * R}px;height:40px;margin-left:-${R}px;border-radius:50%;background:radial-gradient(closest-side, oklch(0 0 0 / 0.16), transparent);transform:translateY(${h}px) scaleY(0.5)"></div>
    <div style="position:absolute;left:50%;top:${ph ? 24 : 40}px;width:0;height:${h}px;transform-style:preserve-3d;transform:translateZ(-${R}px) rotateX(-9deg)">${cards(prefix, (f) => tile(f, w, h, { small: ph }), { ph, base: "left:0;top:0;transform-style:preserve-3d;backface-visibility:visible;" })}</div>
    ${ph ? "" : nav(prefix, { inset: 28 })}</div>`;
}
export function s2Desktop() {
  const top = `${NAV_CSS}<section class="card glass" style="gap:6px;padding:8px 22px 24px;background:linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 64%)">${ringStage("s2", { R: 440, w: 200, h: 140, height: 300 })}${SC.heroPanes(S1.sHero)}</section>${bandPanes()}`;
  const mid = chartCard("Where every rupee goes", "card or account → category → subscription, a month · the pick lights up", CH.sankey({ w: 1360, h: 380 }));
  return SC.page("s2", { selCss: s2Sel(s2Place()), top, mid, sel: "all" });
}
export const s2Phone = () => phonePage("s2", { selCss: s2Sel(s2Place({ R: 255 })), selector: `<section class="card glass" style="padding:4px 16px 16px;gap:4px">${ringStage("s2", { R: 255, w: 120, h: 86, ph: true, height: 196 })}${S1.sHero(facts(null), { ph: true })}</section>`, chart: chartCard("Where every rupee goes", "", CH.sankey({ w: 300, h: 300, ph: true })) });

// ================= S3 · Turntable (an ellipse seen from above) =================
const s3Place = ({ R = 470, squash = 0.3 } = {}) => (d) => { const a = Math.abs(d), ang = d * TH, depth = (Math.cos(rad(ang)) + 1) / 2; return { t: `translate(-50%, -50%) rotate(${90 - ang}deg) translateX(${R}px) rotate(${ang - 90}deg) scaleY(${(1 / squash).toFixed(3)}) scale(${(0.56 + 0.44 * depth).toFixed(3)})`, z: Math.round(10 + 40 * depth), o: a >= 6 ? 0.25 : 0.55 + 0.45 * depth, f: `brightness(${(0.78 + 0.22 * depth).toFixed(2)})` }; };
const s3Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--accent), 0 22px 36px oklch(0 0 0 / 0.35); }\n${CH.streamCss(dsel, id)}`;
function turntable(prefix, { R, squash, w, h, height, ph = false }) {
  return `<div style="position:relative;height:${height}px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">
    <div style="position:absolute;left:50%;top:${height * 0.42}px;width:${2 * R + 60}px;height:${(2 * R + 60) * squash}px;margin-left:-${R + 30}px;margin-top:-${((2 * R + 60) * squash) / 2}px;border-radius:50%;background:radial-gradient(closest-side, oklch(0.72 0.19 145 / 0.10), transparent 75%);border:1.5px dashed var(--fill-strong)"></div>
    <div style="position:absolute;left:50%;top:${height * 0.42}px;width:0;height:0;transform:scaleY(${squash})">${cards(prefix, (f) => tile(f, w, h, { small: ph }), { ph, base: "left:0;top:0;" })}</div>${ph ? "" : nav(prefix, { inset: 20 })}</div>`;
}
export function s3Desktop() {
  const top = `${NAV_CSS}<section class="card glass" style="gap:6px;padding:8px 22px 24px">${turntable("s3", { R: 470, squash: 0.3, w: 190, h: 132, height: 420 })}${SC.heroPanes(S1.sHero)}</section>${bandPanes()}`;
  const mid = chartCard("Two years, as a stream", "each category's monthly spend · the pick's category stands out", CH.streamgraph({ w: 1360, h: 300 }), `<span class="legend">${L.byCategory().map((c) => `<span><i style="background:var(--card-${c.color})"></i>${c.name}</span>`).join("")}</span>`);
  return SC.page("s3", { selCss: s3Sel(s3Place()), top, mid, sel: "all", second: "changes" });
}
export const s3Phone = () => phonePage("s3", { selCss: s3Sel(s3Place({ R: 150, squash: 0.42 })), selector: `<section class="card glass" style="padding:4px 16px 16px;gap:4px">${turntable("s3", { R: 150, squash: 0.42, w: 110, h: 78, height: 250, ph: true })}${S1.sHero(facts(null), { ph: true })}</section>`, chart: chartCard("Two years, as a stream", "", CH.streamgraph({ w: 330, h: 200, ph: true })) });

// ================= S4 · Rolodex drum =================
const s4Place = ({ R = 214 } = {}) => (d) => { const a = Math.abs(d); return { t: `translate(-50%, -50%) rotateX(${-d * TH}deg) translateZ(${R}px)`, z: 50 - a, o: [1, 0.92, 0.7, 0.42, 0, 0, 0][a], f: `brightness(${1 - a * 0.1})` }; };
const s4Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .rcard { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--accent), 0 18px 30px oklch(0 0 0 / 0.3); }\n${FLEX_CSS(dsel, id)}`;
function indexCard(f, { w = 320, h = 96, ph = false } = {}) {
  return `<div class="rcard textured" style="width:${w}px;height:${h}px;border-radius:14px;padding:${ph ? "10px 14px" : "14px 18px"};color:var(--on-card);background:${f.all ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),${grad(f, 150)}` : grad(f)};display:flex;align-items:center;gap:14px;box-shadow:0 10px 22px oklch(0 0 0 / 0.25);${f.all || f.on ? "" : "filter:grayscale(0.8)"}">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}<span style="width:${ph ? 34 : 42}px;height:${ph ? 34 : 42}px;border-radius:12px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">${f.all ? I.subs(16) : f.alias[0]}</span><div class="grow" style="min-width:0"><b style="display:block;font-size:${ph ? 15 : 17}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.alias}</b><span style="font-size:12px;font-weight:600;color:var(--on-card-muted)">${f.all ? `${L.ACTIVE.length} active` : f.on ? `${f.cycle} · ${fmt(f.next)}` : f.status}</span></div><b style="font-size:${ph ? 15 : 17}px">${inr(f.all ? f.monthly : f.amount)}</b></div>`;
}
function drum(prefix, { R, w, h, height, ph = false }) {
  return `<div style="position:relative;height:${height}px;perspective:1000px;overflow:hidden;border-radius:18px;background:linear-gradient(180deg,var(--surface),oklch(0.95 0.008 260) 50%,var(--surface))">
    <div style="position:absolute;left:0;right:0;top:50%;height:${h + 16}px;margin-top:-${(h + 16) / 2}px;border-top:1px solid var(--divider);border-bottom:1px solid var(--divider)"></div>
    <div style="position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:translateZ(-${R}px)">${cards(prefix, (f) => indexCard(f, { w, h, ph }), { ph, base: "left:0;top:0;backface-visibility:hidden;" })}</div>${ph ? "" : nav(prefix, { vertical: true, inset: 10 })}</div>`;
}
export function s4Desktop() {
  const top = `${NAV_CSS}${BAND_CSS}<section class="card glass" style="flex-direction:row;gap:26px;padding:22px;align-items:stretch">
    <div style="width:420px;flex-shrink:0;display:flex;flex-direction:column;gap:8px"><span class="card-t">Spin the drum<small>All is in the middle</small></span><div style="flex:1 1 auto;display:flex;flex-direction:column">${drum("s4", { R: 214, w: 340, h: 96, height: 470 })}</div></div>
    <div class="grow" style="display:flex;flex-direction:column;gap:16px;min-width:0">${SC.heroPanes((f) => band(f, { compact: true }))}${flexPanes(sideFacts)}</div></section>`;
  const mid = chartCard("2026 as a skyline", "each month a building · the pick's part is drawn in its colour", SC.heroPanes((f) => CH.skyline(f, { w: 1360, h: 300 })), `<span class="legend"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-4)"></i>Expected</span></span>`);
  return SC.page("s4", { selCss: s4Sel(s4Place()), top, mid, sel: "all" });
}
export const s4Phone = () => phonePage("s4", { selCss: s4Sel(s4Place({ R: 172 })), selector: `<section class="card glass" style="padding:12px">${drum("s4", { R: 172, w: 300, h: 78, height: 330, ph: true })}</section>`, hero: `<section class="card glass" style="padding:16px">${sideFacts(facts(null), { ph: true })}</section>`, chart: chartCard("2026 as a skyline", "", CH.skyline(facts(null), { w: 330, h: 200, ph: true })) });

// ================= S5 · Wheel =================
const s5Place = ({ phi = 12.5 } = {}) => (d) => { const a = Math.abs(d); return { t: `translateX(-50%) rotate(${d * phi}deg)`, z: 50 - a, o: a >= 6 ? 0 : a >= 5 ? 0.45 : 1, f: `brightness(${1 - a * 0.05})` }; };
const s5Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--accent), 0 22px 36px oklch(0 0 0 / 0.35); }\n${CH.ridgeCss(dsel, id)}`;
function wheel(prefix, { Rp, w, h, height, ph = false }) {
  const top = ph ? 30 : 40;
  return `<div style="position:relative;height:${height}px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">
    <div style="position:absolute;left:50%;top:${top + h / 2}px;width:${2 * Rp}px;height:${2 * Rp}px;margin-left:-${Rp}px;border-radius:50%;border:2px dashed var(--fill-strong);background:radial-gradient(closest-side, transparent 92%, oklch(0.72 0.19 145 / 0.08))"></div>
    <span style="position:absolute;left:50%;top:${top - 18}px;transform:translateX(-50%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:12px solid var(--accent);z-index:90"></span>
    ${cards(prefix, (f) => tile(f, w, h, { small: ph }), { ph, base: `left:50%;top:${top}px;transform-origin:50% ${Rp + h / 2}px;` })}${ph ? "" : nav(prefix, { inset: 26 })}</div>`;
}
export function s5Desktop() {
  const top = `${NAV_CSS}<section class="card glass" style="gap:6px;padding:8px 22px 24px">${wheel("s5", { Rp: 900, w: 196, h: 140, height: 262 })}${SC.heroPanes(S1.sHero)}</section>${bandPanes()}`;
  const mid = chartCard("Renewal rhythm", "every payment as a peak · dashed ones are still to come · the pick stands out", CH.ridgeline({ w: 1360, rowH: 30 }), `<span class="legend"><span><i style="background:var(--warning);border-radius:50%"></i>Not recorded</span></span>`);
  return SC.page("s5", { selCss: s5Sel(s5Place()), top, mid, sel: "all" });
}
export const s5Phone = () => phonePage("s5", { selCss: s5Sel(s5Place({ phi: 18 })), selector: `<section class="card glass" style="padding:4px 16px 16px;gap:4px">${wheel("s5", { Rp: 480, w: 132, h: 96, height: 168, ph: true })}${S1.sHero(facts(null), { ph: true })}</section>`, chart: chartCard("Renewal rhythm", "", CH.ridgeline({ w: 330, rowH: 24, ph: true })) });

// ================= S6 · Halo round the hero =================
const s6Place = ({ R = 232 } = {}) => (d) => { const a = Math.abs(d), ang = -90 + d * TH; return { t: `translate(-50%, -50%) rotate(${ang}deg) translateX(${R}px) rotate(${-ang}deg) scale(${a === 0 ? 1.25 : 1})`, z: 50 - a, o: 1 }; };
const s6Sel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${navRules(dsel, id)}\n${dsel} .sx-${id} .hal { box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--accent); } ${dsel} .sx-${id} .hal-lb { opacity: 1; }\n${FLEX_CSS(dsel, id)}`;
const halTile = (f, s = 54) => `<span class="hal" style="display:flex;border-radius:${Math.round(s * 0.3)}px;transition:box-shadow 200ms">${icon(f, s)}</span>`;
function halo(prefix, { size = 560, R = 232, ph = false } = {}) {
  const c = size / 2;
  const center = (f) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center"><span class="eyebrow">${f.all ? "Everything" : f.category}</span><b style="font-size:${ph ? 18 : 24}px;font-weight:800;line-height:1.15">${f.name}</b><b style="font-size:${ph ? 30 : 42}px;font-weight:800;line-height:1.05;margin-top:4px">${inr(f.all ? f.monthly : f.amount)}</b><span class="muted" style="font-size:12.5px;font-weight:700">${f.all ? "a month" : `a ${f.cycleWord}`} · ${f.all ? `next ${f.nextSub.alias}` : f.on ? rel(f.next) : f.status.toLowerCase()}</span></div>`;
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;max-width:100%">
    <div style="position:absolute;left:${c - R}px;top:${c - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;border:1.5px dashed var(--fill-strong)"></div>
    <div style="position:absolute;left:${c - R * 0.66}px;top:${c - R * 0.66}px;width:${R * 1.32}px;height:${R * 1.32}px;border-radius:50%;background:radial-gradient(closest-side, oklch(0.93 0.06 145 / 0.6), transparent)"></div>
    <span style="position:absolute;left:${c}px;top:${c - R - (ph ? 44 : 56)}px;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:11px solid var(--accent);z-index:90"></span>
    <div style="position:absolute;left:${c}px;top:${c}px;transform:translate(-50%,-50%);width:${R * 1.2}px">${ph ? center(facts(null)) : SC.heroPanes(center)}</div>
    <div style="position:absolute;left:${c}px;top:${c}px;width:0;height:0">${cards(prefix, (f) => halTile(f, ph ? 38 : 54), { ph, base: "left:0;top:0;" })}</div>${ph ? "" : nav(prefix, { inset: 0, bottom: 0 })}</div>`;
}
export function s6Desktop() {
  const top = `${NAV_CSS}${BAND_CSS}<section class="card glass" style="flex-direction:row;gap:30px;padding:30px 30px 26px;align-items:stretch">${halo("s6")}
    <div class="grow" style="display:flex;flex-direction:column;gap:16px;min-width:0">${SC.heroPanes((f) => band(f, { compact: true }))}${flexPanes(sideFacts)}</div></section>`;
  const mid = chartCard("2026 against 2025", "paid so far this year, against the same day last year · the pick is the area at the bottom", SC.heroPanes((f) => CH.race(f, { w: 1360, h: 300 })));
  return SC.page("s6", { selCss: s6Sel(s6Place()), top, mid, sel: "all" });
}
export const s6Phone = () => phonePage("s6", { selCss: s6Sel(s6Place({ R: 128 })), selector: `<section class="card glass" style="padding:20px 14px;align-items:center">${halo("s6", { size: 320, R: 128, ph: true })}</section>`, hero: `<section class="card glass" style="padding:16px">${sideFacts(facts(null), { ph: true })}</section>`, chart: chartCard("2026 against 2025", "", CH.race(facts(null), { w: 330, h: 220, ph: true })) });
