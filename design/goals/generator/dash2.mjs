// Round 2: four leaner directions (Prathik, 2026-10-29: "a few more variations, not too many widgets"). Each page is the greeting, one hero, and at
// most one more card, so the hero does the work.
//   G5 This month   the monthly ritual: what you planned to set aside, what you have, and a button for what's left
//   G6 Skyline      a building per goal, taller the bigger it is, floors for sub-goals, lit windows for what's saved
//   G7 Queue        the goal that's next, and every piece in funding order with the month it finishes
//   G8 Staircase    the money you must have set aside by each date, as steps, against what your plan puts aside
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { piecesOf } from "./dash.mjs";
const { I, inr, inrL, inrS, fmt, plural, sum } = L;
const { card, cardHead, link, grid, tile, needBadge, scaleBadge, standPill, fixedPill } = P;
const kicker = (t) => `<div class="hk">${t}</div>`;
const lean = (hero, rest = "") => P.page(`${P.greeting()}${hero}${rest}`);
const fillBg = (c) => L.fill(c, 90);

// ---------- G5 This month ----------
const MONTH = L.TODAY.slice(0, 7);
export function monthCard() {
  const pieces = L.TOPS.flatMap((x) => piecesOf(x).map((p) => ({ ...p, top: x, color: L.gColor(x) })));
  const rows = pieces.map((p) => ({ ...p, plan: p.plannedMonthly ?? 0, got: sum(L.CONTRIBUTIONS.filter((c) => c.goalId === p.id && c.date.startsWith(MONTH)).map((c) => (c.kind === "Set-aside" ? c.amount : -c.amount))), when: L.CONTRIBUTIONS.filter((c) => c.goalId === p.id && c.date.startsWith(MONTH)).map((c) => c.date).sort().at(-1) })).filter((r) => r.plan || r.got)
    .sort((a, b) => (a.necessity === "Need" ? 0 : 1) - (b.necessity === "Need" ? 0 : 1) || (a.due ?? "9").localeCompare(b.due ?? "9"));
  const plan = sum(rows.map((r) => r.plan)), got = sum(rows.map((r) => r.got)), counted = sum(rows.map((r) => Math.min(r.got, r.plan))), todo = rows.filter((r) => r.got < r.plan);
  const daysLeft = L.daysBetween(L.TODAY, L.addDays(`${MONTH}-01`, 31).slice(0, 7) + "-01") - 0;
  const strip = `<div style="display:flex;height:22px;border-radius:999px;overflow:hidden;gap:2px;background:var(--fill)">${rows.map((r) => `<span style="width:${(r.plan / plan) * 100}%;position:relative;background:color-mix(in oklch,var(--card-${r.color}) 18%,transparent)"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, (r.got / r.plan) * 100)}%;background:${fillBg(r.color)}"></span></span>`).join("")}</div>`;
  const line = (r) => {
    const done = r.got >= r.plan, part = r.got > 0 && !done, over = r.got > r.plan;
    const state = done ? `<span class="pill pill-on">${I.check(10)} ${over ? `${inr(r.got - r.plan)} extra` : "Done"}</span>` : part ? `<span class="pill pill-warn">${inr(r.plan - r.got)} short</span>` : `<span class="pill pill-off">Not yet</span>`;
    return `<div class="mt-row"><div class="cell-name">${tile(r, 34)}<div><b>${r.label}${r.piece.parentId || r.top.id !== r.id ? "" : ""}</b><small>${r.top.id !== r.piece.id && r.top.name !== r.label ? r.top.name + " · " : ""}${r.necessity} · due ${r.due ? fmt(r.due) : "someday"}</small></div></div>
    <div class="num">${inr(r.plan)}<span class="sub2">planned</span></div><div><div class="gbar" style="height:8px"><span class="f" style="width:${Math.min(100, (r.got / r.plan) * 100 || 0)}%;background:${fillBg(r.color)}"></span></div><span class="sub2" style="margin-top:5px">${r.got ? `${inr(r.got)} on ${fmt(r.when)}` : "nothing this month"}</span></div><div>${state}</div><div style="text-align:right">${done ? `<span class="mini-btn ghost">${I.pencil(11)} Edit</span>` : `<span class="mini-btn ok">${I.goals(11)} Set aside ${inr(r.plan - r.got)}</span>`}</div></div>`;
  };
  const hero = card(`${cardHead("This month", "what you planned to set aside, and what's done", `<span class="row" style="gap:8px">${L.seg([{ label: I.chevL(11) }, { label: "October 2026", on: true }, { label: I.chevR(11) }])}</span>`)}
  <div class="between" style="align-items:flex-end;gap:24px"><div><div class="fp-big">${inr(counted)}<small>of ${inr(plan)} planned</small></div><div class="sub2" style="margin-top:6px">${Math.round((counted / plan) * 100)}% of the month's plan · ${plural(todo.length, "goal")} still to do · 2 days left</div></div><div class="row" style="gap:10px">${todo.length ? `<span class="btn btn-primary">${I.check(14)} Set aside all ${plural(todo.length, "remaining one")}</span>` : ""}</div></div>
  ${strip}<div class="meter-l" style="height:auto;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">${rows.map((r) => `<span style="position:static;display:inline-flex;align-items:center;gap:5px"><i class="dot" style="background:var(--card-${r.color})"></i>${r.label}</span>`).join("")}</div>
  <div>${rows.map(line).join("")}</div>
  <div class="card-note">${inr(got - counted)} went in over a plan this month. Planned amounts come from each goal's "planned a month"; the buttons record a set-aside for the day you press them.</div>`, { gap: 16 });
  return hero;
}
export function g5() { return lean(monthCard(), grid([[12, P.goalsTable({ note: "everything, with sub-goals inside" })]])); }

