// Round 1: four directions for the /goals hero. Each page is the greeting (whose figures point), the attention strip, one hero, then the
// shared widgets in a different order. The real layout is picked after the hero, as Income and Loans did.
//   G1 Tanks         a vessel for every piece of a goal that fills as you set money aside; a dashed line is where it should be by now
//   G2 Runway        a timeline: every goal from when saving began to its date, filled to what's saved, with a dot for where your plan ends
//   G3 Funding plan  hands-on: pick a monthly amount and watch each goal's finish month move against its date
//   G4 Matrix        the two axes themselves: Need or Want down the side, Minor or Major across the top
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { I, inr, inrL, inrS, fmt, plural, col, sum } = L;
const { card, cardHead, link, grid, tile, needBadge, scaleBadge, standPill, fixedPill, dueTxt } = P;
const header = () => P.greeting();
const frame = (hero, rest) => P.page(`${header()}${P.attention()}${hero}${rest}`);
const kicker = (t) => `<div class="hk">${t}</div>`;
const live = (id) => L.kids(id).filter((k) => k.status === "Active");
/** The pieces of a top-level goal that are filled: its own part (if it has sub-goals) and each live sub-goal; a plain goal is one piece. */
export const piecesOf = (x) => {
  const ks = live(x.id);
  if (!L.kids(x.id).length) return [{ ...x, piece: x, label: x.name, left: Math.max(0, x.amount - L.savedOwn(x.id)), saved: L.savedOwn(x.id), due: x.targetDate }];
  return [...(x.amount > 0 ? [{ ...x, piece: x, label: x.id === "ipad" ? "The iPad" : "The rest", saved: L.savedOwn(x.id), left: Math.max(0, x.amount - L.savedOwn(x.id)), due: x.targetDate }] : []), ...ks.map((k) => ({ ...k, piece: k, label: k.name, saved: L.savedOwn(k.id), left: Math.max(0, k.amount - L.savedOwn(k.id)), due: k.targetDate }))];
};
const pctPiece = (p) => (p.amount ? Math.min(1, p.saved / p.amount) : 0);
const expPiece = (p) => { if (!p.due) return null; const a = L.daysBetween(p.startDate, L.TODAY), b = L.daysBetween(p.startDate, p.due); return b <= 0 ? 1 : Math.max(0, Math.min(1, a / b)); };

// ---------- G1 Tanks ----------
function tank(p, color) {
  const pct = pctPiece(p), e = expPiece(p), high = pct > 0.8;
  return `<div class="tk hov" tabindex="0"><div class="tk-v" style="--tc:var(--card-${color});--p:${(pct * 100).toFixed(1)}%${e != null ? `;--e:${(e * 100).toFixed(1)}%` : ""}"><span class="tk-w"></span>${e != null ? `<span class="tk-pace"><span>by now</span></span>` : ""}<span class="tk-pct" style="${pct > 0.9 ? "color:var(--on-card)" : ""}">${Math.round(pct * 100)}%</span></div><div class="tk-n">${p.label}</div><div class="tk-s"><b>${inrS(p.saved)}</b> of ${inrS(p.amount)}<br>${p.due ? fmt(p.due) : "Someday"} ${p.necessity === "Need" ? `· <span style="color:var(--need);font-weight:800">Need</span>` : ""}</div>${P.tip(P.hc({ h: p.label, hr: needBadge(p), t: `${inr(p.saved)} of ${inr(p.amount)}`, d: p.due ? `due ${P.dueTxt(p)}` : "no date yet", rows: [["Still to set aside", inr(p.left), ""], ["Planned a month", p.plannedMonthly ? inr(p.plannedMonthly) : "none", ""], ["Horizon", p.scale, ""]], f: e != null ? "The dashed line is where a straight line from the day you started puts you by today" : "" }), { w: 230 })}</div>`;
}
export function g1() {
  const bays = L.TOPS.map((x) => {
    const ps = piecesOf(x), c = L.gColor(x);
    return { n: ps.length, html: `<div class="bay" style="--bc:var(--card-${c})"><div class="bay-h">${tile(x, 36)}<div style="min-width:0;flex:1"><b>${x.name}</b><small>${inrS(L.savedOf(x))} of ${inrS(L.targetOf(x))} · ${L.dueOf(x) ? L.fmtY(L.dueOf(x)) : "Someday"}</small></div></div><div class="tanks">${ps.map((p) => tank(p, c)).join("")}</div><div class="row" style="gap:6px;flex-wrap:wrap">${needBadge(x)}${scaleBadge(x)}${x.dateType === "Fixed" ? fixedPill() : ""}${standPill(x)}</div></div>` };
  });
  const hero = card(`${cardHead("Every goal, filling up", "a tank for each piece · hover one", `<span class="row" style="gap:10px">${L.derivedTag("Dashed line: where saving should be by now")}${L.seg([{ label: "Tanks", on: true }, { label: "List" }])}</span>`)}<div class="bays" style="grid-template-columns:${bays.map((b) => `${Math.max(b.n, 1.7)}fr`).join(" ")}">${bays.map((b) => b.html).join("")}</div>`, { gap: 18 });
  return frame(hero, `${grid([[12, P.goalsTable()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}`);
}

