// The FINAL page: L3 "Who owes what" as the hero, the greeting that points, the attention strip, the Interest clock as its own widget,
// the loans table, interest coming up and money back. The L3 hero is written once, as a function of the loans, so the states and phone boards
// draw the same hero for a repaid loan, a part-returned loan or sixteen people.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { L3_COL } from "./css-lent.mjs";
import { radios, big, stile, chip } from "./ui.mjs";
import { clockWidget } from "./clock.mjs";
const { I, inr } = L;
const { tile, dm, dmy, rateText, termsText, lakh } = P;

const pctS = (a, b, d = 1) => `${((a / b) * 100).toFixed(d)}%`;
function bigRamp(l, reps, w = 560, h = 150) {
  const days = D.daysBetween(l.startDate, D.TODAY), end = D.interestAccrued(l, reps, D.TODAY);
  const pts = []; for (let d = l.startDate; d < D.TODAY; d = L.addDays(d, 14)) pts.push([D.daysBetween(l.startDate, d), D.interestAccrued(l, reps, d)]); pts.push([days, end]);
  const x = (n) => 4 + (n / days) * (w - 12), y = (v) => h - 4 - (v / (end * 1.05)) * (h - 14), line = pts.map(([n, v]) => `${x(n).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:150px" preserveAspectRatio="none"><polygon points="${x(0)},${h} ${line} ${x(days)},${h}" fill="#fff" fill-opacity=".2"></polygon><polyline points="${line}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"></polyline><circle cx="${x(days)}" cy="${y(end)}" r="5" fill="#fff"></circle></svg>`;
}

/** Everything the hero reads, from the loans and repayments, with the real maths. */
export function view(loans = D.LOANS, reps = D.REPAYMENTS) {
  const sm = loans.map((l) => ({ l, s: D.summarise(l, reps, D.TODAY) }));
  const active = sm.filter((x) => x.s.owedToday > 0).sort((a, b) => b.s.owedToday - a.s.owedToday);
  const gone = sm.filter((x) => x.s.owedToday <= 0);
  const total = D.sum(active.map((x) => x.s.owedToday));
  const dayOf = (x) => (x.s.principalOutstanding * x.s.rate) / 100 / 365;
  return { sm, active, gone, total, perDay: D.sum(active.map(dayOf)), dayOf, reps, loans };
}

function terms(l) { return l.interestMode === "Paid-out" ? termsText(l) : `${l.interestRate}% simple · ${D.daysBetween(l.startDate, D.TODAY)} days out`; }
const real = (l) => D.LOANS.some((x) => x.id === l.id) && l.id in D.PAYOUTS;

export function l3Hero({ v = view(), live = true, pick = "all", flags = true, title = "Who owes what", sub = "each block is a borrower, sized by what they owe today. Pick one to see the total without it" } = {}) {
  const many = v.active.length > 3;
  const pc = pick === "all" ? "sapphire" : (L3_COL[pick] ?? "sapphire");
  const pane = (k, inner) => (live ? `<div class="vw-p vw-p-${k}">${inner}</div>` : k === pick ? `<div>${inner}</div>` : "");
  const lbl = (k, cls, style, inner, tag = "") => (live ? `<label class="pkl ${cls}" for="p-${k}" style="${style}">${inner}</label>` : `<div class="${cls}" style="${style};--sel:${k === pick ? 1 : 0}">${inner}</div>`);
  const without = (x) => v.total - x.s.owedToday;

  // ---- the blocks (up to three), or the scrolling list (more) ----
  const blk = (x, i, cls) => {
    const { l, s } = x, pay = l.interestMode === "Paid-out", back = l.principalAmount - s.principalOutstanding, first = i === 0 && !pay;
    const meter = pay ? "" : `<div class="meter">${[["m-p", s.principalOutstanding], ["m-b", back], ["m-o", s.interestOwed]].filter((p) => p[1] > 0).map(([c, n]) => `<i class="${c}" style="width:${(n / (l.principalAmount + s.interestOwed)) * 100}%"></i>`).join("")}</div>`;
    const flag = flags && real(l) && D.notReceived(l) > 0 ? `<span class="oflag">${I.alert(12)} ${inr(D.notReceived(l))} not here</span>` : "";
    const dots = flags && real(l) ? `<div><div class="os" style="font-weight:800;opacity:.9;margin-bottom:5px">Promised vs arrived (sample)</div>${P.dots(l)}</div>` : "";
    const mid = first ? `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;min-height:0"><div class="os" style="font-weight:800;opacity:.9">Interest piling up since ${dm(l.startDate)} ${l.startDate.slice(0, 4)}: ${inr(v.dayOf(x))} a day, ${s.interestPaid ? "some" : "none"} of it paid</div>${bigRamp(l, v.reps)}</div>` : `<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">${dots}${flag}</div>`;
    return lbl(l.id, `oblk ${cls}`, `--bc:var(--card-${l.color})`, `<span class="op">${pctS(s.owedToday, v.total)}</span><div class="on">${tile(l, 34)}<div>${l.borrowerName}<small>${terms(l)}</small></div></div>${mid}<div><div class="ov">${big(s.owedToday)}</div><div class="os" style="margin:6px 0 8px">${pay ? "principal · interest is income" : `${inr(s.principalOutstanding)} principal + ${inr(s.interestOwed)} interest${back ? ` · ${inr(back)} came back` : ""}`}</div>${meter}</div>`);
  };
  const ghost = v.gone.map((x) => `<div class="ghostb">${tile(x.l, 26)}<div><b>${x.l.borrowerName}</b> <small>repaid ${x.l.closedDate ? dm(x.l.closedDate) : ""} · ${inr(x.l.principalAmount)} back · owes ₹0</small></div><span class="tagb grey" style="margin-left:auto">Repaid</span></div>`).join("");
  let left;
  if (many) {
    const max = v.active[0].s.owedToday;
    const row = (x) => lbl(x.l.id, "orow", `--bc:var(--card-${x.l.color})`, `${tile(x.l, 30)}<div><b>${x.l.borrowerName}</b><small>${terms(x.l)}</small></div><div class="obar"><i style="width:${(x.s.owedToday / max) * 100}%"></i></div><span class="ov2">${inr(x.s.owedToday)}</span><span class="op2">${pctS(x.s.owedToday, v.total, 1)}</span>`);
    const grow = v.gone.map((x) => `<div class="orow gone">${tile(x.l, 30)}<div><b>${x.l.borrowerName}</b><small>repaid ${dm(x.l.closedDate)}</small></div><span></span><span class="ov2">₹0</span><span class="op2"></span></div>`).join("");
    left = `<div><div class="oscrollw"><div class="oscroll">${v.active.map(row).join("")}${grow}</div></div><div class="scrollhint">${I.chevR(11)} ${v.active.length} still out, ${v.gone.length} repaid · scroll for the rest, longest first</div></div>`;
  } else {
    const n = v.active.length;
    left = `<div><div class="owe n${n}"${n === 3 ? "" : ""}>${v.active.map((x, i) => blk(x, i, i === 0 ? "big" : n === 2 ? "tall small" : "small")).join("")}</div>${ghost}</div>`;
  }

  // ---- the right-hand panes ----
  const pane1 = (x) => {
    const { l, s } = x, w = without(x), others = v.active.filter((y) => y !== x), dayW = v.perDay - v.dayOf(x);
    const tiles = stile("You'd have lent out", inr(w), `across ${others.length} ${others.length === 1 ? "loan" : "loans"}`) + stile("Out of the total", pctS(s.owedToday, v.total), `${inr(s.owedToday)} of ${inr(v.total)}`) + stile("Earning a day", inr(dayW), `down from ${inr(v.perDay)}`) + stile("Net worth's Lent out line", inr(w), `from ${inr(v.total)}`);
    return pane(l.id, `<div><div class="s-eb"><span>If this one didn't pay back</span></div><h2 class="s-name">If ${l.borrowerName} didn't pay back</h2><div class="s-big" style="font-size:54px">${big(w)}</div><div class="s-sub">would still be out with ${others.length <= 3 ? others.map((y) => y.l.borrowerName).join(" and ") : `${others.length} others`}</div><div class="without" style="margin-top:18px"><div class="wlab"><span>Now</span><b>${inr(v.total)}</b></div><div class="wbar"><i class="keep" style="width:${(w / v.total) * 100}%">${inr(w)} still out</i><i class="gone" style="flex:1;opacity:.9">${inr(s.owedToday)}</i></div><div class="wlab"><span>The hatched part is what ${l.borrowerName} owes${l.interestMode === "Accruing" ? ": the principal and its interest" : ""}</span></div></div><div class="s-tiles">${tiles}</div><div class="s-note">A measure of how much rides on one borrower, not a forecast: nobody has missed a principal payment, and none has fallen due.</div></div>`);
  };
  const top = v.active.slice(0, 3);
  const top3 = D.sum(top.map((x) => x.s.owedToday));
  const chips = many ? chip("Biggest", `${pctS(v.active[0].s.owedToday, v.total)} · ${v.active[0].l.borrowerName}`) + chip("Top three hold", pctS(top3, v.total, 0)) + chip("Earning", `${inr(v.perDay)} a day`) : chip("Biggest", `${pctS(v.active[0].s.owedToday, v.total)} with one loan`) + chip("Earning", `${inr(v.perDay)} a day`);
  const all = pane("all", `<div><div class="s-eb"><span>Everyone</span></div><h2 class="s-name">Who owes what</h2><div class="s-big" style="font-size:54px">${big(v.total)}</div><div class="s-sub">owed today, across ${v.active.length} ${v.active.length === 1 ? "loan" : "loans"}${v.gone.length ? ` · ${v.gone.length} repaid` : ""}</div><div class="s-chips">${chips}</div><div style="margin-top:18px"><div class="s-ct">Without each, in turn<small>${many ? "the three biggest · pick a row for the rest" : "pick a block to open one"}</small></div><div class="lrows">${top.map((x) => `<div class="wrow">${tile(x.l, 30)}<div><b>Without ${x.l.borrowerName}</b><small>${inr(x.s.owedToday)} out of the picture</small></div><div class="am">${inr(without(x))}<small>still out</small></div><span class="pc">${((without(x) / v.total) * 100).toFixed(0)}%</span></div>`).join("")}</div></div><div class="s-note">The percent is how much of today's total would remain. It's a size check, never advice.</div></div>`);
  const panes = all + (live ? v.active : v.active.filter((x) => x.l.id === pick)).map(pane1).join("");
  const keys = ["all", ...v.active.map((x) => x.l.id)];
  const style = live ? "" : ` style="--h1:var(--card-${pc}-from);--h2:var(--card-${pc}-to)"`;
  const everyone = live ? `<label class="pkl chip-b" for="p-all">Everyone</label>` : `<span class="chip-b" style="--sel:${pick === "all" ? 1 : 0}">Everyone</span>`;
  return `<section class="stg2"${style}>${live ? radios("p", keys, "all") : ""}<div class="hhead" style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">${title}<small>${sub}</small></div>${everyone}</div><div class="s-grid" style="grid-template-columns:6fr 5fr;gap:32px">${left}<div>${panes}</div></div></section>`;
}

/** The whole page, one board: hero, clock widget, then the shared widgets. */
export function finalPage() {
  return P.page(`${P.greeting()}${P.attention()}${l3Hero()}${clockWidget({ split: true })}${P.loansTable()}${P.grid([[6, P.comingUp()], [6, P.repaymentsLog()]])}${P.sampleNote()}`);
}
