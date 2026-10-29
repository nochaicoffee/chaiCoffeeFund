// The widget library for the Insurance boards: hover cards, the greeting that points, the attention strip, the policies table,
// renewals, premium payments, a policy's details, where premiums are paid from, what cover costs and the NCB ladder.
// Static HTML/SVG; picks and switches are CSS only (radios + :has()), like the other dashboards' boards.
import * as L from "./lib.mjs";
const { I, inr, inrL, inrS, fmt, fmtY, btn, mono, col, grad, plural } = L;

export const inrC = (n) => (Math.abs(n) >= 10000000 ? `₹${(n / 10000000).toFixed(2).replace(/\.?0+$/, "")}Cr` : L.inrL(n));
export const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
export const sgn = (v) => (v == null ? "" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(Math.abs(v) < 0.1 && v !== 0 ? 1 : 0)}%`);
export const chgCls = (v) => (v == null || Math.abs(v) < 0.0005 ? "chg-0" : v > 0 ? "chg-up" : "chg-dn");
export const coverWord = (p) => (p.kind === "Motor" ? "IDV" : p.kind === "Life" ? "Sum assured" : "Sum insured");
/** What was paid, in words: once for the years it bought, or for the year. */
export const paidTxt = (p) => (p.years > 1 ? `${inr(p.paid)} once, for ${p.years} years` : `${inr(p.paid)} for the year`);

// ---------- Hover cards (the app's light .hc), and where they open from ----------
export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 250 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 250, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;

// ---------- Small shared bits ----------
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const worked = (t = "Worked out") => L.derivedTag(t);
export const row = (cols, items, gap = 20) => `<div style="display:grid;grid-template-columns:${cols};gap:${gap}px;align-items:stretch">${items.join("")}</div>`;
export const grid = (items, gap = 20) => `<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${gap}px;align-items:stretch">${items.map(([span, html]) => `<div class="gc" style="grid-column:span ${span};display:flex;flex-direction:column;min-width:0">${html}</div>`).join("")}</div>`;
export const page = (body, wrapCls = "") => L.desktop({ h: "auto", body: `<div class="${wrapCls}" style="display:flex;flex-direction:column;gap:20px">${body}</div>` });
export const legendKey = (c, t, cls = "") => `<span class="lg"><i class="${cls}" style="background:${c}"></i>${t}</span>`;
export const polKey = (list = L.POLICIES) => `<div class="row" style="gap:14px;flex-wrap:wrap">${list.map((p) => legendKey(col(p), p.name.split(" ·")[0])).join("")}</div>`;
const dayWord = (d) => (d === 0 ? "today" : d === 1 ? "tomorrow" : d > 0 ? `in ${d} days` : `${-d} days ago`);
export const statePill = (p, today = L.TODAY) => {
  const s = L.stateOf(p, today), d = L.daysLeft(p, today);
  return s === "Lapsed" ? `<span class="pill pill-lapsed">${I.alert(10)} Lapsed ${-d} days ago</span>` : s === "Cancelled" ? `<span class="pill pill-off">Cancelled</span>` : s === "Renew soon" ? `<span class="pill pill-soon2">${I.clock(10)} Renews ${dayWord(d)}</span>` : `<span class="pill pill-on">In force</span>`;
};

// ---------- A policy's term, as a bar with its own hover card ----------
export function termBar(p, { today = L.TODAY, w = 270 } = {}) {
  const s = L.stateOf(p, today), e = L.elapsed(p, today), d = L.daysLeft(p, today), soon = s === "Renew soon" || s === "Lapsed";
  const k = p.terms.length;
  const card2 = hc({ h: `${p.name} · term ${k} of ${k}`, t: s === "Lapsed" ? `Ended ${-d} days ago` : `${d} days left`, d: `${fmtY(p.periodStart)} to ${fmtY(L.addDays(p.renewOn, -1))} · ${L.yearsTxt(p.years)}`, rows: [["Gone by", pc(e), col(p)], ["Paid", paidTxt(p), ""], ["Renews on", fmt(p.renewOn), ""]], f: s === "Lapsed" ? "No renewal is recorded for the next term" : p.kind === "Life" ? "Cover runs to 2054; the premium falls due each year" : "Cover ends the day before the renewal date", w });
  return `<div class="hov" tabindex="0" style="position:relative"><div class="tbar${soon ? " soon" : ""}" style="--c:${col(p)}"><span style="width:${Math.max(2, e * 100)}%"></span></div>${tip(card2, { w, x: "c", y: "up" })}</div>`;
}

