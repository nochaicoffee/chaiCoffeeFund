// Round 3 (Prathik, 2026-10-29): "not too few widgets", and he liked the Queue's coloured card, so these four lean on colour cards in the style of
// Subscriptions' cover, Accounts' cards and the Queue's focus card, with a full widget set underneath, as the other dashboards have.
//   G9  Cover    Accounts' cover: a coloured focus panel and a tall card per goal; pick one and the whole cover takes its colour; the staircase runs along the bottom
//   G10 Map      every goal a coloured tile sized by its amount (sub-goals inside the car), filled to what's saved, beside the funding order
//   G11 Board    three date lanes of coloured cards: what's due first, then the rest of next year, then later
//   G12 Tickets  the Queue's focus card, and the funding order as a ticket per piece in its own colour
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { piecesOf } from "./dash.mjs";
import { monthCard, stair, stairCard } from "./dash2.mjs";
const { I, inr, inrL, inrS, fmt, plural, sum } = L;
const { card, cardHead, link, grid, tile, needBadge, scaleBadge, fixedPill } = P;
const page = (hero, rest) => P.page(`${P.greeting()}${P.attention()}${hero}${rest}`);
const gr = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
const PIECES = L.TOPS.flatMap((x) => piecesOf(x).map((p) => ({ ...p, top: x, color: L.gColor(x) })));
const exp = (p) => { if (!p.due) return null; const a = L.daysBetween(p.startDate, L.TODAY), b = L.daysBetween(p.startDate, p.due); return b <= 0 ? 1 : Math.max(0, Math.min(1, a / b)); };
const pct = (p) => (p.amount ? Math.min(1, p.saved / p.amount) : 0);
const ccBar = (pc, e, h = 8) => `<div class="cc-gb" style="height:${h}px"><i style="width:${(pc * 100).toFixed(1)}%"></i>${e != null ? `<b style="left:${(e * 100).toFixed(1)}%"></b>` : ""}</div>`;
const label = (p) => p.label.replace(/^The rest$/, "The rest of the car");
const pieceName = (p) => (p.top.id !== p.piece.id || L.kids(p.top.id).length ? `${p.top.name} · ${p.label}` : p.label);
const needPer = (p) => (p.left && p.due ? Math.ceil(p.left / Math.max(1, L.monthsLeft(p.due))) : 0);
const dayWord = P.dayWord;