// ---------- G2 Runway ----------
const T0 = "2026-01-01", T1 = "2029-08-01", SPAN = L.daysBetween(T0, T1);
const px = (iso) => (L.daysBetween(T0, iso) / SPAN) * 100;
function runRow(p, { sub = false, parent = false, color }) {
  const c = color ?? L.gColor(p), start = p.startDate, due = p.due ?? L.dueOf(p), bar = (a, b) => `left:${px(a)}%;width:${Math.max(0.6, px(b) - px(a))}%`;
  if (!due) return "";
  const saved = parent ? L.savedOf(p) : p.saved, tgt = parent ? L.targetOf(p) : p.amount, pct = tgt ? Math.min(1, saved / tgt) : 0;
  const left = parent ? L.leftOf(p) : p.left, plan = parent ? L.plannedOf(p) : p.plannedMonthly ?? 0;
  const proj = left > 0 && plan > 0 ? L.addMonthsUTC(L.TODAY, Math.ceil(left / plan)) : null;
  const late = proj && proj > due;
  return `<div class="rw-row"><div class="rw-lab${sub ? " sub" : ""}">${tile({ ...p, status: "Active" }, sub ? 26 : 32)}<div style="min-width:0"><b>${parent ? p.name : p.label ?? p.name}</b><small>${inrS(saved)} of ${inrS(tgt)}</small></div></div>
  <div class="rw-track hov" tabindex="0" style="--tc:var(--card-${c})"><span class="rw-bar${parent ? " par" : ""}" style="${bar(start, due)}"><span class="rw-fill" style="width:${(pct * 100).toFixed(1)}%"></span></span>${proj ? `<span class="rw-proj" style="left:${px(proj)}%"></span>` : ""}${p.dateType === "Fixed" ? `<span class="rw-pin" style="left:${px(due)}%"><i></i>${I.pin(10)}</span>` : ""}${P.tip(P.hc({ h: parent ? p.name : p.label ?? p.name, t: `${inr(saved)} of ${inr(tgt)}`, d: `${fmt(start)} → ${L.fmtY(due)}`, rows: [["Planned a month", plan ? inr(plan) : "none", ""], ["At that plan it ends", proj ? L.fmtY(proj) : left ? "never (no plan)" : "already funded", ""], ["Date", late ? "plan runs past it" : "plan makes it", ""]], f: "The dotted line is where your plan finishes the goal" }), { w: 240 })}</div>
  <div class="rw-end">${L.fmt(due)}<small>${late ? `<span style="color:var(--warning-text);font-weight:800">plan ends ${L.monName(proj.slice(0, 7))} ${proj.slice(0, 4)}</span>` : p.dateType === "Fixed" ? "<span style='color:var(--negative);font-weight:800'>Fixed date</span>" : parent ? L.standing(p) : "on plan"}</small></div></div>`;
}
export function g2() {
  const years = [2026, 2027, 2028, 2029], axis = years.map((y) => `<span style="left:${px(`${y}-01-01`)}%;padding-left:6px">${y}</span><i style="left:${px(`${y}-01-01`)}%"></i>`).join("") + [4, 7, 10].flatMap((m) => years.map((y) => `<i style="left:${px(`${y}-${String(m).padStart(2, "0")}-01`)}%;height:4px"></i>`)).join("");
  const rows = L.TOPS.flatMap((x) => {
    const ps = piecesOf(x);
    return L.kids(x.id).length ? [runRow(x, { parent: true }), ...ps.map((p) => runRow(p, { sub: true, color: L.gColor(x) }))] : [runRow(ps[0], {})];
  }).join("");
  const grid2 = [4, 7, 10].flatMap((m) => years.map((y) => `<i style="left:${px(`${y}-${String(m).padStart(2, "0")}-01`)}%"></i>`)).join("");
  const hero = card(`${cardHead("The runway", "from the day saving began to the date, filled to what's set aside", `<span class="row" style="gap:10px">${L.derivedTag("Dotted line: where your plan finishes it")}${L.seg([{ label: "Runway", on: true }, { label: "List" }])}</span>`)}
  <div class="rw" style="padding-top:22px"><div class="rw-axis">${axis}</div><div class="rw-grid">${grid2}</div><span class="rw-now" style="left:calc(250px + (100% - 400px) * ${px(L.TODAY) / 100});top:0"><span>Today</span></span>${rows}</div>`, { gap: 12 });
  return frame(hero, `${grid([[12, P.goalsTable()]])}${grid([[7, P.comingUp({ n: 5 })], [5, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}`);
}

