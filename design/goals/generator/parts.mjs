// The widget library for the Goals boards: hover cards, the greeting that points, the attention strip, the goals table, coming up,
// Needs and Wants, recent set-asides, what's affordable, and finished goals. Static HTML; switches and picks are CSS only (radios + :has()).
import * as L from "./lib.mjs";
const { I, inr, inrL, inrS, fmt, fmtY, plural, sum } = L;

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 250 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 250, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const grid = (items, gap = 20) => `<div class="g12" style="gap:${gap}px">${items.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });

// ---------- Goal bits ----------
export const tile = (x, size = 34) => `<span class="gtile${x.status === "Paused" || x.status === "Dropped" ? " off" : ""}" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${L.grad(L.gColor(x))}">${L.gIcon(x)(Math.round(size * 0.5))}</span>`;
export const needBadge = (x) => `<span class="nb nb-${x.necessity.toLowerCase()}">${x.necessity}</span>`;
export const scaleBadge = (x) => `<span class="sb sb-${x.scale.toLowerCase()}">${x.scale}</span>`;
export const standPill = (x) => {
  const s = L.standing(x);
  const cls = { Funded: "pill-on", "On track": "pill-on", Behind: "pill-warn", Overdue: "pill-due", Done: "pill-ink", Paused: "pill-off", Dropped: "pill-off", "No plan": "pill-off", Someday: "pill-off" }[s];
  return `<span class="pill ${cls}">${s === "Funded" ? I.check(10) : s === "Paused" ? I.pause(10) : ""}${s}</span>`;
};
export const fixedPill = () => `<span class="pill pill-fixed" style="padding:2px 8px;font-size:10px">${I.pin(10)} Fixed</span>`;
export const dayWord = (d) => (d === 0 ? "today" : d === 1 ? "tomorrow" : d > 0 ? `in ${d} days` : `${-d} days ago`);
export const dueTxt = (x) => { const d = L.dueOf(x); return d ? fmtY(d) : "Someday"; };
export const dueIn = (x) => { const d = L.dueOf(x); if (!d) return "no date"; const m = L.monthsTo(d); return d < L.TODAY ? "overdue" : m === 0 ? dayWord(L.daysBetween(L.TODAY, d)) : plural(m, "month") + " left"; };
export const prog = (x, { h = 10 } = {}) => {
  const p = L.pctOfGoal(x) * 100, e = L.expectedPct(x);
  return `<div class="gbar${L.excessOf(x) ? " over" : ""}" style="height:${h}px"><span class="f rt" style="width:${Math.max(p ? 2 : 0, p)}%;background:${L.fill(L.gColor(x), 90)}"></span>${e != null && x.status === "Active" ? `<span class="e" style="left:${(e * 100).toFixed(1)}%"></span>` : ""}</div>`;
};
export const MIN_BUDGET = (() => { for (let b = 1000; b < 200000; b += 500) { const p = L.fundingPlan(b, 80); if (p.order.every((u) => !u.due || (p.done[u.id] ?? 99) <= Math.max(1, L.monthsTo(u.due)))) return b; } return null; })();

