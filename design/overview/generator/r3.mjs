// Round 3 (2026-11-07): the Overview as what its name says. Net worth first, then every page gathered in groups, and every warning the pages raise
// in one list. No hero over widgets: each board is one idea.
//   N1 River    net worth through time as a river (owned above the line, owed below); scrub any month, the number counts to it; lanes of pages and warnings below
//   N2 Map      a map of the money (a cell per page, sized by what it holds); pick a cell and the page and its warnings come forward
//   N3 Bridge   a bridge from what you own to what you keep (owned bars up, owed bars down to net worth); scrub back in time and the bars morph
// Every pick works with no script (hidden radios, labels, :has()); the count-up is a registered CSS property. Every figure is made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { spot, withMascot } from "./art-soft.mjs";
const { I, inr } = L;
const { lakh, col, grad, hc, tip } = P;

export const MKEYS = H.KEYS.map((_, i) => String(i));
export const TODAY_K = String(H.TODAY_I);
export const CELLS = ["all", ...D.SECTIONS.map((s) => s.key)];
export const RANGES = ["3", "6", "12"];
export const GKEYS = ["all", ...H.GROUPS.map((g) => g.k)];
export const LAYERS = ["all", ...H.TYPES.map((t) => t.k)];
export const TYPE_COL = Object.fromEntries(H.TYPES.map((t) => [t.k, t.c]));

export const ICON = { accounts: "accounts", invest: "invest", fixed: "fixed", lent: "lent", cards: "cards", loans: "loans", income: "income", subs: "subs", ins: "shield", goals: "goals" };
export const sg = (n) => `${n < 0 ? "−" : "+"}${lakh(Math.abs(n))}`;
export const arrow = (n) => (n >= 0 ? I.up(11) : I.down(11));
export const mp = (fn, cls = "") => MKEYS.map((k) => `<div class="vw-m vw-m-${k} ${cls}">${fn(+k)}</div>`).join("");
const yearsPct = (a, b) => `${(((a - b) / b) * 100).toFixed(0)}%`;

// ---------- The greeting, pointing, written for round 3 ----------
const pt = (text, c, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(c, { w, x, y: "down" })}</span>`;
function lede() {
  const N = H.NOW, V = H.PREV, T = H.THEN;
  const worth = hc({ h: "Net worth", t: inr(D.NET), d: "what you own less what you owe", rows: [["Owned", inr(D.OWNED)], ["Owed", `−${inr(D.OWED)}`]], f: "Investments at today's prices, EPF at the passbook figure, a dollar account at today's rate. Subscriptions never count." });
  const mo = hc({ h: "Since the end of October", t: `+${inr(H.CHANGE.month)}`, d: `${H.CHANGE.monthPct.toFixed(1)}% on ${inr(V.net)}`, rows: [["Owned grew by", `+${inr(N.owned - V.owned)}`, col("emerald")], ["Owed fell by", `${inr(V.owed - N.owed)}`, col("teal")]], f: "Month-end figures from the monthly snapshots the app keeps. Today is the 7th, so this month is a week old." });
  const yr = hc({ h: "Against a year ago", t: `+${inr(H.CHANGE.year)}`, d: `from ${inr(T.net)} in ${H.mfull(0)}`, rows: [["Owned grew by", `+${inr(N.owned - T.owned)}`, col("emerald")], ["Owed fell by", inr(T.owed - N.owed), col("teal")]], f: "A year of snapshots is needed for this; until then the app shows the months it has." });
  const left = hc({ h: "Still to pay this month", t: inr(D.TO_PAY), d: `${inr(D.PAID_SO_FAR)} already paid`, rows: [["HDFC Car Loan EMI", "due today", col("sky")], ["HDFC Regalia", "18 Nov", col("ruby")], ["Amex", "24 Nov", col("onyx")], ["Gym", "21 Nov", col("plum")]], f: "Obligations of the month less what has been paid so far." });
  const look = hc({ h: "Keep in mind", t: `${H.WARN.length} things`, rows: [["Act now", String(H.COUNTS.red), "oklch(0.62 0.2 25)"], ["Soon, or off", String(H.COUNTS.amber), "oklch(0.8 0.15 85)"], ["Worth knowing", String(H.COUNTS.info), "oklch(0.7 0.08 250)"]], f: "Every warning the ten pages raise, in one list, each tagged with its page." });
  return `You're worth ${pt(inr(D.NET), worth)}, up ${pt(lakh(H.CHANGE.month), mo, { x: "c" })} on last month and ${pt(lakh(H.CHANGE.year), yr, { x: "c" })} on a year ago. ${pt(inr(D.TO_PAY), left, { x: "c" })} is still to pay this month, and ${pt(`${H.WARN.length} things`, look, { x: "r" })} need a look, ${H.COUNTS.red} of them today.`;
}
const head = () => withMascot(L.header({ eyebrow: `Overview · Today ${P.sampleTag()}`, lede: lede(), actions: P.greetingActions() }));
const page = (body) => P.page(`${head()}${body}${P.sampleNote()}`);

