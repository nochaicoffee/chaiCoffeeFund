// Round 5 (Prathik, 2026-11-03, after using the built page): a sub-goal is part of its main goal, so
//  1. money set aside on the main goal covers its parts (he set aside ₹2,00,000 and the ₹45,000 suspension should be under it),
//  2. the list shows main goals only, with a count of parts that opens their details,
//  3. in the orbit the parts go round their goal like moons,
//  4. parts are added and edited inside the main goal's own form.
// Every figure is made up; "today" is Oct 29, 2026. The car has ₹2,00,000 set aside on it, his own example.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { gr } from "./shared4.mjs";
import { fld, inp, sel, dlg, pvk, box } from "./forms.mjs";
const { I, inr, inrL, inrS, fmt, plural, sum } = L;
const { card, cardHead, link } = P;

// ---------- The car, with ₹2,00,000 on the main goal ----------
export const CAR_POT = 200000;
/** The parts, in the order the pot fills them: Needs first, then the soonest date, then the smaller. The last is the part of the car that isn't itemised. */
export const CAR_PARTS = [
  { id: "tyres", name: "New tyres", amount: 38000, need: true, due: "2027-01-10" },
  { id: "susp", name: "Suspension", amount: 45000, need: true, due: "2027-04-15" },
  { id: "alloy", name: "Alloy wheels", amount: 52000, need: false, due: "2027-12-31" },
  { id: "music", name: "Music system", amount: 60000, need: false, due: "2028-03-31" },
  { id: "rest", name: "The rest of the car", amount: 150000, need: false, due: "2028-06-30" },
];
export const CAR_TOTAL = sum(CAR_PARTS.map((p) => p.amount));
/** What the pot covers of each part, filled in the order given. */
export const cover = (parts, pot) => { let left = pot; return parts.map((p) => { const c = Math.min(left, p.amount); left -= c; return { ...p, covered: c, share: p.amount ? c / p.amount : 0 }; }); };
const COVERED = cover(CAR_PARTS, CAR_POT);
const SHADES = ["oklch(0.82 0.1 55)", "oklch(0.74 0.12 52)", "oklch(0.66 0.13 50)", "oklch(0.58 0.12 48)", "oklch(0.5 0.1 46)"];
const ck = (n = 12) => `<span class="r5-ck">${I.check(n)}</span>`;
const dateOf = (iso) => L.fmtY(iso);

/** A main goal's pot as one bar split by its parts, filled by what's covered. */
function potBar(parts = COVERED, h = 18) {
  return `<div class="r5-bar" style="height:${h}px">${parts.map((p, i) => `<span style="width:${(p.amount / CAR_TOTAL) * 100}%;background:${SHADES[i]}22;box-shadow:inset 0 0 0 1px ${SHADES[i]}55"><i style="width:${(p.share * 100).toFixed(1)}%;background:${SHADES[i]}"></i></span>`).join("")}</div>`;
}
const needTag = (p) => `<span class="nb nb-${p.need ? "need" : "want"}">${p.need ? "Need" : "Want"}</span>`;

