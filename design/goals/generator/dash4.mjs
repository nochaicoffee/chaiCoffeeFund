// Round 4 (Prathik, 2026-10-31: "explore a few more variations"): four ideas the first three rounds hadn't tried. All keep the coloured cards he
// liked and the full widget set underneath.
//   G13 Flow      a Sankey: income, less obligations, into what you plan for goals, fanning out to every piece (the money's journey)
//   G14 Orbit     a night sky: the further a piece's date, the wider its orbit; the bigger the amount, the bigger the planet; an arc fills as it's saved
//   G15 Receipt   the whole list as a till receipt (line items, sub-goals indented, totals), beside the checkout cards (this month, Needs, Wants)
//   G16 Calendar  the next four months as real calendars: set-aside day, due dates, and what lands when
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { piecesOf } from "./dash.mjs";
import { monthCard, stairCard } from "./dash2.mjs";
const { I, inr, inrL, inrS, fmt, plural, sum } = L;
const { card, cardHead, link, grid, tile, needBadge, scaleBadge, fixedPill } = P;
export const page = (hero, rest) => P.page(`${P.greeting()}${P.attention()}${hero}${rest}`);
export const gr = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const PIECES = L.TOPS.flatMap((x) => piecesOf(x).map((p) => ({ ...p, top: x, color: L.gColor(x) })));
export const exp = (p) => { if (!p.due) return null; const a = L.daysBetween(p.startDate, L.TODAY), b = L.daysBetween(p.startDate, p.due); return b <= 0 ? 1 : Math.max(0, Math.min(1, a / b)); };
export const pct = (p) => (p.amount ? Math.min(1, p.saved / p.amount) : 0);
export const plan = (p) => p.plannedMonthly ?? 0;
export const needPer = (p) => (p.left && p.due ? Math.ceil(p.left / Math.max(1, L.monthsLeft(p.due))) : 0);
export const byDue = (a, b) => (a.due ?? "9") .localeCompare(b.due ?? "9") || b.amount - a.amount;
export const state = (p) => { const n = needPer(p), q = plan(p); return !n ? ["Funded", "pill-on"] : !q ? ["No plan", "pill-off"] : q >= n ? ["On track", "pill-on"] : ["Behind", "pill-warn"]; };
export const pieceTile = (p, s) => tile({ ...p, status: "Active" }, s);
export const nm = (p) => p.label.replace(/^The rest$/, "The rest of the car");
export const tipOf = (p, w = 230) => P.tip(P.hc({ h: nm(p), hr: needBadge(p), t: `${inr(p.saved)} of ${inr(p.amount)}`, d: p.due ? `due ${L.fmtY(p.due)}` : "no date", rows: [["Planned a month", plan(p) ? inr(plan(p)) : "none", ""], ["Needed a month", needPer(p) ? inr(needPer(p)) : "–", ""], ["Left to set aside", inr(p.left), ""]], f: "The white tick is where saving should be by now" }), { w, y: "down" });
export const rest = (...rows) => rows.join("");

