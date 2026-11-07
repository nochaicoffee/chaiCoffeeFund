// Round 1: five hero ideas for the Overview. Every board shares the greeting, the attention strip and the widgets under the hero; only the hero differs.
// Each hero is a coloured stage that takes the colour of the pick (hidden radios, labels and :has(), so it works with no script: open a board and click).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { radios, big, stile, chip } from "./ui.mjs";
const { I, inr } = L;
const { lakh, pct, col, grad, fillc, dm, dowDm, daysAway } = P;

export const O1_KEYS = ["all", "bank", "invest", "fixed", "lent", "loans", "cards"];
export const O1_COL = { all: "sapphire", bank: "sky", invest: "indigo", fixed: "forest", lent: "copper", loans: "ruby", cards: "plum" };
export const O2_KEYS = ["all", "cash", "brokers", "mfd", "invest", "fd", "lent", "epf"];
export const O2_COL = { all: "emerald", cash: "sky", brokers: "teal", mfd: "gold", invest: "indigo", fd: "forest", lent: "copper", epf: "violet" };
const EV_PICK = D.EVENTS.filter((e) => e.kind !== "sub" || e.cash);
export const O3_KEYS = ["all", ...EV_PICK.map((e) => e.id)];
export const O3_COL = { all: "indigo", ...Object.fromEntries(EV_PICK.map((e) => [e.id, e.amt > 0 ? (e.cash ? "emerald" : "gold") : { emi: "copper", card: "ruby", sub: "plum", ins: "teal" }[e.kind]])) };
export const O4_KEYS = ["all", ...D.VITALS.map((v) => v.key)];
const VCOL = { good: "forest", ok: "gold", watch: "rose" };
export const O4_COL = { all: "sapphire", ...Object.fromEntries(D.VITALS.map((v) => [v.key, VCOL[v.verdict]])) };
export const O5_KEYS = ["all", "pay", "collect", "decide"];
export const O5_COL = { all: "indigo", pay: "ruby", collect: "emerald", decide: "gold" };

// ---------- Shared bits of a stage ----------
const stage = (id, inner) => `<section class="stg2" data-b="${id}">${inner}</section>`;
/** A left-hand pane for one pick: eyebrow, name, the big figure, its line, tiles and rows. */
const pane = (p, k, { eb, name, big: b, sub, tiles = [], rows = [], note = "" }) =>
  `<div class="vw-${p} vw-${p}-${k}"><div class="s-eb">${eb}</div><div class="s-name">${name}</div><div class="s-big">${b}</div><div class="s-sub">${sub}</div>${tiles.length ? `<div class="s-tiles">${tiles.map(([a, v, s]) => stile(a, v, s)).join("")}</div>` : ""}${rows.length ? `<div class="s-rows">${rows.map(([n, v, c, sm]) => `<div class="s-row"><i style="background:${c}"></i><span>${n}${sm ? `<small>${sm}</small>` : ""}</span><b>${v}</b></div>`).join("")}</div>` : ""}${note ? `<div class="s-note">${note}</div>` : ""}</div>`;
const everything = (p, label = "Everything") => `<label class="pkl chip-b" for="${p}-all">${label}</label>`;
const hint = (t) => `<span class="on-stage-hint">${I.info(12)} ${t}</span>`;