// ---------- G6 Skyline ----------
export function g6() {
  const maxA = Math.max(...L.TOPS.map(L.targetOf)), H = (a) => 70 + 300 * Math.sqrt(a / maxA);
  const tops = [...L.TOPS].sort((a, b) => (L.dueOf(a) < L.dueOf(b) ? -1 : 1));
  const b = (x) => {
    const total = H(L.targetOf(x)), ps = piecesOf(x), c = L.gColor(x), tot = sum(ps.map((p) => p.amount)), w = ps.length > 1 ? 230 : 150;
    const floors = ps.map((p) => ({ p, h: Math.max(30, (p.amount / tot) * total) })).reverse();
    const pct = (p) => (p.amount ? Math.min(1, p.saved / p.amount) : 0);
    return `<div class="sk-b hov" tabindex="0" style="width:${w}px"><div class="sk-top">${x.scale === "Major" ? `<i class="sk-spire"></i>` : ""}${x.dateType === "Fixed" ? `<span class="sk-flag">${I.pin(10)} Fixed</span>` : ""}</div><div class="sk-body" style="--tc:var(--card-${c})">${ps.length ? floors.map(({ p, h }) => `<div class="sk-f" style="height:${h}px;--lit:${(pct(p) * 100).toFixed(1)}%"><span>${ps.length > 1 ? p.label : ""}</span><em>${Math.round(pct(p) * 100)}%</em></div>`).join("") : ""}</div>
    <div class="sk-l"><b>${x.name}</b><small>${inrS(L.savedOf(x))} of ${inrS(L.targetOf(x))} · ${L.fmtY(L.dueOf(x))}</small><span class="row" style="gap:5px;flex-wrap:wrap;margin-top:6px">${needBadge(x)}${scaleBadge(x)}</span></div>${P.tip(P.hc({ h: x.name, hr: needBadge(x), t: `${inr(L.savedOf(x))} of ${inr(L.targetOf(x))}`, d: `due ${L.fmtY(L.dueOf(x))}`, rows: ps.map((p) => [p.label, `${inrS(p.saved)} of ${inrS(p.amount)}`, `var(--card-${c})`]), f: "A taller building is a bigger goal. Lit windows are what's set aside" }), { w: 250 })}</div>`;
  };
  const sky = `<div class="sk"><div class="sk-stars"></div><div class="sk-row">${tops.map(b).join("")}</div><div class="sk-ground"></div></div>`;
  const hero = card(`${cardHead("The skyline", "taller is bigger · floors are sub-goals · lit windows are what's set aside · a spire marks a Major goal", `<span class="row" style="gap:10px">${L.derivedTag("Ordered by date, soonest first")}${L.seg([{ label: "Skyline", on: true }, { label: "List" }])}</span>`)}${sky}<div class="card-note">${I.pin(11)} A red flag is a Fixed date. Hover a building for its pieces.</div>`, { gap: 16 });
  return lean(hero, `${grid([[12, P.comingUp({ n: 4 })]])}`);
}