// ---------- G13 Flow ----------
export function g13() {
  const ps = [...PIECES].sort(byDue), n = ps.length, ROW = 66, PITCH = 72, H = n * PITCH - (PITCH - ROW);
  const s = 0.0042, income = L.SALARY, obl = L.OBLIGATIONS, goals = sum(ps.map(plan)), free = income - obl - goals;
  const xI = 150, xM = 400, xR = 760, W = xR, thick = (v) => v * s;
  // the middle column: obligations on top, goals, then what's not planned
  const yO = 0, yG = yO + thick(obl) + 14, yF = yG + thick(goals) + 14;
  const rib = (x0, a0, a1, x1, b0, b1, fill, op = 0.9) => { const m = (x0 + x1) / 2; return `<path d="M${x0} ${a0} C${m} ${a0} ${m} ${b0} ${x1} ${b0} L${x1} ${b1} C${m} ${b1} ${m} ${a1} ${x0} ${a1} Z" fill="${fill}" fill-opacity="${op}"></path>`; };
  let cy = yG; const out = ps.map((p, i) => {
    const t = thick(plan(p)), y0 = cy, ry = i * PITCH + ROW / 2; cy += t;
    return { p, y0, y1: y0 + t, ry, t };
  });
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
    <defs><linearGradient id="gi" x1="0" x2="1"><stop offset="0" stop-color="var(--card-emerald)"/><stop offset="1" stop-color="var(--card-emerald)" stop-opacity=".85"/></linearGradient></defs>
    ${rib(xI + 16, 0, thick(obl), xM, yO, yO + thick(obl), "var(--muted)", 0.22)}
    ${rib(xI + 16, thick(obl), thick(obl + goals), xM, yG, yG + thick(goals), "url(#gi)", 0.92)}
    ${rib(xI + 16, thick(obl + goals), thick(income), xM, yF, yF + thick(free), "var(--warning-text)", 0.5)}
    <rect x="${xI}" y="0" width="16" height="${thick(income)}" rx="5" fill="var(--ink)"></rect>
    <rect x="${xM}" y="${yO}" width="16" height="${thick(obl)}" rx="5" fill="var(--muted)"></rect>
    <rect x="${xM}" y="${yG}" width="16" height="${thick(goals)}" rx="5" fill="var(--card-emerald)"></rect>
    <rect x="${xM}" y="${yF}" width="16" height="${Math.max(4, thick(free))}" rx="3" fill="var(--warning-text)"></rect>
    ${out.map(({ p, y0, y1, ry, t }) => (t ? rib(xM + 16, y0, y1, xR, ry - t / 2, ry + t / 2, `var(--card-${p.color})`, 0.88) : `<path d="M${xM + 16} ${y0} C${(xM + xR) / 2 + 8} ${y0} ${(xM + xR) / 2} ${ry} ${xR} ${ry}" stroke="var(--muted)" stroke-dasharray="3 4" fill="none"></path>`)).join("")}
  </svg>`;
  const lab = (l, t, html, extra = "") => `<div class="fl-lab" style="left:${l}px;top:${t}px;${extra}">${html}</div>`;
  const labels = rest(
    lab(0, 6, `<span class="hk">Income · October</span><b class="fl-n">${inr(income)}</b><small>HDFC Salary, the 1st</small>`, "width:140px"),
    lab(xI + 40, 60, `<b>Obligations</b><span class="fl-big">${inr(obl)}</span><small>EMIs, subscriptions, card bills</small>`, "color:var(--ink)"),
    lab(xI + 40, yG + 30, `<b>Planned for goals</b><span class="fl-big">${inr(goals)}</span><small>${Math.round((goals / income) * 100)}% of income · ${Math.round((goals / L.LEFT) * 100)}% of what's left</small>`, "color:white"),
    lab(xI + 28, yF + 14, `<small style="color:var(--warning-text);font-weight:800">${inr(free)} left, not planned</small>`),
  );
  const cards = ps.map((p, i) => {
    const [st, cls] = state(p), e = exp(p);
    return `<div class="fl-c rt hov" tabindex="0" style="background:${gr(p.color, 100)};top:${i * PITCH}px;height:${ROW}px">${pieceTile(p, 32)}<div style="min-width:0"><b>${p.top.id !== p.piece.id || L.kids(p.top.id).length ? `<span style="opacity:.72;font-weight:600">${p.top.name} · </span>` : ""}${nm(p).replace(/^The rest of the car$/, "The rest")}</b><small>${plan(p) ? `${inr(plan(p))} a month` : "nothing planned"}${needPer(p) ? ` · needs ${inr(needPer(p))}` : ""}</small><div class="cc-gb" style="height:5px;margin-top:6px"><i style="width:${(pct(p) * 100).toFixed(1)}%"></i>${e != null ? `<b style="left:${(e * 100).toFixed(1)}%"></b>` : ""}</div></div><div class="fl-end"><b>${p.due ? fmt(p.due) : "Someday"}</b><span class="pill ${cls}" style="background:oklch(1 0 0/.18);color:inherit">${st}</span></div>${tipOf(p)}</div>`;
  }).join("");
  const body = `<div class="fl"><div class="fl-svg" style="width:${W}px;height:${H}px">${svg}${labels}</div><div class="fl-cards" style="height:${H}px">${cards}</div></div>`;
  const hero = card(`${cardHead("Where this month's money goes", "income, less obligations, into what you plan for each piece · thicker is more a month", `<span class="row" style="gap:8px">${L.derivedTag("From Overview and each goal's plan")}${L.seg([{ label: "Your plan", on: true }, { label: "What's needed" }, { label: "Funded in order" }])}</span>`)}${body}<div class="card-note">${plural(ps.filter((p) => !plan(p)).length, "piece")} has nothing planned (a dotted line). The money is only earmarked: it stays in your accounts. Income less obligations is not a true surplus, since UPI and cash spending aren't tracked.</div>`, { gap: 18 });
  return page(hero, rest(grid([[12, P.goalsTable()]]), grid([[12, monthCard()]]), grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]]), grid([[12, stairCard({ Hh: 240 })]]), grid([[6, P.needsWants()], [6, P.setAsides({ n: 7 })]]), grid([[12, P.finishedCard()]])));
}

