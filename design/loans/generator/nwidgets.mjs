// Round 3: the best hero visuals of rounds 1 and 2, as widgets that sit together on ONE dark page.
// One loan picker at the top of the page (radios + :has(), CSS only): the whole page follows it. The background and the
// accent take the picked loan's colour, every chart fades the other loans, and the widgets that show one loan's own
// numbers switch to the picked one. "All loans" is the emerald default.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as D from "./dash.mjs";
import { rings as ringTexture } from "./rings.mjs";
const { I, inr, inrL, inrS, fmt, fmtY, col, mono, plural } = L;
const { hc, tip, card, cardHead, PRINCIPAL, INTEREST } = P;
const sum = (xs) => xs.reduce((t, x) => t + x, 0);

export const IDS = ["all", "home", "car", "pers"];
export const accent = (id) => (id === "all" ? "emerald" : L.loan(id).color);
export const scope = (id) => (id === "all" ? L.AS : L.AS.filter((s) => s.loan.id === id));
const nm = (id) => (id === "all" ? "All loans" : L.loan(id).name);
/** One block per pick; only the picked one shows. */
export const nb = (render, ids = IDS, { fill = false } = {}) => ids.map((id) => `<div class="nb nb-${id}${fill ? " fill" : ""}">${render(id)}</div>`).join("");
export const nbi = (render) => IDS.map((id) => `<span class="nbi nbi-${id}">${render(id)}</span>`).join("");
const facts = (id) => { const A = scope(id); return { A, owed: sum(A.map((s) => s.outstanding)), emi: sum(A.map((s) => s.emi)), intr: sum(A.map((s) => s.interestLeft)), end: A.map((s) => s.end).sort().at(-1), borrowed: sum(A.map((s) => s.loan.principalAmount)), next: A.map((s) => s.next).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0] }; };
const W = (title, small, inner, { right = "", cls = "", gap = 14, style = "", bare = false } = {}) => card(`${cardHead(title, small, right)}${inner}`, { gap, cls: `nw${bare ? " bare" : ""} ${cls}`, style });
const body = (inner, style = "") => `<div class="nbody" style="${style}">${inner}</div>`;
const mon = D.mon;

// ---------- Local pick groups (chips) ----------
const DATES = [["pk", "2025-04", "Apr 2025"], ["now", "2026-10", "Today"], ["a", "2027-12", "Dec 2027"], ["b", "2029-04", "Apr 2029"], ["c", "2033-12", "Dec 2033"], ["d", "2038-12", "Dec 2038"], ["e", "2043-07", "Jul 2043"]];
const EFFECTS = [["tenure", "Reduce tenure"], ["emi", "Reduce EMI"]];
const POINTS = [["first", "First EMI"], ["next", "Next EMI"], ["last", "Last EMI"]];
const radios = () => [["loan", IDS, "all"], ["d", DATES.map((x) => x[0]), "now"], ["e", EFFECTS.map((x) => x[0]), "emi"], ["p", POINTS.map((x) => x[0]), "next"], ["w", ["m", "y"], "m"], ["h", ["emis", "prep"], "emis"]].map(([g, ks, def]) => ks.map((k) => `<input type="radio" class="pk-in" name="nl-${g}" id="nl-${g}-${k}"${k === def ? " checked" : ""} aria-label="${g} ${k}">`).join("")).join("");
export const chip = (g, k, inner, cls = "") => `<label for="nl-${g}-${k}" class="nc ${cls}">${inner}</label>`;

