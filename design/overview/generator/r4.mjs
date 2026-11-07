// Round 4 (2026-11-07): more visual. Prathik attached two designs he liked and asked for the Overview to be molded on them and on our data.
//   V1 Capsules   (the purple Float design) paired pills for owned against owed, month by month; net worth with a treemap of what it is made of; status chips
//   V2 Warm bento (the dark warm bento) cards stack, gradient owned-and-owed blocks, a pill-bar month strip, concentric arcs, and the warnings as a table
//   V3 Bubbles    (our own) every type of money as a glowing orb sized by what it holds; slide through the months and they swell and shrink
// All three keep net worth first, the pages in groups, and every warning in one place. Picks work with no script; every figure is made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { spot, withMascot } from "./art-soft.mjs";
import { MKEYS, TODAY_K, GKEYS, ICON, sg, arrow, mp, pctOf, nwBig, wk, dots, pageCard, groupAside, smooth } from "./r3.mjs";
const { I, inr } = L;
const { lakh, col, grad, hc, tip } = P;

export const BKEYS = ["all", ...H.TYPES.map((t) => t.k)];
const pt = (text, c, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(c, { w, x, y: "down" })}</span>`;
export const lede = () => {
  const N = H.NOW;
  const worth = hc({ h: "Net worth", t: inr(D.NET), d: "what you own less what you owe", rows: [["Owned", inr(D.OWNED)], ["Owed", `−${inr(D.OWED)}`]], f: "Investments at today's prices, EPF at the passbook figure, a dollar account at today's rate." });
  const mo = hc({ h: "Since the end of October", t: `+${inr(H.CHANGE.month)}`, d: `${H.CHANGE.monthPct.toFixed(1)}% on ${inr(H.PREV.net)}`, rows: [["Owned grew by", `+${inr(N.owned - H.PREV.owned)}`, col("emerald")], ["Owed fell by", inr(H.PREV.owed - N.owed), col("teal")]], f: "Month-end figures from the monthly snapshots." });
  const yr = hc({ h: "Against a year ago", t: `+${inr(H.CHANGE.year)}`, d: `from ${inr(H.THEN.net)} in ${H.mfull(0)}`, rows: [["Owned grew by", `+${inr(N.owned - H.THEN.owned)}`, col("emerald")], ["Owed fell by", inr(H.THEN.owed - N.owed), col("teal")]], f: "Needs a year of snapshots." });
  const left = hc({ h: "Still to pay this month", t: inr(D.TO_PAY), d: `${inr(D.PAID_SO_FAR)} already paid`, rows: [["HDFC Car Loan EMI", "due today", col("sky")], ["HDFC Regalia", "18 Nov", col("ruby")], ["Amex", "24 Nov", col("onyx")], ["Gym", "21 Nov", col("plum")]], f: "Obligations of the month less what has been paid." });
  const look = hc({ h: "Keep in mind", t: `${H.WARN.length} things`, rows: [["Act now", String(H.COUNTS.red), "oklch(0.62 0.2 25)"], ["Soon, or off", String(H.COUNTS.amber), "oklch(0.8 0.15 85)"], ["Worth knowing", String(H.COUNTS.info), "oklch(0.7 0.08 250)"]], f: "Every warning the ten pages raise, in one list." });
  return `You're worth ${pt(inr(D.NET), worth)}, up ${pt(lakh(H.CHANGE.month), mo, { x: "c" })} on last month and ${pt(lakh(H.CHANGE.year), yr, { x: "c" })} on a year ago. ${pt(inr(D.TO_PAY), left, { x: "c" })} is still to pay this month, and ${pt(`${H.WARN.length} things`, look, { x: "r" })} need a look, ${H.COUNTS.red} of them today.`;
};
const page = (body) => P.page(`${withMascot(L.header({ eyebrow: `Overview · Today ${P.sampleTag()}`, lede: lede(), actions: P.greetingActions() }))}${body}${P.sampleNote()}`);
const COVER = D.BANK_SPEND / (D.EMI + D.SUBS_MONTH);
const sgn = (n) => `${n < 0 ? "−" : "+"}${lakh(Math.abs(n))}`;