// ---------- G14 Orbit ----------
// Hand-placed so no two planets or labels touch and the ring labels at the top stay clear (the golden-angle spread collided).
const ANG = { "New fridge": 10, "New tyres": 190, "The iPad": 235, "Apple Pencil": 70, "Suspension": 320, "Goa trip": 150, "Alloy wheels": 100, "Music system": 200, "The rest of the car": 330, "Masters course": 60 };
export function g14() {
  const S = 780, C = S / 2, rad = (m) => 104 + 38 * Math.sqrt(m), pr = (a) => 7 + Math.sqrt(a) / 22;
  const ps = [...PIECES].filter((p) => p.due).sort(byDue);
  const ms = (p) => Math.max(1, L.monthsLeft(p.due));
  const marks = [1, 3, 6, 12, 24, 36];
  const rings = marks.map((m) => `<circle cx="${C}" cy="${C}" r="${rad(m)}" fill="none" stroke="oklch(1 0 0/.16)" stroke-dasharray="2 6"></circle>`).join("");
  const rl = marks.map((m) => `<span class="or-ring" style="left:${C}px;top:${C - rad(m)}px">${m < 12 ? `${m} mo` : `${m / 12} yr`}</span>`).join("");
  const seen = {};
  const stars = Array.from({ length: 70 }, (_, i) => { const a = (i * 2654435761) % 1000, b = (i * 40503 + 977) % 1000; return `<i style="left:${a / 10}%;top:${b / 10}%;width:${1 + (i % 3 === 0 ? 1 : 0)}px;height:${1 + (i % 3 === 0 ? 1 : 0)}px;opacity:${0.25 + (i % 5) * 0.12}"></i>`; }).join("");
  const planets = ps.map((p, i) => {
    const m = ms(p), r = rad(m), k = (seen[m] = (seen[m] ?? 0) + 1) - 1;
    let deg = ANG[nm(p)] ?? ANG[p.label] ?? (i * 137.5) % 360; const ang = (deg * Math.PI) / 180, x = C + r * Math.cos(ang), y = C + r * Math.sin(ang), d = pr(p.amount) * 2, ring = d + 12, pc = pct(p);
    const below = Math.sin(ang) < 0.7;
    return `<div class="or-p hov" tabindex="0" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${ring}px;height:${ring}px;margin:${-ring / 2}px 0 0 ${-ring / 2}px;background:conic-gradient(white ${(pc * 360).toFixed(1)}deg,oklch(1 0 0/.2) 0)"><span class="or-core rt" style="background:${gr(p.color, 150)}">${pieceTile(p, Math.max(14, Math.round(d * 0.55)))}</span>${p.dateType === "Fixed" ? `<span class="or-flag">${I.pin(10)}</span>` : ""}<span class="or-n" style="${below ? "top:calc(100% + 4px)" : "bottom:calc(100% + 4px)"}"><b>${nm(p).replace(/^The rest of the car$/, "Car: the rest")}</b><small>${inrS(p.left)} to go · ${fmt(p.due)}</small></span>${tipOf(p, 230)}</div>`;
  }).join("");
  const sky = `<div class="or-sky"><div class="or-stars">${stars}</div><svg width="${S}" height="${S}" style="position:absolute;inset:0">${rings}</svg>${rl}
    <div class="or-sun" style="left:${C}px;top:${C}px"><span class="hk" style="color:inherit;opacity:.75">Set aside</span><b>${inrL(L.SAVED)}</b><small>of ${inrL(L.TARGET)} · ${Math.round((L.SAVED / L.TARGET) * 100)}%</small></div>${planets}
    <div class="or-key"><span><i class="dot" style="background:white;border-radius:50%"></i> the arc is what's set aside</span><span>${I.pin(10)} Fixed date</span><span>bigger planet, bigger amount</span></div></div>`;
  const bands = [["Within 3 months", (m) => m <= 3], ["3 to 12 months", (m) => m > 3 && m <= 12], ["1 to 2 years", (m) => m > 12 && m <= 24], ["Further out", (m) => m > 24]];
  const rows = bands.map(([t, f]) => {
    const inB = ps.filter((p) => f(ms(p))), togo = sum(inB.map((p) => p.left)), mo = sum(inB.map(needPer));
    return `<div class="or-row"><div><b>${t}</b><small>${inB.length ? plural(inB.length, "piece") : "nothing yet"}</small></div><div class="or-dots">${inB.map((p) => `<i class="dot" style="background:var(--card-${p.color});width:12px;height:12px;border-radius:50%"></i>`).join("")}</div><div style="text-align:right"><b>${inr(togo)}</b><small>${mo ? `${inr(mo)} a month` : "–"}</small></div></div>`;
  }).join("");
  const nx = ps[0], big = [...ps].sort((a, b) => b.left - a.left)[0];
  const stat = (k, p, line) => `<div class="cc rt hov" tabindex="0" style="background:${gr(p.color, 150)};flex:1;justify-content:space-between"><div class="between"><span class="hk" style="color:inherit;opacity:.8">${k}</span>${pieceTile(p, 30)}</div><div><b style="font-size:18px;font-weight:800;display:block">${nm(p)}</b><div class="cc-big" style="margin-top:4px">${inr(p.left)}<small>to go</small></div><div style="font-size:12px;font-weight:600;opacity:.85;margin-top:4px">${line}</div></div><div><div class="cc-gb" style="height:8px"><i style="width:${(pct(p) * 100).toFixed(1)}%"></i>${exp(p) != null ? `<b style="left:${(exp(p) * 100).toFixed(1)}%"></b>` : ""}</div><div class="between" style="font-size:11.5px;font-weight:700;margin-top:6px;opacity:.9"><span>${inrS(p.saved)} of ${inrS(p.amount)}</span><span>${plan(p) ? `${inr(plan(p))} planned · ` : "no plan · "}needs ${inr(needPer(p))}</span></div></div>${tipOf(p, 230)}</div>`;
  const side = `<div style="display:flex;flex-direction:column;gap:14px;min-width:0"><div class="stack3"><b style="font-size:15px;font-weight:800">How far out</b><span class="card-note">Each ring is a distance in months from today. The date picks the ring, so a goal moves inward as it nears.</span></div><div>${rows}</div>${stat("Closest", nx, `${fmt(nx.due)} · ${nx.dateType === "Fixed" ? "Fixed, " : ""}${L.monthsLeft(nx.due)} month left`)}${stat("Furthest to go", big, `${inr(big.amount)} in all · ${Math.round(pct(big) * 100)}% saved · due ${fmt(big.due)}`)}</div>`;
  const hero = card(`${cardHead("Your goals in orbit", "the nearer its date, the closer to the middle · hover a planet", `<span class="row" style="gap:8px">${L.derivedTag("Ring = months left")}${L.seg([{ label: "By date", on: true }, { label: "By amount left" }])}</span>`)}<div class="or-grid">${sky}${side}</div>`, { gap: 18 });
  return page(hero, rest(grid([[12, P.goalsTable()]]), grid([[12, monthCard()]]), grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]]), grid([[12, stairCard({ Hh: 240 })]]), grid([[6, P.needsWants()], [6, P.setAsides({ n: 7 })]]), grid([[12, P.finishedCard()]])));
}

