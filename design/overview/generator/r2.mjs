// Round 2: four bold, whole-page ideas for the Overview. They keep the shell (rail, the greeting that points) and drop the shared widgets:
// each page is built around one interaction that answers a question the old Overview never could.
//   Q1 Future you        what will I be worth, and when are the loans gone?
//   Q2 What if           what can hurt me, and how long could I carry it?
//   Q3 Things I noticed  what is worth knowing, with the maths behind it
//   Q4 Where a month goes where does a month of salary actually go?
// Every pick works with no script (hidden radios, labels and :has()). Every figure is made up; every rate and habit is an assumption on the board.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as M from "./model.mjs";
import { radios, stile } from "./ui.mjs";
const { I, inr } = L;
const { lakh, col, grad, fillc, dm } = P;
const A = M.ASSUME;

export const Q1_H = M.HORIZONS, Q1_R = M.RETURNS;
export const Q1_COL = { 4: "sky", 8: "emerald", 12: "gold" };
export const SC = M.scenarios();
export const Q2_KEYS = SC.map((s) => s.k);
export const Q2_COL = Object.fromEntries(SC.map((s) => [s.k, s.c]));
export const Q3_TAGS = ["all", "cash", "debt", "risk", "growth", "habits"];
export const FLOW = M.FLOW;
export const Q4_KEYS = ["all", ...FLOW.groups.map((g) => g.k), ...FLOW.groups.flatMap((g) => g.leaves.map((l) => l.k))];
export const Q4_COL = { all: "indigo", ...Object.fromEntries(FLOW.groups.map((g) => [g.k, g.c])), ...Object.fromEntries(FLOW.groups.flatMap((g) => g.leaves.map((l) => [l.k, g.c]))) };

const ICON = { accounts: "accounts", invest: "invest", fixed: "fixed", lent: "lent", cards: "cards", loans: "loans", income: "income", subs: "subs", ins: "shield", goals: "goals" };
/** A slim dock of every section at the foot of the page: where to go next, with a dot where something needs a look. */
export const dock = () => `<div class="dock"><span class="dock-t">Go to</span>${D.SECTIONS.map((s) => `<span class="dk"><span class="dk-ic" style="background:${grad(s.color)}">${I[ICON[s.key]]?.(13) ?? ""}</span><span class="dk-n"><b>${s.name}</b><small>${s.owe ? "−" : ""}${lakh(s.big)}</small></span>${s.flag ? '<i class="dk-f"></i>' : ""}</span>`).join("")}</div>`;
const page = (body) => P.page(`${P.greeting()}${body}${dock()}${P.sampleNote()}`);
const big = (n) => `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`;
const sgn = (n) => `${n < 0 ? "−" : "+"}${lakh(Math.abs(n))}`;
const yrs = (n) => (n === 1 ? "1 year" : `${n} years`);