/** The pages of one group, as small tiles, and its warnings. */
const pagesOf = (g, cls = "") => g.pages.map((k) => { const s = H.SEC[k]; return `<span class="hov pg ${cls}" tabindex="0"><span class="pg-ic spt">${spot(k, 30)}</span><span class="pg-n"><b>${s.name}</b><small>${s.sub}</small></span><span class="pg-v${s.owe ? " owe" : ""}">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small>${s.per}</small>` : ""}</span>${dots(k) ? `<span class="lc-w">${dots(k)}</span>` : ""}${tip(pageCard(s), { w: 320, x: "l", y: "up" })}</span>`; }).join("");

// =====================================================================
// V1 · Capsules
// =====================================================================
const CAP_H = 300, CAP_K = CAP_H / 6600000;
function v1() {
  const chip = (icon, text, c) => `<span class="hov v1-chip">${icon}<b>${text}</b>${tip(c, { w: 300, x: "r", y: "down" })}</span>`;
  const chips = `<div class="v1-chips">${chip(I.check(15), `${COVER.toFixed(1)} months of bills covered`, hc({ h: "Cash cover", t: `${COVER.toFixed(1)} months`, d: "what the three bank accounts could carry", rows: [["Bank accounts", inr(D.BANK_SPEND)], ["EMIs and subscriptions a month", inr(D.EMI + D.SUBS_MONTH)]], f: "Brokers' cash is left out: it isn't spendable today." }))}${chip(I.up(15), `Net worth up ${H.CHANGE.monthPct.toFixed(1)}% this month`, hc({ h: "Since the end of October", t: `+${inr(H.CHANGE.month)}`, rows: [["Owned grew by", `+${inr(H.NOW.owned - H.PREV.owned)}`], ["Owed fell by", inr(H.PREV.owed - H.NOW.owed)]], f: "Month-end figures." }))}${chip(I.alert(15), `${H.WARN.length} things to keep in mind`, hc({ h: "Keep in mind", t: `${H.COUNTS.red} act now`, rows: H.WARN_SORTED.slice(0, 4).map((w) => [w.text, H.SEC[w.page].name]), f: "The whole list is at the foot of the page." }))}</div>`;
  const kpis = mp((i) => {
    const r = H.HIST[i], p = H.HIST[i - 1];
    const k = (name, v, sub, cls = "") => `<div class="v1-k"><small>${name}</small><b class="${cls}">${v}</b><span>${sub}</span></div>`;
    return `<div class="v1-ks">${k("Owned", lakh(r.owned), p ? `${r.owned >= p.owned ? "Up" : "Down"} from ${lakh(p.owned)} in ${H.mlabel(i - 1)}` : "first month on record")}${k("Owed", `−${lakh(r.owed)}`, p ? `${r.owed <= p.owed ? "Down" : "Up"} from ${lakh(p.owed)} in ${H.mlabel(i - 1)}` : "first month on record", "owe")}${k("Net worth", lakh(r.net), p ? `${sgn(r.net - p.net)} on ${H.mlabel(i - 1)}` : "")}</div>`;
  });
  const caps = H.HIST.map((r, i) => `<label class="pkl cap" for="m-${i}"><span class="cap-tag">${lakh(r.net)}</span><i class="cap-o" style="height:${(r.owned * CAP_K).toFixed(1)}px"></i><i class="cap-d" style="height:${(r.owed * CAP_K).toFixed(1)}px"></i><span class="cap-m">${H.mlabel(i)}${i === H.TODAY_I ? "<em>today</em>" : ""}</span></label>`).join("");
  // the net worth panel: a treemap of the four things you own, whose heights follow the month
  const tiles = [["invest", 38], ["fixed", 24], ["lent", 21], ["bank", 17]].map(([k, w], j) => { const t = H.TYPES.find((x) => x.k === k); return `<div class="tm tm-${k}" style="flex:${w};--tc:${col(t.c)};height:var(--t${j})"><span class="tm-a">${spot({ invest: "invest", fixed: "fixed", lent: "lent", bank: "accounts" }[k], 40)}</span><span class="tm-n">${t.name}</span><span class="tm-v">${mp((i) => lakh(H.HIST[i][k]), "tmv")}</span></div>`; }).join("");
  const owedBar = mp((i) => { const r = H.HIST[i]; return `<div class="ob">${["home", "car", "cards"].map((k) => `<i style="flex:${r[k]};background:${col(H.TYPES.find((t) => t.k === k).c)}" title="${k}"></i>`).join("")}</div>`; });
  const net = `<div class="v1-nw"><div class="v1-nh"><span class="v1-ic">${I.invest(22)}</span><b>Net worth</b><em>${mp((i) => (i === H.TODAY_I ? "today" : H.mfull(i)), "nm")}</em></div><div class="v1-pill"><span class="v1-up">${I.up(18)}</span>${nwBig()}</div><div class="tms">${tiles}</div><div class="v1-of"><div><small>Owed</small>${mp((i) => `<b class="owe">−${lakh(H.HIST[i].owed)}</b>`, "of")}${owedBar}</div><div class="v1-as"><small>Assets</small>${mp((i) => `<b>${lakh(H.HIST[i].owned)}</b>`, "of")}</div></div></div>`;
  const tabs = GKEYS.map((k) => `<label class="pkl v1-tab" for="g-${k}">${k === "all" ? "Everything" : H.GROUPS.find((g) => g.k === k).name}<em>${k === "all" ? H.WARN.length : H.warnIn(k).length}</em></label>`).join("");
  const pane = (k) => { const g = H.GROUPS.find((x) => x.k === k); const ws = k === "all" ? H.WARN_SORTED : H.warnIn(k); const pgs = k === "all" ? D.SECTIONS.map((s) => s.key) : g.pages; const grp = { pages: pgs }; return `<div class="vw-g vw-g-${k} vw-grid v1-pane"><div class="v1-pg">${pagesOf(grp)}</div><div class="v1-wk">${ws.map((w) => wk(w)).join("") || `<div class="ln-ok">${I.check(13)} All clear</div>`}</div></div>`; };
  const stage = `<section class="stg2 v1" data-b="v1">${radios("m", MKEYS, TODAY_K)}${radios("g", GKEYS)}${chips}<div class="v1-g"><div class="v1-l"><div class="v1-t"><b>Month by month</b><small>pale is what you own, dark is what you owe; the gap is what you keep</small></div>${kpis}<div class="caps">${caps}</div></div>${net}</div><div class="v1-b"><div class="v1-tabs">${tabs}</div>${GKEYS.map(pane).join("")}</div></section>`;
  return page(stage);
}

// =====================================================================
// V2 · Warm bento
// =====================================================================
function arcs() {
  const cx = 190, cy = 190, R = [158, 118, 78], SW = 24;
  const arc = (r) => `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`;
  const vals = [Math.min(COVER / 6, 1), D.NET / D.OWNED, D.GOALS.reduce((a, g) => a + g.saved, 0) / D.GOALS.reduce((a, g) => a + g.target, 0)];
  const stroke = ["url(#ag0)", "url(#ag1)", "#fff"];
  const names = ["Cash cover", "What you keep", "Goals saved"];
  const sub = [`${COVER.toFixed(1)} of 6 months`, `${lakh(D.NET)} of ${lakh(D.OWNED)}`, `${lakh(D.GOALS[0].saved + D.GOALS[1].saved)} of ${lakh(D.GOALS[0].target + D.GOALS[1].target)}`];
  const defs = `<defs><linearGradient id="ag0" x1="0" x2="1"><stop offset="0" stop-color="oklch(0.62 0.22 35)"/><stop offset="1" stop-color="oklch(0.9 0.15 95)"/></linearGradient><linearGradient id="ag1" x1="0" x2="1"><stop offset="0" stop-color="oklch(0.8 0.15 70)"/><stop offset="1" stop-color="oklch(0.97 0.06 95)"/></linearGradient></defs>`;
  const svg = `<svg viewBox="0 0 380 210" class="arcs">${defs}${R.map((r) => `<path d="${arc(r)}" class="at" stroke-width="${SW}" pathLength="100"/>`).join("")}${R.map((r, i) => `<path d="${arc(r)}" class="av" stroke="${stroke[i]}" stroke-width="${SW}" pathLength="100" style="stroke-dasharray:${(vals[i] * 100).toFixed(1)} 100;--d${i}:${(vals[i] * 100).toFixed(1)}"/>`).join("")}<text x="${cx}" y="${cy - 8}" text-anchor="middle" class="at-t">${Math.round(vals[0] * 100)}%</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="at-s">cash cover</text></svg>`;
  const legend = names.map((n, i) => `<div class="al"><i style="background:${["oklch(0.72 0.2 45)", "oklch(0.88 0.13 90)", "#fff"][i]}"></i><span>${n}</span><b>${Math.round(vals[i] * 100)}%</b><small>${sub[i]}</small></div>`).join("");
  return `<div class="arcw">${svg}<div class="als">${legend}</div></div>`;
}
function v2() {
  const cardFace = (c, back) => `<div class="cdf" style="background:${grad(c.color)}"><div class="cdf-t"><b>${c.name}</b>${I.bolt(18)}</div><div class="cdf-n">•••• •••• •••• ${c.id === "regalia" ? "4021" : "7733"}</div><div class="cdf-f"><span><small>Outstanding</small><b>${inr(c.out)}</b></span><span><small>Due</small><b>${P.dm(c.due)}</b></span></div></div>`;
  const cards = `<div class="wbc wb-cards"><div class="wb-h"><span>Cards</span>${I.plus(20)}</div><div class="wbs">${cardFace(D.CARDS[0])}<i class="ghost g1" style="background:${grad("onyx")}"></i><i class="ghost g2"></i></div><div class="wb-note">${D.CARDS.length} cards · ${inr(D.CARD_OUT)} outstanding · ${pctOf(D.CARD_OUT, D.CARD_LIMIT)} of the limit</div></div>`;
  const eq = `<div class="wbc wb-eq"><div class="wb-h"><span>Total equation</span>${I.plus(20)}</div>${[["Owned", D.OWNED, H.NOW.owned - H.PREV.owned, spot("accounts", 30), "up"], ["Owed", D.OWED, H.PREV.owed - H.NOW.owed, spot("loans", 30), "dn"]].map(([n, v, d, ic, kind]) => `<div class="eq"><div class="eq-t"><span>${n}</span><i class="eq-ic">${ic}</i></div><div class="eq-v">${kind === "dn" ? "−" : ""}${inr(v)}</div><div class="eq-s">Since last month <em class="chp">${kind === "dn" ? `−${inr(d)}` : `+${inr(d)}`}</em></div></div>`).join("")}</div>`;
  const rows = H.WARN_SORTED.map((w) => `<div class="tr2 g-${H.groupOf(w.page).k}"><b>${w.text}</b><span>${w.amt}</span><span><em class="st st-${w.tone}">${w.tone === "red" ? "Due today" : w.tone === "amber" ? "Needs a look" : "Heads-up"}</em></span><span class="nt">${w.detail}</span><span>${w.when}</span></div>`).join("");
  const gt = H.GROUPS.map((g) => `<label class="pkl gt" for="g-${g.k}" style="--gc:${col(g.c)}"><b>${g.name}</b><span>${g.k === "assets" ? lakh(D.OWNED) : g.k === "debts" ? `−${lakh(D.OWED)}` : g.k === "flow" ? `${lakh(D.SALARY)}/mo` : `${lakh(D.COVER)} cover`}</span><small>${g.pages.map((k) => H.SEC[k].name).join(" · ")}</small><span class="gt-d">${H.warnIn(g.k).map((w) => `<i class="wd wd-${w.tone}"></i>`).join("")}</span></label>`).join("");
  const table = `<div class="wbc wb-tb"><div class="wb-h"><span>Keep in mind</span><span class="wb-sel">${H.WARN.length} things · ten pages ${I.chev(12)}</span></div><div class="gts"><label class="pkl gt gt-all" for="g-all"><b>Everything</b><span>${H.WARN.length}</span></label>${gt}</div><div class="tr2 th"><span>What</span><span>Amount</span><span>Status</span><span>Note</span><span>When</span></div>${rows}</div>`;
  const maxH = 232, hO = maxH, hD = maxH * (D.OWED / D.OWNED);
  const blocks = `<div class="wbc wb-pr"><div class="wb-h"><span>Net worth</span>${I.plus(20)}</div><div class="pr-top"><div><small>Owned</small><b>${lakh(D.OWNED)}</b></div><div><small>Owed</small><b>${lakh(D.OWED)}</b></div><div class="pr-nw"><small>You keep</small>${nwBig(" nwc-wb")}</div></div><div class="pr-bl"><div class="pb" style="height:${hD}px;background:linear-gradient(180deg,oklch(0.78 0.17 55),oklch(0.65 0.2 40))"><span class="pb-t">−${lakh(D.OWED)}</span></div><div class="pb" style="height:${hO}px;background:linear-gradient(180deg,oklch(0.96 0.08 100),oklch(0.78 0.15 80))"><span class="pb-t">${lakh(D.OWNED)}</span></div></div></div>`;
  const pills = H.HIST.map((r, i) => `<label class="pkl pl" for="m-${i}"><span class="pl-t">${lakh(r.net)}</span><i style="height:${((r.net / 2800000) * 100).toFixed(1)}%"></i><em>${H.mshort(i)}</em></label>`).join("");
  const act = `<div class="wbc wb-act"><div class="wb-h"><span>Net worth, month by month</span>${I.plus(20)}</div><div class="pls">${pills}</div></div>`;
  const target = `<div class="wbc wb-tg"><div class="wb-h"><span>Three measures</span>${I.plus(20)}</div>${arcs()}</div>`;
  const left = `<div class="wbc wb-lm"><div class="wb-h"><span>Still to pay this month</span>${I.more(18)}</div><div class="lm"><b>${inr(D.TO_PAY)}</b><span> of ${inr(D.OBLIGATIONS)}</span></div><div class="lm-b"><i style="width:${(D.PAID_SO_FAR / D.OBLIGATIONS) * 100}%"></i></div><div class="lm-f"><span>${inr(D.PAID_SO_FAR)} paid</span><b>${pctOf(D.PAID_SO_FAR, D.OBLIGATIONS)}</b></div></div>`;
  const body = `<section class="wb" data-b="v2">${radios("m", MKEYS, TODAY_K)}${radios("g", GKEYS)}<div class="wb-c1">${cards}${eq}</div><div class="wb-c2">${table}${blocks}</div><div class="wb-c3">${act}${target}${left}</div></section>`;
  return page(body);
}