// =====================================================================
// O1 · Two sides of the ledger
// What you own stacked on the left; on the right, what you owe plus what's left, which is your net worth. Both columns are the same height
// because owned = owed + net worth. Pick a block and the stage tells you what it is, and what you'd be worth without it.
// =====================================================================
const OWN = [
  { k: "lent", name: "Lent out", v: D.LENT, c: "copper" },
  { k: "invest", name: "Investments", v: D.INVEST, c: "indigo" },
  { k: "fixed", name: "Fixed income", v: D.FIXED, c: "forest" },
  { k: "bank", name: "Bank and brokers' cash", v: D.BANK, c: "sky" },
];
const OWE = [
  { k: "loans", name: "Loans", v: D.LOAN_OUT, c: "ruby" },
  { k: "cards", name: "Cards", v: D.CARD_OUT, c: "plum" },
];
export function o1() {
  const H = 430, S = H - 34;
  const blk = (s, side) => `<label class="pkl bseg" for="p-${s.k}" style="flex:0 1 ${Math.max(34, (s.v / D.OWNED) * S)}px;background:${grad(s.c)};--sel:0"><b>${s.name}</b><span>${lakh(s.v)}</span><em>${pct(s.v, side === "own" ? D.OWNED : D.OWNED, 1)}</em></label>`;
  const bars = `<div class="o1-bars" style="height:${H}px">
<div class="o1-col"><div class="o1-h">You own<b>${lakh(D.OWNED)}</b></div><div class="o1-stack">${OWN.map((s) => blk(s, "own")).join("")}</div></div>
<div class="o1-eq">=</div>
<div class="o1-col"><div class="o1-h">You owe, and you keep<b>${lakh(D.OWED)} + ${lakh(D.NET)}</b></div><div class="o1-stack">${OWE.map((s) => blk(s, "owe")).join("")}<label class="pkl bseg nw" for="p-all" style="flex:1 1 0"><b>Net worth</b><span>${lakh(D.NET)}</span><em>${pct(D.NET, D.OWNED, 1)} of what you own</em></label></div></div></div>`;
  const rowsOf = {
    bank: D.ACCOUNTS.map((a) => [a.name, a.usd ? `$${a.usd.toLocaleString("en-IN")} · ${inr(a.bal)}` : inr(a.bal), col(a.color)]),
    invest: D.HOLDINGS.map((h) => [h.name, inr(h.worth), col(h.color), h.kind]),
    fixed: [...D.FDS.map((f) => [f.name, inr(f.amt), col("forest"), f.note]), ["EPF", inr(D.EPF), col("violet"), "at the passbook figure"]],
    lent: [["Friend", inr(813693), col("copper"), "12% simple, nothing paid back"], ["Friend – ₹3L", inr(300000), col("teal"), "pays ₹6,000 a month"], ["Friend – ₹1.82L", inr(182000), col("violet"), "pays ₹18,000 a quarter"]],
    loans: D.LOANS.map((l) => [l.name, inr(l.out), col(l.color), `EMI ${inr(l.emi)} on the ${l.emiDay}${l.emiDay === 2 ? "nd" : "th"}`]),
    cards: D.CARDS.map((c) => [c.name, inr(c.out), col(c.color), `due ${dm(c.due)}`]),
  };
  const sub = { bank: "three bank accounts, two brokers", invest: `${inr(D.INVEST - D.INVEST_COST)} above what it cost you`, fixed: "seven deposits and your EPF", lent: "owed to you by people, not banks", loans: "what's left to pay back", cards: "outstanding on two cards" };
  const panes = [...OWN, ...OWE].map((s) => {
    const owned = OWN.includes(s);
    return pane("p", s.k, { eb: owned ? "You own" : "You owe", name: s.name, big: big(s.v), sub: sub[s.k], tiles: owned ? [["Share of what you own", pct(s.v, D.OWNED, 1), `of ${lakh(D.OWNED)}`], ["Net worth without it", lakh(D.NET - s.v), D.NET - s.v < 0 ? "you'd owe more than you own" : `${pct(D.NET - s.v, D.NET)} of today's`]] : [["Share of what you owe", pct(s.v, D.OWED, 1), `of ${lakh(D.OWED)}`], ["Falls due this month", s.k === "loans" ? inr(D.EMI) : inr(D.CARD_OUT), s.k === "loans" ? "both EMIs" : "both bills"]], rows: rowsOf[s.k] });
  });
  const all = pane("p", "all", { eb: "Net worth", name: "What you're worth", big: big(D.NET), sub: `${lakh(D.OWNED)} owned, less ${lakh(D.OWED)} owed`, tiles: [["Owned against owed", `${(D.OWNED / D.OWED).toFixed(2)} to 1`, "assets to liabilities"], ["Bank and brokers' cash", lakh(D.BANK), `${pct(D.BANK, D.OWNED)} of what you own`]], note: "Both columns are the same height: what you own is exactly what you owe plus what you're worth. Pick a block to look inside it." });
  return stage("o1", `<div class="s-grid"><div>${all}${panes.join("")}<div class="s-acts">${everything("p")}${hint("pick a block")}</div></div><div class="s-chart">${bars}<div class="s-note" style="margin-top:12px">Bars to scale, except Cards, which is too thin to pick at scale and is drawn a little taller.</div></div></div>`);
}