// ---------- The greeting, pointing ----------
export const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 270, x, y: "down" })}</span>`;
const byGoal = (fn) => L.TOPS.map((x) => [x.name, fn(x), L.col(L.gColor(x))]);
export function pointLede() {
  const nx = L.NEXT_DUE, nu = L.UNITS.find((u) => u.id === nx.id);
  const saved = hc({ h: "Set aside so far", t: inr(L.SAVED), d: `${Math.round((L.SAVED / L.TARGET) * 100)}% of the ${inr(L.TARGET)} your goals add up to`, rows: byGoal((x) => inr(L.savedOf(x))), f: "The sum of every set-aside, less anything taken back. It is not new money: it is already in your accounts" });
  const target = hc({ h: "All goals add up to", t: inr(L.TARGET), d: `${plural(L.TOPS.length, "goal")}, ${plural(L.ACTIVE.length - L.TOPS.length, "sub-goal")} inside them`, rows: byGoal((x) => inr(L.targetOf(x))), f: "A goal's total is its own part plus its sub-goals. Dropped sub-goals aren't counted" });
  const req = hc({ h: "Paid on its own schedule", t: `${inr(L.REQ_TOTAL)} a month`, d: "What each piece needs, spread evenly to its own date", rows: byGoal((x) => inr(L.requiredAll(x))), f: "Left to save, over the whole months left, for every goal at once. It falls as goals finish" });
  const min = hc({ h: "Funded in order", t: `${inr(MIN_BUDGET)} a month`, d: "Enough to hit every date if money goes to Fixed dates first, then Needs, then the soonest", f: "Because goals finish and free their money for the next. See the Funding plan" });
  const plan = hc({ h: "What you plan", t: `${inr(L.PLAN_TOTAL)} a month`, d: `Of the ${inr(L.LEFT)} left after obligations`, rows: [["Income", inr(L.SALARY), ""], ["Obligations", `−${inr(L.OBLIGATIONS)}`, ""], ["Left", inr(L.LEFT), ""], ["Planned for goals", inr(L.PLAN_TOTAL), ""]], f: "Not a true surplus: UPI and cash spending aren't tracked" });
  const next = hc({ h: `${nx.name} · due soon`, hr: `<span class="pill pill-fixed" style="padding:2px 8px;font-size:10px">Fixed</span>`, t: inr(L.leftOf(nx)), d: `still to set aside by ${fmtY(L.dueOf(nx))}`, rows: [["Saved", inr(L.savedOf(nx)), ""], ["Target", inr(L.targetOf(nx)), ""], ["Planned a month", inr(L.plannedOf(nx)), ""], ["Needed a month", inr(L.requiredAll(nx)), ""]], f: "A Fixed date can't slip: the old one is failing" });
  return `You're saving for ${plural(L.TOPS.length, "goal")}, and ${pt(inrL(L.SAVED), saved)} of the ${pt(inrL(L.TARGET), target)} is set aside. Paying each on its own schedule takes ${pt(inr(L.REQ_TOTAL), req)} a month, but ${pt(inr(MIN_BUDGET), min)} would hit every date if they're funded in order, and you plan ${pt(inr(L.PLAN_TOTAL), plan)}. The ${pt(nx.name.toLowerCase(), next, { x: "r" })} is next, due ${fmt(L.dueOf(nx))} with ${inr(L.leftOf(nx))} still to set aside.`;
}
export const greetingActions = () => `${L.btn("Add goal", { icon: I.plus() })}${L.btn("Set aside", { kind: "primary", icon: I.goals(14) })}`;
export const greeting = () => L.header({ lede: pointLede(), actions: greetingActions() });
export function attention() {
  const f = L.goal("fridge"), d = L.daysBetween(L.TODAY, f.targetDate);
  return `<div class="notice">${I.alert(16)}<div class="grow"><b>${f.name} · Fixed date ${fmt(f.targetDate)}</b> (${dayWord(d)}): ${inr(L.leftOf(f))} still to set aside, and you plan ${inr(f.plannedMonthly)} a month. It's a Need.</div><span class="mini-btn ok">${I.goals(11)} Set aside</span><span class="mini-btn ghost">See plan</span></div>`;
}