// ---------- G9 Cover ----------
const PICKS = [{ id: "all", color: "emerald" }, ...L.TOPS.map((x) => ({ id: x.id, color: L.gColor(x), x }))];
function focus9(pk) {
  const x = pk.x, all = !x;
  const saved = all ? L.SAVED : L.savedOf(x), tgt = all ? L.TARGET : L.targetOf(x), pc = tgt ? saved / tgt : 0;
  const e = all ? null : L.expectedPct(x);
  const ks = all ? [] : L.kids(x.id).filter((k) => k.status === "Active");
  return `<div class="h9-f h9-f-${pk.id}"><div class="between"><span class="hk" style="color:inherit;opacity:.8">${all ? "Set aside across all goals" : "Set aside for"}</span><span class="h9-pill">${all ? `${plural(L.TOPS.length, "goal")} · ${plural(piecesCount(), "piece")}` : `${x.category} · ${x.necessity}`}</span></div>
  <div class="h9-big">${inr(saved)}</div><div style="font-size:19px;font-weight:800">${all ? "All goals" : x.name}</div>
  <div style="font-size:13px;font-weight:600;opacity:.85">${all ? `of ${inr(tgt)} · ${Math.round(pc * 100)}%` : `of ${inr(tgt)} · ${Math.round(pc * 100)}% · due ${P.dueTxt(x)}${L.kids(x.id).length ? ` · ${plural(ks.length, "sub-goal")}` : ""}`}</div>
  ${ccBar(pc, e, 10)}
  ${all ? `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="h9-chip">${inr(L.REQ_TOTAL)} a month on each schedule</span><span class="h9-chip">${inr(P.MIN_BUDGET)} funded in order</span></div>` : `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="h9-chip">${inr(L.plannedOf(x))} planned a month</span><span class="h9-chip">${inr(L.requiredAll(x))} needed</span>${x.scale === "Major" ? `<span class="h9-chip">Major</span>` : ""}${x.dateType === "Fixed" ? `<span class="h9-chip" style="background:oklch(0.55 0.2 25)">Fixed date</span>` : ""}</div>`}
  <div class="row" style="gap:8px;margin-top:auto"><span class="btn" style="background:oklch(1 0 0/.92);color:var(--ink)">${I.goals(14)} Set aside</span><span class="btn" style="background:oklch(1 0 0/.16);color:inherit">${I.plus(13)} ${all ? "Add goal" : "Add sub-goal"}</span></div></div>`;
}
const piecesCount = () => PIECES.length;
function vcard(pk) {
  if (pk.id === "all") return "";
  const x = pk.x, pc = L.pctOfGoal(x);
  return `<label for="p9-${pk.id}" class="vc" style="background:${gr(pk.color, 170)}"><span class="vc-f" style="height:${(pc * 100).toFixed(1)}%"></span><span class="vc-t">${tile(x, 30)}</span><span class="vc-p">${Math.round(pc * 100)}%</span><span class="vc-n">${x.name}</span></label>`;
}
export function g9() {
  const css = `<style>${PICKS.map((pk) => `.h9dir:has(#p9-${pk.id}:checked) .h9-f-${pk.id}{display:flex}.h9dir:has(#p9-${pk.id}:checked) .h9-bg-${pk.id}{opacity:1}.h9dir:has(#p9-${pk.id}:checked) label[for="p9-${pk.id}"].vc,.h9dir:has(#p9-${pk.id}:checked) label[for="p9-all"].h9-all{outline:3px solid oklch(1 0 0/.85);outline-offset:3px}`).join("")}</style>`;
  const radios = PICKS.map((pk) => `<input type="radio" class="pk-in" name="p9" id="p9-${pk.id}"${pk.id === "all" ? " checked" : ""} aria-label="${pk.id}">`).join("");
  const st = stair({ dark: true, Hh: 170, labels: false });
  const stats = [["This month", `${inr(L.sum(P_MONTH().map((r) => Math.min(r.got, r.plan))))}`, "of ₹65,000 planned"], ["Next date", "New fridge", "Dec 20 · Fixed · 52 days"], ["Funded in order", `${inr(P.MIN_BUDGET)} a month`, "hits every date"], ["Behind its plan", `${L.TOPS.filter((x) => L.standing(x) === "Behind").length} of ${L.TOPS.length}`, "needing more a month"]];
  const hero = `<section class="hero h9" style="padding:26px;display:flex;flex-direction:column;gap:22px;color:white">${PICKS.map((pk) => `<div class="h9-bg h9-bg-${pk.id}" style="background:${gr(pk.color, 160)}"></div>`).join("")}<div class="h9-rings"></div>
  <div class="between" style="gap:12px"><label for="p9-all" class="h9-all chip" style="background:oklch(1 0 0/.16);color:white;cursor:pointer">${L.I.goals(13)} All goals</label><span class="hk" style="color:oklch(1 0 0/.75)">Pick a goal and the cover follows</span></div>
  <div style="display:grid;grid-template-columns:minmax(0,520px) minmax(0,1fr);gap:22px"><div class="h9-fp">${PICKS.map(focus9).join("")}</div><div class="vcs">${PICKS.map(vcard).join("")}</div></div>
  <div class="h9-chart"><div class="between"><span class="hk" style="color:oklch(1 0 0/.75)">Money needed by each date, against what a month puts aside</span>${st.legend}</div>${st.plot}</div>
  <div class="h9-stats">${stats.map(([k, v, s]) => `<div><span class="hk" style="color:oklch(1 0 0/.7)">${k}</span><b>${v}</b><small>${s}</small></div>`).join("")}</div></section>`;
  return P.page(`<div class="h9dir pgcol">${radios}${css}${P.greeting()}${hero}${grid([[12, P.goalsTable()]])}${grid([[12, monthCard()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}</div>`);
}
function P_MONTH() {
  const m = L.TODAY.slice(0, 7);
  return PIECES.map((p) => ({ plan: p.plannedMonthly ?? 0, got: sum(L.CONTRIBUTIONS.filter((c) => c.goalId === p.id && c.date.startsWith(m)).map((c) => (c.kind === "Set-aside" ? c.amount : -c.amount))) })).filter((r) => r.plan || r.got);
}

// ---------- G10 Map ----------
const fillBand = (pc) => `<span class="tm-fill" style="height:${(pc * 100).toFixed(1)}%"></span>`;
function tmTile(x, extra = "", compact = false) {
  const pc = L.pctOfGoal(x), c = L.gColor(x);
  return `<div class="tm hov rt" tabindex="0" style="background:${gr(c, 155)};${extra}">${fillBand(pc)}<div class="tm-in"><div class="between" style="align-items:flex-start"><div><b class="tm-n">${x.name}</b><small>${x.category} · ${x.scale}${compact && x.dateType === "Fixed" ? " · Fixed" : ""}</small></div>${compact ? "" : `<span class="tm-p">${Math.round(pc * 100)}%</span>`}</div><div class="tm-foot"><b>${inrL(L.targetOf(x))}</b><small>${compact ? `${Math.round(pc * 100)}% · ` : `${inrS(L.savedOf(x))} set aside · `}${L.dueOf(x) ? fmt(L.dueOf(x)) : "someday"}</small>${compact ? "" : `<span class="row" style="gap:5px;margin-top:6px">${needBadge(x)}${x.dateType === "Fixed" ? fixedPill() : ""}</span>`}</div></div>${P.tip(P.hc({ h: x.name, hr: needBadge(x), t: `${inr(L.savedOf(x))} of ${inr(L.targetOf(x))}`, d: `due ${P.dueTxt(x)}`, rows: [["Planned a month", inr(L.plannedOf(x)), ""], ["Needed a month", inr(L.requiredAll(x)), ""]], f: "A bigger tile is a bigger goal; the lighter band is what's set aside" }), { w: 230 })}</div>`;
}
function carTile() {
  const x = L.goal("car"), ps = piecesOf(x), pc = L.pctOfGoal(x), c = L.gColor(x);
  const mini = (p, area) => { const q = pct(p); return `<div class="tm mini rt" style="grid-area:${area}">${fillBand(q)}<div class="tm-in"><b class="tm-n" style="font-size:12px">${p.label === "The rest" ? "The rest" : p.label}</b><div class="tm-foot"><b style="font-size:15px">${inrS(p.amount)}</b><small>${Math.round(q * 100)}%${p.necessity === "Need" ? " · Need" : ""}</small></div></div></div>`; };
  return `<div class="tm rt" style="background:${gr(c, 155)};display:flex;flex-direction:column">${fillBand(0)}<div class="tm-in" style="flex:1;gap:10px"><div class="between" style="align-items:flex-start"><div><b class="tm-n" style="font-size:19px">${x.name}</b><small>${inrL(L.targetOf(x))} · ${inrS(L.savedOf(x))} set aside · due ${fmt(L.dueOf(x))}</small></div><span class="tm-p">${Math.round(pc * 100)}%</span></div><div class="tm-grid">${mini(ps[0], "r")}${mini(ps[1], "s")}${mini(ps[2], "t")}${mini(ps[3], "a")}${mini(ps[4], "m")}</div></div></div>`;
}
function queueList() {
  const pl = L.fundingPlan(L.PLAN_TOTAL, 80);
  const rows = pl.order.map((u, i) => { const d = pl.done[u.id], date = L.addMonthsUTC(L.TODAY, d); const top = u.parentId ? L.goal(u.parentId) : null; return `<div class="q-mini"><span class="q-n">${i + 1}</span><span class="gtile" style="width:12px;height:12px;border-radius:4px;background:${gr(L.gColor(u))}"></span><div style="min-width:0"><b>${u.name.replace(/ \((the rest|the iPad itself)\)/, "")}</b><small>${top ? top.name + " · " : ""}${u.necessity}${u.dateType === "Fixed" ? " · Fixed" : ""}</small></div><div class="num" style="text-align:right">${inrS(u.left)}<span class="sub2" style="text-align:right">${L.monName(date.slice(0, 7))} ${date.slice(2, 4)}</span></div></div>`; }).join("");
  return card(`${cardHead("Funding order", `at ${inr(L.PLAN_TOTAL)} a month`, link("Funding plan"))}<div>${rows}</div>`, { gap: 8 });
}
export function g10() {
  const small = [L.goal("goa"), L.goal("ipad"), L.goal("fridge")];
  const map = `<div class="tmap2"><div style="grid-area:m">${tmTile(L.goal("masters"), "height:100%")}</div><div style="grid-area:c">${carTile()}</div><div style="grid-area:s;display:grid;grid-template-columns:85fr 80.8fr 62fr;gap:10px">${small.map((x) => tmTile(x, "", true)).join("")}</div></div>`;
  const hero = card(`${cardHead("What each goal asks for", "sized by amount · the lighter band is what's set aside · the car's tiles are its sub-goals", `<span class="row" style="gap:8px">${L.seg([{ label: "Each", on: true }, { label: "Need or Want" }, { label: "Minor or Major" }])}</span>`)}${map}<div class="row" style="gap:14px;flex-wrap:wrap;font-size:12px;font-weight:700">${L.TOPS.map((x) => `<span><i class="dot" style="background:var(--card-${L.gColor(x)})"></i> ${x.category} ${inrL(L.targetOf(x))}</span>`).join("")}<span style="color:var(--muted)">Not in the map: <b>Mirrorless camera</b> paused · <b>Headphones</b> done</span></div>`, { gap: 14 });
  return page(grid([[8, hero], [4, queueList()]]), `${grid([[12, P.goalsTable()]])}${grid([[12, monthCard()]])}${grid([[12, stairCard({ Hh: 240 })]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}`);
}

// ---------- G11 Board ----------
function boardCard(p) {
  const pc = pct(p), e = exp(p), np = needPer(p), plan = p.plannedMonthly ?? 0;
  return `<div class="cc rt hov" tabindex="0" style="background:${gr(p.color, 155)}"><div class="row" style="gap:10px;align-items:center">${tile({ ...p, status: "Active" }, 34)}<div style="min-width:0;flex:1"><b style="font-size:14px;font-weight:800;display:block">${p.label}</b><small style="font-size:11px;opacity:.8;font-weight:600">${p.top.id !== p.piece.id ? p.top.name + " · " : ""}${p.category}</small></div>${p.dateType === "Fixed" ? `<span class="h9-chip" style="background:oklch(0.55 0.2 25);padding:3px 9px">${I.pin(10)} Fixed</span>` : ""}</div>
  <div><div class="cc-big">${inr(p.left)}<small>to go</small></div><div style="font-size:12px;font-weight:600;opacity:.85">${p.due ? `by ${fmt(p.due)} · ${dayWord(L.daysBetween(L.TODAY, p.due))}` : "someday"}</div></div>
  <div>${ccBar(pc, e)}<div class="between" style="font-size:11px;font-weight:700;margin-top:5px;opacity:.9"><span>${inrS(p.saved)} of ${inrS(p.amount)}</span><span>${plan ? `${inr(plan)} planned` : "no plan"}${np ? ` · needs ${inr(np)}` : ""}</span></div></div>
  <div class="row" style="gap:6px">${needBadge(p)}${scaleBadge(p)}</div>${P.tip(P.hc({ h: p.label, hr: needBadge(p), t: `${inr(p.saved)} of ${inr(p.amount)}`, d: p.due ? `due ${L.fmtY(p.due)}` : "no date", rows: [["Planned a month", plan ? inr(plan) : "none", ""], ["Needed a month", np ? inr(np) : "–", ""]], f: "The white tick is where saving should be by now" }), { w: 230 })}</div>`;
}
export function g11() {
  const lanes = [{ n: "By Feb 2027", s: "the next four months", f: (p) => p.due <= "2027-02-28" }, { n: "The rest of 2027", s: "March to December", f: (p) => p.due > "2027-02-28" && p.due <= "2027-12-31" }, { n: "2028 and beyond", s: "the long ones", f: (p) => p.due > "2027-12-31" }];
  const cols = lanes.map((ln) => {
    const ps = PIECES.filter((p) => p.due && ln.f(p)).sort((a, b) => (a.due < b.due ? -1 : 1));
    const togo = sum(ps.map((p) => p.left)), mo = sum(ps.map(needPer));
    return `<div class="lane"><div class="lane-h"><div><b>${ln.n}</b><small>${ln.s}</small></div><div style="text-align:right"><b>${inr(togo)}</b><small>to go · ${inr(mo)} a month</small></div></div><div class="lane-b">${ps.map(boardCard).join("")}</div></div>`;
  }).join("");
  const hero = card(`${cardHead("The board", "every piece by when it's due · the colour is the goal's", `<span class="row" style="gap:8px">${L.derivedTag("Lanes by due date")}${L.seg([{ label: "By date", on: true }, { label: "Need or Want" }, { label: "Goal" }])}</span>`)}<div class="lanes">${cols}</div>`, { gap: 16 });
  return page(hero, `${grid([[12, P.goalsTable()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[12, stairCard({ Hh: 240 })]])}${grid([[6, P.needsWants()], [6, P.setAsides({ n: 7 })]])}${grid([[12, P.finishedCard()]])}`);
}

// ---------- G12 Tickets ----------
export function g12() {
  const nx = L.goal("fridge"), c = L.gColor(nx), left = L.leftOf(nx), pl = L.fundingPlan(L.PLAN_TOTAL, 80);
  const focus = `<div class="q-focus rt" style="background:${gr(c, 155)};height:100%"><div class="between"><span class="hk" style="color:inherit;opacity:.8">Next up</span>${fixedPill()}</div><div class="row" style="gap:12px">${tile(nx, 44)}<div><b style="font-size:22px;font-weight:800;display:block">${nx.name}</b><span style="font-size:12px;opacity:.85;font-weight:600">${nx.category} · ${nx.necessity}</span></div></div>
  <div><div class="fp-big" style="color:inherit">${inr(left)}<small style="color:inherit;opacity:.8">to set aside</small></div><div style="font-size:13px;font-weight:600;opacity:.9;margin-top:6px">by Dec 20 · 52 days · 1 month left</div></div>
  ${ccBar(L.pctOfGoal(nx), L.expectedPct(nx), 12)}<div class="between" style="font-size:12px;font-weight:700"><span>${inr(L.savedOf(nx))} of ${inr(L.targetOf(nx))}</span><span>73%</span></div>
  <div class="q-kv"><span>You plan a month</span><b>${inr(nx.plannedMonthly)}</b></div><div class="q-kv"><span>It needs a month</span><b>${inr(L.requiredAll(nx))}</b></div><div class="q-kv"><span>Short of what it needs</span><b>${inr(L.requiredAll(nx) - nx.plannedMonthly)} a month</b></div>
  <div class="row" style="gap:8px;margin-top:auto;padding-top:8px"><span class="btn" style="background:oklch(1 0 0/.92);color:var(--ink)">${I.goals(14)} Set aside ${inr(left)}</span><span class="btn" style="background:oklch(1 0 0/.16);color:inherit">Raise the plan</span></div></div>`;
  const tickets = pl.order.map((u, i) => {
    const d = pl.done[u.id], due = u.due ? Math.max(1, L.monthsTo(u.due)) : null, date = L.addMonthsUTC(L.TODAY, d), diff = due ? due - d : 0, top = u.parentId ? L.goal(u.parentId) : null;
    const amount = u.amount || 1, saved = amount - u.left, pc = Math.min(1, saved / amount), color = L.gColor(u);
    return `<div class="tk2 rt" style="background:${gr(color, 100)}"><span class="tk2-n">${i + 1}</span>${tile({ ...u, status: "Active" }, 32)}<div style="min-width:0"><b style="font-size:13.5px;font-weight:800;display:block">${top ? `<span style="opacity:.75;font-weight:600">${top.name} · </span>` : ""}${u.name.replace(/ \((the rest|the iPad itself)\)/, " · $1")}</b><span class="row" style="gap:5px;margin-top:4px">${needBadge(u)}${scaleBadge(u)}${u.dateType === "Fixed" ? `<span class="h9-chip" style="background:oklch(0.55 0.2 25);padding:2px 8px;font-size:10px">${I.pin(9)} Fixed</span>` : ""}</span></div><div>${ccBar(pc, null, 7)}<span style="font-size:11px;font-weight:700;opacity:.85;display:block;margin-top:5px">${inrS(saved)} of ${inrS(amount)}</span></div><div style="text-align:right"><b style="font-size:15px;font-weight:800">${inr(u.left)}</b><span style="display:block;font-size:11px;opacity:.8;font-weight:600">to go</span></div><div class="tk2-end"><b>${L.monName(date.slice(0, 7))} ${date.slice(0, 4)}</b><span>${diff < 0 ? `${plural(-diff, "month")} late` : diff > 0 ? `${plural(diff, "month")} early` : "on its date"}</span></div></div>`;
  }).join("");
  const queue = `<div style="display:flex;flex-direction:column;gap:8px"><div class="between" style="margin-bottom:2px"><div><b style="font-size:15px;font-weight:800">In funding order</b><span class="card-note" style="margin-left:8px">Fixed dates, then Needs, then the soonest</span></div>${L.seg([{ label: "₹27,000" }, { label: `${inr(L.PLAN_TOTAL)} · your plan`, on: true }])}</div>${tickets}</div>`;
  const hero = card(`<div style="display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:24px;align-items:stretch">${focus}${queue}</div>`, { gap: 0 });
  return page(hero, `${grid([[12, P.goalsTable()]])}${grid([[12, monthCard()]])}${grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]])}${grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]])}${grid([[12, P.finishedCard()]])}`);
}