// ---------- G15 Receipt ----------
export function g15() {
  const line = (x, sub = false) => {
    const p = x, saved = sub ? L.savedOwn(x.id) : L.savedOf(x), tgt = sub ? x.amount : L.targetOf(x), off = x.status === "Dropped" || x.status === "Paused";
    return `<div class="rc-l${sub ? " sub" : ""}${off ? " off" : ""}"><i class="rc-sw" style="background:var(--card-${L.gColor(x)})"></i><span class="rc-nm">${x.name}${x.status === "Dropped" ? " (dropped)" : x.status === "Paused" ? " (paused)" : ""}${x.necessity === "Need" ? ` <em class="rc-need">NEED</em>` : ""}${x.dateType === "Fixed" ? ` <em class="rc-need" style="background:var(--negative)">FIXED</em>` : ""}</span><span class="rc-dots"></span><span class="rc-sv">${saved ? inr(saved) : "–"}</span><span class="rc-tg">${inr(tgt)}</span></div>`;
  };
  const items = L.TOPS.map((x) => `${line(x)}${L.kids(x.id).filter((k) => k.status === "Active" || k.status === "Dropped").map((k) => line(k, true)).join("")}${L.kids(x.id).length && x.amount > 0 ? `<div class="rc-l sub"><i class="rc-sw" style="background:transparent"></i><span class="rc-nm" style="opacity:.7">${x.id === "ipad" ? "the iPad itself" : "the rest"}</span><span class="rc-dots"></span><span class="rc-sv">${L.savedOwn(x.id) ? inr(L.savedOwn(x.id)) : "–"}</span><span class="rc-tg">${inr(x.amount)}</span></div>` : ""}`).join("");
  const need = sum(L.TOPS.map((x) => L.necessitySplit(x).need)), want = L.TARGET - need;
  const bars = Array.from({ length: 46 }, (_, i) => `<i style="width:${1 + ((i * 7 + 3) % 4)}px;margin-right:${1 + ((i * 5) % 3)}px"></i>`).join("");
  const receipt = `<div class="rcpt"><div class="rc-h"><b>CHAI COFFEE FUND</b><span>THE LIST · GOALS</span><span>${L.fmtDow(L.TODAY)}, 2026</span></div><div class="rc-cols"><span>ITEM</span><span>SET ASIDE</span><span>COST</span></div><div class="rc-b">${items}</div>
    <div class="rc-rule"></div><div class="rc-t"><span>NEEDS</span><b>${inr(need)}</b></div><div class="rc-t"><span>WANTS</span><b>${inr(want)}</b></div><div class="rc-rule dbl"></div>
    <div class="rc-t big"><span>TOTAL OF THE LIST</span><b>${inr(L.TARGET)}</b></div><div class="rc-t"><span>SET ASIDE</span><b>${inr(L.SAVED)}</b></div><div class="rc-t big"><span>STILL TO GO</span><b>${inr(L.TARGET - L.SAVED)}</b></div>
    <div class="rc-rule"></div><div class="rc-f">NOTHING HERE IS SPENT.<br>IT IS ALL EARMARKED IN YOUR ACCOUNTS.</div><div class="rc-bar">${bars}</div></div>`;
  const nextMonth = sum(L.UNITS.map((u) => (u.left && u.due ? Math.ceil(u.left / Math.max(1, L.monthsLeft(u.due))) : 0)));
  const checkout = `<div class="cc rt" style="background:${gr("emerald", 155)};flex:1.25;justify-content:space-between"><div class="between"><span class="hk" style="color:inherit;opacity:.8">At the till · October</span><span class="h9-chip">${I.cal(12)} ${L.inDays("2026-11-05")}</span></div><div><div class="cc-big" style="font-size:40px">${inr(20500)}<small>left to set aside this month</small></div><div style="font-size:13px;font-weight:600;opacity:.85;margin-top:6px">${inr(44500)} of the ${inr(L.PLAN_TOTAL)} plan is done · ${plural(6, "goal")} still to do</div></div><div class="cc-gb" style="height:10px"><i style="width:68%"></i></div><div class="row" style="gap:8px"><span class="btn" style="background:oklch(1 0 0/.92);color:var(--ink)">${I.goals(14)} Set aside what's left</span><span class="btn" style="background:oklch(1 0 0/.16);color:inherit">${I.plus(13)} Add goal</span></div></div>`;
  const sect = (title, c, items2, k) => `<div class="cc rt" style="background:${gr(c, 150)};flex:1;justify-content:space-between"><div class="between"><span class="hk" style="color:inherit;opacity:.8">${title}</span><b style="font-size:20px;font-weight:800">${inrL(k)}</b></div><div class="rc-mini">${items2.map((p) => `<div><i class="rc-sw" style="background:white;opacity:.9"></i><span>${nm(p)}</span><b>${inrS(p.left)}</b><em>${p.due ? fmt(p.due) : ""}</em><div class="cc-gb" style="height:5px;grid-column:2 / 5"><i style="width:${(pct(p) * 100).toFixed(1)}%"></i>${exp(p) != null ? `<b style="left:${(exp(p) * 100).toFixed(1)}%"></b>` : ""}</div></div>`).join("")}</div></div>`;
  const nds = PIECES.filter((p) => p.necessity === "Need").sort(byDue), wnt = PIECES.filter((p) => p.necessity === "Want" && p.left).sort(byDue).slice(0, 4);
  const right = `<div class="rc-right">${checkout}${sect("Needs first", "ruby", nds, sum(nds.map((p) => p.left)))}${sect("The next wants", "sapphire", wnt, sum(PIECES.filter((p) => p.necessity === "Want").map((p) => p.left)))}</div>`;
  const hero = card(`${cardHead("The list, as a receipt", "every goal and sub-goal as a line · set aside against what it costs", `<span class="row" style="gap:8px">${L.seg([{ label: "Everything", on: true }, { label: "Needs" }, { label: "Wants" }])}</span>`)}<div class="rc-grid">${receipt}${right}</div>`, { gap: 18 });
  return page(hero, rest(grid([[12, P.goalsTable()]]), grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]]), grid([[12, stairCard({ Hh: 240 })]]), grid([[6, P.setAsides({ n: 7 })], [6, P.needsWants()]]), grid([[12, P.finishedCard()]])));
}