// ---------- The three ways a main goal's money can cover its parts ----------
function partRowA(p, i) {
  const full = p.share >= 1, none = p.covered === 0;
  return `<div class="r5-row${none ? " dim" : ""}"><i class="r5-sw" style="background:${SHADES[i]}"></i><div class="r5-nm"><b>${p.name}</b><small>${needTag(p)} · due ${fmt(p.due)}</small></div><div class="r5-pb"><div class="gbar" style="height:8px"><span class="f rt" style="width:${(p.share * 100).toFixed(1)}%;background:${SHADES[i]}"></span></div><span class="sub2">${full ? `${ck()} covered` : none ? "not reached yet" : `${inr(p.covered)} of ${inr(p.amount)}`}</span></div><b class="num">${inr(p.amount)}</b></div>`;
}
function potA() {
  return `<div class="r5-pot"><div class="between"><div><span class="hk">Set aside on Car upgrade</span><div class="fp-big" style="font-size:34px">${inr(CAR_POT)}<small>of ${inr(CAR_TOTAL)}</small></div></div><span class="pill pill-on" style="align-self:flex-start">${Math.round((CAR_POT / CAR_TOTAL) * 100)}%</span></div>${potBar()}<div class="r5-rows">${COVERED.map(partRowA).join("")}</div><div class="r5-note">${I.info(12)}<span>One set-aside goes into the car's pot. The pot fills the parts in order: <b>Needs first, then the soonest date, then the smaller</b>. Parts have no set-asides of their own, so nothing has to be split by hand.</span></div></div>`;
}
const ASSIGN = [38000, 45000, 52000, 60000, 0];
function potB() {
  const assigned = sum(ASSIGN), free = CAR_POT - assigned;
  const row = (p, i) => `<div class="r5-row"><i class="r5-sw" style="background:${SHADES[i]}"></i><div class="r5-nm"><b>${p.name}</b><small>${needTag(p)} · due ${fmt(p.due)}</small></div><div class="r5-pb"><div class="gbar" style="height:8px"><span class="f rt" style="width:${((ASSIGN[i] / p.amount) * 100).toFixed(1)}%;background:${SHADES[i]}"></span></div><span class="sub2">${ASSIGN[i] >= p.amount ? `${ck()} covered` : ASSIGN[i] ? `${inr(ASSIGN[i])} of ${inr(p.amount)}` : "nothing assigned"}</span></div><div class="inp" style="width:104px;min-height:34px;padding:0 10px;font-weight:800"><span class="pre">₹</span><span>${ASSIGN[i].toLocaleString("en-IN")}</span></div></div>`;
  return `<div class="r5-pot"><div class="between"><div><span class="hk">Set aside on Car upgrade</span><div class="fp-big" style="font-size:34px">${inr(CAR_POT)}<small>of ${inr(CAR_TOTAL)}</small></div></div><span class="mini-btn ghost">${I.refresh(11)} Fill in order</span></div>${potBar(COVERED.map((p, i) => ({ ...p, share: ASSIGN[i] / p.amount })))}<div class="r5-rows">${CAR_PARTS.map(row).join("")}</div><div class="r5-free"><span>Left in the pot, not given to a part</span><b>${inr(free)}</b></div><div class="r5-note">${I.info(12)}<span>You choose where each rupee goes. Full control, but every set-aside has to be split, and a part you forget stays at nothing.</span></div></div>`;
}
function potC() {
  const own = [21000, 20000, 28000, 7500, 0];
  const row = (p, i) => `<div class="r5-row dim"><i class="r5-sw" style="background:${SHADES[i]}"></i><div class="r5-nm"><b>${p.name}</b><small>${needTag(p)} · due ${fmt(p.due)}</small></div><div class="r5-pb"><div class="gbar" style="height:8px"><span class="f rt" style="width:${((own[i] / p.amount) * 100).toFixed(1)}%;background:${SHADES[i]}"></span></div><span class="sub2">${own[i] ? `${inr(own[i])} of ${inr(p.amount)}` : "nothing set aside"}</span></div><b class="num">${inr(p.amount)}</b></div>`;
  return `<div class="r5-pot"><div class="between"><div><span class="hk">Set aside on Car upgrade</span><div class="fp-big" style="font-size:34px">${inr(CAR_POT)}<small>of ${inr(CAR_TOTAL)}</small></div></div><span class="pill pill-warn" style="align-self:flex-start">Doesn't add up</span></div>${potBar(COVERED.map((p, i) => ({ ...p, share: own[i] / p.amount })), 18)}<div class="r5-rows">${CAR_PARTS.map(row).join("")}</div><div class="r5-note warn">${I.alert(12)}<span><b>How it works now.</b> The main goal and each part hold their own set-asides, so ₹2,00,000 on the car leaves the suspension at ₹20,000 of ₹45,000 and the bars below disagree with the one above. This is what you ran into.</span></div></div>`;
}
export function potBoard() {
  const col = (tag, title, sub, body, rec = false) => `<div class="r5-col${rec ? " rec" : ""}"><div class="r5-h"><span class="r5-tag">${tag}</span><div><b>${title}</b><small>${sub}</small></div>${rec ? `<span class="pill pill-on">Recommended</span>` : ""}</div>${body}</div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Round 5 · A main goal's money covers its parts</h2>${L.sampleTag()}</div><p>Your example: <b>₹2,00,000 set aside on Car upgrade</b>, and a ₹45,000 suspension that should come under it. A part is <b>part of</b> its main goal, so the question is what a set-aside on the main goal does. Three ways, with the same car.</p></div>
  <div class="r5-cols">${col("A", "One pot, filled in order", "Set aside on the main goal only. The pot covers Needs first, then the soonest, then the smaller.", potA(), true)}${col("B", "One pot, you assign", "Set aside on the main goal, then give each part its share by hand.", potB())}${col("C", "Each part has its own pot", "Today's page. Shown so you can see why it confuses.", potC())}</div>
  <div class="hk" style="margin-bottom:-12px">What option A (my pick) means</div>
  <div class="r5-sums"><div><b>For the parts</b><p>A part has a cost, a date and Need or Want, and <i>no set-asides of its own</i>. "Covered" is worked out from the pot, so it can never disagree with the main goal: the main goal's saved is the pot, and a part is funded when the pot has reached it. Needs first, so the pot fills what breaks first.</p></div><div><b>For the money</b><p>With ₹2,00,000 in the pot: tyres, suspension, alloy wheels and the music system are covered (₹1,95,000), and ₹5,000 is on the rest of the car. A take-back comes off the end of the pot, so the part that was last to be reached loses first.</p></div><div><b>For what it needs a month</b><p>What the car needs a month is what's <i>uncovered</i> in each part over the months to its own date: ₹1,45,000 of the rest over 20 months is ₹7,250 a month, down from ₹23,159 a month, because the pot already covers the early parts.</p></div></div>`;
  return `<div class="chai-app board" style="width:1700px;height:__H__">${body}</div>`;
}