// =====================================================================
// V3 · Bubbles
// =====================================================================
export const wcount = (key) => H.warnOf(key);
export const PAGEOF = { bank: "accounts", fixed: "fixed", lent: "lent", invest: "invest", home: "loans", car: "loans", cards: "cards" };

export const detailFor = (t) => {
  const ws = wcount(PAGEOF[t.k]), mine = H.HIST.map((r) => r[t.k]);
  const W = 300, Hh = 60, lo = Math.min(...mine), hi = Math.max(...mine), pts = mine.map((v, i) => [4 + (i * (W - 8)) / 12, Hh - 8 - ((v - lo) / (hi - lo || 1)) * (Hh - 16)]);
  return `<div class="vw-b vw-b-${t.k} od vw-grid"><div class="od-l"><div class="od-h"><i style="background:${col(t.c)}"></i><b>${t.name}</b>${t.page !== t.name ? `<span>${t.page}</span>` : ""}</div><div class="od-v">${mp((i) => `${t.side === "owe" ? "−" : ""}${lakh(H.HIST[i][t.k])}`, "ov")}</div><div class="od-s">${pctOf(H.NOW[t.k], t.side === "own" ? D.OWNED : D.OWED)} of what you ${t.side === "own" ? "own" : "owe"} today · ${t.side === "own" ? "up" : "down"} ${lakh(Math.abs(H.NOW[t.k] - H.THEN[t.k]))} in a year</div></div><div class="od-m"><small>${t.name} over the year</small><svg viewBox="0 0 ${W} ${Hh}" class="spark" preserveAspectRatio="none"><path d="${smooth(pts)}" class="sp-l" pathLength="1"/></svg></div><div class="od-r">${ws.map((w) => `<div class="mini wk-${w.tone}"><i class="wk-d"></i><span><b>${w.text}</b> ${w.detail}</span></div>`).join("")}</div></div>`;
};