// ---------- The greeting, pointing (every dashboard's greeting points) ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 280, x, y: "down" })}</span>`;
const byPol = (fn, list = L.IN_FORCE) => list.map((p) => [p.name.split(" ·")[0], fn(p), col(p)]);
const WORD = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
const short = (p) => p.name.split(" ·")[0];
/** The greeting's sentence, built from `list` (what's in force) and `today`, so a state with a policy lapsed or cancelled reads right. */
export function pointLede({ today = L.TODAY, list = L.IN_FORCE } = {}) {
  const n = list.length, byKind = (k) => list.filter((p) => p.kind === k), motor = byKind("Motor");
  const nx = list.slice().sort((a, b) => (a.renewOn < b.renewOn ? -1 : 1))[0];
  const yearly = list.reduce((t, p) => t + p.premium, 0), multi = list.filter((p) => p.years > 1);
  const paid = L.premiumsIn(today.slice(0, 4)).filter((x) => x.status !== "Pending"), paidYtd = paid.reduce((t, x) => t + x.amount, 0);
  const cPolicies = hc({ h: "Policies in force", t: plural(n, "policy", "policies"), d: "Each one covers a person or a vehicle", rows: list.map((p) => [`${short(p)} · ${p.insurer}`, inrC(p.sumInsured), col(p)]), f: "Cover is the sum insured, or the IDV for a vehicle" });
  const cover = (kind, noun, make) => { const ps = byKind(kind); if (!ps.length) return null; const total = ps.reduce((t, p) => t + p.sumInsured, 0); return `${pt(inrC(total), make(ps, total))} of ${noun}`; };
  const healthPart = cover("Health", "health cover", (ps, total) => hc({ h: "Health cover", t: inrC(total), d: ps.map((p) => `${p.insurer}, ${L.yearsTxt(p.years)} from ${fmt(p.periodStart)}`).join(" · "), rows: ps.flatMap((p) => [[`${short(p)}, paid once`, inr(p.paid), col(p)], ["A year of it", inr(p.premium), ""]]), f: "Waiting periods apply: see the policy's schedule" }));
  const accidentPart = cover("Accident", "accident cover", (ps, total) => hc({ h: "Accident cover", t: inrC(total), d: ps.map((p) => `${p.insurer}'s ${short(p).toLowerCase()} cover`).join(" · "), rows: ps.flatMap((p) => [["Premium", inr(p.paid), col(p)], ["Renews", fmtY(p.renewOn), ""]]), f: "The bike's policy leaves owner-driver cover out because this one exists" }));
  const idv = motor.length ? hc({ h: "Insured declared value", t: motor.map((p) => inrC(p.sumInsured)).join(" · "), d: "The most the insurer pays if the vehicle is stolen or written off", rows: motor.map((p) => [L.WHO[p.who].name, inr(p.sumInsured), col(p)]), f: "It falls with the vehicle's age, so it's worth checking at each renewal" }) : null;
  const vehiclesPart = motor.length ? `the ${motor.map((p) => L.WHO[p.who].name.toLowerCase()).join(" and ")} insured up to ${pt(inrC(motor[0].sumInsured), idv)}${motor.slice(1).map((p) => ` and ${inrC(p.sumInsured)}`).join("")}` : null;
  const cYear = hc({ h: "A year of cover", t: inr(yearly), d: "What every policy costs a year, with the single premiums spread over their years", rows: byPol((p) => inr(p.premium), list), f: multi.length ? `${plural(multi.length, "policy", "policies")} paid once for ${multi.map((p) => p.years).join(" and ")} years, so ${inr(paidYtd)} left this year` : "Each paid every year" });
  const cPaid = hc({ h: `Paid in ${today.slice(0, 4)}`, t: inr(paidYtd), d: `${plural(paid.length, "premium")}, against ${inr(yearly)} a year of cover`, rows: paid.slice().sort((a, b) => (a.paidOn < b.paidOn ? -1 : 1)).map((x) => [`${short(L.policy(x.policyId))} · ${fmt(x.paidOn)}`, inr(x.amount), col(L.policy(x.policyId))]), f: multi.length ? `${multi.map((p) => `${short(p)} cover bought for ${WORD[p.years] ?? p.years} years`).join(", ")}` : "All paid a year at a time" });
  const cNext = hc({ h: `${short(nx)} · ${nx.insurer}`, hr: L.daysLeft(nx, today) <= L.SOON ? `<span class="pill pill-soon2" style="padding:2px 8px;font-size:10px">soon</span>` : "", t: fmtY(nx.renewOn), d: `${dayWord(L.daysBetween(today, nx.renewOn))} · last paid ${inr(nx.paid)}`, rows: [["Cover", `${inrC(nx.sumInsured)} ${coverWord(nx)}`, ""], ["Term", L.yearsTxt(nx.years), ""]], f: "Enter the insurer's quote when you renew" });
  const lapsedList = L.POLICIES.filter((p) => L.stateOf(p, today) === "Lapsed");
  const gap = L.GAPS[0], tail = gap ? ` Your ${pt(gap.name.toLowerCase(), hc({ h: gap.name, t: "No policy recorded", d: `${gap.loan.lender}'s ${gap.loan.name.toLowerCase()} is on your Loans page`, f: "Worked out from your loans. The app doesn't say whether you need one" }), { x: "r" })} has no policy recorded.` : "";
  const d = L.daysBetween(today, nx.renewOn);
  const middle = lapsedList.length ? `${lapsedList.map((p) => short(p).toLowerCase()).join(" and ")} lapsed ${-L.daysLeft(lapsedList[0], today)} days ago` : d <= 90 ? "nothing else is due before then" : "nothing is due before then";
  const multiPaid = multi.filter((p) => paid.some((x) => x.policyId === p.id));
  const said = multiPaid.length ? `, though ${pt(inr(paidYtd), cPaid)} left your accounts this year because the ${multiPaid.map((p) => short(p).toLowerCase()).join(" and ")} cover was bought for ${[...new Set(multiPaid.map((p) => WORD[p.years] ?? p.years))].join(" and ")} years at once` : `, and ${pt(inr(paidYtd), cPaid)} of it is paid so far this year`;
  const covers = [healthPart, accidentPart].filter(Boolean);
  const lead = [covers.length ? `${covers.join(" and ")} for you` : null, vehiclesPart].filter(Boolean).join(", and ");
  return `You're covered by ${pt(plural(n, "policy", "policies"), cPolicies)}${lead ? `: ${lead}` : ""}. A year of cover costs ${pt(inr(yearly), cYear)}, ${inr(Math.round(yearly / 12))} a month${said}. The next renewal is the ${short(nx).toLowerCase()} cover on ${pt(fmt(nx.renewOn), cNext)}, and ${middle}.${tail}`;
}
export const greeting = (opts) => L.header({ lede: pointLede(opts), actions: L.greetingActions() });