// ---------- The orbit, with the parts as moons ----------
const S5 = 490, K = S5 / 780, C5 = S5 / 2;
const rad5 = (m) => K * (104 + 38 * Math.sqrt(m === 99 ? 40 : Math.min(m, 36)));
const TOPS5 = [
  { id: "fridge", name: "New fridge", color: "teal", cat: "Appliance", target: 62000, saved: 45000, ring: 2, ang: 62, fixed: true, parts: [] },
  { id: "car", name: "Car upgrade", color: "copper", cat: "Vehicle", target: CAR_TOTAL, saved: CAR_POT, ring: 20, ang: 222, parts: COVERED },
  { id: "ipad", name: "iPad Pro", color: "violet", cat: "Gadget", target: 80800, saved: 48000, ring: 4, ang: 332, parts: cover([{ id: "pencil", name: "Apple Pencil", amount: 11900, need: false, due: "2027-02-28" }, { id: "ipad", name: "The iPad itself", amount: 68900, need: false, due: "2027-02-28" }], 48000) },
  { id: "goa", name: "Goa trip", color: "ruby", cat: "Travel", target: 85000, saved: 21000, ring: 7, ang: 148, parts: [] },
  { id: "masters", name: "Masters course", color: "sapphire", cat: "Education", target: 600000, saved: 130000, ring: 32, ang: 40, parts: [] },
  { id: "camera", name: "Camera", color: "onyx", cat: "Gadget", target: 75000, saved: 12000, ring: 99, ang: 152, paused: true, parts: [] },
];
const pr5 = (t) => K * (7 + Math.sqrt(t) / 22) * 1.15;
const at5 = (ring, ang) => ({ x: C5 + rad5(ring) * Math.cos((ang * Math.PI) / 180), y: C5 + rad5(ring) * Math.sin((ang * Math.PI) / 180) });
const arc = (share, base = "white") => `conic-gradient(${base} ${(Math.min(1, share) * 360).toFixed(1)}deg,oklch(1 0 0/.2) 0)`;
const skyShell = (inner, label, sunNote) => `<div class="or-sky" style="width:${S5}px;height:${S5}px"><div class="or-stars">${Array.from({ length: 48 }, (_, i) => `<i style="left:${((i * 2654435761) % 1000) / 10}%;top:${((i * 40503 + 977) % 1000) / 10}%;width:1px;height:1px;opacity:${0.25 + (i % 5) * 0.12}"></i>`).join("")}</div><svg width="${S5}" height="${S5}" style="position:absolute;inset:0">${[1, 3, 6, 12, 24, 36, 99].map((m) => `<circle cx="${C5}" cy="${C5}" r="${rad5(m)}" fill="none" stroke="oklch(1 0 0/.14)" stroke-dasharray="2 6"></circle>`).join("")}</svg>${[6, 12, 24].map((m) => `<span class="or-ring" style="left:${C5}px;top:${C5 - rad5(m)}px">${m < 12 ? `${m} mo` : `${m / 12} yr`}</span>`).join("")}<div class="or-sun" style="left:${C5}px;top:${C5}px;width:${156 * K}px;height:${156 * K}px;margin:${-78 * K}px 0 0 ${-78 * K}px"><span class="hk" style="color:inherit;opacity:.75;font-size:8px">Set aside</span><b style="font-size:20px">₹4.4L</b><small style="font-size:9px">of ₹11.7L · 38%</small></div>${inner}<div class="or-key" style="font-size:10px"><span>${label}</span></div></div>`;
/** One planet: the goal as a whole, with its arc what the pot holds. */
function planet5(t, { dim = false, chip = false, glow = false, labelDrop = 0 } = {}) {
  const { x, y } = at5(t.ring, t.ang), r = pr5(t.target), d = r * 2 + 10, share = t.saved / t.target;
  return `<div class="or-p${t.paused ? " off" : ""}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;background:${arc(share)};${dim ? "opacity:.25;" : ""}${glow ? "filter:drop-shadow(0 0 14px oklch(1 0 0/.55));" : ""}"><span class="or-core rt" style="background:${gr(t.color, 150)};inset:5px"><span class="gtile" style="width:${Math.round(r)}px;height:${Math.round(r)}px;background:transparent;box-shadow:none">${L.I[{ Vehicle: "car", Gadget: "tablet", Appliance: "fridge", Travel: "plane", Education: "cap" }[t.cat] ?? "goals"](Math.round(r * 0.9))}</span></span>${t.fixed ? `<span class="or-flag">${I.pin(9)}</span>` : ""}${chip && t.parts.length ? `<span class="r5-chip">${t.parts.length}</span>` : ""}<span class="or-n" style="top:calc(100% + ${4 + labelDrop}px);${dim ? "opacity:.5" : ""}"><b>${t.name}</b><small>${inrS(t.target - t.saved)} to go</small></span></div>`;
}
const moonR = (t, ring = 1) => pr5(t.target) + 8 + ring * 18;
/** The parts as moons going round a planet: a moon per part, its arc what the pot covers of it. */
function moons5(t, { named = false, ring = 1 } = {}) {
  const { x, y } = at5(t.ring, t.ang), R = moonR(t, ring);
  const orbit = `<svg width="${S5}" height="${S5}" style="position:absolute;inset:0;pointer-events:none"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="none" stroke="oklch(1 0 0/.35)" stroke-dasharray="1 4"></circle></svg>`;
  const dots = t.parts.map((p, i) => {
    const a = ((i / t.parts.length) * 360 + 200) * (Math.PI / 180), mr = 5 + Math.sqrt(p.amount) / 42, mx = x + R * Math.cos(a), my = y + R * Math.sin(a), dd = mr * 2 + 6;
    return `<div class="or-p" style="left:${mx.toFixed(1)}px;top:${my.toFixed(1)}px;width:${dd}px;height:${dd}px;margin:${-dd / 2}px 0 0 ${-dd / 2}px;background:${arc(p.share)};z-index:3"><span class="or-core" style="inset:3px;background:${gr(t.color, 150)}">${named ? `<b class="or-num" style="font-size:9px">${i + 1}</b>` : ""}</span></div>`;
  }).join("");
  const legend = named ? `<div class="r5-legend"><b>${t.name} · parts</b>${t.parts.map((p, i) => `<div><span class="n">${i + 1}</span><span class="nm">${p.name}</span><span class="v">${p.share >= 1 ? "covered" : p.covered ? `${inrS(p.covered)} of ${inrS(p.amount)}` : "not reached"}</span></div>`).join("")}</div>` : "";
  return orbit + dots + legend;
}
/** Pips round the rim of a planet: one per part, lit when the pot has covered it. */
function pips5(t) {
  const { x, y } = at5(t.ring, t.ang), R = pr5(t.target) + 11;
  return t.parts.map((p, i) => {
    const a = ((i / t.parts.length) * 360 - 90) * (Math.PI / 180), px = x + R * Math.cos(a), py = y + R * Math.sin(a), lit = p.share >= 1, part = p.share > 0 && !lit;
    return `<i style="position:absolute;left:${px.toFixed(1)}px;top:${py.toFixed(1)}px;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;z-index:3;background:${lit ? "white" : part ? `conic-gradient(white ${(p.share * 360).toFixed(0)}deg,oklch(1 0 0/.25) 0)` : "oklch(1 0 0/.25)"};box-shadow:0 0 0 1.5px oklch(0.15 0.04 265)"></i>`;
  }).join("");
}
export function moonsBoard() {
  const v1 = skyShell(TOPS5.map((t) => planet5(t, { labelDrop: t.parts.length ? moonR(t) - pr5(t.target) + 10 : 0 })).join("") + TOPS5.filter((t) => t.parts.length).map((t) => moons5(t)).join(""), "every goal with parts shows its moons", "");
  const v2 = skyShell(TOPS5.map((t) => planet5(t, { dim: t.id !== "car", chip: true, glow: t.id === "car", labelDrop: t.id === "car" ? moonR(t, 1.6) - pr5(t.target) + 10 : 0 })).join("") + moons5(TOPS5[1], { named: true, ring: 1.6 }), "pick a planet and its parts go round it", "");
  const v3 = skyShell(TOPS5.map((t) => planet5(t, { labelDrop: t.parts.length ? 8 : 0 })).join("") + TOPS5.filter((t) => t.parts.length).map(pips5).join(""), "a pip per part, lit when covered", "");
  const frame = (tag, title, sub, sky, rec) => `<div class="r5-col${rec ? " rec" : ""}" style="gap:12px"><div class="r5-h"><span class="r5-tag">${tag}</span><div><b>${title}</b><small>${sub}</small></div>${rec ? `<span class="pill pill-on">Recommended</span>` : ""}</div>${sky}</div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Round 5 · Parts as moons</h2>${L.sampleTag()}</div><p>A planet is now a <b>main goal</b>, placed by its last date, sized by its total, its arc what the pot holds (the car's is ₹2,00,000 of ₹3,45,000). Its parts go round it. A moon's arc is how much of that part the pot covers, in the order of option A on the other board: tyres, suspension, alloy wheels and the music system are full, the rest of the car is at 3%.</p></div>
  <div class="r5-cols" style="grid-template-columns:repeat(3,${S5 + 44}px);justify-content:space-between">${frame("M1", "Moons, always", "Every goal with parts carries its moons. The sky shows the whole picture at once.", v1)}${frame("M2", "Moons on pick", "Planets stay clean with a count chip; pick one and its parts go round it, named, while the others dim.", v2, true)}${frame("M3", "Pips on the rim", "Quietest: a dot per part on the planet's rim, lit when covered. Details only in the side panel.", v3)}</div>
  <div class="r5-sums"><div><b>M1</b><p>Most to see, but the car's five moons sit close to its neighbours and the sky gets busy with every goal that has parts. Works best with few parts.</p></div><div><b>M2</b><p>Keeps the sky as calm as today's and adds the moons exactly when you ask: picking is already how the page works. A chip shows how many parts a planet has. My pick.</p></div><div><b>M3</b><p>The least change: nothing orbits, so there's nothing to collide. Tells you how many parts are covered at a glance but not which, which the side panel does.</p></div></div>`;
  return `<div class="chai-app board" style="width:1760px;height:__H__">${body}</div>`;
}