// ---------- Small parts ----------
/** The animated net worth: three counters (lakhs, thousands, units) that run to --nw. */
export const nwBig = (extra = "") => `<div class="nwc${extra}" role="img" aria-label="Net worth"><small>₹</small><span class="nc nc-l"></span><span class="sp">,</span><span class="nc nc-t"></span><span class="sp">,</span><span class="nc nc-u"></span></div>`;
export const wk = (w, { tag = true } = {}) => `<div class="wk wk-${w.tone} wk-pg-${w.page}"><i class="wk-d"></i><div class="wk-t"><b>${w.text}</b><small>${w.detail}</small></div>${tag ? `<span class="wk-p" style="--pc:${col(H.SEC[w.page].color)}">${H.SEC[w.page].name}</span>` : ""}<span class="wk-w">${w.when}</span><span class="btn btn-ghost btn-xs">${w.act}</span></div>`;
export const dots = (key) => H.warnOf(key).map((w) => `<i class="wd wd-${w.tone}"></i>`).join("");
export const pctOf = (a, b) => `${((a / b) * 100).toFixed(0)}%`;

/** What sits behind each page, as rows (name, figure, colour). */
export const FACTS = {
  accounts: () => D.ACCOUNTS.map((a) => [a.name, inr(a.bal), col(a.color)]),
  invest: () => D.HOLDINGS.map((h) => [h.name, inr(h.worth), col(h.color)]),
  fixed: () => [...D.FDS.map((f) => [f.name, inr(f.amt), col("forest")]), ["EPF", inr(D.EPF), col("emerald")]],
  lent: () => [["Friend – ₹6.5L, with interest", inr(813693), col("copper")], ["Friend – ₹3L", inr(300000), col("copper")], ["Friend – ₹1.82L", inr(182000), col("copper")]],
  cards: () => D.CARDS.map((c) => [`${c.name} · ${pctOf(c.out, c.limit)} of limit`, inr(c.out), col(c.color)]),
  loans: () => D.LOANS.map((l) => [`${l.name} · EMI ${inr(l.emi)}`, inr(l.out), col(l.id === "home" ? "teal" : "sky")]),
  income: () => [["NetApp salary, 30 Nov", inr(D.SALARY), col("emerald")], ["Interest from lent out", `${inr(6000)} a month`, col("copper")]],
  subs: () => [["All subscriptions, a month", inr(D.SUBS_MONTH), col("plum")], ["On a card (inside its bill)", inr(D.SUBS_MONTH - D.SUBS_OFF_CARD), col("ruby")], ["Paid from the bank", inr(D.SUBS_OFF_CARD), col("sapphire")]],
  ins: () => D.POLICIES.map((p) => [`${p.name} · due ${P.dm(p.due)}`, `${inr(p.premium)} a year`, col("gold")]),
  goals: () => D.GOALS.map((g) => [`${g.name} · ${g.ok ? "on track" : "behind"}`, `${inr(g.saved)} of ${inr(g.target)}`, col(g.color)]),
};
export const pageCard = (s) => hc({ h: s.name, hr: s.flag ? `<span class="tagb warn">${s.flag}</span>` : "", t: `${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? ` ${s.per}` : ""}`, d: s.sub, rows: FACTS[s.key](), f: `Open ${s.name} for the rest.`, w: 320 });