// =====================================================================
// O2 · How fast you could reach it
// The same net worth sorted by how soon you could hold it: today, within a week, within weeks at a cost, when someone else pays, locked.
// =====================================================================
const LADDER = [
  { id: "today", title: "Today", sub: "in your hand", items: [{ k: "cash", name: "Bank", v: D.BANK_SPEND, c: "sky", how: "Spend it now.", cost: "Nothing." }] },
  { id: "week", title: "Within a week", sub: "a day or two", items: [
    { k: "mfd", name: "Matured FD", v: 152400, c: "gold", how: "Close it and it lands in HDFC Salary the next day.", cost: "Nothing: it has matured." },
    { k: "brokers", name: "Brokers' cash", v: D.BROKER_CASH, c: "teal", how: "Move it to a bank. Dollars take a couple of days and the rate that day.", cost: "A transfer fee and the day's rate." },
    { k: "invest", name: "Investments, if sold", v: D.INVEST, c: "indigo", how: "Sell and it settles in one or two days.", cost: "Tax on the gains, and a price that moves while you wait." },
  ] },
  { id: "weeks", title: "Within weeks", sub: "at a cost", items: [{ k: "fd", name: "Other fixed deposits", v: D.FD - 152400, c: "forest", how: "Break them early.", cost: "A lower rate on what they've earned." }] },
  { id: "theirs", title: "When they pay", sub: "not your call", items: [{ k: "lent", name: "Lent out", v: D.LENT, c: "copper", how: "Only when the borrowers pay it back. Friend's 12% loan has nothing back yet.", cost: "It can go bad." }] },
  { id: "locked", title: "Locked", sub: "until a life event", items: [{ k: "epf", name: "EPF", v: D.EPF, c: "violet", how: "Retirement, or a rule-bound withdrawal.", cost: "Tax, and the interest it would have earned." }] },
];
export function o2() {
  const H = 290, SC = 230, max = Math.max(...LADDER.map((c) => D.sum(c.items.map((i) => i.v))));
  let cum = 0;
  const cols = LADDER.map((c) => {
    const tot = D.sum(c.items.map((i) => i.v));
    cum += tot;
    const blocks = [...c.items].reverse().map((i) => `<label class="pkl bseg${(i.v / max) * SC < 44 ? " thin" : ""}" for="p-${i.k}" style="flex:0 0 ${Math.max(30, (i.v / max) * SC)}px;background:${grad(i.c)};--sel:0"><b>${i.name}</b><span>${lakh(i.v)}</span></label>`).join("");
    return `<div class="o2-col"><div class="o2-cum"><small>you'd have</small><b>${lakh(cum)}</b></div><div class="o2-stack" style="height:${H}px">${blocks}</div><div class="o2-t"><b>${c.title}</b><small>${c.sub}</small></div></div>`;
  }).join("");
  const chart = `<div class="o2-cols">${cols}</div><div class="s-note" style="margin-top:12px">How fast is my reading of each thing, not a promise: a sale settles in a day or two, but tax and price moves are real. Checked with you in the doc.</div>`;
  const items = LADDER.flatMap((c) => c.items.map((i) => ({ ...i, when: c.title })));
  const panes = items.map((i) => pane("p", i.k, { eb: i.when, name: i.name, big: big(i.v), sub: i.how, tiles: [["Share of what you own", pct(i.v, D.OWNED, 1), `of ${lakh(D.OWNED)}`], ["Covers this month's bills", `${(i.v / D.TO_PAY).toFixed(1)}×`, `of ${inr(D.TO_PAY)} still to pay`]], note: `What it costs to reach: ${i.cost}` }));
  const all = pane("p", "all", { eb: "How reachable", name: "What you could hold, and when", big: big(D.BANK_SPEND), sub: "in your hand today", tiles: [["Within a week", lakh(D.BANK_SPEND + 152400 + D.BROKER_CASH + D.INVEST), "bank, brokers, the FD, investments"], ["Everything you own", lakh(D.OWNED), "once lent and locked money is back"], ["This month's bills", inr(D.TO_PAY), `still to pay · cash covers them ${(D.BANK_SPEND / D.TO_PAY).toFixed(1)}×`], ["Not in your hands", lakh(D.LENT + D.EPF), "lent out and EPF"]] });
  return stage("o2", `<div class="s-grid"><div>${all}${panes.join("")}<div class="s-acts">${everything("p", "Everything")}${hint("pick a block")}</div></div><div class="s-chart">${chart}</div></div>`);
}