export const BUB = { // centre of each orb in the 900 x 540 pool
  invest: [185, 205], fixed: [390, 300], lent: [300, 450], bank: [100, 440],
  home: [690, 225], car: [705, 430], cards: [830, 335],
};
export const bubD = (r, k) => { const v = r[k]; return Math.round(2 * Math.max(Math.sqrt(v) * 0.0712, 22)); };
function v3() {
  const head = mp((i) => {
    const r = H.HIST[i], p = H.HIST[i - 1], ch = r.net - H.NOW.net;
    return `<div class="n1-meta"><span class="eyebrow-s">Net worth at the end of ${H.mfull(i)}${i === H.TODAY_I ? " (today)" : ""}</span><div class="n1-d">${i === H.TODAY_I ? `<span class="dpill up">${arrow(1)} ${sg(H.CHANGE.month)}<small>vs ${H.mfull(i - 1)}</small></span><span class="dpill up">${arrow(1)} ${sg(H.CHANGE.year)}<small>since ${H.mfull(0)}</small></span>` : `<span class="dpill dn">${arrow(-1)} ${sg(ch)}<small>against today</small></span>${p ? `<span class="dpill ${r.net - p.net >= 0 ? "up" : "dn"}">${arrow(r.net - p.net)} ${sg(r.net - p.net)}<small>that month</small></span>` : ""}`}</div></div>`;
  });
  const OART = { bank: "accounts", fixed: "fixed", lent: "lent", invest: "invest", home: "loans", car: "car", cards: "cards" };
  const orb = (t) => {
    const [x, y] = BUB[t.k], ws = wcount(PAGEOF[t.k]), worst = ws.sort((a, b) => H.TONE_RANK[a.tone] - H.TONE_RANK[b.tone])[0];
    return `<label class="pkl orb orb-${t.side} orb-${t.k}" for="b-${t.k}" style="left:${(x / 900) * 100}%;top:${(y / 540) * 100}%;--oc:${col(t.c)};--bd:var(--bd-${t.k})"><span class="orb-i"><span class="orb-a">${spot(OART[t.k], 34)}</span><b>${t.name}</b><span>${mp((i) => `${t.side === "owe" ? "−" : ""}${lakh(H.HIST[i][t.k])}`, "ov")}</span></span>${worst ? `<i class="orb-w wd-${worst.tone}">${ws.length}</i>` : ""}</label>`;
  };
  const scrub = `<div class="sc3"><span class="sc3-t">Slide through the months</span><div class="sc3-tr">${H.KEYS.map((_, i) => `<label class="pkl sc3-k" for="m-${i}"><i></i><span>${H.mshort(i)}</span></label>`).join("")}</div></div>`;
  const pool = `<div class="pool"><div class="pool-lab pl-own">what you own</div><div class="pool-lab pl-owe">what you owe</div>${H.TYPES.map(orb).join("")}</div><div class="od-w"><div class="vw-b vw-b-all od od-hint"><b>Pick an orb</b><span>to see it through the year and the warnings on its page. The orbs swell and shrink as you slide through the months; the dashed ones are debts, and a number on an orb is how many things its page wants a look at.</span></div>${H.TYPES.map(detailFor).join("")}</div>`;
  const stage = `<section class="stg2 v3" data-b="v3">${radios("m", MKEYS, TODAY_K)}${radios("g", GKEYS)}${radios("b", BKEYS)}<div class="n3-g"><div class="n3-l"><div class="n1-top"><div class="n1-l">${head}${nwBig()}</div></div>${pool}${scrub}</div>${groupAside()}</div></section>`;
  return page(stage);
}

export const q = { v1, v2, v3 };
export const renderV = (id) => () => q[id]();