// ---------- G3 Funding plan ----------
const BUDGETS = [{ v: 20000, k: "Tight" }, { v: P.MIN_BUDGET, k: "Just enough" }, { v: 40000, k: "Comfortable" }, { v: L.LEFT, k: "Everything left" }];
const MAXM = 44;
function planView(b) {
  const pl = L.fundingPlan(b.v, 80), order = pl.order, mpx = (m) => `${(m / MAXM) * 100}%`;
  const late = order.filter((u) => u.due && (pl.done[u.id] ?? 99) > Math.max(1, L.monthsTo(u.due)));
  const rows = order.map((u, i) => {
    const d = pl.done[u.id], due = u.due ? Math.max(1, L.monthsTo(u.due)) : null, isLate = due && d > due, fixed = u.dateType === "Fixed";
    const doneDate = L.addMonthsUTC(L.TODAY, d);
    return `<div class="fp-row"><div class="rw-lab"><span style="font-size:11px;font-weight:800;color:var(--muted);width:14px">${i + 1}</span>${tile({ ...u, status: "Active" }, 26)}<div style="min-width:0"><b style="font-size:12.5px">${u.name}</b><small>${inrS(u.left)} to go</small></div></div><div class="fp-track" style="--tc:var(--card-${L.gColor(u)})"><span class="fp-bar${isLate ? " late" : ""}" style="width:${(d / MAXM) * 100}%"></span>${due ? `<span class="fp-due${fixed ? " fx" : ""}" style="left:${mpx(due)}"></span>` : ""}</div><div class="fp-res" style="${isLate ? "color:var(--warning-text)" : ""}">${L.monName(doneDate.slice(0, 7))} ${doneDate.slice(0, 4)}<small>${isLate ? `${plural(d - due, "month")} after its date` : due && d < due ? `${plural(due - d, "month")} early` : "on its date"}</small></div></div>`;
  }).join("");
  const maxM = Math.max(...Object.values(pl.done)), cols = pl.rows.slice(0, maxM);
  const stack = `<div class="fp-stack">${cols.map((r) => `<div title="Month ${r.m}">${order.filter((u) => r.give[u.id]).map((u) => `<i style="height:${(r.give[u.id] / b.v) * 130}px;background:var(--card-${L.gColor(u)})"></i>`).join("")}</div>`).join("")}</div>`;
  const ticks = [0, 6, 12, 18, 24, 30, 36, 42].map((m) => `<span style="position:absolute;left:${mpx(m)};font-size:10px;font-weight:800;color:var(--muted)">${m ? L.monName(L.addMonthsUTC(L.TODAY, m).slice(0, 7)) + " " + L.addMonthsUTC(L.TODAY, m).slice(2, 4) : "Now"}</span>`).join("");
  return `<div class="fp-view fp-v-${b.v}"><div class="between" style="align-items:flex-end;gap:20px"><div><div class="fp-big">${inr(b.v)}<small>a month</small></div><div class="sub2" style="margin-top:6px">${b.v > L.LEFT ? "More than is left after obligations" : `${Math.round((b.v / L.LEFT) * 100)}% of the ${inr(L.LEFT)} left after obligations`}</div></div><div style="text-align:right">${late.length ? `<span class="pill pill-warn" style="font-size:12px;padding:6px 12px">${I.alert(12)} ${late.map((u) => u.name.split(":")[0]).join(", ")} slips ${late.map((u) => plural(pl.done[u.id] - Math.max(1, L.monthsTo(u.due)), "month")).join(", ")}</span>` : `<span class="pill pill-on" style="font-size:12px;padding:6px 12px">${I.check(12)} Every date is hit</span>`}<div class="sub2" style="margin-top:6px">${order.every((u) => pl.done[u.id]) ? `All funded by ${L.monName(L.addMonthsUTC(L.TODAY, maxM).slice(0, 7))} ${L.addMonthsUTC(L.TODAY, maxM).slice(0, 4)}` : ""}</div></div></div>
  <div style="margin-top:18px"><div style="position:relative;height:18px;margin-left:210px;margin-right:150px">${ticks}</div>${rows}</div>
  <div style="margin-top:14px;display:grid;grid-template-columns:210px minmax(0,1fr) 150px"><div><b style="font-size:12.5px">Where each month goes</b><div class="sub2" style="white-space:normal">${inr(b.v)} a month, split in the order above</div></div><div style="width:${(maxM / MAXM) * 100}%">${stack}</div><div></div></div></div>`;
}
export function g3() {
  const css = `<style>${BUDGETS.map((b) => `.fpdir:has(#fp-b-${b.v}:checked) .fp-v-${b.v}{display:block}.fpdir:has(#fp-b-${b.v}:checked) label[for="fp-b-${b.v}"]{background:var(--ink);color:var(--on-ink)}`).join("")}</style>`;
  const radios = BUDGETS.map((b, i) => `<input type="radio" class="pk-in" name="fp-b" id="fp-b-${b.v}"${i === 1 ? " checked" : ""} aria-label="${inr(b.v)}">`).join("");
  const chips = `<div class="fp-chips">${kicker("Put aside each month")}${BUDGETS.map((b) => `<label for="fp-b-${b.v}" class="chip">${inr(b.v)}<em>${b.k}</em></label>`).join("")}<span class="chip" style="background:transparent;border:1px dashed var(--divider);color:var(--muted)">${I.pencilTool(12)} Type an amount</span></div>`;
  const hero = card(`${cardHead("The funding plan", "money goes to Fixed dates first, then Needs, then the soonest date", L.derivedTag("A plan, not a promise"))}${chips}${BUDGETS.map(planView).join("")}<div class="card-note">The rule: each month, every goal first gets what it needs to reach its date; whatever is left goes to the goals still open, in the same order. A goal that finishes frees its money for the next.</div>`, { gap: 16 });
  return P.page(`<div class="fpdir pgcol">${radios}${css}${header()}${P.attention()}${hero}${grid([[12, P.goalsTable()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}</div>`);
}

// ---------- G4 Matrix ----------
function mxCard(x) {
  const c = L.gColor(x), ks = L.kids(x.id).filter((k) => k.status === "Active");
  return `<div class="mx-card" style="--tc:var(--card-${c})"><div class="top">${tile(x, 34)}<div style="flex:1;min-width:0"><b>${x.name}</b><small>${x.category} · due ${L.dueOf(x) ? L.fmtY(L.dueOf(x)) : "someday"}</small></div>${x.dateType === "Fixed" ? fixedPill() : ""}${standPill(x)}</div>
  ${P.prog(x, { h: 9 })}<div class="nums"><span>${inr(L.savedOf(x))} of ${inr(L.targetOf(x))}</span><span>${Math.round(L.pctOfGoal(x) * 100)}% · needs ${inr(L.requiredAll(x))} a month</span></div>
  ${ks.length ? `<div class="mx-sub">${ks.map((k) => `<span class="${k.necessity.toLowerCase()}"><i></i>${k.name} ${L.inrS(k.amount)}</span>`).join("")}</div>` : ""}</div>`;
}
export function g4() {
  const cell = (nec, sc) => {
    const gs = L.TOPS.filter((x) => x.necessity === nec && x.scale === sc);
    const total = sum(gs.map(L.targetOf));
    return `<div class="mx-cell ${nec.toLowerCase()}"><div class="mx-t"><span>${nec}s · ${sc === "Minor" ? "short-term" : "long-term"}</span><span>${gs.length ? `${plural(gs.length, "goal")} · ${inrL(total)}` : ""}</span></div>${gs.length ? gs.map(mxCard).join("") : `<div class="mx-empty">Nothing here yet.<br>A long-term need, such as a home repair fund, would sit here.</div>`}</div>`;
  };
  const hero = card(`${cardHead("Why, and for how long", "Need or Want down the side · Minor (short-term) or Major (long-term) across the top", L.derivedTag("You pick both on each goal"))}
  <div class="mx"><div></div><div class="mx-h"><b>Minor</b><small>a short-term thing</small></div><div class="mx-h"><b>Major</b><small>a long-term commitment</small></div>
  <div class="mx-h row"><b>Needs</b><small>something breaks without it</small></div>${cell("Need", "Minor")}${cell("Need", "Major")}
  <div class="mx-h row"><b>Wants</b><small>nice to have</small></div>${cell("Want", "Minor")}${cell("Want", "Major")}</div>
  <div class="card-note">Sub-goals ride inside their goal as chips, red for a Need and blue for a Want. A paused or finished goal leaves the matrix.</div>`, { gap: 16 });
  return frame(hero, `${grid([[12, P.goalsTable()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}`);
}