/** The strip under the greeting while a renewal is within a month. */
export function attention({ list = L.IN_FORCE, today = L.TODAY } = {}) {
  const soon = list.filter((p) => L.daysLeft(p, today) >= 0 && L.daysLeft(p, today) <= L.SOON).sort((a, b) => (a.renewOn < b.renewOn ? -1 : 1));
  const lapsed = list.filter((p) => L.stateOf(p, today) === "Lapsed");
  if (lapsed.length) { const p = lapsed[0]; return `<div class="notice" style="background:var(--negative-tint);color:var(--negative)">${I.alert(16)}<div class="grow" style="color:var(--negative)"><b style="color:var(--negative)">${p.name} lapsed on ${fmt(L.addDays(p.renewOn, -1))}</b> and no renewal is recorded. ${p.kind === "Motor" ? "Driving without cover is illegal, and the no-claim bonus can be lost." : p.kind === "Accident" ? "The bike's policy leaves owner-driver cover out because of this one, so nothing covers you as its driver." : "Cover stopped when the term ended."}</div><span class="mini-btn ok">${I.refresh(11)} Renew now</span><span class="mini-btn ghost">It's cancelled</span></div>`; }
  if (!soon.length) return "";
  const p = soon[0], d = L.daysLeft(p, today);
  return `<div class="notice">${I.alert(16)}<div class="grow"><b>${p.name} · ${p.insurer}</b> renews ${fmt(p.renewOn)} (${dayWord(d)}). Last paid ${inr(p.paid)}; the insurer's quote may differ.${soon.length > 1 ? ` ${soon.length - 1} more within a month.` : ""}</div><span class="mini-btn ok">${I.refresh(11)} Renew</span><span class="mini-btn ghost">See policy</span></div>`;
}