// =====================================================================
// Q1 · Future you
// =====================================================================
export function q1Body({ rates = Q1_R, slider = false } = {}) {
  const W = 900, H = 330, pl = 56, pr = 18, pt = 24, pb = 74;
  const YMAX = { 4: 35000000, 8: 50000000, 12: 80000000 }, STEP = { 4: 10000000, 8: 10000000, 12: 20000000 };
  const stepOf = (ym) => (ym > 55000000 ? 20000000 : 10000000), niceMax = (r) => { const f = M.PROJ[r][240].net, st = stepOf(f); return Math.ceil((f * 1.04) / st) * st; };
  const cr = (v) => (v === 0 ? "₹0" : `₹${v / 10000000} Cr`);
  const svgFor = (r) => {
    const ymax = YMAX[r] ?? niceMax(r), step = STEP[r] ?? stepOf(ymax), x = (t) => pl + (t / 240) * (W - pl - pr), y = (v) => pt + (1 - v / ymax) * (H - pt - pb), base = y(0);
    const line = M.PROJ[r].filter((p) => p.t % 3 === 0).map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.net).toFixed(1)}`).join(" ");
    const owed = M.PROJ[0].filter((p) => p.t % 3 === 0);
    const owedArea = `M${x(0)},${base} ${owed.map((p) => `L${x(p.t).toFixed(1)},${y(p.owed).toFixed(1)}`).join(" ")} L${x(240)},${base} Z`;
    const grid = Array.from({ length: Math.round(ymax / step) + 1 }, (_, i) => i * step).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#fff" stroke-opacity="${v ? 0.13 : 0.3}" ${v ? 'stroke-dasharray="3 5"' : ""}/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#fff" fill-opacity=".6">${cr(v)}</text>`).join("");
    const ticks = [0, 60, 120, 180, 240].map((t) => `<text x="${x(t)}" y="${base + 16}" text-anchor="middle" font-size="11" fill="#fff" fill-opacity=".6">${t ? M.dateAt(t).slice(0, 4) : "Today"}</text>`).join("");
    const marks = Q1_H.map((h) => { const p = M.PROJ[r][h * 12]; return `<g class="mk mk-${h}-${r}"><line x1="${x(p.t)}" x2="${x(p.t)}" y1="${y(p.net)}" y2="${base}" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 4"/><circle cx="${x(p.t)}" cy="${y(p.net)}" r="8" fill="#fff" stroke="var(--hc)" stroke-width="4"/><text x="${x(p.t) - (h === 20 ? 14 : 0)}" y="${y(p.net) - 16}" text-anchor="${h === 20 ? "end" : "middle"}" font-size="13" font-weight="800" fill="#fff">${lakh(p.net)}</text></g>`; }).join("");
    const flags = M.milestones(r).map((m, i) => { const fx = x(m.t), row = i % 3, end = m.t > 170; return `<g><line x1="${fx}" x2="${fx}" y1="${base}" y2="${base + 28 + row * 14}" stroke="#fff" stroke-opacity=".5"/><circle cx="${fx}" cy="${base}" r="3.5" fill="#fff"/><text x="${fx + (end ? -5 : 5)}" y="${base + 34 + row * 14}" text-anchor="${end ? "end" : "start"}" font-size="10.5" font-weight="700" fill="#fff" fill-opacity=".92">${m.label} · ${M.monthYear(M.dateAt(m.t))}</text></g>`; }).join("");
    const now = `<circle cx="${x(0)}" cy="${y(D.NET)}" r="6" fill="#fff"/><text x="${x(0) + 12}" y="${y(D.NET) - 14}" font-size="12" font-weight="800" fill="#fff">Today ${lakh(D.NET)}</text>`;
    return `<svg class="q1svg q1svg-${r}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${ticks}<path d="${owedArea}" fill="oklch(0.7 0.18 25)" fill-opacity=".38"/><path d="${line} L${x(240)},${base} L${x(0)},${base} Z" fill="#fff" fill-opacity=".13"/><path d="${line}" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>${flags}${marks}${now}</svg>`;
  };
  const svg = rates.map(svgFor).join("");
  const owedKey = `<span class="q1-key"><i style="background:oklch(0.7 0.18 25 / .7)"></i>What you owe, shrinking as the loans clear</span><span class="q1-key"><i style="background:#fff"></i>Your net worth</span>`;
  const panes = rates.flatMap((r) => Q1_H.map((h) => {
    const f = M.future(h, r), flat = M.PROJ[0][h * 12], now0 = M.PROJ[0][0];
    return `<div class="q1p q1p-${h}-${r}"><div class="s-eb">In ${yrs(h)} · ${M.monthYear(M.dateAt(h * 12))}</div><div class="s-big" style="font-size:60px">${big(f.net)}</div><div class="s-sub">is what you'd be worth, if your investments earn ${r}% a year. That is ${sgn(f.change)} on today.</div>
<div class="s-tiles q1-tiles">${stile("From investment growth", sgn(f.growth), `what ${r}% adds over standing still`)}${stile("From everything else", sgn(flat.net - now0.net), "what you add, deposits and EPF, loans paid down")}${stile("Investments then", lakh(f.p.inv), `from ${lakh(D.INVEST)} today`)}${stile("Still owed then", f.p.owed ? lakh(f.p.owed) : "₹0", f.p.loans ? "loans and cards" : "loans are gone; cards remain")}</div></div>`;
  })).join("");
  const chips = (g, items, fmt) => `<div class="q1-chips">${items.map((v) => `<label class="pkl chip-b" for="${g}-${v}">${fmt(v)}</label>`).join("")}</div>`;
  const rateSlider = (rs) => `<div class="rs"><div class="rs-top"><b>Your own number</b><span class="rs-v">${rs.map((r) => `<span class="vw-rt vw-rt-${r}">${r}%<small> a year</small></span>`).join("")}</span></div><div class="rs-tr">${rs.map((r) => `<label class="pkl rs-k" for="rt-${r}"><i></i><span>${r}</span></label>`).join("")}</div><div class="rs-q"><span>slide to any rate from ${rs[0]}% to ${rs.at(-1)}%</span><span>the real number is a typed field</span></div></div>`;
  const stage = `<section class="stg2 q1" data-b="q1">
<div class="q1-l"><div class="s-eb">Future you</div><div class="s-name">What you'll be worth, and when</div>
<div class="q1-q">In</div>${chips("hz", Q1_H, (v) => `${v} <small>${v === 1 ? "year" : "years"}</small>`)}
<div class="q1-q">If your investments earn</div>${slider ? rateSlider(rates) : chips("rt", rates, (v) => `${v}% <small>a year</small>`)}
<div class="q1-as"><b>What it assumes</b><ul><li>You add <b>${inr(A.sip)}</b> a month to investments</li><li>EPF gets <b>${inr(A.epfAdd)}</b> a month, at ${A.epfRate}%</li><li>Deposits earn ${A.fdRate}%, the matured one goes back in</li><li>Loans paid by EMI only: home ${A.homeRate}%, car ${A.carRate}%</li><li>Friend's 12% loan keeps piling up, and is paid in the end</li></ul><small>Made-up rates. The build reads the real ones, and shows these as editable.</small></div></div>
<div class="q1-r">${panes}<div class="s-chart q1-chart">${svg}<div class="q1-keys">${owedKey}</div></div></div></section>`;
  return `${radios("hz", Q1_H.map(String), "10")}${radios("rt", rates.map(String), "8")}${stage}`;
}