// ---------- The goals list: main goals only, with a count of parts ----------
const COLS = "2.4fr 0.7fr 0.8fr 1.9fr 1fr 1.1fr 1.2fr 1fr";
const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
const HEAD = `<div class="srow" style="grid-template-columns:${COLS};padding:0 0 8px">${th("Goal")}${th("Why")}${th("Horizon")}${th("Set aside")}${th("Target", true)}${th("Due")}${th("Per month")}${th("Standing")}</div>`;
const bar = (share, color, e = null, h = 10) => `<div class="gbar" style="height:${h}px"><span class="f rt" style="width:${Math.max(share ? 2 : 0, share * 100)}%;background:${L.fill(color, 90)}"></span>${e != null ? `<span class="e" style="left:${(e * 100).toFixed(1)}%"></span>` : ""}</div>`;
const standP = (s) => `<span class="pill ${{ "On track": "pill-on", Behind: "pill-warn", Funded: "pill-on", Paused: "pill-off", Done: "pill-ink" }[s]}">${s}</span>`;
const partsChip = (n, open = false) => `<span class="r5-parts${open ? " open" : ""}">${plural(n, "part")} ${open ? I.chev(11) : I.chevR(11)}</span>`;
const topRow = (t, { chip = null, strip = null, perMonth, needs, due, dueNote, standing, tgt = t.target, saved = t.saved, exp = null } = {}) => {
  const g = L.TOPS.find((x) => x.id === t.id);
  return `<div class="srow" style="grid-template-columns:${COLS}"><div class="cell-name">${P.tile(g ?? { ...L.goal("car"), id: t.id }, 34)}<div><b>${t.name}</b><small>${t.cat}${chip ? ` · ${chip}` : ""}</small></div></div><div>${P.needBadge(g ?? L.goal("car"))}</div><div>${P.scaleBadge(g ?? L.goal("car"))}</div><div>${bar(saved / tgt, t.color, exp)}${strip ?? ""}<span class="sub2" style="margin-top:5px">${inrS(saved)} · ${Math.round((saved / tgt) * 100)}%</span></div><div class="num">${inr(tgt)}</div><div><b>${due}</b><span class="sub2">${dueNote}</span></div><div><b class="num">${perMonth}</b><span class="sub2">${needs}</span></div><div>${standP(standing)}</div></div>`;
};
const OTHERS = () => [
  topRow(TOPS5[2], { chip: partsChip(2), perMonth: inr(9500), needs: "needs ₹8,200", due: "Feb 28", dueNote: "4 months left", standing: "On track", exp: 0.52 }),
  topRow(TOPS5[0], { perMonth: inr(15000), needs: "needs ₹17,000", due: "Dec 20", dueNote: "1 month left", standing: "Behind", exp: 0.7, saved: 45000 }),
  topRow(TOPS5[3], { perMonth: inr(8000), needs: "needs ₹9,143", due: "Jun 10", dueNote: "7 months left", standing: "Behind", exp: 0.3 }),
  topRow(TOPS5[4], { perMonth: inr(15000), needs: "needs ₹14,688", due: "Jun 30", dueNote: "32 months left", standing: "On track", exp: 0.25 }),
].join("");
const partRow = (p, i) => `<div class="srow r5-sub" style="grid-template-columns:${COLS}"><div class="cell-name subrow"><i class="r5-sw" style="background:${SHADES[i]}"></i><div><b>${p.name}</b><small>${needTag(p)}</small></div></div><div></div><div></div><div><div class="gbar" style="height:7px"><span class="f rt" style="width:${(p.share * 100).toFixed(1)}%;background:${SHADES[i]}"></span></div><span class="sub2" style="margin-top:4px">${p.share >= 1 ? `${ck(10)} covered` : p.covered ? `${inr(p.covered)} of ${inr(p.amount)}` : "not reached yet"}</span></div><div class="num">${inr(p.amount)}</div><div><b>${fmt(p.due)}</b></div><div></div><div></div></div>`;
const carRow = (extra = {}) => topRow(TOPS5[1], { perMonth: inr(17500), needs: "needs ₹7,250", due: "Jun 30", dueNote: "20 months left", standing: "On track", exp: 0.45, ...extra });
const listCard = (title, rows, note = "main goals only · a goal's parts are inside it") => card(`${cardHead(title, note, `<span class="row" style="gap:8px">${L.seg([{ label: "Active", on: true, count: 5 }, { label: "All", count: 7 }])}</span>`)}<div>${HEAD}${rows}</div>`, { gap: 6 });
export function listBoard() {
  // L1: the count chip opens the parts inline
  const l1 = listCard("Goals", carRow({ chip: partsChip(5, true) }) + COVERED.map(partRow).join("") + OTHERS());
  // L2: the chip opens a small card of the parts under it
  const pop = `<div class="r5-pop"><div class="between"><b>Car upgrade · 5 parts</b><span class="sub2">₹2,00,000 covers ₹1,95,000 + ₹5,000</span></div>${COVERED.map((p, i) => `<div class="r5-prow"><i class="r5-sw" style="background:${SHADES[i]}"></i><span class="nm">${p.name}</span>${needTag(p)}<span class="sub2">${fmt(p.due)}</span><div class="gbar" style="height:6px;width:90px"><span class="f" style="width:${(p.share * 100).toFixed(0)}%;background:${SHADES[i]}"></span></div><b class="num">${inr(p.amount)}</b></div>`).join("")}<div class="between" style="border-top:1px solid var(--divider);padding-top:8px"><span class="link">Open the car ${I.arrowR(11)}</span><span class="mini-btn ghost">${I.pencil(11)} Edit parts</span></div></div>`;
  const l2 = listCard("Goals", `<div style="position:relative">${carRow({ chip: partsChip(5, true) })}<div style="position:absolute;left:44px;top:62px;z-index:5">${pop}</div></div><div style="height:230px"></div>` + OTHERS());
  // L3: the bar itself is split by parts, no chip to open
  const strip = `<div class="r5-strip">${COVERED.map((p, i) => `<i style="width:${(p.amount / CAR_TOTAL) * 100}%;background:${SHADES[i]}33"><b style="width:${(p.share * 100).toFixed(0)}%;background:${SHADES[i]}"></b></i>`).join("")}</div>`;
  const l3 = listCard("Goals", carRow({ chip: `<span class="r5-parts">${plural(5, "part")} · 4 covered</span>`, strip }) + OTHERS(), "the bar is split by parts, filled by what's covered");
  const col = (tag, title, sub, body, rec) => `<div class="r5-wide"><div class="r5-h"><span class="r5-tag">${tag}</span><div><b>${title}</b><small>${sub}</small></div>${rec ? `<span class="pill pill-on">Recommended</span>` : ""}</div>${body}</div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Round 5 · The list shows main goals only</h2>${L.sampleTag()}</div><p>One row per main goal, as you asked, with a count of its parts. Where the parts show is the choice.</p></div>${col("L1", "Parts open under the goal", "Tap the count and the parts unfold in the table, each with what the pot covers of it.", l1, true)}${col("L2", "Parts in a small card", "The count opens a card over the table. The list never gets longer.", l2)}${col("L3", "The bar is the parts", "No opening at all: the set-aside bar is cut into one block per part, filled by coverage. The details are in the side panel.", l3)}`;
  return `<div class="chai-app board" style="width:1560px;height:__H__">${body}</div>`;
}