// ---------- G7 Queue ----------
export function g7() {
  const nx = L.goal("fridge"), c = L.gColor(nx), left = L.leftOf(nx), pl = L.fundingPlan(L.PLAN_TOTAL, 80);
  const focus = `<div class="q-focus" style="--tc:var(--card-${c})"><div class="between"><span class="hk" style="color:inherit;opacity:.8">Next up</span>${fixedPill()}</div><div class="row" style="gap:12px">${tile(nx, 44)}<div><b style="font-size:22px;font-weight:800;display:block">${nx.name}</b><span style="font-size:12px;opacity:.85;font-weight:600">${nx.category} · ${nx.necessity}</span></div></div>
  <div><div class="fp-big" style="color:inherit">${inr(left)}<small style="color:inherit;opacity:.8">to set aside</small></div><div style="font-size:13px;font-weight:600;opacity:.9;margin-top:6px">by Dec 20 · 52 days · 1 month left</div></div>
  ${P.prog(nx, { h: 12 })}<div class="between" style="font-size:12px;font-weight:700"><span>${inr(L.savedOf(nx))} of ${inr(L.targetOf(nx))}</span><span>73%</span></div>
  <div class="q-kv"><span>You plan a month</span><b>${inr(nx.plannedMonthly)}</b></div><div class="q-kv"><span>It needs a month</span><b>${inr(L.requiredAll(nx))}</b></div><div class="q-kv"><span>Short of what it needs</span><b>${inr(L.requiredAll(nx) - nx.plannedMonthly)} a month</b></div>
  <div class="row" style="gap:8px;margin-top:auto;padding-top:8px"><span class="btn" style="background:oklch(1 0 0/.92);color:var(--ink)">${I.goals(14)} Set aside ${inr(left)}</span><span class="btn" style="background:oklch(1 0 0/.16);color:inherit">Raise the plan</span></div></div>`;
  const rows = pl.order.map((u, i) => {
    const d = pl.done[u.id], due = u.due ? Math.max(1, L.monthsTo(u.due)) : null, date = L.addMonthsUTC(L.TODAY, d), diff = due ? due - d : 0;
    const top = u.parentId ? L.goal(u.parentId) : null;
    return `<div class="q-row"><span class="q-n">${i + 1}</span>${tile({ ...u, status: "Active" }, 30)}<div style="min-width:0"><b style="font-size:13px;font-weight:700;display:block">${top ? `<span style="color:var(--muted);font-weight:600">${top.name} · </span>` : ""}${u.name.replace(/ \((the rest|the iPad itself)\)/, " · $1")}</b><span class="row" style="gap:5px;margin-top:3px">${needBadge(u)}${scaleBadge(u)}${u.dateType === "Fixed" ? fixedPill() : ""}</span></div><div class="num" style="text-align:right">${inr(u.left)}<span class="sub2" style="text-align:right">to go</span></div><div style="text-align:right"><b>${L.monName(date.slice(0, 7))} ${date.slice(0, 4)}</b><span class="sub2" style="text-align:right;${diff < 0 ? "color:var(--warning-text);font-weight:800" : ""}">${diff < 0 ? `${plural(-diff, "month")} late` : diff > 0 ? `${plural(diff, "month")} early` : "on its date"}</span></div></div>`;
  }).join("");
  const queue = `<div><div class="between" style="margin-bottom:6px"><div><b style="font-size:15px;font-weight:800">In funding order</b><span class="card-note" style="margin-left:8px">Fixed dates, then Needs, then the soonest</span></div>${L.seg([{ label: "₹27,000" }, { label: `${inr(L.PLAN_TOTAL)} · your plan`, on: true }])}</div>${rows}</div>`;
  const hero = card(`<div style="display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:28px;align-items:stretch">${focus}${queue}</div>`, { gap: 0 });
  return lean(hero);
}