// =====================================================================
// Q2 · What if
// =====================================================================
export const q1 = () => page(q1Body());
function runway(s) {
  const MAXM = 40, w = (m) => (m / MAXM) * 100;
  const segs = s.layers.filter((l) => l.m > 0.05).map((l) => `<div class="rw-s" style="left:${w(l.from)}%;width:${w(l.m)}%;background:${grad(l.c)}" title="${l.name}"><b>${w(l.m) > 9 ? l.name : ""}</b><span>${w(l.m) > 5 ? l.m.toFixed(1) : ""}</span></div>`).join("");
  const ticks = [0, 6, 12, 24, 36].map((m) => `<span style="left:${w(m)}%">${m === 0 ? "Now" : m < 12 ? `${m} mo` : `${m / 12} yr`}</span>`).join("");
  const total = s.layers.at(-1).to;
  const key = s.layers.filter((l) => l.m > 0.05).map((l) => `<span><i style="background:${col(l.c)}"></i>${l.name}<b>${l.m.toFixed(1)} mo</b><small>${l.how}</small></span>`).join("");
  return `<div class="rw"><div class="rw-bar">${segs}<em style="left:${w(total)}%"><b>${total.toFixed(1)} months</b></em></div><div class="rw-ax">${ticks}</div></div><div class="rw-key">${key}</div>`;
}
function incomeBills(s) {
  const mx = 260000, a = (s.income / mx) * 100, b = (s.outgo / mx) * 100, gap = s.income - s.outgo;
  return `<div class="ib"><div class="ib-r"><span>Money in</span><div><i style="width:${a}%;background:#fff"></i></div><b>${inr(s.income)}</b></div><div class="ib-r"><span>Bills and EMIs</span><div><i style="width:${b}%;background:oklch(0.78 0.14 25)"></i></div><b>${inr(s.outgo)}</b></div><div class="ib-n ${gap >= 0 ? "pos" : "neg"}">${gap >= 0 ? `Adds ${inr(gap)} a month` : `Burns ${inr(-gap)} a month`}</div></div>`;
}
export function q2() {
  const list = SC.map((s) => `<label class="pkl q2-i" for="p-${s.k}" style="--ic:${col(s.c)}"><i></i><span><b>${s.name}</b><small>${s.sub}</small></span><em class="${s.delta < 0 ? "dn" : ""}">${s.delta ? sgn(s.delta) : s.tag}</em></label>`).join("");
  const panes = SC.map((s) => `<div class="vw-p vw-p-${s.k} vw-flex q2-p"><div class="q2-h"><div><div class="s-eb">${s.tag} · what if</div><div class="s-name">${s.name}</div></div><div class="q2-nw"><small>Net worth after</small><b>${big(s.net)}</b><span class="${s.delta < 0 ? "dn" : ""}">${s.delta ? sgn(s.delta) : "no change today"}</span></div></div>
<div class="s-ct" style="margin-top:6px">How long could you carry the bills?<small>${inr(s.outgo)} a month, if the salary stopped: bank first, then what you'd sell</small></div>${runway(s)}
<div class="q2-b"><div>${incomeBills(s)}</div><div class="s-tiles q2-t">${s.touches.map(([k, v]) => stile(k, v)).join("")}</div></div>
<div class="q2-line">${I.info(14)}<span>${s.line}</span></div></div>`).join("");
  return page(`${radios("p", Q2_KEYS)}<section class="stg2 q2" data-b="q2"><div class="q2-l"><div class="s-eb">What if</div><div class="s-name" style="margin-bottom:14px">Pick a bad day, or a good choice</div>${list}<div class="on-stage-hint" style="margin-top:12px">${I.info(12)} Nothing here is a forecast: it's your own numbers pushed one way.</div></div><div class="q2-r">${panes}</div></section>`);
}