// ---------- G16 Calendar ----------
export function g16() {
  const months = ["2026-10", "2026-11", "2026-12", "2027-01"];
  const dim = (k) => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
  const due = (iso) => PIECES.filter((p) => p.due === iso && p.left);
  const SETDAY = 5, planned = PIECES.filter((p) => plan(p));
  const month = (k) => {
    const first = new Date(`${k}-01T00:00:00Z`).getUTCDay(), lead = (first + 6) % 7, n = dim(k), cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<span class="ca-d off"></span>`);
    for (let d = 1; d <= n; d++) {
      const iso = `${k}-${String(d).padStart(2, "0")}`, dueHere = due(iso), isSet = d === SETDAY, past = iso < L.TODAY, today = iso === L.TODAY;
      const inner = dueHere.length ? `<span class="ca-due" style="background:${gr(dueHere[0].color)}">${dueHere.length > 1 ? `<b>${dueHere.length}</b>` : L.gIcon(dueHere[0])(12)}</span>` : isSet ? `<span class="ca-set${past ? " past" : ""}">${planned.slice(0, 9).map((p) => `<i style="background:var(--card-${p.color})"></i>`).join("")}</span>` : "";
      const tip = dueHere.length ? P.tip(P.hc({ h: `Due ${fmt(iso)}`, t: dueHere.map(nm).join(" and "), rows: dueHere.map((p) => [nm(p), inr(p.left), `var(--card-${p.color})`]), f: dueHere.some((p) => p.dateType === "Fixed") ? "A Fixed date: it can't slip" : "A Flexible date" }), { w: 230, y: "down" }) : isSet ? P.tip(P.hc({ h: `Set-aside day · ${fmt(iso)}`, t: `${inr(L.PLAN_TOTAL)} planned`, rows: planned.map((p) => [nm(p), inr(plan(p)), `var(--card-${p.color})`]), f: "Pay yourself first: each goal's planned amount on the 5th" }), { w: 250, y: "down" }) : "";
      cells.push(`<span class="ca-d hov${today ? " today" : ""}${dueHere.length ? " has-due" : ""}" tabindex="0"><em>${d}</em>${inner}${tip}</span>`);
    }
    const dues = [...Array(n)].map((_, i) => `${k}-${String(i + 1).padStart(2, "0")}`).flatMap((iso) => due(iso));
    const need = sum(dues.map((p) => p.left)), setMo = k === "2026-11" ? 0 : 0;
    const foot = `<div class="ca-f"><div class="between"><span class="hk">Set aside on the ${SETDAY}th</span><b>${k === L.TODAY.slice(0, 7) ? `${inr(44500)} of ${inr(L.PLAN_TOTAL)}` : inr(L.PLAN_TOTAL)}</b></div>${dues.length ? dues.map((p) => `<div class="ca-due-l" style="background:${gr(p.color, 100)}">${pieceTile(p, 24)}<div><b>${nm(p)}</b><small>${fmt(p.due)} · ${inr(p.left)} still to go</small></div>${p.dateType === "Fixed" ? fixedPill() : ""}</div>`).join("") : `<div class="ca-none">Nothing falls due</div>`}</div>`;
    return `<div class="ca-m"><div class="ca-mh"><b>${L.monFull(k)} ${k.slice(0, 4)}</b><span>${dues.length ? `${plural(dues.length, "date")} · ${inrL(need)} due` : "quiet month"}</span></div><div class="ca-w">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}</div><div class="ca-g">${cells.join("")}</div>${foot}</div>`;
  };
  const later = PIECES.filter((p) => p.due && p.due > "2027-01-31" && p.left).sort(byDue);
  const strip = `<div class="ca-later"><div class="hk">Later, after January</div><div class="ca-lr">${later.map((p) => `<div class="cc rt" style="background:${gr(p.color, 100)};flex:1 1 0;flex-direction:row;align-items:center;gap:10px;padding:10px 14px;border-radius:16px">${pieceTile(p, 28)}<div style="min-width:0"><b style="font-size:12.5px;font-weight:800;display:block;white-space:nowrap">${nm(p).replace(/^The rest of the car$/, "Car: the rest")}</b><small style="font-size:11px;opacity:.85;font-weight:600">${fmt(p.due)}, ${p.due.slice(0, 4)} · ${inrS(p.left)}</small></div></div>`).join("")}</div></div>`;
  const hero = card(`${cardHead("This month and the next three", "the day you set money aside, and the dates that fall due · hover a day", `<span class="row" style="gap:8px">${L.derivedTag("The set-aside day is the 5th")}${L.seg([{ label: "Months", on: true }, { label: "Agenda" }])}</span>`)}<div class="ca-grid">${months.map(month).join("")}</div>${strip}`, { gap: 18 });
  return page(hero, rest(grid([[12, P.goalsTable()]]), grid([[12, monthCard()]]), grid([[6, P.comingUp({ n: 5 })], [6, P.affordCard()]]), grid([[12, stairCard({ Hh: 240 })]]), grid([[6, P.needsWants()], [6, P.setAsides({ n: 7 })]]), grid([[12, P.finishedCard()]])));
}