// ---------- The page's CSS: the pick's colour, who shows, who fades ----------
const SHARE = (id) => facts(id).emi / L.SALARY;
export function nightCss() {
  const rules = IDS.map((id) => {
    const c = accent(id), s = `.nldir:has(#nl-loan-${id}:checked)`;
    return `${s} { --lc: var(--card-${c}); --lcl: color-mix(in oklch, var(--card-${c}) 52%, white); --p: ${Math.min(SHARE(id) / 0.6, 1).toFixed(4)}; }
${s} .nbg-${id} { opacity: 1; }
${s} .nb-${id} { display: block; }
${s} .nb-${id}.fill { display: flex; }
${id === "all" ? "" : `${s} .pick:not(.pk-${id}) { opacity: 0.2; }`}
${s} label[for="nl-loan-${id}"].npill.lt { background: color-mix(in oklch, var(--tc) 16%, white); border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc); }
${s} label[for="nl-loan-${id}"].pl { background: color-mix(in oklch, var(--tc) 26%, oklch(1 0 0 / 0.04)); border-color: color-mix(in oklch, var(--tc) 70%, white); box-shadow: 0 0 0 1px color-mix(in oklch, var(--tc) 70%, white), 0 12px 34px color-mix(in oklch, var(--tc) 38%, transparent); }`;
  }).join("\n");
  const local = [["d", DATES.map((x) => x[0])], ["e", EFFECTS.map((x) => x[0])], ["p", POINTS.map((x) => x[0])]].map(([g, ks]) => ks.map((k) => `.nldir:has(#nl-${g}-${k}:checked) label[for="nl-${g}-${k}"] { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }`).join("\n")).join("\n");
  const combos = `${DATES.map(([k]) => `.nldir:has(#nl-d-${k}:checked) .nd-${k} { display: block; }`).join("\n")}
${IDS.flatMap((id) => EFFECTS.map(([e]) => `.nldir:has(#nl-loan-${id}:checked):has(#nl-e-${e}:checked) .nwi-${id}-${e} { display: block; }`)).join("\n")}
${IDS.flatMap((id) => POINTS.map(([p]) => `.nldir:has(#nl-loan-${id}:checked):has(#nl-p-${p}:checked) .nan-${id}-${p} { display: block; }`)).join("\n")}
${IDS.flatMap((id) => ["m", "y"].map((w) => `.nldir:has(#nl-loan-${id}:checked):has(#nl-w-${w}:checked) .nwm-${id}-${w} { display: flex; }`)).join("\n")}
.nldir:has(#nl-h-prep:checked) .nhe { display: none !important; }
.nldir:has(#nl-h-prep:checked) .nh-prep { display: block; }`;
  return `<style>.nldir .nb, .nldir .nd, .nldir .nwc, .nldir .nwm { display: none; animation: cmb-in 380ms var(--ease-out); }
${rules}
${local}
${["w", "h"].flatMap((g) => (g === "w" ? ["m", "y"] : ["emis", "prep"]).map((k) => `.nldir:has(#nl-${g}-${k}:checked) label.sg[for="nl-${g}-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`)).join("\n")}
${IDS.map((id) => `.nldir:has(#nl-loan-${id}:checked) .nbi-${id} { display: inline; }`).join("\n")}
${combos}</style>`;
}
const bgOf = (c) => `background: radial-gradient(1200px 800px at 6% -8%, color-mix(in oklch, var(--card-${c}) 78%, transparent), transparent 64%), radial-gradient(1000px 700px at 104% 104%, color-mix(in oklch, var(--card-${c}) 46%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklch, var(--card-${c}-from) 72%, black), color-mix(in oklch, var(--card-${c}-to) 90%, black));`;
/** The whole page: light, with a dark cover on top. The cover's background fades to the picked loan's colour. */
export function coverPage({ header, attention, cover, rest, w = 1600, cls = "" }) {
  const hero = `<section class="hero nite" style="padding:28px;display:flex;flex-direction:column;gap:22px;border:1px solid oklch(1 0 0 / 0.12)">${IDS.map((id) => `<div class="nbg nbg-${id}" style="${bgOf(accent(id))}"></div>`).join("")}${ringTexture(1416, 760, { first: 60, step: 30, opacity: 0.1, stroke: "var(--rings-light)" })}${cover}</section>`;
  return `<div class="chai-app desk nldir ${cls}" style="width:${w}px;height:__H__">${radios()}${nightCss()}${L.rail()}<main class="main glass"><div style="display:flex;flex-direction:column;gap:20px">${header}${attention}${hero}${rest}</div></main></div>`;
}
export const grid = (items, gap = 20) => `<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${gap}px;align-items:stretch">${items.map(([span, html]) => `<div style="grid-column:span ${span};display:flex;flex-direction:column;min-width:0">${html}</div>`).join("")}</div>`;

// ---------- The picker ----------
function tile(id, { list = false } = {}) {
  const f = facts(id), c = accent(id), l = id === "all" ? null : L.loan(id), pct = id === "all" ? L.REPAID_PCT : L.sum_(id).repaidPct;
  const head = id === "all" ? `${L.allMono(36)}<span><b>All loans</b><small>${plural(L.AS.length, "loan")} · ${inr(f.emi)} a month</small></span>` : `${mono(l, 36)}<span><b>${l.name}</b><small>${l.lenderName} · ${l.annualInterestRate}%</small></span>`;
  const foot = id === "all" ? `Debt-free ${mon(f.end.slice(0, 7))}` : `EMI ${inr(f.emi)} · next ${fmt(f.next.dueDate)}`;
  return `<label for="nl-loan-${id}" class="ptile pl${list ? " list" : ""}" style="--tc:var(--card-${c})"><span class="row" style="gap:12px">${head}</span><span class="ptbig">${inr(f.owed)}<small>still owed</small></span><span class="hbar"><span class="rt" style="width:${Math.max(2, pct * 100)}%;background:${id === "all" ? L.fill("emerald", 90) : L.fill(l, 90)}"></span></span><span class="ptfoot"><span>${Math.round(pct * 100)}% repaid</span><span>${foot}</span></span></label>`;
}
export const pickerTiles = () => `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${IDS.map((id) => tile(id)).join("")}</div>`;
export const pickerList = () => `<div style="display:flex;flex-direction:column;gap:12px">${IDS.map((id) => tile(id, { list: true })).join("")}</div>`;
export const pickerPills = ({ light = false } = {}) => `<div class="row" style="gap:8px;flex-wrap:wrap">${IDS.map((id) => { const c = accent(id); return `<label for="nl-loan-${id}" class="pl npill${light ? " lt" : ""}" style="--tc:var(--card-${c})"><i></i>${nm(id)}</label>`; }).join("")}</div>`;

// ---------- Figures ----------
export function figures({ bare = false } = {}) {
  const one = (id) => { const f = facts(id), pct = id === "all" ? L.REPAID_PCT : L.sum_(id).repaidPct; return `<div class="between" style="align-items:flex-start;gap:32px"><div style="display:flex;flex-direction:column;gap:8px"><div class="hk">Still owed · ${nm(id).toLowerCase()}</div><div class="hbig" style="font-size:54px"><small>₹</small>${Math.round(f.owed).toLocaleString("en-IN")}</div><div class="row" style="gap:10px"><span class="delta">${I.down(11)} ${Math.round(pct * 100)}% repaid</span><span class="hsub">${inr(f.borrowed - f.owed)} of ${inr(f.borrowed)}</span></div></div><div class="row" style="gap:36px;align-items:flex-start;flex-wrap:nowrap">${[["Monthly EMIs", inr(f.emi), id === "all" ? `${Math.round(SHARE("all") * 100)}% of your salary` : `${Math.round(SHARE(id) * 100)}% of your salary`], ["Next EMI", fmt(f.next.dueDate), `${L.loan(f.next.loanId).name} ${inr(f.next.totalDue)}`], ["Interest to come", inr(f.intr), "if every EMI is on time"], ["Debt-free", `${L.monName(f.end.slice(0, 7))} ${f.end.slice(0, 4)}`, `${L.ymTxt(L.monthsTo(f.end))} to go`]].map(([k, v, s]) => `<div class="hfig"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join("")}</div></div>`; };
  return bare ? `<div class="nw bare" style="flex:none">${nb(one)}</div>` : card(nb(one), { gap: 0, cls: "nw", style: "flex:none" });
}

// ---------- Descent and cliffs ----------
export function descent({ H = 190, id = "nd", bare = false } = {}) {
  return W("The descent", "what you owe, stacked by loan · hover a year", D.descentChart({ H, TOP: 90, id, compact: true }) + D.legend([["var(--card-sapphire)", "Owed then"], ["color-mix(in oklch,var(--card-sapphire) 42%,var(--future-base))", "Still to come, if every EMI is on time"]]), { gap: 8, bare });
}
export function cliffs({ H = 190, id = "nc", bare = false } = {}) {
  return W("EMI cliffs", "what leaves each month · hover a year", D.cliffsChart({ H, TOP: 90, id, compact: true }) + D.legend([["var(--card-sapphire)", "Paid"], ["color-mix(in oklch,var(--card-sapphire) 42%,var(--future-base))", "Still to come"]]), { gap: 8, bare });
}

// ---------- Rings ----------
export function rings({ S = 300, bare = false } = {}) {
  const c = S / 2, radii = [c - 12, c - 12 - 34, c - 12 - 68], Wd = 24, loans = L.AS.slice();
  const arcs = loans.map((s, k) => { const r = radii[k], circ = 2 * Math.PI * r, a = (s.paidN / s.n) * 2 * Math.PI, dx = c + r * Math.sin(a), dy = c - r * Math.cos(a); return `<g class="pick pk-${s.loan.id}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--fill-strong)" stroke-width="${Wd}"></circle><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col(s.loan)}" stroke-width="${Wd}" stroke-linecap="round" stroke-dasharray="${(circ * s.repaidPct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${c} ${c})"></circle><circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="6" fill="var(--solid)" stroke="${col(s.loan)}" stroke-width="3"></circle></g>`; }).join("");
  const centre = nb((id) => { const f = facts(id), pct = id === "all" ? L.REPAID_PCT : L.sum_(id).repaidPct; return `<div class="rcentre" style="position:static;inset:auto"><small>Repaid</small><b style="font-size:44px">${Math.round(pct * 100)}%</b><span>${inrL(f.owed)} owed</span></div>`; });
  const lab = loans.map((s, k) => `<div class="rlabel pick pk-${s.loan.id}" style="top:${c - radii[k] - 9}px;right:${S - c + 10}px"><b>${s.loan.name.replace(" loan", "")}</b> ${(s.repaidPct * 100).toFixed(0)}%</div>`).join("");
  const legend = `<div style="display:flex;flex-direction:column;gap:8px">${loans.map((s) => `<div class="pick pk-${s.loan.id} between" style="font-size:12px;font-weight:700"><span class="row" style="gap:8px"><i style="width:9px;height:9px;border-radius:3px;background:${col(s.loan)}"></i>${s.loan.name}</span><span class="muted">${(s.repaidPct * 100).toFixed(0)}% repaid · ${(s.paidN / s.n * 100).toFixed(0)}% of its term</span></div>`).join("")}</div>`;
  return W("Payoff rings", "ring: principal repaid · dot: how far through the term", body(`<div style="display:flex;justify-content:center"><div style="position:relative;width:${S}px;height:${S}px"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${arcs}</svg>${lab}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${centre}</div></div></div>${legend}`, "gap:16px"), { bare });
}

// ---------- Bricks ----------
export function bricks() {
  const state = ([k, ym]) => {
    const cut = k === "now" ? L.TODAY : `${ym}-31`, bal = L.LOANS.map((l) => ({ l, b: L.balanceAt(l, ym, cut) })).filter((x) => x.b > 0), total = sum(bal.map((x) => x.b));
    const cells = bal.flatMap(({ l, b }) => { const n = Math.ceil(b / 100000 - 1e-9); return Array.from({ length: n }, (_, i) => ({ l, f: i === n - 1 ? (b - i * 100000) / 100000 : 1 })); });
    const wall = cells.length ? cells.map((c) => `<span class="brick sm rt pick pk-${c.l.id}" style="--c:${col(c.l)};--f:${(c.f * 100).toFixed(0)}%"></span>`).join("") : `<div class="wallempty" style="min-height:120px">${I.check(24)}<b>Nothing owed</b></div>`;
    const emi = L.emiMonth(L.addMonthsUTC(`${ym}-01`, 1).slice(0, 7));
    return `<div class="nd nd-${k}"><div class="wall" style="min-height:150px">${wall}</div><div class="between" style="margin-top:10px;font-size:12px;font-weight:700"><span class="muted">${k === "now" ? "Today" : mon(ym)} · ${plural(cells.length, "brick")} of ₹1L</span><span>${inr(total)} owed · EMIs then ${inr(emi)}</span></div></div>`;
  };
  return W("Time machine", "pick a date, past or future", `<div class="row" style="gap:6px;flex-wrap:wrap">${DATES.map(([k, , t]) => chip("d", k, t, "sm")).join("")}</div>${body(DATES.map(state).join(""), "justify-content:flex-start")}`);
}

// ---------- Tally ----------
export function tally({ rowH = 56 } = {}) {
  const ms = D.months("2023-06", "2043-07"), N = ms.length, pct = (ym) => (ms.indexOf(ym) / N) * 100, tw = (100 / N) * 0.62;
  const rows = L.SUM.map((s) => {
    const l = s.loan, off = l.status === "Closed";
    const ticks = s.ins.map((i) => { const paid = i.status === "Paid", late = paid && i.paidDate > i.dueDate, isNext = s.next && i.installmentNumber === s.next.installmentNumber; return `<span class="tkw" title="${l.name} · EMI ${i.installmentNumber} of ${s.n} · ${fmtY(i.dueDate)} · ${inr(i.totalDue)}" style="left:${pct(i.dueDate.slice(0, 7))}%;width:${tw}%"><i class="tk${paid ? "" : " f"}${late ? " late" : ""}${isNext ? " next" : ""}"></i></span>`; }).join("");
    return `<div class="trow pick pk-${l.id}${off ? " off" : ""}" style="--c:${col(l)};height:${rowH}px"><span class="tl-lab">${mono(l, 30)}<span><b>${l.name}</b><small>${off ? "Closed" : `${s.paidN} of ${s.n} paid`}</small></span></span><div class="tlane" style="height:${rowH}px">${ticks}</div></div>`;
  }).join("");
  const nowPct = pct(L.TODAY.slice(0, 7)) + tw / 2, yrs = [2024, 2028, 2032, 2036, 2040].map((y) => `<span style="left:${pct(`${y}-01`)}%">${y}</span>`).join(""), grid = [2024, 2028, 2032, 2036, 2040].map((y) => `<span style="left:${pct(`${y}-01`)}%"></span>`).join("");
  return W("EMI tally", "a tick for every EMI, on one calendar", `<div class="tally" style="margin-top:-4px"><div class="tgrid" style="left:190px;bottom:22px">${grid}</div>${rows}<div class="taxis" style="margin-left:190px">${yrs}</div><div class="todayline" style="left:calc(190px + (100% - 190px) * ${(nowPct / 100).toFixed(4)});top:0;bottom:22px"></div></div>${D.legend([["var(--card-sapphire)", "Paid"], ["", "Paid late", "latekey"], ["", "Still to come", "futurekey"], ["oklch(0.72 0.14 75)", "Next"]])}`, { gap: 8 });
}

// ---------- Cost anatomy ----------
export function anatomy5() {
  const MAXX = 2.3, w = (v) => `${(v / MAXX) * 100}%`;
  const rows = L.SUM.map((s) => {
    const l = s.loan, p = l.principalAmount, off = l.status === "Closed", total = (p + s.interestTotal) / p, seg = (v, bg, ex = "") => `<span class="seg5 ${ex}" style="width:${w(v / p)};background:${bg}"></span>`;
    return `<div class="a5 pick pk-${l.id}${off ? " off" : ""}" style="grid-template-columns:150px 1fr 90px;padding:10px 0"><div class="cell-name">${mono(l, 28)}<div><b>${l.name}</b><small>${inrL(p)} borrowed</small></div></div><div class="a5bar" style="height:28px"><span class="a5track" style="height:24px">${seg(s.principalRepaid, PRINCIPAL, "rt")}${seg(s.outstanding, `color-mix(in oklch,${PRINCIPAL} 28%,transparent)`)}${seg(s.interestPaid, INTEREST, "rt ig")}${seg(s.interestLeft, `color-mix(in oklch,${INTEREST} 30%,transparent)`, "ig igl")}</span><span class="a5end" style="left:calc(${w(total)} + 8px)"><b>${total.toFixed(2)}×</b></span></div><div class="a5f"><span class="num">${inrL(s.interestLeft)}</span><small>interest to come</small></div></div>`;
  }).join("");
  return W("Cost anatomy", "in multiples of what you borrowed", `<div class="a5wrap" style="margin-top:-4px"><div class="a5scale" style="grid-template-columns:150px 1fr 90px;gap:16px;padding:0"><span></span><div class="a5axis">${[0, 0.5, 1, 1.5, 2].map((v) => `<span style="left:${w(v)}">${v === 1 ? "1× borrowed" : `${v}×`}</span>`).join("")}</div></div>${rows}</div>${D.legend([[PRINCIPAL, "Principal repaid"], [`color-mix(in oklch,${PRINCIPAL} 28%,transparent)`, "Principal owed"], [INTEREST, "Interest paid", "outl"], [`color-mix(in oklch,${INTEREST} 30%,transparent)`, "Interest to come", "outl"]])}`, { gap: 8 });
}

// ---------- Clock ----------
export function clock() {
  const digits = (id) => { const f = facts(id), u = L.untilYmd(f.end); return `<div class="row" style="gap:10px;justify-content:center">${[[u.y, "years"], [u.m, "months"], [u.d, "days"]].map(([v, k]) => `<div class="ctile" style="min-width:96px;padding:12px 16px 10px"><b style="font-size:52px">${String(v).padStart(2, "0")}</b><small>${k}</small></div>`).join("")}</div><div class="hsub" style="text-align:center;margin-top:10px">until ${id === "all" ? "the last EMI" : `the ${nm(id)} ends`} · ${fmtY(f.end)}</div>`; };
  const span = L.daysBetween(L.TODAY, L.DEBT_FREE);
  const bars = L.AS.slice().sort((a, b) => (a.end < b.end ? -1 : 1)).map((s) => { const pc = (L.daysBetween(L.TODAY, s.end) / span) * 100; return `<div class="cbar pick pk-${s.loan.id}" style="--c:${col(s.loan)};grid-template-columns:120px 1fr;gap:12px"><span class="row" style="gap:8px;font-size:12px;font-weight:700">${mono(s.loan, 22)}${s.loan.name.replace(" loan", "")}</span><div class="ctrack" style="height:16px"><span class="cfill rt" style="width:${pc}%"></span><span class="cend${pc > 70 ? " in" : ""}" style="left:${pc}%;font-size:11px"><b>${mon(s.end.slice(0, 7))}</b></span></div></div>`; }).join("");
  return W("Debt-free clock", "a countdown to the last EMI", body(`<div>${nb(digits)}</div><div style="display:flex;flex-direction:column;gap:10px">${bars}</div>`, "gap:18px"));
}

// ---------- Gauge ----------
export function gauge({ scale = 1 } = {}) {
  const cx = 190, cy = 190, R = 150, MAXP = 60, ang = (p) => Math.PI * (1 - p / MAXP), pt = (p, r = R) => `${(cx + r * Math.cos(ang(p))).toFixed(1)} ${(cy - r * Math.sin(ang(p))).toFixed(1)}`;
  const arc = (a, b, c) => `<path d="M${pt(a)}A${R} ${R} 0 0 1 ${pt(b)}" fill="none" stroke="${c}" stroke-width="28"></path>`;
  const ticks = [0, 30, 40, 60].map((p) => `<span class="gt" style="left:${cx + (R + 28) * Math.cos(ang(p))}px;top:${cy - (R + 26) * Math.sin(ang(p))}px">${p}%</span>`).join("");
  const dial = `<div class="gauge" style="width:380px;height:215px;margin:0 auto;zoom:${scale}"><svg width="380" height="215" viewBox="0 0 380 215">${arc(0, 30, "var(--card-emerald)")}${arc(30, 40, "oklch(0.78 0.14 80)")}${arc(40, 60, "var(--card-ruby)")}</svg>${ticks}<div class="needle" style="left:${cx}px;top:${cy}px"><span style="height:135px;top:-135px"></span></div><div class="hub" style="left:${cx - 12}px;top:${cy - 12}px;width:24px;height:24px"></div></div>`;
  const txt = (id) => { const f = facts(id), p = f.emi / L.SALARY, z = p < 0.3 ? ["Comfortable", "pill-on"] : p < 0.4 ? ["Stretched", "pill-late"] : ["Heavy", "pill-due"]; return `<div style="text-align:center"><div class="row" style="gap:10px;justify-content:center;align-items:baseline"><span style="font-size:46px;font-weight:800;letter-spacing:-0.03em">${Math.round(p * 100)}<small style="font-size:20px;opacity:.7">%</small></span><span class="pill ${z[1]}">${z[0]}</span></div><div class="hsub">${inr(f.emi)} of your ${inr(L.SALARY)} salary</div></div>`; };
  return W("EMI load", "share of salary · zones are placeholders", body(`${dial}${nb(txt)}`, "gap:6px"));
}

// ---------- What if ----------
const WI = { all: ["pers", 50000], home: ["home", 300000], car: ["car", 50000], pers: ["pers", 50000] };
export function whatIf() {
  const block = (id, e) => {
    const [lid, amt] = WI[id], l = L.loan(lid), s = L.sum_(lid), eff = e === "tenure" ? "Reduce-Tenure" : "Reduce-Emi", p = L.prepay(l, amt, eff);
    const pend = s.ins.filter((i) => i.status === "Pending"), base = [s.outstanding, ...pend.map((i) => i.openingBalance - i.principalDue)], Wd = 1000, H = 120, N = base.length - 1, X = (m) => (m / N) * Wd, Y = (b) => H - (b / s.outstanding) * (H - 8);
    const path = (ser) => `M${ser.map((b, m) => `${X(m).toFixed(1)} ${Y(b).toFixed(1)}`).join("L")}L${X(ser.length - 1).toFixed(1)} ${H}L0 ${H}Z`, line = (ser) => `M${ser.map((b, m) => `${X(m).toFixed(1)} ${Y(b).toFixed(1)}`).join("L")}`;
    const chart = `<div class="wi" style="height:${H}px;margin-bottom:4px"><svg viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="none"><path d="${path(base)}" fill="oklch(1 0 0 / 0.08)"></path><path d="${line(base)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"></path><path d="${path(p.series)}" fill="${col(l)}" fill-opacity="0.9"></path></svg></div>`;
    const eff2 = e === "tenure" ? `${plural(s.left - p.months, "EMI")} fewer, same ${inr(s.emi)}, ends ${mon(p.end.slice(0, 7))}` : `EMI ${inr(s.emi)} → ${inr(p.emi)}, still ends ${mon(p.end.slice(0, 7))}`;
    return `<div class="nwc nwi-${id}-${e}"><div class="between" style="font-size:12px;font-weight:700;margin-bottom:6px"><span class="row" style="gap:8px">${mono(l, 22)}${l.name} · prepay ${inr(amt)} today</span><span class="muted">${id === "all" ? "pick a loan to try another" : ""}</span></div>${chart}<div class="wi2" style="margin-top:6px"><div class="wibox hot"><span class="k">Interest saved · estimate</span><b>${inr(p.interestSaved)}</b></div><div class="wibox"><span class="k">Charge · separate</span><b>${inr(p.charge)}</b></div></div><div class="hsub" style="margin-top:8px;font-size:12px">${eff2}</div></div>`;
  };
  return W("What if", "a prepayment today · estimates", `<div class="row" style="gap:6px">${EFFECTS.map(([k, t]) => chip("e", k, t, "sm")).join("")}</div>${body(IDS.flatMap((id) => EFFECTS.map(([e]) => block(id, e))).join(""), "justify-content:flex-start")}`);
}

// ---------- EMI anatomy ----------
const AN = { all: "home", home: "home", car: "car", pers: "pers" };
export function emiAnatomy() {
  const block = (id, pk) => {
    const l = L.loan(AN[id]), s = L.sum_(l.id), n = s.n, i = pk === "first" ? s.ins[0] : pk === "last" ? s.ins.at(-1) : s.next, ip = i.interestDue / i.totalDue, Wd = 1000, H = 90, X = (m) => (m / (n - 1)) * Wd, Y = (f) => H - f * H;
    const prin = `M${s.ins.map((x, m) => `${X(m).toFixed(1)} ${Y(x.principalDue / x.totalDue).toFixed(1)}`).join("L")}L${Wd} ${H}L0 ${H}Z`;
    const xi = (X(i.installmentNumber - 1) / Wd) * 100;
    return `<div class="nwc nan-${id}-${pk}"><div class="between"><span class="row" style="gap:8px;font-size:12px;font-weight:700">${mono(l, 22)}${l.name} · EMI ${i.installmentNumber} of ${n}</span><span class="muted" style="font-size:12px;font-weight:600">due ${fmtY(i.dueDate)}</span></div><div class="row" style="gap:10px;align-items:baseline;margin:6px 0 10px"><span style="font-size:34px;font-weight:800;letter-spacing:-0.02em">${inr(i.totalDue)}</span><span class="hsub"><b style="color:var(--fg)">₹${Math.round(ip * 100)}</b> of every ₹100 is interest</span></div><div class="split" style="height:26px"><span class="rt" style="width:${(1 - ip) * 100}%;background:${PRINCIPAL}"></span><span class="rt ig" style="width:${ip * 100}%;background:${INTEREST}"></span></div><div class="between" style="margin-top:6px;font-size:12px;font-weight:600;color:var(--muted)"><span>Principal ${inr(i.principalDue)}</span><span>Interest ${inr(i.interestDue)}</span></div><div class="wi" style="height:${H}px;margin:16px 0 22px"><svg viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="none"><rect class="igr" width="${Wd}" height="${H}" fill="${INTEREST}" fill-opacity="0.85"></rect><path d="${prin}" fill="${PRINCIPAL}"></path></svg><div class="m3mark" style="left:${xi}%"><span class="m3line"></span><span class="m3dot" style="top:${Y(1 - ip)}px"></span></div><span class="m3end" style="left:0">first: ${(s.ins[0].interestDue / s.ins[0].totalDue * 100).toFixed(0)}% interest</span><span class="m3end" style="right:0">last: ${(s.ins.at(-1).interestDue / s.ins.at(-1).totalDue * 100).toFixed(0)}%</span></div></div>`;
  };
  return W("Inside an EMI", "principal against interest, over the whole loan", `<div class="row" style="gap:6px">${POINTS.map(([k, t]) => chip("p", k, t, "sm")).join("")}</div>${body(IDS.flatMap((id) => POINTS.map(([p]) => block(id, p))).join(""), "justify-content:flex-start")}`);
}

// ---------- Principal and interest, month by month (the visual beside the Payments card, as Subscriptions' cost map sits beside Payments) ----------
const segToggle = (g, items) => `<span class="seg">${items.map(([k, t]) => chip(g, k, t, "sg")).join("")}</span>`;
/** The chart and its summary line for one pick and one window (m: month by month, y: by year to the end). */
export function splitBlockHtml(id, w, { minH = 250 } = {}) {
  const ms = D.months("2025-11", "2027-10"), nowYm = L.TODAY.slice(0, 7), years = Array.from({ length: 18 }, (_, k) => 2026 + k);
  const insOf = (i) => (i === "all" ? L.INST : L.INST.filter((x) => x.loanId === i));
  const data = w === "m"
    ? ms.map((ym) => { const ins = insOf(id).filter((i) => i.dueDate.startsWith(ym)); return { key: ym, label: L.monName(ym), sub: ym.endsWith("-01") || ym === ms[0] ? `’${ym.slice(2, 4)}` : "", p: sum(ins.map((i) => i.principalDue)), i: sum(ins.map((i) => i.interestDue)), by: ins, now: ym === nowYm, future: ym > nowYm }; })
    : years.map((y) => { const ins = insOf(id).filter((i) => i.dueDate.startsWith(String(y)) && L.loan(i.loanId).status === "Active"); return { key: String(y), label: `’${String(y).slice(2)}`, sub: "", p: sum(ins.map((i) => i.principalDue)), i: sum(ins.map((i) => i.interestDue)), by: ins, now: y === 2026, future: y > 2026 }; });
  const max = Math.max(...data.map((d) => d.p + d.i), 1), cur = data.find((d) => d.now);
  const cols = data.map((d) => {
    const tot = d.p + d.i, ph = (tot / max) * 84, names = [...new Set(d.by.map((i) => L.loan(i.loanId)))];
    const card2 = hc({ h: w === "m" ? L.monYear(d.key) : d.key, hr: d.now ? `<span class="pill pill-ink" style="padding:2px 8px;font-size:10px">${w === "m" ? "this month" : "this year"}</span>` : d.future ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">still to come</span>` : "", t: inr(tot), d: tot ? `${Math.round((d.i / tot) * 100)}% of it is interest` : "no EMI", rows: [["Principal", inr(d.p), PRINCIPAL], ["Interest", inr(d.i), INTEREST], ...(id === "all" ? names.map((l) => [l.name, inr(sum(d.by.filter((i) => i.loanId === l.id).map((i) => i.totalDue))), col(l)]) : [])], w: 250 });
    return `<div class="mcol hov${d.now ? " nowcol" : ""}" tabindex="0"${d.future && w === "m" ? ' style="opacity:.62"' : ""}><div class="plot"><div class="mval" style="font-size:9.5px;position:absolute;left:-4px;right:-4px;bottom:${ph}%">${tot ? inrS(tot) : ""}</div><div class="mstack" style="position:absolute;left:0;right:0;bottom:0;height:${ph}%"><div class="mseg rt" style="height:${tot ? (d.p / tot) * 100 : 0}%;background:${PRINCIPAL}"></div><div class="mseg ig rt" style="height:${tot ? (d.i / tot) * 100 : 0}%;background:${INTEREST}"></div></div></div><div class="mlab${d.now ? " now" : ""}" style="font-size:10px">${d.label}${d.sub ? `<small style="display:block;font-size:9px;opacity:.7">${d.sub}</small>` : ""}</div>${tip(card2, { w: 250, x: "c", y: "up" })}</div>`;
  }).join("");
  const share = cur && cur.p + cur.i ? Math.round((cur.i / (cur.p + cur.i)) * 100) : 0;
  return `<div class="mb fill" style="flex:1;min-height:${minH}px;gap:${w === "m" ? 5 : 8}px;padding-left:0">${cols}</div><div class="between" style="margin-top:10px;font-size:12px;font-weight:700"><span class="muted">${w === "m" ? `This month, ${mon(nowYm)}` : "This year"}: <b style="color:var(--fg)">${inr(cur.p + cur.i)}</b> = ${inr(cur.p)} principal + ${inr(cur.i)} interest</span><span class="pill pill-late" style="font-size:11px">${share}% interest</span></div>`;
}
export const splitLegend = `<div class="row" style="gap:14px"><span class="lg"><i style="background:${PRINCIPAL}"></i>Principal</span><span class="lg"><i class="outl" style="background:${INTEREST}"></i>Interest</span></div>`;
export function splitMonthly() {
  const blocks = IDS.flatMap((id) => ["m", "y"].map((w) => `<div class="nwm nwm-${id}-${w}">${splitBlockHtml(id, w)}</div>`)).join("");
  return W("Principal and interest", "each EMI, split · hover a bar", `${splitLegend}${body(blocks, "justify-content:flex-start")}`, { right: segToggle("w", [["m", "Month by month"], ["y", "By year"]]) });
}

// ---------- Payments: Subscriptions' Payments card for EMIs (table, a toggle, "the 6 most recent", a hint line) ----------
export function payments({ rows = 6 } = {}) {
  const cols = "1.7fr .8fr 1fr 1.5fr .9fr";
  const head = `<div class="erow" style="grid-template-columns:${cols};padding:0 0 8px"><span class="th">Loan</span><span class="th">Paid on</span><span class="th">Amount</span><span class="th">Paid from</span><span class="th" style="text-align:right">Status</span></div>`;
  const one = (id) => {
    const all = (id === "all" ? L.INST : L.INST.filter((i) => i.loanId === id)).filter((i) => i.status === "Paid").sort((a, b) => (a.paidDate < b.paidDate ? 1 : -1)), list = all.slice(0, rows);
    const rowsHtml = list.map((i) => { const l = L.loan(i.loanId), late = i.paidDate > i.dueDate; return `<div class="erow" style="grid-template-columns:${cols}"><div class="cell-name">${mono(l, 34)}<div><b>${l.name}</b><small>EMI ${i.installmentNumber} of ${L.sum_(l.id).n}</small></div></div><span>${fmt(i.paidDate)}</span><b>${inr(i.amountPaid)}</b><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${L.via(i.paidFrom)}</span><span style="text-align:right">${late ? `<span class="pill pill-late" title="${L.daysBetween(i.dueDate, i.paidDate)} days late, ${inr(i.overdueCharge)} charge">Paid late</span>` : `<span class="pill pill-on">Paid</span>`}</span></div>`; }).join("");
    const pad = Array.from({ length: Math.max(0, rows - list.length) }, () => `<div class="erow" style="visibility:hidden"><div style="height:34px"></div></div>`).join("");
    const yr = all.filter((i) => i.paidDate.startsWith("2026")).length;
    return `<div class="tbl" style="justify-content:flex-start">${head}${rowsHtml}${pad}</div><div class="between" style="font-size:13px;color:var(--muted);font-weight:600;padding-top:10px"><span>The ${list.length} most recent of ${yr} this year</span>${P.link("View all installments")}</div><div class="pay-hint">${id === "all" ? "Pick a loan tile for one loan's payments" : `Only the ${nm(id)}. Pick All loans for every EMI`}</div>`;
  };
  const prep = `<div class="nh-prep"><div class="nhempty">${I.arrowR(26)}<b>No prepayments yet</b><span>Anything you pay above an EMI, or add yourself,<br>shows here with its effect and its charge.</span><span class="btn btn-soft btn-sm">Add prepayment</span></div></div>`;
  return W(`Payments<span style="color:var(--muted);margin:0 9px">·</span>${nbi(nm)}`, "", `${nb(one, IDS, { fill: true }).replace(/class="nb /g, 'class="nhe nb ')}${prep}`, { right: segToggle("h", [["emis", "Payments"], ["prep", "Prepayments"]]), gap: 8 });
}

// ---------- Payoff, five ways (the rings did not look good): clean rings, half dial, donut by what you owe, capsules, three dials ----------
const owedL = (s) => inrL(s.outstanding);
const trk = "var(--fill)";
function ringsCentre(S, c, big, small) { return `<div style="position:absolute;left:0;top:0;width:${S}px;height:${S}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none">${big}${small}</div>`; }
const ctr = nb((id) => { const f = facts(id), pct = id === "all" ? L.REPAID_PCT : L.sum_(id).repaidPct; return `<small style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Repaid</small><b style="font-size:44px;font-weight:800;letter-spacing:-.03em;line-height:1.05;display:block">${Math.round(pct * 100)}%</b><span style="font-size:12.5px;font-weight:700;color:var(--muted)">${inrL(f.owed)} owed</span>`; });
const legendRows = () => L.AS.map((s) => `<div class="rl pick pk-${s.loan.id}"><i style="background:${col(s.loan)}"></i><span class="rn"><b>${s.loan.name}</b><small>${s.loan.lenderName} · ${s.loan.annualInterestRate}% · ${(s.paidN / s.n * 100).toFixed(0)}% through its term</small></span><b>${(s.repaidPct * 100).toFixed(0)}%</b><span class="ro">${owedL(s)} owed</span></div>`).join("");
export const RING_KINDS = [["clean", "Clean rings"], ["half", "Half dial"], ["donut", "Donut by what you owe"], ["capsule", "Capsules"], ["dials", "Three dials"]];
export function payoff(kind = "clean", { bare = false } = {}) {
  let inner;
  if (kind === "clean") {
    const S = 260, c = S / 2, radii = [116, 90, 64], arcs = L.AS.map((s, k) => `<g class="pick pk-${s.loan.id}"><circle cx="${c}" cy="${c}" r="${radii[k]}" fill="none" stroke="${trk}" stroke-width="16"></circle><circle cx="${c}" cy="${c}" r="${radii[k]}" fill="none" stroke="${col(s.loan)}" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${(s.repaidPct * 100).toFixed(2)} 100" transform="rotate(-90 ${c} ${c})"></circle></g>`).join("");
    inner = `<div style="display:flex;gap:34px;align-items:center"><div style="position:relative;width:${S}px;height:${S}px;flex-shrink:0"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${arcs}</svg>${ringsCentre(S, c, "", ctr).replace('<div style="', '<div style="')}</div><div style="flex:1;min-width:0">${legendRows()}</div></div>`;
  } else if (kind === "half") {
    const Wd = 360, Hh = 196, cx = 180, cy = 176, radii = [150, 122, 94], arcs = L.AS.map((s, k) => { const r = radii[k], d = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`; return `<g class="pick pk-${s.loan.id}"><path d="${d}" fill="none" stroke="${trk}" stroke-width="18" stroke-linecap="round"></path><path d="${d}" fill="none" stroke="${col(s.loan)}" stroke-width="18" stroke-linecap="round" pathLength="100" stroke-dasharray="${(s.repaidPct * 100).toFixed(2)} 100"></path></g>`; }).join("");
    inner = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="position:relative;width:${Wd}px;height:${Hh}px"><svg width="${Wd}" height="${Hh}" viewBox="0 0 ${Wd} ${Hh}">${arcs}</svg><div style="position:absolute;left:0;right:0;bottom:0;text-align:center;line-height:1.1">${ctr}</div></div><div style="width:100%">${legendRows()}</div></div>`;
  } else if (kind === "donut") {
    const S = 250, c = S / 2, r = 92, tot = sum(L.AS.map((s) => s.outstanding)); let cum = 0;
    const segs = L.AS.map((s) => { const share = s.outstanding / tot * 100, len = Math.max(share - 1.2, 0.6), off = -cum; cum += share; return `<circle class="pick pk-${s.loan.id}" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col(s.loan)}" stroke-width="34" pathLength="100" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${c} ${c})"></circle>`; }).join("");
    const ctr2 = nb((id) => { const f = facts(id); return `<small style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">You owe</small><b style="font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1.1;display:block">${inrL(f.owed)}</b><span style="font-size:12.5px;font-weight:700;color:var(--muted)">${id === "all" ? "across 3 loans" : nm(id)}</span>`; });
    const rows = L.AS.map((s) => `<div class="rl pick pk-${s.loan.id}" style="grid-template-columns:12px 1fr auto"><i style="background:${col(s.loan)}"></i><span class="rn"><b>${s.loan.name}</b><small>${(s.outstanding / tot * 100).toFixed(0)}% of what you owe · ${(s.repaidPct * 100).toFixed(0)}% repaid</small><span class="hbar" style="display:block;margin-top:6px;height:6px"><span style="width:${s.repaidPct * 100}%;background:${col(s.loan)}"></span></span></span><b style="font-size:18px">${owedL(s)}</b></div>`).join("");
    inner = `<div style="display:flex;gap:34px;align-items:center"><div style="position:relative;width:${S}px;height:${S}px;flex-shrink:0"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${segs}</svg>${ringsCentre(S, c, "", ctr2)}</div><div style="flex:1;min-width:0">${rows}</div></div>`;
  } else if (kind === "capsule") {
    const rows = L.AS.map((s) => { const term = s.paidN / s.n; return `<div class="pick pk-${s.loan.id}" style="display:grid;grid-template-columns:170px 1fr 64px;gap:16px;align-items:center;padding:12px 0"><span class="row" style="gap:10px">${mono(s.loan, 30)}<span><b style="display:block;font-size:13px">${s.loan.name}</b><small style="color:var(--muted);font-weight:600;font-size:11px">${owedL(s)} of ${inrL(s.loan.principalAmount)} owed</small></span></span><div><div class="cap"><i class="rt" style="width:${Math.max(s.repaidPct * 100, 3)}%;background:${L.fill(s.loan, 90)}"></i><b style="left:${term * 100}%"></b></div><div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;color:var(--muted);margin-top:7px"><span>principal repaid</span><span style="margin-left:auto;padding-left:${Math.max(term * 100 - 30, 0)}%">${(term * 100).toFixed(0)}% of its term</span></div></div><b style="font-size:22px;font-weight:800;text-align:right">${(s.repaidPct * 100).toFixed(0)}%</b></div>`; }).join("");
    inner = `<div style="display:flex;flex-direction:column;justify-content:center">${rows}</div><div class="hsub" style="font-size:12px">The bar is principal repaid; the white mark is how far through its term the loan is.</div>`;
  } else {
    const dial = (s) => { const Wd = 190, Hh = 112, cx = 95, cy = 100, r = 78, d = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`, term = s.paidN / s.n, a = Math.PI * (1 - term), mx = cx + r * Math.cos(a), my = cy - r * Math.sin(a); return `<div class="pick pk-${s.loan.id}" style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1"><div style="position:relative;width:${Wd}px;height:${Hh}px"><svg width="${Wd}" height="${Hh}" viewBox="0 0 ${Wd} ${Hh}"><path d="${d}" fill="none" stroke="${trk}" stroke-width="14" stroke-linecap="round"></path><path d="${d}" fill="none" stroke="${col(s.loan)}" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="${(s.repaidPct * 100).toFixed(2)} 100"></path><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="4.5" fill="var(--fg)"></circle></svg><div style="position:absolute;left:0;right:0;bottom:0;text-align:center"><b style="font-size:28px;font-weight:800;letter-spacing:-.02em">${(s.repaidPct * 100).toFixed(0)}%</b></div></div><b style="font-size:13px;margin-top:6px">${s.loan.name}</b><small style="color:var(--muted);font-weight:600;font-size:11.5px">${owedL(s)} owed · ${(term * 100).toFixed(0)}% of term</small></div>`; };
    inner = `<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-around;padding-top:6px">${L.AS.map(dial).join("")}</div><div class="hsub" style="font-size:12px;text-align:center">The arc is principal repaid; the dot marks how far through its term each loan is.</div>`;
  }
  return W("Payoff", RING_KINDS.find((k) => k[0] === kind)[1].toLowerCase(), body(inner, "gap:14px"), { bare });
}

// ---------- The schedule of the picked loan (All loans: the Personal loan, the next one due) ----------
export function scheduleFollow() {
  return nb((id) => P.scheduleCard({ loanId: id === "all" ? "pers" : id, before: 3, after: 5, selector: false }), IDS, { fill: true });
}

// ---------- Frames for boards that try things out ----------
/** The dark cover, on its own: the background layers fade to the pick's colour. */
export const coverPanel = (inner, { pad = 28, extra = "" } = {}) => `<section class="hero nite" style="padding:${pad}px;display:flex;flex-direction:column;gap:18px;border:1px solid oklch(1 0 0 / 0.12);${extra}">${IDS.map((id) => `<div class="nbg nbg-${id}" style="${bgOf(accent(id))}"></div>`).join("")}${ringTexture(700, 420, { first: 60, step: 30, opacity: 0.1, stroke: "var(--rings-light)" })}${inner}</section>`;
export const boardFrame = ({ w = 1600, body, cls = "" }) => `<div class="chai-app board nldir ${cls}" style="width:${w}px;height:__H__">${radios()}${nightCss()}${body}</div>`;

// ---------- EMI load, five ways (the dial with red, yellow and green blocks needed revising) ----------
const shareOf = (id) => facts(id).emi / L.SALARY;
const zoneOf = (p) => (p < 0.3 ? ["Comfortable", "pill-on"] : p < 0.4 ? ["Stretched", "pill-late"] : ["Heavy", "pill-due"]);
const bigShare = nb((id) => { const p = shareOf(id), z = zoneOf(p); return `<div class="row" style="gap:12px;align-items:baseline;flex-wrap:wrap"><span style="font-size:46px;font-weight:800;letter-spacing:-0.03em;line-height:1">${(p * 100).toFixed(0)}<small style="font-size:20px;opacity:.7">%</small></span><span class="pill ${z[1]}">${z[0]}</span><span class="hsub">${inr(facts(id).emi)} of your ${inr(L.SALARY)} salary${id === "all" ? "" : `, the ${nm(id)} alone`}</span></div>`; });
const loadLegend = () => L.AS.map((s) => `<div class="rl pick pk-${s.loan.id}" style="grid-template-columns:12px 1fr auto auto;border-bottom-color:var(--divider)"><i style="background:${col(s.loan)}"></i><span class="rn"><b>${s.loan.name}</b></span><b style="font-size:15px">${inr(s.emi)}</b><span class="ro" style="min-width:52px">${(s.emi / L.SALARY * 100).toFixed(1)}%</span></div>`).join("");
const leftOver = `<div class="rl" style="grid-template-columns:12px 1fr auto auto;border-bottom:0"><i style="background:var(--fill-strong)"></i><span class="rn"><b>Left over</b></span><b style="font-size:15px">${inr(L.SALARY - L.EMI_TOTAL)}</b><span class="ro" style="min-width:52px">${((L.SALARY - L.EMI_TOTAL) / L.SALARY * 100).toFixed(1)}%</span></div>`;
export const LOAD_KINDS = [["bar", "The salary as a bar"], ["waffle", "Waffle"], ["arc", "Thin arc"], ["steps", "How it falls"], ["donut", "Salary donut"]];
export function load(kind = "bar") {
  let inner, small = "share of salary · zones are placeholders";
  if (kind === "bar") {
    const segs = L.AS.map((s) => `<div class="pick pk-${s.loan.id}" title="${s.loan.name} ${inr(s.emi)}" style="width:${(s.emi / L.SALARY) * 100}%;background:${L.fill(s.loan, 180)};border-radius:10px"></div>`).join("");
    const tick = (p, t) => `<span style="position:absolute;left:${p}%;top:-8px;bottom:-8px;border-left:1.5px dashed var(--fg);opacity:.45"></span><span style="position:absolute;left:${p}%;top:-26px;transform:translateX(-50%);font-size:10.5px;font-weight:800;color:var(--muted)">${t}</span>`;
    inner = `${bigShare}<div style="padding-top:26px"><div style="position:relative;height:48px;border-radius:14px;background:var(--fill);display:flex;gap:3px;padding:3px">${segs}${tick(30, "30%")}${tick(40, "40%")}<span style="margin-left:auto;align-self:center;padding-right:12px;font-size:12px;font-weight:700;color:var(--muted)">left over ${inr(L.SALARY - L.EMI_TOTAL)}</span></div><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;font-weight:600;color:var(--muted)"><span>₹0</span><span>your salary, ${inr(L.SALARY)}</span></div></div><div>${loadLegend()}${leftOver}</div>`;
  } else if (kind === "waffle") {
    const b = [0, ...L.AS.map((s, k) => L.AS.slice(0, k + 1).reduce((t, x) => t + (x.emi / L.SALARY) * 100, 0))];
    const cells = Array.from({ length: 100 }, (_, i) => { const k = L.AS.findIndex((_, j) => i + 0.5 >= b[j] && i + 0.5 < b[j + 1]); return k < 0 ? `<i class="wf"></i>` : `<i class="wf on pick pk-${L.AS[k].loan.id}" style="background:${col(L.AS[k].loan)}"></i>`; }).join("");
    inner = `${bigShare}<div style="display:flex;gap:30px;align-items:center"><div class="waffle">${cells}</div><div style="flex:1;min-width:0">${loadLegend()}${leftOver}<div class="hsub" style="font-size:11.5px;margin-top:8px">Each square is 1% of your salary.</div></div></div>`;
  } else if (kind === "arc") {
    const cx = 190, cy = 186, R = 148, MAXP = 60, ang = (p) => Math.PI * (1 - p / MAXP), pt = (p, r = R) => `${(cx + r * Math.cos(ang(p))).toFixed(1)} ${(cy - r * Math.sin(ang(p))).toFixed(1)}`;
    const zone = (a, b, o) => `<path d="M${pt(a)}A${R} ${R} 0 0 1 ${pt(b)}" fill="none" stroke="var(--fg)" stroke-opacity="${o}" stroke-width="14"></path>`;
    const tl = [0, 30, 40, 60].map((p) => `<span class="gt" style="left:${cx + (R + 24) * Math.cos(ang(p))}px;top:${cy - (R + 22) * Math.sin(ang(p))}px">${p}%</span>`).join("");
    inner = `<div class="gauge" style="width:380px;height:206px;margin:6px auto 0"><svg width="380" height="206" viewBox="0 0 380 206">${zone(0, 30, 0.07)}${zone(30, 40, 0.15)}${zone(40, 60, 0.26)}<path d="M${pt(0)}A${R} ${R} 0 0 1 ${pt(60)}" fill="none" stroke="var(--lc)" stroke-width="14" stroke-linecap="round" pathLength="100" style="stroke-dasharray:calc(var(--p) * 100) 100;transition:stroke-dasharray 900ms cubic-bezier(.3,1.2,.5,1)"></path></svg>${tl}<div style="position:absolute;left:0;right:0;bottom:0;text-align:center">${nb((id) => { const p = shareOf(id), z = zoneOf(p); return `<div class="row" style="gap:10px;justify-content:center;align-items:baseline"><span style="font-size:52px;font-weight:800;letter-spacing:-0.03em;line-height:1">${(p * 100).toFixed(0)}<small style="font-size:22px;opacity:.7">%</small></span><span class="pill ${z[1]}">${z[0]}</span></div><div class="hsub">${inr(facts(id).emi)} of your ${inr(L.SALARY)}</div>`; })}</div></div><div class="hsub" style="text-align:center;font-size:11.5px">The darker the band, the heavier the load. The arc fills to the pick.</div>`;
  } else if (kind === "steps") {
    const ms = D.months("2026-11", "2043-07"), W2 = 1000, H2 = 150, MAXP = 0.5, Y = (p) => H2 - (p / MAXP) * H2;
    const chart = (id) => { const ls = id === "all" ? L.LOANS : [L.loan(id)], ser = ms.map((m) => L.emiMonth(m, ls) / L.SALARY); let d = ""; ser.forEach((p, i) => { const x = (i / ms.length) * W2, x2 = ((i + 1) / ms.length) * W2; d += `${i ? "L" : "M"}${x.toFixed(1)} ${Y(p).toFixed(1)}L${x2.toFixed(1)} ${Y(p).toFixed(1)}`; });
      const area = `${d}L${W2} ${H2}L0 ${H2}Z`; const drops = ls.filter((l) => l.status === "Active").map((l) => ({ l, ym: L.lastEmiOf(l).dueDate.slice(0, 7) })).sort((a, b) => (a.ym < b.ym ? -1 : 1));
      const flags = drops.map(({ l, ym }, k) => { const i = ms.indexOf(ym), after = (ser[Math.min(i + 1, ser.length - 1)] ?? 0), x = (i / ms.length) * 100; return `<span class="stp" style="left:${x}%;top:${(k % 2) * 17}px;${x > 85 ? "transform:translateX(-100%)" : ""}"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${col(l)};margin-right:5px"></i><b>${L.monName(ym)} ’${ym.slice(2, 4)}</b> ${l.name.replace(" loan", "")} ends, ${Math.round(after * 100)}%</span>`; }).join("");
      const ref = (p, t) => `<span style="position:absolute;left:0;right:0;top:${Y(p)}px;border-top:1.5px dashed var(--fg);opacity:.35"></span><span style="position:absolute;right:0;top:${Y(p) - 16}px;font-size:10.5px;font-weight:800;color:var(--muted)">${t}</span>`;
      return `<div class="wi" style="height:${H2}px;margin:6px 0 46px"><svg viewBox="0 0 ${W2} ${H2}" preserveAspectRatio="none"><path d="${area}" fill="var(--lc)" fill-opacity="0.85"></path></svg>${ref(0.3, "30%")}${ref(0.4, "40%")}<div style="position:absolute;left:0;right:0;top:100%;margin-top:8px;height:36px">${flags}</div></div>`; };
    inner = `${bigShare}${nb(chart)}<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--muted)"><span>Nov 2026</span><span>Jun 2043</span></div>`;
    small = "the share of salary as loans end";
  } else {
    const S = 220, c = S / 2, r = 84, tot = L.SALARY; let cum = 0;
    const parts = [...L.AS.map((s) => ({ v: s.emi / tot * 100, c: col(s.loan), cls: `pick pk-${s.loan.id}` })), { v: (tot - L.EMI_TOTAL) / tot * 100, c: "var(--fill-strong)", cls: "" }];
    const segs = parts.map((pt2) => { const len = Math.max(pt2.v - 1, 0.5), off = -cum; cum += pt2.v; return `<circle class="${pt2.cls}" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${pt2.c}" stroke-width="28" pathLength="100" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${c} ${c})"></circle>`; }).join("");
    const mid = nb((id) => id === "all" ? `<small style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Left over</small><b style="font-size:30px;font-weight:800;letter-spacing:-.02em;display:block;line-height:1.1">${inrL(L.SALARY - L.EMI_TOTAL)}</b><span style="font-size:12px;font-weight:700;color:var(--muted)">${Math.round((1 - SHARE("all")) * 100)}% of salary</span>` : `<small style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">${nm(id).replace(" loan", "")} EMI</small><b style="font-size:30px;font-weight:800;letter-spacing:-.02em;display:block;line-height:1.1">${inr(facts(id).emi)}</b><span style="font-size:12px;font-weight:700;color:var(--muted)">${Math.round(shareOf(id) * 100)}% of salary</span>`);
    inner = `<div style="display:flex;gap:30px;align-items:center"><div style="position:relative;width:${S}px;height:${S}px;flex-shrink:0"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${segs}</svg>${ringsCentre(S, c, "", mid)}</div><div style="flex:1;min-width:0">${bigShare}<div style="margin-top:12px">${loadLegend()}${leftOver}</div></div></div>`;
  }
  return W("EMI load", small, body(inner, "gap:16px;justify-content:flex-start"), { gap: 12 });
}