// =====================================================================
// Q3 · Things I noticed
// =====================================================================
const mini = (inner, w = 300, h = 74) => `<svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:${h}px">${inner}</svg>`;
const hbar = (parts, w = 300, h = 18, y = 0) => { let x = 0; return parts.map(([v, c, label]) => { const pw = (v / parts.reduce((a, p) => a + p[0], 0)) * w; const r = `<rect x="${x.toFixed(1)}" y="${y}" width="${Math.max(0, pw - 2).toFixed(1)}" height="${h}" rx="5" fill="${c}"/>${label && pw > 46 ? `<text x="${(x + 7).toFixed(1)}" y="${y + h / 2 + 4}" font-size="10.5" font-weight="800" fill="#fff">${label}</text>` : ""}`; x += pw; return r; }).join(""); };
const C = (n) => `var(--card-${n})`;
const INS = [
  { k: "cash", tag: "cash", title: `Your bank accounts dip to <b>${lakh(D.LOWEST.bal)}</b> on 28 Nov`, body: "Five bills fall in 11 days; the salary lands two days after the lowest point.", act: "See the month", vis: () => { const pts = D.CASH, mx = 330000, mn = 150000, x = (i) => 6 + (i * 288) / 30, y = (v) => 66 - ((v - mn) / (mx - mn)) * 56; return mini(`<path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(p.i)},${y(p.bal)}`).join(" ")}" fill="none" stroke="${C("sapphire")}" stroke-width="2.4"/><circle cx="${x(D.LOWEST.i)}" cy="${y(D.LOWEST.bal)}" r="5" fill="oklch(0.72 0.14 75)"/>`); }, how: `Today's three bank accounts (${inr(D.BANK_SPEND)}) with every dated bill and payday applied. A matured FD isn't counted until it's closed, and day-to-day spending isn't tracked.` },
  { k: "prepay", tag: "debt", act: "Close the FD into the loan", star: true, title: `The matured FD would save <b>₹${Math.round(M.PREPAY.saved / 1000)}k</b> if it paid down the car loan`, body: `It ends the loan ${M.PREPAY.sooner} months sooner. Left as a deposit it would earn ₹${Math.round(M.PREPAY.fdEarns / 1000)}k, so the loan wins by ₹${Math.round(M.PREPAY.edge / 1000)}k.`, vis: () => mini(`<text x="0" y="12" font-size="10.5" font-weight="700" fill="var(--muted)">Interest you still pay on the car loan</text>${hbar([[M.PREPAY.baseInterest, C("copper"), `₹${Math.round(M.PREPAY.baseInterest / 1000)}k`]], 300 * (M.PREPAY.baseInterest / M.PREPAY.baseInterest), 18, 20)}<text x="0" y="56" font-size="10.5" font-weight="700" fill="var(--muted)">If ₹1.52L goes in now</text>${hbar([[M.PREPAY.newInterest, C("emerald"), `₹${Math.round(M.PREPAY.newInterest / 1000)}k`]], 300 * (M.PREPAY.newInterest / M.PREPAY.baseInterest), 18, 60)}`, 300, 84), how: `The car loan (${inr(D.LOANS[1].out)} at ${A.carRate}%, EMI ${inr(D.LOANS[1].emi)}) run month by month with and without ₹1,52,400 paid in today. The deposit's alternative is ${A.fdRate}% over the same ${M.CAR.months} months.` },
  { k: "netapp", tag: "risk", act: "See Investments", title: `<b>${((D.HOLDINGS[0].worth / D.INVEST) * 100).toFixed(0)}%</b> of your investments is one company, the one that pays your salary`, body: `NetApp is ${((D.HOLDINGS[0].worth / D.OWNED) * 100).toFixed(0)}% of everything you own. A measure of what rides on it, not a reason to sell.`, vis: () => mini(hbar(D.HOLDINGS.map((h, i) => [h.worth, i === 0 ? C("sapphire") : `color-mix(in oklch,${C(h.color)} 60%,white)`, i === 0 ? "NetApp" : ""]), 300, 26, 8) + `<text x="0" y="56" font-size="10.5" font-weight="700" fill="var(--muted)">Salary, RSUs, ESPP and EPF all from the same employer</text>`), how: `NetApp holdings ${inr(D.HOLDINGS[0].worth)} ÷ investments ${inr(D.INVEST)}; and ÷ everything you own ${inr(D.OWNED)}.` },
  { k: "idle", tag: "growth", act: "Move it", star: true, title: `<b>${lakh(D.BROKER_CASH)}</b> is sitting as cash at your brokers`, body: `${((D.BROKER_CASH / (D.INVEST + D.BROKER_CASH)) * 100).toFixed(1)}% of what you hold at brokers earns nothing while it waits.`, vis: () => mini(hbar([[D.INVEST, C("indigo"), "Invested"], [D.BROKER_CASH, "oklch(0.78 0.14 75)", ""]], 300, 26, 8) + `<text x="0" y="56" font-size="10.5" font-weight="700" fill="var(--muted)">$3,000 at Vested and ₹1,00,000 at Zerodha</text>`), how: `Brokerage cash ${inr(D.BROKER_CASH)} ÷ (investments ${inr(D.INVEST)} + that cash). A dollar balance is counted at today's rate (${D.USD_INR}).` },
  { k: "fixed", tag: "habits", act: "See Loans", title: `<b>22%</b> of every salary is spoken for before you spend a rupee`, body: `Both EMIs and the insurance premiums come to ${inr(D.EMI + 3583)} of your ${inr(D.SALARY)}.`, vis: () => mini(hbar([[D.EMI + 3583, C("copper"), "22%"], [D.SALARY - D.EMI - 3583, `color-mix(in oklch,${C("emerald")} 55%,white)`, "the rest"]], 300, 26, 8) + `<text x="0" y="56" font-size="10.5" font-weight="700" fill="var(--muted)">${inr(D.LOANS[0].emi)} home · ${inr(D.LOANS[1].emi)} car · ${inr(3583)} insurance</text>`), how: `EMIs ${inr(D.EMI)} + both premiums (₹18,400 and ₹24,600 a year ÷ 12 = ${inr(3583)}) ÷ salary ${inr(D.SALARY)}.` },
  { k: "friend", tag: "risk", act: "Record a repayment", star: true, title: `One borrower owes <b>${((813693 / D.LENT) * 100).toFixed(0)}%</b> of everything you've lent`, body: `Friend's ₹6.5L is 766 days out; ₹1,63,693 of interest is owed and nothing has come back.`, vis: () => { const x = (i) => 6 + (i * 288) / 10, y = (i) => 62 - (i / 10) * 50; return mini(`<path d="M${x(0)},${y(0)} L${x(10)},${y(10)}" stroke="${C("copper")}" stroke-width="2.4" fill="none"/><path d="M${x(0)},${y(0)} L${x(10)},${y(10)} L${x(10)},62 L${x(0)},62Z" fill="${C("copper")}" fill-opacity=".18"/><circle cx="${x(10)}" cy="${y(10)}" r="5" fill="${C("copper")}"/><text x="${x(0) + 4}" y="14" font-size="10.5" font-weight="800" fill="var(--muted)">+₹214 a day, 766 days and counting</text>`); }, how: `₹6,50,000 + ₹1,63,693 of simple interest (12% × 766 days ÷ 365) = ₹8,13,693 of the ₹12,95,693 lent out.` },
  { k: "subs", tag: "habits", act: "See Subscriptions", title: `Subscriptions cost <b>₹${(D.SUBS_MONTH * 12).toLocaleString("en-IN")}</b> a year`, body: `Three of them are 83% of it. ₹${(D.SUBS_MONTH - D.SUBS_OFF_CARD).toLocaleString("en-IN")} a month rides on cards, the rest comes off the bank.`, vis: () => mini(hbar([[1999, C("plum"), "Claude"], [1350, C("copper"), "Gym"], [649, C("ruby"), ""], [822, "oklch(0.8 0.02 260)", ""]], 300, 26, 8) + `<text x="0" y="56" font-size="10.5" font-weight="700" fill="var(--muted)">Claude · Gym · Netflix · nine smaller ones</text>`), how: `₹4,820 a month × 12. Card-charged ones are inside their card's bill, so monthly obligations count only the ₹1,350 that isn't.` },
  { k: "free", tag: "debt", act: "See Loans", title: `The car loan ends <b>${M.monthYear(M.dateAt(M.CAR.months))}</b>, the home loan <b>${M.monthYear(M.dateAt(M.HOME.months))}</b>`, body: `At today's EMIs you'll pay ₹${(M.HOME.interest / 100000).toFixed(1)}L of interest on the home loan and ₹${(M.CAR.interest / 1000).toFixed(0)}k on the car loan.`, vis: () => { const w = (m) => (m / 240) * 288; return mini(`<text x="0" y="12" font-size="10.5" font-weight="700" fill="var(--muted)">Car</text><rect x="44" y="3" width="${w(M.CAR.months)}" height="12" rx="5" fill="${C("copper")}"/><text x="0" y="40" font-size="10.5" font-weight="700" fill="var(--muted)">Home</text><rect x="44" y="31" width="${w(M.HOME.months) - 24}" height="12" rx="5" fill="${C("teal")}"/><text x="44" y="68" font-size="10" font-weight="700" fill="var(--muted)">Today</text><text x="294" y="68" text-anchor="end" font-size="10" font-weight="700" fill="var(--muted)">${M.dateAt(240).slice(0, 4)}</text>`); }, how: `Each loan run month by month: balance × (1 + rate ÷ 12) − EMI, until it reaches zero. Rates here are made up (home ${A.homeRate}%, car ${A.carRate}%).` },
];
export function q3Body(flipped = []) {
  const tagN = (t) => INS.filter((i) => i.tag === t).length;
  const card = (i) => `<article class="ins t-${i.tag}${i.star ? " star" : ""}"><input class="pk-in" type="checkbox" id="fl-${i.k}"${flipped.includes(i.k) ? " checked" : ""}>
<div class="ins-f"><div class="ins-h"><span class="ins-tag tg-${i.tag}">${i.tag}</span>${i.star ? '<span class="tagb gain">worth acting on</span>' : ""}</div><div class="ins-t">${i.title}</div><div class="ins-b">${i.body}</div><div class="ins-v">${i.vis()}</div><div class="ins-a"><label for="fl-${i.k}" class="ins-how">How it's worked out</label><span class="btn btn-ghost btn-xs">${i.act}</span></div></div>
<div class="ins-k"><div class="ins-h"><span class="ins-tag tg-${i.tag}">${i.tag}</span></div><div class="ins-t" style="font-size:14px">How it's worked out</div><div class="ins-b" style="font-size:12.5px;color:var(--fg)">${i.how}</div><div class="ins-a" style="margin-top:auto"><label for="fl-${i.k}" class="ins-how">Back</label><span class="tagb grey">made-up sample</span></div></div></article>`;
  const sum = `<article class="ins ins-sum"><div class="s-eb">What I noticed</div><div class="ins-n">${INS.length}<small> things</small></div><div class="s-sub">in your numbers today. Three are worth acting on, the rest are worth knowing.</div><ul>${Q3_TAGS.slice(1).map((t) => `<li><span class="ins-tag tg-${t}">${t}</span><b>${tagN(t)}</b></li>`).join("")}</ul><div class="s-note">Each one is worked out from your own figures, and says how. They're measures, never advice.</div></article>`;
  const f = Q3_TAGS.map((t) => `<label class="pkl chip-b" for="p-${t}">${t === "all" ? "All" : t[0].toUpperCase() + t.slice(1)}<small>${t === "all" ? INS.length : tagN(t)}</small></label>`).join("");
  return `${radios("p", Q3_TAGS)}<section class="stg2 q3" data-b="q3"><div class="q3-top"><div><div class="s-eb">Things I noticed</div><div class="s-name" style="font-size:30px">Eight things worth knowing about your money</div></div><div class="q3-f">${f}</div></div><div class="q3-g">${sum}${INS.map(card).join("")}</div></section>`;
}

// =====================================================================
// Q4 · Where a month goes
// =====================================================================
export const q3 = (f) => page(q3Body(f));
function sankey() {
  const W = 1100, H = 690, G_MIN = 44, L_MIN = 28, GAP = 8;
  const fit = (vals, min, gap, H) => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const s = (lo + hi) / 2, tot = vals.reduce((a, v) => a + Math.max(min, v * s), 0) + gap * (vals.length - 1); tot > H ? (hi = s) : (lo = s); } return lo; };
  const stack = (vals, min, gap, H) => { const s = fit(vals, min, gap, H), hs = vals.map((v) => Math.max(min, v * s)); const free = H - hs.reduce((a, b) => a + b, 0), g = vals.length > 1 ? Math.min(40, free / (vals.length - 1)) : 0; const off = (H - hs.reduce((a, b) => a + b, 0) - g * (vals.length - 1)) / 2; let y = Math.max(0, off); return hs.map((h) => { const o = { y, h }; y += h + g; return o; }); };
  const IN = { x: 0, w: 150, y: 0, h: H };
  const grp = stack(FLOW.groups.map((g) => g.v), G_MIN, GAP, H).map((p, i) => ({ ...p, ...FLOW.groups[i], x: 390, w: 190 }));
  const allLeaves = FLOW.groups.flatMap((g) => g.leaves.map((l) => ({ ...l, g })));
  const lpos = stack(allLeaves.map((l) => l.v), L_MIN, GAP, H);
  const leaves = allLeaves.map((l, i) => ({ ...l, ...lpos[i], x: 830, w: 270 }));
  const ribbon = (x1, y1a, y1b, x2, y2a, y2b) => { const mx = (x1 + x2) / 2; return `M${x1},${y1a} C${mx},${y1a} ${mx},${y2a} ${x2},${y2a} L${x2},${y2b} C${mx},${y2b} ${mx},${y1b} ${x1},${y1b} Z`; };
  let paths = "", iy = 0;
  grp.forEach((g) => {
    const th = (g.v / FLOW.total) * IN.h;
    paths += `<path class="lk to-group g-${g.k} ig-${g.k}" d="${ribbon(IN.w, iy, iy + th, g.x, g.y, g.y + g.h)}" fill="${col(g.c)}"/>`;
    iy += th;
    let gy = g.y;
    leaves.filter((l) => l.g.k === g.k).forEach((l) => { const t = (l.v / g.v) * g.h; paths += `<path class="lk g-${g.k} l-${l.k}" d="${ribbon(g.x + g.w, gy, gy + t, l.x, l.y, l.y + l.h)}" fill="${col(g.c)}"/>`; gy += t; });
  });
  const pill = (k, cls, x, y, h, w, inner, bg) => `<label class="pkl fp ${cls}" for="p-${k}" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%;background:${bg};--sel:0">${inner}</label>`;
  const inp = `<div class="fp fp-in" style="left:0;top:0;width:${(IN.w / W) * 100}%;height:100%"><b>Money in</b><span>${inr(FLOW.total)}</span><i style="top:0;height:${(D.SALARY / FLOW.total) * 100}%;background:${col("emerald")}"></i><i style="top:${(D.SALARY / FLOW.total) * 100}%;height:${(6000 / FLOW.total) * 100}%;background:${col("teal")}"></i><small>salary ${inr(D.SALARY)} · interest ${inr(6000)}</small></div>`;
  const gp = grp.map((g) => pill(g.k, "fp-g", g.x, g.y, g.h, g.w, `<b>${g.name}</b><span>${lakh(g.v)}</span>`, grad(g.c))).join("");
  const lp = leaves.map((l) => pill(l.k, "fp-l", l.x, l.y, l.h, l.w, `<i style="background:${col(l.c)}"></i><b>${l.name}</b><span>${inr(l.v)}</span>`, "oklch(1 0 0 / 0.14)")).join("");
  return `<div class="sk" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${paths}</svg>${inp}${gp}${lp}</div>`;
}
export function q4() {
  const T = FLOW.total, per = (v) => inr(v / 30), share = (v) => `${((v / T) * 100).toFixed(1)}%`;
  const rows = (items) => `<div class="s-rows">${items.map(([n, v, c, sm]) => `<div class="s-row"><i style="background:${c}"></i><span>${n}${sm ? `<small>${sm}</small>` : ""}</span><b>${v}</b></div>`).join("")}</div>`;
  const all = `<div class="vw-p vw-p-all"><div class="s-eb">A month of money</div><div class="s-name">Where ${lakh(T)} goes</div><div class="s-big" style="font-size:54px">${big(FLOW.left)}</div><div class="s-sub">is what's left in the bank, ${share(FLOW.left)} of what came in. ${share(FLOW.groups[0].v + FLOW.groups[1].v)} is gone to fixed commitments and cards before you decide anything else.</div>${rows(FLOW.groups.map((g) => [g.name, inr(g.v), col(g.c), `${share(g.v)} · ${per(g.v)} a day`]))}</div>`;
  const gps = FLOW.groups.map((g) => `<div class="vw-p vw-p-${g.k}"><div class="s-eb">Group</div><div class="s-name">${g.name}</div><div class="s-big" style="font-size:54px">${big(g.v)}</div><div class="s-sub">${share(g.v)} of what came in, ${per(g.v)} a day.</div>${rows(g.leaves.map((l) => [l.name, inr(l.v), col(l.c), share(l.v)]))}</div>`).join("");
  const note = { shop: (c) => `Up ${(((c.v - c.last) / c.last) * 100).toFixed(0)}% on October (${inr(c.last)}): the biggest rise.`, travel: (c) => `More than double October's ${inr(c.last)}.` };
  const lvs = FLOW.groups.flatMap((g) => g.leaves.map((l) => { const c = M.SPEND_CATS.find((s) => s.k === l.k); const delta = c ? `${l.v >= c.last ? "Up" : "Down"} ${Math.abs(((l.v - c.last) / c.last) * 100).toFixed(0)}% on October (${inr(c.last)}).` : { home: "Paid on the 2nd, ₹31,200 every month.", car: `Ends ${M.monthYear(M.dateAt(M.CAR.months))}, ${M.CAR.months} payments to go.`, ins: "Health ₹18,400 and term ₹24,600 a year, shown per month.", gym: "Comes off the bank, not a card.", goals: "₹15,000 car upgrade, ₹9,000 Japan trip: the trip needs ₹16,000.", sip: "What you add to investments each month.", keep: "Stays in HDFC Salary." }[l.k]; return `<div class="vw-p vw-p-${l.k}"><div class="s-eb">${g.name}</div><div class="s-name">${l.name}</div><div class="s-big" style="font-size:54px">${big(l.v)}</div><div class="s-sub">${share(l.v)} of what came in, ${per(l.v)} a day. ${note[l.k] && c ? note[l.k](c) : delta}</div>${rows([["Of its group", `${((l.v / g.v) * 100).toFixed(0)}%`, col(l.c)], ["A year at this pace", lakh(l.v * 12), col(l.c)]])}</div>`; })).join("");
  const chips = `<div class="s-acts"><label class="pkl chip-b" for="p-all">Whole month</label>${FLOW.groups.map((g) => `<label class="pkl chip-b sm" for="p-${g.k}">${g.name}</label>`).join("")}</div>`;
  return page(`${radios("p", Q4_KEYS)}<section class="stg2 q4" data-b="q4"><div class="q4-g"><div class="q4-l">${all}${gps}${lvs}${chips}</div><div class="q4-r"><div class="s-ct">Every rupee that came in this month, and where it went<small>pick a block to follow it</small></div>${sankey()}<div class="s-note">Card spending is by category, from the card statements. The set-aside and the monthly investment are his habits, shown as made up.</div></div></div></section>`);
}

export const q = { q1, q2, q3, q4 };
export const renderQ = (id, opt) => () => q[id](opt);