// ---------- The policies table ----------
export function policiesTable({ title = "Policies", note = "everything you're insured under · hover a bar", list = L.POLICIES, today = L.TODAY } = {}) {
  const cols = "minmax(0,2.5fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,1.9fr) minmax(0,1.2fr)";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Policy")}${th("Cover")}${th("Paid")}${th("A year")}${th("This term")}${th("Renews")}</div>`;
  const rows = list.map((p) => {
    const off = p.status === "Cancelled", s = L.stateOf(p, today), d = L.daysLeft(p, today);
    const name = `<div class="cell-name">${mono(p, 34)}<div><b>${p.name}</b><small>${p.insurer} · ${L.WHO[p.who].name}${p.kind === "Motor" ? "" : ""}</small></div></div>`;
    const cover = `<div class="num">${inrC(p.sumInsured)}</div><span class="sub2">${coverWord(p)}</span>`;
    const paid = `<div class="num">${inr(p.paid)}</div><span class="sub2">${p.years > 1 ? `once, for ${p.years} years` : "for the year"}</span>`;
    const yr = `<div class="num">${inr(p.premium)}</div><span class="sub2">${inr(Math.round(p.premium / 12))} a month</span>`;
    const term = off ? `<div class="tbar" style="--c:var(--fill-strong)"></div><span class="sub2" style="margin-top:5px">Cancelled ${fmt(p.endedOn ?? today)} · payments kept</span>` : `${termBar(p, { today })}<span class="sub2" style="margin-top:5px">${s === "Lapsed" ? "Ended" : `${d} days left`} · ${L.fmt(p.periodStart)} to ${fmtY(L.addDays(p.renewOn, -1))}</span>`;
    const renew = off ? `<span class="pill pill-off">Cancelled</span>` : `<b>${fmt(p.renewOn)}, ${p.renewOn.slice(0, 4)}</b><span class="sub2">${s === "Renew soon" ? `<span style="color:var(--warning-text);font-weight:700">${dayWord(d)}</span>` : s === "Lapsed" ? `<span style="color:var(--negative);font-weight:700">${dayWord(d)}</span>` : dayWord(d)}</span>`;
    return `<div class="srow pick pk-${p.id}${off ? " off" : ""}" style="grid-template-columns:${cols}">${name}<div>${cover}</div><div>${paid}</div><div>${yr}</div><div>${term}</div><div>${renew}</div></div>`;
  }).join("");
  const live = list.filter((p) => p.status !== "Cancelled"), yearly = live.reduce((t, p) => t + p.premium, 0);
  return card(`${cardHead(title, note, btn("Add policy", { kind: "soft", icon: I.plus(12), cls: "btn-sm" }))}<div class="tbl">${head}${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600"><span>${plural(list.length, "policy", "policies")} · <b style="color:var(--fg)">${inr(yearly)}</b> a year of cover · ${inr(Math.round(yearly / 12))} a month</span>${link("All policies")}</div>`, { gap: 12 });
}

// ---------- Renewals ----------
export function comingUp({ n = 5, filter = true, list = L.BY_RENEWAL, today = L.TODAY } = {}) {
  const items = list.slice(0, n);
  const rows = items.map((p, k) => {
    const d = L.daysBetween(today, p.renewOn), soon = d <= L.SOON;
    const extra = p.ncb != null ? ` · NCB ${p.ncb}% → ${p.ncbNext}%` : "";
    return `<div class="cu"><div class="dd${soon ? " late" : ""}"><b>${Number(p.renewOn.slice(8))}</b><span>${L.monName(p.renewOn).toUpperCase()}</span></div><div><div class="tt">${p.name} · ${p.insurer}</div><div class="ss">${soon ? `<span style="color:var(--warning-text);font-weight:700">${dayWord(d)}</span>` : dayWord(d)} · ${p.renewOn.slice(0, 4)} · last paid ${inr(p.paid)}${p.years > 1 ? ` for ${p.years} years` : ""}${extra}</div></div><div class="amt" style="color:var(--fg)">${inr(p.paid)}${k === 0 && soon ? `<span class="mini-btn ok" style="margin-top:6px">${I.refresh(11)} Renew</span>` : ""}</div></div>`;
  }).join("");
  const n90 = list.filter((p) => L.daysBetween(today, p.renewOn) <= 90), s90 = n90.reduce((t, p) => t + p.paid, 0);
  return card(`${cardHead("Coming up", "renewals, soonest first", filter ? L.seg([{ label: "All", on: true }, { label: "Within a month" }, { label: "Later" }]) : "")}<div class="tbl">${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px"><span>${n90.length ? `Next 90 days: <b style="color:var(--fg)">${inr(s90)}</b> from ${plural(n90.length, "renewal")}` : `Next 90 days: <b style="color:var(--fg)">nothing falls due</b>`}</span>${worked("From each policy's dates")}</div>`, { gap: 6 });
}