// ---------- The forms: parts live inside the main goal's form ----------
const partInput = (p, i, { focus = false } = {}) => `<div class="r5-pf"><i class="r5-sw" style="background:${SHADES[i]}"></i><div class="inp${focus ? " focus" : ""}" style="min-height:36px"><span>${p.name}</span></div><div class="inp" style="min-height:36px;width:112px"><span class="pre">₹</span><span>${p.amount.toLocaleString("en-IN")}</span></div><div class="inp" style="min-height:36px;width:118px"><span>${fmt(p.due)}, ${p.due.slice(0, 4)}</span></div>${L.seg([{ label: "Need", on: p.need }, { label: "Want", on: !p.need }])}<span class="dlg-x" style="width:28px;height:28px">${I.x(11)}</span></div>`;
const partsField = (parts, extra = "") => `<div class="fld full"><span class="lbl">Parts <span class="opt-tag">OPTIONAL</span></span><div class="r5-pfs">${parts.map((p, i) => partInput(p, i)).join("")}${extra}<span class="btn btn-ghost" style="align-self:flex-start;min-height:34px">${I.plus(12)} Add a part</span></div><div class="help">${I.info(12)}<span>A part is a piece of this goal with its own cost and date, like the suspension of the car. The goal's money covers the parts in order. What isn't itemised stays as the goal's own part.</span></div></div>`;
export function forms5Board() {
  const own = fld("Its own part", inp("1,50,000", { pre: "₹" }), { help: "What isn't a part yet. It's covered last." });
  const addWith = dlg({ icon: I.goals(20), title: "Add a goal", sub: "Something you're saving a sum of money for, with the parts it's made of.",
    preview: `${pvk("What this means")}${box([["The goal", "₹3,45,000"], ["Its own part", "₹1,50,000"], ["Parts", "₹1,95,000"], ["Needed a month", "₹14,383"]])}<div class="pv-box" style="font-size:12px;line-height:1.5">Whatever you set aside goes into one pot. It covers the two Needs first (tyres, then suspension), then the other parts by date, then the rest of the car.</div>`,
    fields: [fld("Name", inp("Car upgrade", { focus: true }), { full: true, req: true }), fld("Category", sel("Vehicle"), { req: true }), fld("Why", L.seg([{ label: "Need" }, { label: "Want", on: true }]), { req: true }), fld("How long", L.seg([{ label: "Minor" }, { label: "Major", on: true }]), { req: true }), fld("Target date", inp("Jun 30, 2028"), { help: "Later than a part? The goal's date follows its last part." }), own, partsField(CAR_PARTS.slice(0, 4).map((p) => ({ ...p })))].join(""),
    note: "Parts are added and edited here, inside their goal.", cta: L.btn("Add goal", { kind: "primary", icon: I.plus() }) });
  const edit = dlg({ icon: I.pencil(20), title: "Edit goal", sub: "Car upgrade. The parts are here too.",
    preview: `${pvk("The pot covers")}${box(COVERED.map((p) => [p.id === "rest" ? "Its own part" : p.name, p.share >= 1 ? "covered" : p.covered ? `${inr(p.covered)} of ${inr(p.amount)}` : "not yet"]))}<div class="pv-box" style="font-size:12px;line-height:1.5">₹2,00,000 is set aside on this goal. Change a part's cost and what it covers moves with it.</div>`,
    fields: [fld("Name", inp("Car upgrade"), { full: true, req: true }), fld("Target date", inp("Jun 30, 2028")), fld("Planned a month", inp("17,500", { pre: "₹" })), fld("Its own part", inp("1,50,000", { pre: "₹" }), { help: "What isn't a part yet. It's covered last." }), partsField(CAR_PARTS.slice(0, 4).map((p) => ({ ...p })))].join(""),
    note: "Removing a part takes its cost off the goal; the pot stays.", cta: L.btn("Save goal", { kind: "primary", icon: I.check(14) }) });
  const aside = dlg({ icon: I.goals(20), title: "Set aside", sub: "Put money towards a goal. It goes into the goal's pot.",
    preview: `${pvk("Car upgrade after this")}${box([["In the pot", `${inr(CAR_POT)} → <b>${inr(CAR_POT + 30000)}</b>`], ["Covered", "4 of 5 parts → <b>4 of 5</b>"], ["The rest of the car", "₹5,000 → <b>₹35,000</b>"]])}<div class="pv-box" style="font-size:12px;line-height:1.5">The extra ₹30,000 goes to the last part the pot is on, the rest of the car. Nothing to split.</div>`,
    fields: [fld("Goal", sel("Car upgrade · 5 parts"), { full: true, req: true }), fld("Amount", inp("30,000", { pre: "₹", focus: true }), { req: true }), fld("Date", inp("Oct 29, 2026"), { req: true }), fld("Where it sits", sel("HDFC Salary"), { full: true, opt: true })].join(""),
    note: "A take-back comes off the end of the pot.", cta: L.btn("Set aside ₹30,000", { kind: "primary", icon: I.check(14) }) });
  const menu = `<div class="gmenu">${[["Set aside", I.goals(13)], ["Take back", I.undo(13)], "-", ["Edit goal and parts", I.pencil(13)], ["Pause", I.pause(13)], ["Mark bought", I.check(13)], "-", ["Drop", I.x(13)], ["Delete", I.x(13)]].map((o) => (o === "-" ? `<div class="gm-div"></div>` : `<div class="gm-i${o[0] === "Delete" ? " bad" : ""}">${o[1]} ${o[0]}</div>`)).join("")}</div>`;
  const stt = (cap, text, inner) => `<div class="stt" style="width:1020px"><div class="cap">${cap}</div><p>${text}</p>${inner}</div>`;
  const body = `<div class="formgrid" style="padding:0;align-items:stretch"><div class="between"><div><h1 style="font-size:24px;font-weight:800">Round 5 · Forms with parts inside the goal</h1><div class="card-note">There's no "Add sub-goal" any more. Parts are made and changed in their goal's own form.</div></div>${L.sampleTag()}</div>
  ${stt("Add a goal", "A Parts section under the goal's own fields: a row per part (name, cost, date, Need or Want). The preview adds it up and says how the pot will fill.", addWith)}
  ${stt("Edit goal", "The same Parts section, filled in. The preview shows what the pot covers of each part as you change them.", edit)}
  ${stt("Set aside", "One amount into the goal's pot. The preview says what it covers.", aside)}
  ${stt("The goal's ⋯ menu", "Add sub-goal is gone; Edit goal and parts is where they live.", menu)}</div>`;
  return `<div class="chai-app board" style="width:1100px;height:__H__">${body}</div>`;
}