// =====================================================================
// O3 · The month ahead
// The three bank accounts' balance for the next 30 days, with every dated bill and payday on it. Pick one to see what it does.
// =====================================================================
export function o3() {
  const W = 760, Ht = 290, pl = 52, pr = 14, pt = 18, pb = 28, lo = 100000, hi = 460000;
  const x = (i) => pl + (i * (W - pl - pr)) / 30, y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (Ht - pt - pb);
  let d = `M${x(0)},${y(D.CASH[0].bal)}`;
  D.CASH.forEach((p, i) => { if (i) d += ` H${x(i)} V${y(p.bal)}`; });
  const area = `${d} V${Ht - pb} H${x(0)} Z`;
  const grid = [100000, 200000, 300000, 400000].map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#fff" stroke-opacity=".14" stroke-dasharray="3 5"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#fff" fill-opacity=".6">${lakh(v)}</text>`).join("");
  const ticks = [0, 7, 14, 21, 28].map((i) => { const iso = L.addDays(D.TODAY, i); return `<text x="${x(i)}" y="${Ht - 8}" text-anchor="middle" font-size="11" fill="#fff" fill-opacity=".6">${i === 0 ? "Today" : dm(iso)}</text>`; }).join("");
  const marks = EV_PICK.map((e, n) => {
    const i = L.daysBetween(D.TODAY, e.date), bal = D.CASH[i].bal, cash = e.cash;
    return `<g class="evm evm-${e.id}"><line x1="${x(i)}" x2="${x(i)}" y1="${y(bal)}" y2="${Ht - pb}" stroke="#fff" stroke-opacity="${cash ? 0.3 : 0.45}" stroke-dasharray="${cash ? "2 4" : "5 4"}"/><circle class="evc" cx="${x(i)}" cy="${y(bal)}" r="11" fill="${e.amt > 0 ? "oklch(0.82 0.15 150)" : "oklch(0.68 0.19 25)"}" stroke="#fff" stroke-width="2" ${cash ? "" : 'stroke-dasharray="3 3" fill-opacity=".35"'}/><text x="${x(i)}" y="${y(bal) + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${n + 1}</text></g>`;
  }).join("");
  const low = D.LOWEST, li = low.i;
  const lowMark = `<g><circle cx="${x(li)}" cy="${y(low.bal)}" r="5" fill="oklch(0.85 0.16 85)"/><text x="${x(li) - 12}" y="${y(low.bal) + 30}" text-anchor="end" font-size="12" font-weight="800" fill="oklch(0.88 0.13 85)">Lowest ${lakh(low.bal)}</text></g>`;
  const svg = `<svg viewBox="0 0 ${W} ${Ht}" style="display:block;width:100%;height:auto">${grid}${ticks}<path d="${area}" fill="#fff" fill-opacity=".1"/><path d="${d}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>${lowMark}${marks}</svg>`;
  const chips = `<div class="o3-chips">${everything("p", "The whole month")}${EV_PICK.map((e, n) => `<label class="pkl chip-b sm" for="p-${e.id}"><i class="no">${n + 1}</i>${e.label.replace(" membership", "").replace(" premium", "")}<small>${e.amt > 0 ? "+" : "−"}${lakh(Math.abs(e.amt))}</small></label>`).join("")}</div>`;
  const all = pane("p", "all", { eb: "Next 30 days", name: "Your bank accounts, day by day", big: big(low.bal), sub: `the lowest they'll get, ${dowDm(low.date)} (${daysAway(low.date)})`, tiles: [["Today", inr(D.BANK_SPEND), "three bank accounts"], ["Out", `−${inr(D.OUT_30)}`, "EMIs, card bills, gym, premium"], ["In", `+${inr(D.IN_30)}`, "salary and interest"], ["30 days on", inr(D.CASH[30].bal), "if nothing else moves"]], note: "Only dated things are on it: what you spend day to day isn't, and a matured FD counts only once you close it (dashed)." });
  const panes = EV_PICK.map((e, n) => {
    const i = L.daysBetween(D.TODAY, e.date), after = D.CASH[i].bal, before = after - (e.cash ? e.amt : 0);
    return pane("p", e.id, { eb: `${n + 1} · ${dowDm(e.date)} · ${daysAway(e.date)}`, name: e.label, big: `${e.amt > 0 ? "+" : "−"}${big(Math.abs(e.amt))}`, sub: e.sub, tiles: e.cash ? [["Balance before", inr(after - e.amt), "that morning"], ["Balance after", inr(after), after === low.bal ? "the lowest of the month" : `${after >= before ? "up" : "down"} ${inr(Math.abs(after - before))}`]] : [["Would add", inr(e.amt), "to the bank once closed"], ["If closed today", inr(D.BANK_SPEND + e.amt), "three bank accounts"]] });
  });
  return stage("o3", `<div class="s-grid"><div>${all}${panes.join("")}</div><div class="s-chart">${svg}${chips}</div></div>`);
}