// ---------- G8 Staircase ----------
/** The staircase: steps for what must be set aside by each date, and a line for what a monthly amount puts aside. `dark` draws it for a coloured cover. */
export function stair({ dark = false, Hh = 300, labels = true } = {}) {
  const M = 34, W = 1000, units = L.UNITS.filter((u) => u.due && u.left), tot = sum(units.map((u) => u.left));
  const x = (m) => (m / M) * W, y = (v) => Hh - (v / tot) * Hh * 0.97;
  const due = units.map((u) => ({ u, m: Math.max(1, L.monthsTo(u.due)) })).sort((a, b) => a.m - b.m);
  let run = 0, d = `M0 ${y(0)}`; const marks = [];
  for (const { u, m } of due) { d += ` H${x(m)}`; run += u.left; d += ` V${y(run)}`; marks.push({ u, m, run }); }
  d += ` H${W}`;
  const area = `${d} V${Hh} H0 Z`;
  const cum = (b) => { const p = L.fundingPlan(b, M); let c = 0; const pts = [[0, 0]]; for (const r of p.rows) { c += r.spent; pts.push([r.m, c]); } return pts.map(([m, v], i) => `${i ? "L" : "M"}${x(m)} ${y(v)}`).join(" "); };
  const C = dark ? { step: "oklch(0.85 0.12 30)", fill: "oklch(1 0 0 / 0.07)", a: "oklch(0.9 0.17 150)", b: "white", grid: "oklch(1 0 0 / 0.16)", txt: "oklch(1 0 0 / 0.75)" } : { step: "var(--negative)", fill: "color-mix(in oklch,var(--negative) 9%,transparent)", a: "var(--accent)", b: "var(--ink)", grid: "var(--grid)", txt: "var(--muted)" };
  const lines = [{ b: L.PLAN_TOTAL, c: C.a, n: `Your plan, ${inr(L.PLAN_TOTAL)} a month` }, { b: P.MIN_BUDGET, c: C.b, n: `Just enough, ${inr(P.MIN_BUDGET)} a month` }];
  const gl = [0, 0.25, 0.5, 0.75, 1].map((f) => `<div style="position:absolute;left:0;right:0;bottom:${f * 97}%;border-top:1px dashed ${C.grid}"><span style="position:absolute;left:-64px;top:-8px;font-size:10px;font-weight:700;color:${C.txt};width:56px;text-align:right">${f ? inrL(tot * f) : "₹0"}</span></div>`).join("");
  const ticks = [0, 6, 12, 18, 24, 30].map((m) => `<span style="position:absolute;left:${(m / M) * 100}%;top:6px;font-size:10px;font-weight:800;letter-spacing:.04em;color:${C.txt};transform:translateX(-50%)">${m ? L.monName(L.addMonthsUTC(L.TODAY, m).slice(0, 7)) + " " + L.addMonthsUTC(L.TODAY, m).slice(2, 4) : "Now"}</span>`).join("");
  const early = marks.filter((k) => k.m <= 7), late = marks.filter((k) => k.m > 7);
  const lab = (k, text) => `<div style="position:absolute;left:${(k.m / M) * 100}%;bottom:${(1 - y(k.run) / Hh) * 100}%;transform:translate(-100%,0);padding:0 6px 6px 0;text-align:right"><span class="st-lab${dark ? " dk" : ""}">${text}</span></div>`;
  const labelsHtml = !labels ? "" : lab(early.at(-1), `<i class="dot" style="background:${dark ? "white" : "var(--ink)"}"></i>${early.length} pieces by ${L.monName(L.addMonthsUTC(L.TODAY, 7).slice(0, 7))} ${L.addMonthsUTC(L.TODAY, 7).slice(2, 4)}: ${inrL(early.at(-1).run)}`) + late.map((k) => lab(k, `<i class="dot" style="background:var(--card-${L.gColor(k.u)})"></i>${k.u.name.replace(/ \((the rest|the iPad itself)\)/, " (the rest)")}${k.u.dateType === "Fixed" ? ` ${I.pin(10)}` : ""}`)).join("");
  const plot = `<div style="position:relative;margin-left:64px;height:${Hh}px;margin-top:10px;margin-bottom:26px">${gl}<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"><path d="${area}" fill="${C.fill}"></path><path d="${d}" fill="none" stroke="${C.step}" stroke-width="2" vector-effect="non-scaling-stroke"></path>${lines.map((l) => `<path d="${cum(l.b)}" fill="none" stroke="${l.c}" stroke-width="2.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>`).join("")}</svg>${labelsHtml}<div style="position:absolute;left:0;right:0;top:100%">${ticks}</div></div>`;
  const legend = `<div class="row" style="gap:20px;flex-wrap:wrap;font-size:12px;font-weight:700;${dark ? "color:oklch(1 0 0/.85)" : ""}"><span><i class="dot" style="background:${C.step}"></i> Needed by each date (steps)</span>${lines.map((l) => `<span><i class="dot" style="background:${l.c}"></i> ${l.n}</span>`).join("")}</div>`;
  return { plot, legend, tot, marks, due };
}
export function stairCard({ title = "The staircase", Hh = 300 } = {}) {
  const st = stair({ Hh });
  return card(`${cardHead(title, "the money that must be set aside by each date, against what a monthly amount puts aside", `<span class="row" style="gap:8px">${L.derivedTag("Both lines come from the funding plan")}</span>`)}
  <div class="between" style="align-items:flex-end;gap:24px"><div><div class="fp-big">${inr(st.tot)}<small>still to set aside, in all</small></div><div class="sub2" style="margin-top:6px">${plural(st.marks.length, "piece")} with dates · the last is ${L.fmtY(st.due.at(-1).u.due)}</div></div><div style="text-align:right;font-size:13px;font-weight:700;max-width:420px;line-height:1.5">A line above a step means that date is safe. ${inr(P.MIN_BUDGET)} a month stays on or above every step; ₹20,000 would slip.</div></div>${st.plot}${st.legend}`, { gap: 16 });
}
export function g8() { return lean(stairCard(), grid([[12, P.goalsTable({ note: "everything, with sub-goals inside" })]])); }