// ---------- Lanes: every group, its pages, its warnings ----------
function lanes() {
  const chip = (key) => {
    const s = H.SEC[key];
    return `<span class="hov lc" tabindex="0"><span class="lc-ic spt">${spot(key, 30)}</span><span class="lc-n"><b>${s.name}</b><small>${s.sub}</small></span><span class="lc-v${s.owe ? " owe" : ""}">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small>${s.per}</small>` : ""}</span>${dots(key) ? `<span class="lc-w">${dots(key)}</span>` : ""}${tip(pageCard(s), { w: 320, x: "l", y: "down" })}</span>`;
  };
  const lane = (g) => {
    const ws = H.warnIn(g.k);
    return `<div class="lane" style="--gc:${col(g.c)}"><div class="ln-h"><i class="ln-bar"></i><div><b>${g.name}</b><small>${g.line}</small></div></div><div class="ln-p">${g.pages.map(chip).join("")}</div><div class="ln-w">${ws.length ? ws.map((w) => wk(w, { tag: false })).join("") : `<div class="ln-ok">${I.check(13)} All clear</div>`}</div></div>`;
  };
  return `<section class="lanes glass"><div class="lanes-h"><div><b>Everything else, by group</b><small>every page, and every warning it raises, in one place</small></div><div class="lanes-k"><span class="kd wd-red"></span>act now<span class="kd wd-amber"></span>soon or off<span class="kd wd-info"></span>worth knowing</div></div>${H.GROUPS.map(lane).join("")}</section>`;
}

// =====================================================================
// N1 · River
// =====================================================================
const RW = 1040, RH = 450;
export const R = (() => {
  const own = 6700000, owe = 4300000, padT = 14, padB = 14, k = (RH - padT - padB) / (own + owe), y0 = padT + own * k;
  const x = (i) => ((i + 0.5) / H.N) * RW;
  return { k, y0, x, yv: (v) => y0 - v * k };
})();
export const smooth = (pts, t = 0.18) => {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t], c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
export const NETY = H.HIST.map((r) => R.yv(r.net) / RH * 100); // the net worth line's y at each month, as a % of the chart's height
function riverSvg() {
  const order = ["bank", "fixed", "lent", "invest"], oweOrder = ["home", "car", "cards"];
  const layer = (keys, j, sign) => {
    const lo = H.HIST.map((r, i) => [R.x(i), R.yv(sign * keys.slice(0, j).reduce((a, kk) => a + r[kk], 0))]);
    const hi = H.HIST.map((r, i) => [R.x(i), R.yv(sign * keys.slice(0, j + 1).reduce((a, kk) => a + r[kk], 0))]);
    const back = [...lo].reverse();
    return `${smooth(hi)}L${back[0][0].toFixed(1)},${back[0][1].toFixed(1)}${smooth(back).replace(/^M[^C]*/, "")}Z`;
  };
  const defs = H.TYPES.map((t) => `<linearGradient id="rv-${t.k}" x1="0" y1="${t.side === "own" ? 0 : 1}" x2="0" y2="${t.side === "own" ? 1 : 0}"><stop offset="0" stop-color="color-mix(in oklch,var(--card-${t.c}) 78%,white)"/><stop offset="1" stop-color="var(--card-${t.c})"/></linearGradient>`).join("");
  const areas = [...order.map((kk, j) => [kk, layer(order, j, 1)]), ...oweOrder.map((kk, j) => [kk, layer(oweOrder, j, -1)])].map(([kk, d]) => `<path class="rl rl-${kk}" d="${d}" fill="url(#rv-${kk})"/>`).join("");
  const net = smooth(H.HIST.map((r, i) => [R.x(i), R.yv(r.net)]));
  const grid = H.HIST.map((_, i) => `<line x1="${R.x(i).toFixed(1)}" x2="${R.x(i).toFixed(1)}" y1="0" y2="${RH}" class="gl"/>`).join("");
  return `<svg viewBox="0 0 ${RW} ${RH}" preserveAspectRatio="none" class="rv-svg"><defs>${defs}</defs>${grid}${areas}<line x1="0" x2="${RW}" y1="${R.y0.toFixed(1)}" y2="${R.y0.toFixed(1)}" class="zl"/><path d="${net}" class="nl-glow"/><path d="${net}" class="nl" pathLength="1"/></svg>`;
}
function n1() {
  const dp = (n, label) => `<span class="dpill ${n >= 0 ? "up" : "dn"}">${arrow(n)} ${sg(n)}<small>${label}</small></span>`;
  const top = mp((i) => {
    const r = H.HIST[i], p = H.HIST[i - 1];
    return `<div class="n1-meta"><span class="eyebrow-s">Net worth at the end of ${H.mfull(i)}${i === H.TODAY_I ? " (today)" : ""}</span><div class="n1-d">${p ? dp(r.net - p.net, `vs ${H.mfull(i - 1)}`) : `<span class="dpill">first month on record</span>`}${i > 0 ? dp(r.net - H.HIST[0].net, `since ${H.mfull(0)}`) : ""}</div></div>`;
  });
  const oo = mp((i) => { const r = H.HIST[i]; return `<div class="n1-oo"><div><small>Owned</small><b>${lakh(r.owned)}</b></div><div><small>Owed</small><b class="owe">−${lakh(r.owed)}</b></div></div>`; });
  const rows = (i) => {
    const r = H.HIST[i], p = H.HIST[i - 1];
    const row = (t) => `<div class="tr tr-${t.k}"><i style="background:${col(t.c)}"></i><span>${t.name}${t.page !== t.name ? `<small>${t.page}</small>` : ""}</span><div class="tr-v"><b>${t.side === "owe" ? "−" : ""}${lakh(r[t.k])}</b>${p ? `<small class="${(t.side === "own" ? r[t.k] - p[t.k] : p[t.k] - r[t.k]) >= 0 ? "up" : "dn"}">${(t.side === "own" ? r[t.k] - p[t.k] : p[t.k] - r[t.k]) >= 0 ? "▲" : "▼"} ${lakh(Math.abs(r[t.k] - p[t.k]))}</small>` : ""}</div></div>`;
    return `<div class="tr-g"><div class="tr-h"><span>What you own</span><b>${lakh(r.owned)}</b></div>${H.TYPES.filter((t) => t.side === "own").reverse().map(row).join("")}<div class="tr-h"><span>What you owe</span><b>−${lakh(r.owed)}</b></div>${H.TYPES.filter((t) => t.side === "owe").map(row).join("")}</div>`;
  };
  const cols = H.KEYS.map((_, i) => `<label class="pkl rv-c" for="m-${i}" style="left:${(i / H.N) * 100}%;width:${100 / H.N}%"><span class="rv-t">${H.mlabel(i)}${i === 0 ? `<em>${H.KEYS[0].slice(2, 4) === "25" ? "’25" : ""}</em>` : ""}${i === H.TODAY_I ? "<em>today</em>" : ""}</span></label>`).join("");
  const legend = LAYERS.map((k) => k === "all" ? `<label class="pkl chip-b sm" for="ly-all">Every layer</label>` : `<label class="pkl chip-b sm" for="ly-${k}"><i class="lg" style="background:${col(TYPE_COL[k])}"></i>${H.TYPES.find((t) => t.k === k).name}</label>`).join("");
  const stage = `<section class="stg2 n1" data-b="n1">${radios("m", MKEYS, TODAY_K)}${radios("ly", LAYERS)}
<div class="n1-top"><div class="n1-l">${top}${nwBig()}</div>${oo}</div>
<div class="n1-g"><div class="n1-c"><div class="rv"><div class="rv-bd">${riverSvg()}<div class="rv-lab rv-up">owned</div><div class="rv-lab rv-dn">owed</div><div class="cur"><i class="cur-l"></i><i class="cur-d"></i></div><div class="rv-hit">${H.KEYS.map((_, i) => `<label class="pkl" for="m-${i}" aria-label="${H.mfull(i)}"></label>`).join("")}</div></div><div class="rv-x">${cols}</div></div><div class="n1-lg">${legend}</div></div><aside class="n1-r">${mp(rows)}</aside></div></section>`;
  return page(`${stage}${lanes()}`);
}

// =====================================================================
// N2 · Map
// =====================================================================
function n2() {
  const cell = (key, cls = "") => {
    const s = H.SEC[key];
    return `<label class="pkl mc ${cls}" for="c-${key}" style="--cc:${col(s.color)};--cg:${grad(s.color)}"><div class="mc-top"><span class="mc-ic spt">${spot(key, 24)}</span><b>${s.name}</b><span class="mc-w">${dots(key)}</span></div><div class="mc-v${s.owe ? " owe" : ""}">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small>${s.per}</small>` : ""}</div><small class="mc-s">${s.sub}</small></label>`;
  };
  const reg = (name, v, inner, cls) => `<div class="rg ${cls}"><div class="rg-h"><span>${name}</span><b>${v}</b></div><div class="rg-b">${inner}</div></div>`;
  const map = `<div class="mp"><div class="mp-t">${reg("What you own", lakh(D.OWNED), `<div class="ga">${cell("invest", "c-inv")}<div class="gb">${cell("fixed")}${cell("lent")}${cell("accounts", "sm")}</div></div>`, "rg-own")}${reg("What you owe", `−${lakh(D.OWED)}`, `<div class="gd">${cell("loans", "c-loans")}${cell("cards", "sm")}</div>`, "rg-owe")}</div><div class="mp-b">${reg("Cash flow", "not part of net worth", `<div class="gf">${cell("income")}${cell("subs")}</div>`, "rg-flow")}${reg("Plans and cover", "not part of net worth", `<div class="gf">${cell("goals")}${cell("ins")}</div>`, "rg-plan")}</div><small class="mp-n">Cells are drawn to scale for what you own and owe; the small ones are held to a minimum size. Pick one.</small></div>`;
  const spark = (n) => {
    const rs = H.HIST.slice(-n - 1), W = 360, Hh = 90, lo = Math.min(...rs.map((r) => r.net)), hi = Math.max(...rs.map((r) => r.net));
    const pts = rs.map((r, i) => [6 + (i * (W - 12)) / n, Hh - 10 - ((r.net - lo) / (hi - lo || 1)) * (Hh - 24)]);
    const d = smooth(pts), end = pts[pts.length - 1], ch = rs[n].net - rs[0].net;
    return `<div class="sp-w"><svg viewBox="0 0 ${W} ${Hh}" class="spark" preserveAspectRatio="none"><defs><linearGradient id="sp${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${d}L${end[0]},${Hh}L${pts[0][0]},${Hh}Z" fill="url(#sp${n})"/><path d="${d}" class="sp-l" pathLength="1"/><circle cx="${end[0]}" cy="${end[1].toFixed(1)}" r="4.5" fill="#fff"/></svg><div class="sp-k"><span>${H.mfull(H.N - 1 - n)}</span><span>today</span></div></div><div class="sp-c"><span class="dpill ${ch >= 0 ? "up" : "dn"}">${arrow(ch)} ${sg(ch)}<small>in ${n === 12 ? "a year" : `${n} months`}, ${yearsPct(rs[n].net, rs[0].net)}</small></span></div>`;
  };
  const split = (side) => { const ts = H.TYPES.filter((t) => t.side === side), tot = side === "own" ? D.OWNED : D.OWED; return `<div class="n2-sp"><div class="n2-sh"><span>${side === "own" ? "What you own, by type" : "What you owe, by type"}</span><b>${lakh(tot)}</b></div><div class="n2-sb">${ts.map((t) => `<i style="width:${(H.NOW[t.k] / tot) * 100}%;background:${col(t.c)}"></i>`).join("")}</div><div class="n2-sl">${ts.map((t) => `<span><i style="background:${col(t.c)}"></i>${t.name} ${pctOf(H.NOW[t.k], tot)}</span>`).join("")}</div></div>`; };
  const all = `<div class="vw-c vw-c-all vw-flex"><div class="s-eb">Net worth</div>${nwBig(" nwc-m")}<div class="n2-oo"><div><small>Owned</small><b>${lakh(D.OWNED)}</b></div><div><small>Owed</small><b class="owe">−${lakh(D.OWED)}</b></div></div>
<div class="n2-bar" title="owned against owed"><i class="b-net" style="width:${(D.NET / D.OWNED) * 100}%"></i><i class="b-owe" style="width:${(D.OWED / D.OWNED) * 100}%"></i></div><div class="n2-bl"><span>${I.check(10)} you keep ${pctOf(D.NET, D.OWNED)}</span><span>${pctOf(D.OWED, D.OWNED)} is owed</span></div>
<div class="n2-rg">${RANGES.map((r) => `<label class="pkl chip-b sm" for="r-${r}">${r === "12" ? "A year" : `${r} months`}</label>`).join("")}</div>${RANGES.map((r) => `<div class="vw-r vw-r-${r}">${spark(+r)}</div>`).join("")}<div class="n2-sps">${split("own")}${split("owe")}</div></div>`;
  const pg = (s) => {
    const part = s.owe ? -s.big : s.key === "accounts" || s.key === "invest" || s.key === "fixed" || s.key === "lent" ? s.big : null;
    const ws = H.warnOf(s.key);
    return `<div class="vw-c vw-c-${s.key} vw-flex"><div class="s-eb"><span class="mc-ic spt">${spot(s.key, 24)}</span>${H.groupOf(s.key).name}</div><div class="s-name">${s.name}</div><div class="s-big" style="font-size:54px">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small style="font-size:18px"> ${s.per}</small>` : ""}</div><div class="s-sub">${s.sub}</div>${part !== null ? `<div class="n2-part"><span>${part >= 0 ? "Adds" : "Takes"}</span><b>${lakh(Math.abs(part))}</b><span>${part >= 0 ? "to" : "from"} your net worth, ${pctOf(Math.abs(part), part >= 0 ? D.OWNED : D.OWED)} of what you ${part >= 0 ? "own" : "owe"}</span></div>` : `<div class="n2-part"><span>Not part of net worth: it is money moving or cover, not a balance.</span></div>`}<div class="s-rows">${FACTS[s.key]().map(([n, v, c]) => `<div class="s-row"><i style="background:${c}"></i><span>${n}</span><b>${v}</b></div>`).join("")}</div>${ws.length ? `<div class="n2-wn">${ws.map((w) => `<div class="mini wk-${w.tone}"><i class="wk-d"></i><span><b>${w.text}</b> ${w.detail}</span></div>`).join("")}</div>` : ""}<div class="s-acts"><span class="btn btn-light">Open ${s.name} ${I.arrowR(13)}</span><label class="pkl chip-b sm" for="c-all">Back to net worth</label></div></div>`;
  };
  const kw = `<div class="kw"><div class="kw-h"><div><b>Keep in mind</b><small>${H.WARN.length} things from ten pages · pick a cell to see only its page</small></div><div class="kw-k"><span class="kd wd-red"></span>${H.COUNTS.red} now<span class="kd wd-amber"></span>${H.COUNTS.amber} soon<span class="kd wd-info"></span>${H.COUNTS.info} to know</div></div><div class="kw-l">${H.WARN_SORTED.map((w) => wk(w)).join("")}</div></div>`;
  const stage = `<section class="stg2 n2" data-b="n2">${radios("c", CELLS)}${radios("r", RANGES, "12")}<div class="n2-g">${map}<aside class="n2-r">${all}${D.SECTIONS.map(pg).join("")}</aside></div>${kw}</section>`;
  return page(stage);
}

// =====================================================================
// N3 · Bridge
// =====================================================================
export const YMAX = 7000000;
export const BARS = [
  { k: "bank", name: "Bank and brokers", page: "Accounts", kind: "own", c: "sapphire", g: "assets" },
  { k: "fixed", name: "Fixed income", page: "Fixed income", kind: "own", c: "forest", g: "assets" },
  { k: "lent", name: "Lent out", page: "Lent out", kind: "own", c: "copper", g: "assets" },
  { k: "invest", name: "Investments", page: "Investments", kind: "own", c: "indigo", g: "assets" },
  { k: "owned", name: "Owned", page: "everything you own", kind: "tot", c: "emerald", g: "assets" },
  { k: "home", name: "Home loan", page: "Loans", kind: "owe", c: "teal", g: "debts" },
  { k: "car", name: "Car loan", page: "Loans", kind: "owe", c: "sky", g: "debts" },
  { k: "cards", name: "Card bills", page: "Cards", kind: "owe", c: "ruby", g: "debts" },
  { k: "net", name: "Net worth", page: "what you keep", kind: "net", c: "gold", g: "net" },
];
/** Start and height of every bar, as a % of the plot, for a month. */
export const barGeom = (r) => {
  const own = ["bank", "fixed", "lent", "invest"]; let run = 0; const g = {};
  for (const k of own) { g[k] = [run, r[k]]; run += r[k]; }
  g.owned = [0, r.owned]; let lv = r.owned;
  for (const k of ["home", "car", "cards"]) { lv -= r[k]; g[k] = [lv, r[k]]; }
  g.net = [0, r.net];
  return Object.fromEntries(Object.entries(g).map(([k, [s, h]]) => [k, [(s / YMAX) * 100, (h / YMAX) * 100]]));
};
/** A small trend for a group of the bridge's side panel. */
export const mini = (vals, caption) => {
  const W = 420, Hh = 74, lo = Math.min(...vals), hi = Math.max(...vals), n = vals.length - 1;
  const pts = vals.map((v, i) => [6 + (i * (W - 12)) / n, Hh - 10 - ((v - lo) / (hi - lo || 1)) * (Hh - 22)]), d = smooth(pts), e = pts[n];
  return `<div class="gx"><svg viewBox="0 0 ${W} ${Hh}" class="spark" preserveAspectRatio="none"><path d="${d}L${e[0]},${Hh}L${pts[0][0]},${Hh}Z" fill="oklch(1 0 0 / 0.14)"/><path d="${d}" class="sp-l" pathLength="1"/><circle cx="${e[0]}" cy="${e[1].toFixed(1)}" r="4.5" fill="#fff"/></svg><div class="sp-k"><span>${H.mfull(0)}</span><span>today</span></div><small class="gx-c">${caption}</small></div>`;
};
export const groupExtra = (k) => {
  if (k === "assets") return mini(H.HIST.map((r) => r.owned), `What you own, up ${lakh(H.NOW.owned - H.THEN.owned)} in a year`);
  if (k === "debts") return mini(H.HIST.map((r) => r.owed), `What you owe, down ${lakh(H.THEN.owed - H.NOW.owed)} in a year`);
  if (k === "flow") return `<div class="gx"><div class="n2-sh"><span>This month, salary against bills</span><b>${inr(D.SALARY)}</b></div><div class="n2-sb" style="height:16px"><i style="width:${(D.OBLIGATIONS / D.SALARY) * 100}%;background:${col("ruby")}"></i><i style="flex:1;background:${col("emerald")}"></i></div><div class="n2-sl"><span><i style="background:${col("ruby")}"></i>Bills and EMIs ${inr(D.OBLIGATIONS)} · ${pctOf(D.OBLIGATIONS, D.SALARY)}</span><span><i style="background:${col("emerald")}"></i>Left ${inr(D.SALARY - D.OBLIGATIONS)}</span></div><small class="gx-c">Not a true surplus: it doesn't know what you spend day to day.</small></div>`;
  return `<div class="gx">${D.GOALS.map((g) => `<div class="gx-g"><div class="n2-sh"><span>${g.name} · ${g.ok ? "on track" : "behind"}</span><b>${pctOf(g.saved, g.target)}</b></div><div class="n2-sb" style="height:12px"><i style="width:${(g.saved / g.target) * 100}%;background:${col(g.color)}"></i><i style="flex:1;background:oklch(1 0 0 / 0.14)"></i></div></div>`).join("")}<small class="gx-c">${inr(D.COVER)} of cover across 2 policies, ${inr(D.POLICIES[0].premium + D.POLICIES[1].premium)} a year in premiums.</small></div>`;
};
/** The side panel with the group tabs: every page and warning of a group, and a picture of it. Used by the Bridge and the Bubbles. */
export function groupAside() {
  const grp = (g) => {
    const ws = H.warnIn(g.k);
    return `<div class="vw-g vw-g-${g.k} vw-flex"><div class="s-eb"><i class="ln-dot" style="background:${col(g.c)}"></i>${g.name}</div><div class="s-name" style="font-size:22px">${g.line}</div><div class="gp-p">${g.pages.map((k) => { const s = H.SEC[k]; return `<span class="hov lc lc-s" tabindex="0"><span class="lc-ic spt">${spot(k, 30)}</span><span class="lc-n"><b>${s.name}</b><small>${s.sub}</small></span><span class="lc-v${s.owe ? " owe" : ""}">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small>${s.per}</small>` : ""}</span>${dots(k) ? `<span class="lc-w">${dots(k)}</span>` : ""}${tip(pageCard(s), { w: 320, x: "r", y: "down" })}</span>`; }).join("")}</div><div class="gp-w">${ws.length ? ws.map((w) => wk(w)).join("") : `<div class="ln-ok">${I.check(13)} All clear</div>`}</div>${groupExtra(g.k)}</div>`;
  };
  const allg = `<div class="vw-g vw-g-all vw-flex"><div class="s-eb">Every page</div><div class="s-name" style="font-size:22px">${H.WARN.length} things to keep in mind</div><div class="gp-w">${H.WARN_SORTED.map((w) => wk(w)).join("")}</div></div>`;
  const tabs = GKEYS.map((k) => `<label class="pkl chip-b sm" for="g-${k}">${k === "all" ? "Everything" : H.GROUPS.find((g) => g.k === k).name}${k === "all" ? `<em class="cn3">${H.WARN.length}</em>` : `<em class="cn3">${H.warnIn(k).length}</em>`}</label>`).join("");
  return `<aside class="n3-r"><div class="s-eb">By group</div><div class="n3-tabs">${tabs}</div>${allg}${H.GROUPS.map(grp).join("")}</aside>`;
}
function n3() {
  const geom = barGeom(H.NOW);
  const lbl = (k) => mp((i) => { const r = H.HIST[i]; const v = r[k === "owned" ? "owned" : k === "net" ? "net" : k]; return `${BARS.find((b) => b.k === k).kind === "owe" ? "−" : ""}${lakh(v)}`; }, "bl");
  const bar = (b, j) => `<div class="cl"><i class="gh" style="bottom:${geom[b.k][0]}%;height:${geom[b.k][1]}%"></i><i class="br br-${b.kind}" style="--bc:${col(b.c)};--bg:${grad(b.c)};bottom:var(--s${j});height:var(--h${j})">${lbl(b.k)}</i>${j < 8 ? `<i class="cn" style="bottom:var(--l${j})"></i>` : ""}</div>`;
  const ART = { bank: "accounts", fixed: "fixed", lent: "lent", invest: "invest", owned: "sun", home: "loans", car: "car", cards: "cards", net: "star" };
  const under = BARS.map((b) => `<div class="ux"><span class="ux-a">${spot(ART[b.k], 30)}</span><b>${b.name}</b><small>${b.page}</small></div>`).join("");
  const brackets = `<div class="bk"><span style="grid-column:1/6;--bk:${col("sapphire")}">Assets · ${lakh(D.OWNED)}</span><span style="grid-column:6/9;--bk:${col("ruby")}">Debts · −${lakh(D.OWED)}</span><span style="grid-column:9/10;--bk:${col("gold")}">What stays</span></div>`;
  const scrub = `<div class="sc3"><span class="sc3-t">Slide back in time</span><div class="sc3-tr">${H.KEYS.map((_, i) => `<label class="pkl sc3-k" for="m-${i}"><i></i><span>${H.mshort(i)}</span></label>`).join("")}</div></div>`;
  const head3 = mp((i) => {
    const r = H.HIST[i], p = H.HIST[i - 1];
    const ch = r.net - H.NOW.net;
    return `<div class="n1-meta"><span class="eyebrow-s">Net worth at the end of ${H.mfull(i)}${i === H.TODAY_I ? " (today)" : ""}</span><div class="n1-d">${i === H.TODAY_I ? `<span class="dpill ${H.CHANGE.month >= 0 ? "up" : "dn"}">${arrow(1)} ${sg(H.CHANGE.month)}<small>vs ${H.mfull(i - 1)}</small></span><span class="dpill up">${arrow(1)} ${sg(H.CHANGE.year)}<small>since ${H.mfull(0)}</small></span>` : `<span class="dpill dn">${arrow(-1)} ${sg(ch)}<small>against today</small></span>${p ? `<span class="dpill ${r.net - p.net >= 0 ? "up" : "dn"}">${arrow(r.net - p.net)} ${sg(r.net - p.net)}<small>that month</small></span>` : ""}`}</div></div>`;
  });
  const stage = `<section class="stg2 n3" data-b="n3">${radios("m", MKEYS, TODAY_K)}${radios("g", GKEYS)}
<div class="n3-g"><div class="n3-l"><div class="n1-top"><div class="n1-l">${head3}${nwBig()}</div></div><div class="bridge"><div class="plot">${BARS.map(bar).join("")}</div><div class="ax">${under}</div>${brackets}</div>${scrub}</div>
${groupAside()}</div></section>`;
  return page(stage);
}

export const q = { n1, n2, n3 };
export const renderN = (id) => () => q[id]();