// ---------- Premium payments ----------
export function paymentsRows(list) {
  const g = "1.05fr 1.7fr 1.9fr 1fr 0.8fr 1.5fr";
  const head = `<div class="srow" style="grid-template-columns:${g};padding:0 0 8px;gap:10px"><span class="th">Paid on</span><span class="th">Policy</span><span class="th">Cover period</span><span class="th" style="text-align:right">Amount</span><span class="th" style="text-align:right">Change</span><span class="th">Paid from</span></div>`;
  const rows = list.map(({ p, x, k }) => {
    const c = L.change(p, k);
    return `<div class="srow" style="grid-template-columns:${g};padding:11px 0;gap:10px"><b>${fmt(x.paidOn)}<span class="sub2">${x.paidOn.slice(0, 4)}${x.assumed ? " · assumed" : ""}</span></b><span class="row" style="gap:9px;min-width:0">${mono(p, 26)}<span style="min-width:0"><b style="display:block;font-size:12.5px">${p.name.split(" ·")[0]}</b><span class="sub2" style="margin:0">${p.insurer}</span></span></span><span style="font-size:12px;font-weight:600">${L.fmt(x.periodStart)} to ${fmtY(x.periodEnd)}<span class="sub2">${L.yearsTxt(x.years)}</span></span><b style="text-align:right">${inr(x.amount)}</b><span class="${chgCls(c)}" style="text-align:right;font-weight:800;font-size:12px">${c == null ? "first" : c === 0 ? "same" : sgn(c)}</span>${L.via(x.paidFrom)}</div>`;
  }).join("");
  return `<div class="tbl">${head}${rows}</div>`;
}
export const allPayments = () => L.POLICIES.flatMap((p) => p.payments.map((x, k) => ({ p, x, k }))).sort((a, b) => (a.x.paidOn < b.x.paidOn ? 1 : -1));
export function paymentsCard({ pickId = null, n = 6, title } = {}) {
  const all = allPayments(), list = (pickId ? all.filter((r) => r.p.id === pickId) : all).slice(0, n), total = (pickId ? all.filter((r) => r.p.id === pickId) : all);
  const paid = total.reduce((t, r) => t + r.x.amount, 0), years = total.reduce((t, r) => t + r.x.years, 0);
  const since = total.map((r) => r.x.paidOn).sort()[0];
  const pol = pickId ? L.policy(pickId) : null;
  const tiles = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:auto"><div class="mini"><small>Paid in all</small><b style="font-size:18px">${inr(paid)}</b></div><div class="mini"><small>Years of cover bought</small><b style="font-size:18px">${years}</b></div><div class="mini"><small>A year of it</small><b style="font-size:18px">${inr(paid / years)}</b></div></div>`;
  return card(`${cardHead(title ?? `Premiums paid${pol ? ` · ${pol.name}` : ""}`, "every term you've paid for", L.seg([{ label: "Payments", on: true }, { label: "Premium history" }]))}<div style="flex:${pol ? "0 0 auto" : "1"};display:flex;flex-direction:column">${paymentsRows(list)}</div>${pol ? tiles : ""}<div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600"><span>Showing ${list.length} of ${total.length} · <b style="color:var(--fg)">${inr(paid)}</b> paid since ${fmtY(since)}</span>${link("All premiums")}</div>`, { gap: 12 });
}