// ---------- The goals table ----------
export function goalsTable({ title = "Goals", note = "sub-goals sit inside their goal · the line on a bar is where saving should be by now" } = {}) {
  const cols = "2.5fr 0.8fr 0.8fr 1.9fr 1fr 1.1fr 1.2fr 1fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Goal")}${th("Why")}${th("Horizon")}${th("Set aside")}${th("Target")}${th("Due")}${th("Per month")}${th("Standing")}</div>`;
  const row = (x, sub = false) => {
    const off = x.status === "Paused" || x.status === "Done";
    const fixed = x.dateType === "Fixed" && x.status === "Active";
    const name = `<div class="cell-name${sub ? " subrow" : ""}">${tile(x, sub ? 28 : 34)}<div><b>${x.name}</b><small>${sub ? x.category : `${x.category}${L.kids(x.id).length ? ` · ${plural(L.kids(x.id).filter((k) => k.status !== "Dropped").length, "sub-goal")}` : ""}`}</small></div></div>`;
    if (x.status === "Done") {
      return `<div class="srow off" style="grid-template-columns:${cols}">${name}<div>${needBadge(x)}</div><div>${scaleBadge(x)}</div><div><b class="num">${inr(x.actualCost)}</b><span class="sub2">paid ${fmt(x.doneOn)} · ${inr(x.amount - x.actualCost)} under</span></div><div class="num">${inr(x.amount)}</div><div><b>${fmt(x.doneOn)}</b></div><div class="sub2">–</div><div>${standPill(x)}</div></div>`;
    }
    const saved = L.savedOf(x), tgt = L.targetOf(x), plan = L.plannedOf(x), req = L.requiredAll(x);
    const perMonth = x.status === "Active" ? `<b class="num">${plan ? inr(plan) : "–"}</b><span class="sub2">${req ? `needs ${inr(req)}` : "nothing needed"}</span>` : `<span class="sub2">${x.status === "Dropped" ? "–" : "paused"}</span>`;
    return `<div class="srow${off ? " off" : ""}${x.status === "Dropped" ? " dropped" : ""}" style="grid-template-columns:${cols}">${name}<div>${needBadge(x)}</div><div>${scaleBadge(x)}</div><div>${prog(x)}<span class="sub2" style="margin-top:5px">${x.status === "Dropped" ? `${inr(saved)} · ${inr(sum(L.CONTRIBUTIONS.filter((c) => c.goalId === x.id && c.kind === "Take-back").map((c) => c.amount)))} released` : `${inr(saved)} · ${Math.round(L.pctOfGoal(x) * 100)}%`}</span></div><div class="num">${inr(tgt)}</div><div><b>${L.dueOf(x) ? fmt(L.dueOf(x)) : "Someday"}</b><span class="sub2">${fixed ? `<span style="color:var(--negative);font-weight:800">Fixed</span> · ` : ""}${x.status === "Active" ? dueIn(x) : ""}</span></div><div>${perMonth}</div><div>${x.status === "Dropped" ? `<span class="pill pill-off">Dropped</span>` : standPill(x)}</div></div>`;
  };
  const rows = [...L.TOPS.flatMap((x) => [row(x), ...L.kids(x.id).map((k) => row(k, true))]), ...L.GOALS.filter((x) => !x.parentId && x.status !== "Active").map((x) => row(x))].join("");
  return card(`${cardHead(title, note, `<span class="row" style="gap:8px">${L.seg([{ label: "Active", on: true, count: L.TOPS.length }, { label: "All", count: L.GOALS.filter((x) => !x.parentId).length }])}</span>`)}<div>${head}${rows}</div>`, { gap: 6 });
}

// ---------- Smaller widgets ----------
export function comingUp({ n = 5 } = {}) {
  const items = L.UNITS.filter((u) => u.due && u.left).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, n);
  const rows = items.map((u) => {
    const mm = Math.max(1, L.monthsLeft(u.due)), need = Math.ceil(u.left / mm), plan = u.plannedMonthly ?? 0;
    const risk = u.dateType === "Fixed" && plan < need;
    return `<div class="cu${risk ? " risk" : ""}">${tile(u, 32)}<div><b>${u.name}</b><small>${inr(u.left)} to go · ${plan ? `plan ${inr(plan)}` : "no plan"} of ${inr(need)} a month</small></div><div class="d">${fmt(u.due)}<small>${u.dateType === "Fixed" ? `<span style="color:var(--negative);font-weight:800">Fixed</span> · ` : ""}${dayWord(L.daysBetween(L.TODAY, u.due))}</small></div></div>`;
  }).join("");
  return card(`${cardHead("Coming up", "the next dates, soonest first", link("All goals"))}<div>${rows}</div>`, { gap: 6 });
}
export function needsWants() {
  const all = L.TOPS.map((x) => L.necessitySplit(x)); const need = sum(all.map((s) => s.need)), want = sum(all.map((s) => s.want));
  const maj = sum(L.TOPS.filter((x) => x.scale === "Major").map(L.targetOf)), min = L.TARGET - maj;
  const bar = (a, b, ca, cb) => `<div class="split2"><span style="width:${(a / (a + b)) * 100}%;background:${ca}"></span><span style="width:${(b / (a + b)) * 100}%;background:${cb}"></span></div>`;
  return card(`${cardHead("Needs and wants", "by what each part is for, and for how long")}
  <div class="stack3"><div class="between"><b style="font-size:13px">Why</b><span class="sub2">${inr(L.TARGET)} in all</span></div>${bar(need, want, "var(--need)", "var(--want)")}
  <div class="between" style="font-size:12px;font-weight:700"><span><i class="dot" style="background:var(--need)"></i> Needs ${inr(need)} <span style="color:var(--muted)">· ${Math.round((need / L.TARGET) * 100)}%</span></span><span><i class="dot" style="background:var(--want)"></i> Wants ${inr(want)}</span></div></div>
  <div class="stack3"><div class="between"><b style="font-size:13px">How long</b></div>${bar(min, maj, "var(--muted)", "var(--ink)")}
  <div class="between" style="font-size:12px;font-weight:700"><span><i class="dot" style="background:var(--muted)"></i> Minor ${inr(min)}</span><span><i class="dot" style="background:var(--ink)"></i> Major ${inr(maj)} <span style="color:var(--muted)">· ${Math.round((maj / L.TARGET) * 100)}%</span></span></div></div>
  <div class="stack3"><div class="between"><b style="font-size:13px">By category</b></div>${Object.keys(L.CATEGORIES).map((c) => { const gs = L.TOPS.filter((x) => x.category === c); if (!gs.length) return ""; const v = sum(gs.map(L.targetOf)); return `<div style="display:grid;grid-template-columns:86px 1fr 70px;gap:10px;align-items:center;font-size:12px;font-weight:700"><span>${c}</span><span class="hbar" style="height:8px"><span style="width:${(v / Math.max(...Object.keys(L.CATEGORIES).map((k) => sum(L.TOPS.filter((x) => x.category === k).map(L.targetOf))))) * 100}%;background:${L.fill(L.CATEGORIES[c].color, 90)}"></span></span><span style="text-align:right">${L.inrS(v)}</span></div>`; }).join("")}</div>
  <div class="card-note">Minor is short-term, Major a long-term commitment. You pick it per goal.</div>`);
}
export function setAsides({ n = 6 } = {}) {
  const last = [...L.CONTRIBUTIONS].sort((a, b) => (a.date < b.date ? 1 : -1)).filter((c) => c.date <= L.TODAY).slice(0, n);
  const rows = last.map((c) => { const x = L.goal(c.goalId); return `<div class="cu">${tile(x, 30)}<div><b>${x.name}</b><small>${c.kind === "Take-back" ? c.note ?? "Taken back" : c.accountId ? `from ${c.accountId === "hdfc" ? "HDFC Salary" : "ICICI Invest"}` : "no account named"}</small></div><div class="d" style="${c.kind === "Take-back" ? "color:var(--negative)" : ""}">${c.kind === "Take-back" ? "−" : "+"}${inr(c.amount)}<small>${fmt(c.date)}</small></div></div>`; }).join("");
  return card(`${cardHead("Set aside lately", "the latest entries", link("All set-asides"))}<div>${rows}</div>`, { gap: 6 });
}
export function affordCard() {
  const max = Math.max(L.REQ_TOTAL, L.LEFT, L.PLAN_TOTAL) * 1.08, w = (v) => `${(v / max) * 100}%`;
  return card(`${cardHead("What your money allows", "income less obligations, not a true surplus")}
  <div class="stack3"><div class="meter"><i style="width:${w(L.PLAN_TOTAL)};background:${L.fill("emerald", 90)}"></i><b style="left:${w(L.LEFT)}"></b></div>
  <div class="meter-l"><span style="left:0">planned ${inr(L.PLAN_TOTAL)}</span><span style="left:calc(${w(L.LEFT)} - 54px)">left ${inr(L.LEFT)}</span></div></div>
  <div class="stack3"><div class="meter"><i style="width:${w(L.REQ_TOTAL)};background:${L.fill("ruby", 90)}"></i><b style="left:${w(L.LEFT)}"></b></div>
  <div class="meter-l"><span style="left:0">each on its own schedule ${inr(L.REQ_TOTAL)}</span></div></div>
  <div class="kv"><span>Income</span><b>${inr(L.SALARY)}</b></div><div class="kv"><span>Obligations (EMIs, subscriptions, card bills)</span><b>−${inr(L.OBLIGATIONS)}</b></div><div class="kv"><span>Left after obligations</span><b>${inr(L.LEFT)}</b></div>
  <div class="card-note">${inr(L.PLAN_TOTAL)} planned is ${Math.round((L.PLAN_TOTAL / L.LEFT) * 100)}% of what's left. Funded in order, ${inr(MIN_BUDGET)} is enough.</div>`);
}
export function finishedCard() {
  const x = L.goal("phones"), v = x.amount - x.actualCost;
  return card(`${cardHead("Finished", "estimate against what it cost")}
  <div class="cu">${tile(x, 36)}<div><b>${x.name}</b><small>bought ${fmt(x.doneOn)} · paid on ${x.paidFrom}</small></div><div class="d">${inr(x.actualCost)}<small>of ${inr(x.amount)}</small></div></div>
  <div class="between" style="background:var(--accent-tint);color:var(--accent-text);padding:12px 14px;border-radius:14px;font-size:13px;font-weight:700"><span>${I.check(12)} Came in ${inr(v)} under the estimate</span><span>${(v / x.amount * 100).toFixed(1)}%</span></div>
  <div class="card-note">The ${inr(x.amount)} you'd set aside is released back to you: nothing is left in the goal.</div>`);
}