// =====================================================================
// O4 · Money vitals
// Six measures with a band each, in plain words, like a check-up. A measure, never advice. Pick one to see how it's worked out.
// =====================================================================
const VWORD = { good: "comfortable", ok: "fine", watch: "worth watching" };
function gauge(v) {
  const [a, b, c, mx] = v.bands, pos = Math.min(100, (v.value / (mx === 100 ? 100 : mx)) * 100);
  const cols = v.low ? ["oklch(0.7 0.14 150)", "oklch(0.82 0.15 85)", "oklch(0.62 0.18 25)"] : ["oklch(0.62 0.18 25)", "oklch(0.82 0.15 85)", "oklch(0.7 0.14 150)"];
  const w = (lo, hi) => ((hi - lo) / (mx - a)) * 100;
  const bar = `<div class="gbar"><i style="width:${w(a, b)}%;background:${cols[0]}"></i><i style="width:${w(b, c)}%;background:${cols[1]}"></i><i style="width:${w(c, mx)}%;background:${cols[2]}"></i><em style="left:${pos}%"></em></div>`;
  return `<label class="pkl vcard v-${v.verdict}" for="p-${v.key}" style="--sel:0"><div class="vh"><b>${v.name}</b><span class="vp">${VWORD[v.verdict]}</span></div><div class="vv">${v.fmt(v.value)}</div>${bar}<small>${v.how.split(".")[0]}.</small></label>`;
}
export function o4() {
  const good = D.VITALS.filter((v) => v.verdict !== "watch").length;
  const all = pane("p", "all", { eb: "Check-up", name: "How things look", big: `${good}<small> of ${D.VITALS.length}</small>`, sub: "look comfortable or fine. The rest are worth watching.", tiles: [["Worth watching", `${D.VITALS.filter((v) => v.verdict === "watch").length} measures`, "owed against owned, NetApp share"], ["Lowest bank balance", lakh(D.LOWEST.bal), `this month, ${dm(D.LOWEST.date)}`]], note: "These are measures of your own numbers against common rules of thumb, not advice. Pick one to see how it's worked out." });
  const panes = D.VITALS.map((v) => pane("p", v.key, { eb: "How it's worked out", name: v.name, big: v.fmt(v.value).replace(/^(\d[\d.,]*)(.*)$/, "$1<small>$2</small>"), sub: VWORD[v.verdict] + ".", tiles: [["The sum", v.note.split(".")[0], ""], ["Bands", v.low ? `comfortable under ${v.bands[1]}%` : `comfortable over ${v.bands[2]}${v.name === "Cash cover" ? " months" : "%"}`, v.low ? `watch over ${v.bands[2]}%` : `watch under ${v.bands[1]}${v.name === "Cash cover" ? " months" : "%"}`]], note: `${v.how} ${v.note.split(". ").slice(1).join(". ")}` }));
  return stage("o4", `<div class="s-grid" style="grid-template-columns:4fr 8fr"><div>${all}${panes.join("")}<div class="s-acts">${everything("p")}${hint("pick a measure")}</div></div><div class="vgrid">${D.VITALS.map(gauge).join("")}</div></div>`);
}