// ---------- A policy's details ----------
export function policyDetails(p, { bare = false, note = "", phone = false } = {}) {
  const num = `••••  ${p.number.replace(/[^A-Za-z0-9]/g, "").slice(-4)}`;
  const kv = (k, v, cls = "") => `<div class="${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const head = `<div class="row" style="gap:14px">${mono(p, 46)}<div class="grow"><b style="font-size:17px;font-weight:800;display:block">${p.name}</b><span class="muted" style="font-weight:600;font-size:12.5px">${p.insurer} · ${L.WHO[p.who].name}${p.kind === "Motor" ? ` · ${L.WHO[p.who].sub}` : ""}</span></div>${phone ? "" : statePill(p)}</div>${phone ? statePill(p).replace("<span", '<span style="align-self:flex-start"') : ""}`;
  const body = `<div class="kv">${kv("Policy number", `${num}<span class="cp">${I.copy(13)}</span>`)}${kv(coverWord(p), inr(p.sumInsured))}${kv("This term", `${L.fmt(p.periodStart)} to ${fmtY(L.addDays(p.renewOn, -1))}`)}${kv("Paid", p.years > 1 ? `${inr(p.paid)} once <span class="muted" style="font-weight:600">${inr(p.premium)} a year</span>` : `${inr(p.paid)} for the year`)}${kv("Insured", p.insured)}${kv("Paid from", L.via(p.paidFrom))}${p.ncb != null ? kv("No-claim bonus", `${p.ncb}% now${p.ncbNext !== p.ncb ? `, ${p.ncbNext}% at renewal` : ", the top step"}`) : ""}${p.facts.map(([k, v]) => kv(k, v)).join("")}${kv("Policy document", "Add a link to the PDF", "nov")}</div>${p.addOns.length ? `<div><span class="k" style="font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:8px">Add-ons and covers</span><div class="addons">${p.addOns.map((a) => `<span class="addon">${I.check(11)}${a}</span>`).join("")}</div></div>` : ""}`;
  const foot = `<div class="foot row" style="gap:10px;${phone ? "flex-wrap:wrap" : ""}">${btn("Renew", { kind: "primary", icon: I.refresh(13), cls: "btn-sm" })}${btn("Edit", { icon: I.pencil(12), cls: "btn-sm" })}${btn("", { icon: I.more(14), cls: "btn-sm btn-icon" })}<span class="grow"></span>${phone ? "" : note || `<span class="muted" style="font-size:12px;font-weight:600">Started ${fmtY(p.terms[0].periodStart)} · ${plural(p.terms.length, "term")} paid</span>`}</div>`;
  const inner = `${head}${body}${foot}`;
  return bare ? inner : card(`${cardHead("Policy details", "what you'd look up when you need to claim")}${inner}`, { gap: 18 });
}

// ---------- The cover timeline: every policy's term on one axis ----------
export function timelineCard({ from = "2026-01-01", to = "2030-01-01", today = L.TODAY, list = L.POLICIES, title = "Cover timeline", note = "when each policy covers you · hover a bar" } = {}) {
  const span = L.daysBetween(from, to), X = (iso) => Math.min(100, Math.max(0, (L.daysBetween(from, iso) / span) * 100));
  const years = [2026, 2027, 2028, 2029].map((y) => `<span style="position:absolute;left:${X(`${y}-01-01`)}%;top:0;font-size:11px;font-weight:800;color:var(--muted)">${y}</span><i style="position:absolute;left:${X(`${y}-01-01`)}%;top:18px;bottom:0;border-left:1px dashed var(--divider)"></i>`).join("");
  const rows = list.map((p, k) => {
    const s = L.stateOf(p, today), d = L.daysLeft(p, today), x0 = X(p.periodStart), x1 = X(p.renewOn);
    const card2 = hc({ h: p.name, t: s === "Lapsed" ? `Ended ${-d} days ago` : `${L.yearsTxt(p.years)} of cover`, d: `${fmtY(p.periodStart)} to ${fmtY(L.addDays(p.renewOn, -1))}`, rows: [["Paid", paidTxt(p), col(p)], ["A year of it", inr(p.premium), ""]], f: `Renews ${fmtY(p.renewOn)} · ${dayWord(d)}`, w: 270 });
    return `<div class="hov pick pk-${p.id}" tabindex="0" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;height:46px;position:relative"><span class="row" style="gap:9px;font-size:12.5px;font-weight:800">${mono(p, 26)}${p.name.split(" ·")[0]}</span><div style="position:relative;height:100%"><span class="rt" style="position:absolute;left:${x0}%;width:${x1 - x0}%;top:9px;height:28px;border-radius:9px;background:${L.fill(p, 90)};display:flex;align-items:center;padding:0 10px;color:var(--on-card);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden">${L.yearsTxt(p.years)} · ${inr(p.paid)}</span><i style="position:absolute;left:${x1}%;top:4px;bottom:4px;border-left:2px solid ${col(p)}"></i></div>${tip(card2, { w: 270, x: "r", y: "up" })}</div>`;
  }).join("");
  const nowX = X(today);
  return card(`${cardHead(title, note)}<div style="position:relative;display:flex;flex-direction:column;gap:2px;flex:1;justify-content:center"><div style="position:relative;height:20px;margin-left:162px">${years}</div>${rows}<div style="position:absolute;left:calc(162px + (100% - 162px) * ${(nowX / 100).toFixed(4)});top:0;bottom:0;border-left:2px dashed var(--fg);opacity:.5"></div><span style="position:absolute;left:calc(162px + (100% - 162px) * ${(nowX / 100).toFixed(4)} + 6px);top:-2px;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--surface);box-shadow:var(--soft-shadow)">Today</span></div><div class="card-note">The line at the end of a bar is the renewal day. A single premium buys the whole bar, so the health and bike cover are paid for until ${L.fmt(L.policy("health").renewOn)}, ${L.policy("health").renewOn.slice(0, 4)} and ${L.fmt(L.policy("bike").renewOn)}, ${L.policy("bike").renewOn.slice(0, 4)}.</div>`, { gap: 12 });
}

// ---------- What cover costs ----------
export function costCard() {
  const total = L.YEARLY, g = "1.7fr 1fr 1fr 1.2fr";
  const rows = L.IN_FORCE.map((p) => `<div class="srow" style="grid-template-columns:${g};padding:10px 0;gap:8px;font-weight:700"><span class="row" style="gap:8px">${mono(p, 24)}<span style="min-width:0"><b style="display:block;font-size:12.5px">${p.name.split(" ·")[0]}</b></span></span><span>${inr(p.premium)}</span><span>${inrC(p.sumInsured)}</span><b style="text-align:right">${pc(L.rateOf(p), L.rateOf(p) < 0.01 ? 2 : 1)}</b></div>`).join("");
  return card(`${cardHead("What cover costs", "a year of each policy against the cover it buys", worked())}<div style="display:flex;flex-direction:column;gap:7px"><div class="hbar" style="display:flex;gap:2px;background:transparent;height:14px">${L.IN_FORCE.map((p) => `<span class="rt" style="width:${(p.premium / total) * 100}%;background:${L.fill(p, 90)};border-radius:6px"></span>`).join("")}</div><div class="between sub2"><span>${inr(total)} a year</span><span>${inr(Math.round(total / 12))} a month</span></div></div><div class="tbl" style="gap:0"><div class="srow" style="grid-template-columns:${g};padding:0 0 6px;gap:8px"><span class="th">Policy</span><span class="th">A year</span><span class="th">Cover</span><span class="th" style="text-align:right">A year ÷ cover</span></div>${rows}</div><div class="card-note">A year ÷ cover is what each ₹100 of cover costs a year. It's for reading a policy's price against its own history, not for comparing an accident cover with a motor policy. A single premium is spread over the years it bought.</div>`, { gap: 14 });
}

// ---------- The no-claim bonus ladder ----------
export function ncbCard() {
  const motor = L.POLICIES.filter((p) => p.ncb != null);
  const one = (p) => {
    const steps = L.NCB_STEPS.map((s) => `<div class="st${s < p.ncb ? " done" : s === p.ncb ? " now" : s === p.ncbNext ? " nx" : ""}"><i></i>${s}%</div>`).join("");
    return `<div style="display:flex;flex-direction:column;gap:10px;--c:${col(p)}"><div class="between"><span class="row" style="gap:9px">${mono(p, 26)}<b style="font-size:13.5px">${p.name.split(" ·")[0]}</b></span><span style="font-size:12px;font-weight:700;color:var(--muted)">${p.ncb}% now${p.ncbNext !== p.ncb ? `, ${p.ncbNext}% on ${fmt(p.renewOn)}, ${p.renewOn.slice(0, 4)}` : ", the top step"}</span></div><div class="ladder">${steps}</div></div>`;
  };
  return card(`${cardHead("No-claim bonus", "the discount on the own-damage premium", worked("From each term"))}<div style="display:flex;flex-direction:column;gap:22px;flex:1;justify-content:space-around">${motor.map(one).join("")}</div><div class="card-note">A term with no claim moves a policy up a step at renewal, and a claim sends it back to 0%. The app can't see claims, so the step is the one on the insurer's certificate. The car is at the top step; the bike's first step comes with its renewal in ${L.policy("bike").renewOn.slice(0, 4)}.</div>`, { gap: 16 });
}