// =====================================================================
// O5 · Briefing
// The page opens on what to do: late and waiting, today, later this month, each with its button. Chips light what you pay, collect or decide.
// =====================================================================
export function o5() {
  const it = (a) => `<div class="it it-${a.kind}"><div class="it-h"><span class="dotk k-${a.kind}"></span><b>${a.label}</b></div><small>${a.detail}</small><div class="it-f"><span class="tagb grey">${a.from}</span><span class="s-act solid">${a.act}</span></div></div>`;
  const colm = (t, sub, ids) => `<div class="b-col"><div class="b-h"><b>${t}</b><small>${sub}</small></div>${D.ATTENTION.filter((a) => ids.includes(a.id)).map(it).join("")}</div>`;
  const count = (k) => D.ATTENTION.filter((a) => a.kind === k).length;
  const tiles = `<div class="s-tiles" style="grid-template-columns:repeat(4,1fr);margin-top:0">${stile("Worth", lakh(D.NET), `${lakh(D.OWNED)} − ${lakh(D.OWED)}`)}${stile("Bank today", lakh(D.BANK_SPEND), "three bank accounts")}${stile("Still to pay", lakh(D.TO_PAY), "this month")}${stile("Lowest", lakh(D.LOWEST.bal), `${dm(D.LOWEST.date)}`)}</div>`;
  const chips = `<div class="s-acts" style="margin-top:0"><label class="pkl chip-b" for="p-all">All ${D.ATTENTION.length}</label><label class="pkl chip-b" for="p-pay">To pay <small>${count("pay")}</small></label><label class="pkl chip-b" for="p-collect">To collect <small>${count("collect")}</small></label><label class="pkl chip-b" for="p-decide">To decide <small>${count("decide")}</small></label></div>`;
  return stage("o5", `<div class="b-top"><div><div class="s-eb">Briefing · ${dowDm(D.TODAY)}</div><div class="s-name" style="font-size:30px">${D.ATTENTION.length} things need you</div><div class="s-sub">${lakh(D.TO_PAY)} to pay this month, ${inr(6000)} late to collect, ${lakh(152400)} to close.</div></div>${tiles}</div>${chips}<div class="b-cols">${colm("Late or waiting", "on you now", ["a-pay", "a-fd"])}${colm("Today", dowDm(D.TODAY), ["a-car"])}${colm("Later this month", "dated", ["a-c1", "a-c2", "a-goal"])}</div>`);
}

// ---------- The boards ----------
const note = P.sampleNote();
export const o = {
  o1: () => ({ keys: O1_KEYS, hero: o1(), strip: true }),
  o2: () => ({ keys: O2_KEYS, hero: o2(), strip: true }),
  o3: () => ({ keys: O3_KEYS, hero: o3(), strip: true }),
  o4: () => ({ keys: O4_KEYS, hero: o4(), strip: true }),
  o5: () => ({ keys: O5_KEYS, hero: o5(), strip: false }),
};
export const render = (id) => () => {
  const { keys, hero, strip } = o[id]();
  const rows = strip
    ? `${P.sectionTiles()}${P.grid([[7, P.attentionList()], [5, P.thisMonth()]])}${P.grid([[6, P.comingUp({ n: 6 })], [6, P.balanceCard({ w: 560 })]])}`
    : `${P.sectionTiles()}${P.grid([[7, P.comingUp({ n: 6 })], [5, P.thisMonth()]])}${P.grid([[6, P.balanceCard({ w: 560 })], [6, P.goalsCard()]])}`;
  return P.page(`${P.greeting()}${strip ? P.attentionStrip() : ""}${radios("p", keys)}${hero}${rows}${note}`);
};
