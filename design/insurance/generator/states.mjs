// The states of the page, and the phone layout. Each state is a variant of his real policies with "today" moved or a policy changed: a
// renewal close, a lapse, a renewal, a cancellation, a home with a loan and no policy, or none at all. Dates after Oct 29, 2026 and the
// renewal quote are illustrative.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as H from "./heroes.mjs";
import * as F from "./forms.mjs";
const { I, inr, fmt, fmtY, btn } = L;

const clone = (list, id, patch) => list.map((p) => (p.id === id ? { ...p, ...patch } : p));
/** The accident cover renewed on time for another year at an illustrative ₹473. */
const renewedAccident = () => {
  const a = L.policy("accident"), terms = [...a.terms, { policyId: "accident", n: 2, periodStart: "2027-03-21", years: 1, periodEnd: "2028-03-20", amount: 473, paidOn: "2027-03-18", status: "Paid", paidFrom: null }];
  return { ...a, terms, payments: terms, paid: 473, premium: 473, renewOn: "2028-03-21", periodStart: "2027-03-21", periodEnd: "2028-03-20" };
};
const frame = (inner) => `<div class="frame" style="width:1364px">${inner}</div>`;
const stt = (cap, text, inner) => `<div class="stt"><div class="cap">${cap}</div><p>${text}</p>${inner}</div>`;
const map = (opts) => H.heroBox("i2dir", H.coverMap(opts), { h: 460 });

// 1. No policies yet
function empty() {
  const kinds = [["heart", "Health", "A sum insured for you or your family"], ["shield", "Accident", "An owner-driver or personal accident cover"], ["car", "Motor", "A car or a bike: IDV and no-claim bonus"], ["home", "Home", "The flat and what's in it"]];
  const tiles = kinds.map(([ic, k, t]) => `<div class="who" style="align-items:flex-start;gap:12px"><span class="mono" style="width:40px;height:40px;border-radius:12px;background:${L.grad("onyx")}">${I[ic](20)}</span><div><b style="font-size:15px;font-weight:800;display:block">${k}</b><span class="muted" style="font-size:12px;font-weight:600;line-height:1.5">${t}</span></div>${btn("Add", { kind: "soft", icon: I.plus(12), cls: "btn-sm" })}</div>`).join("");
  return frame(`${L.header({ lede: "Nothing is recorded yet. Add a policy and this page shows what's covered, for how much, and what renews when.", actions: btn("Add policy", { kind: "primary", icon: I.plus(14) }) })}<div class="empty" style="background:var(--feature-tile);border:1.5px dashed var(--feature-tile-line)">${L.whoMono({ icon: "shield" }, 56, "emerald")}<b>No insurance recorded</b><p>Health, accident, a car, a bike or a home. Each policy is a name, who or what it covers, and what its current term cost.</p></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${tiles}</div>`);
}

// 2. A renewal is close: the accident cover, with today moved to Feb 25, 2027
function soon() {
  const today = "2027-02-25", list = L.POLICIES;
  return frame(`${L.header({ lede: `The <b>accident cover</b> renews on <b>Mar 21</b>, in 24 days. The other three are in force until Aug 2027 and 2029.`, actions: L.greetingActions() })}${P.attention({ list, today })}${map({ list, today })}${P.comingUp({ n: 4, filter: false, today })}`);
}

// 3. Lapsed: the accident cover's term ended Mar 20 and no renewal is recorded; today is Mar 27
function lapsed() {
  const today = "2027-03-27", list = L.POLICIES;
  return frame(`${L.header({ lede: `The <b>accident cover</b> lapsed 6 days ago: its term ended Mar 20 and no renewal is recorded. The other three policies are in force, and the next renewal is the car on <b>Aug 6</b>.`, actions: L.greetingActions() })}${P.attention({ list, today })}${map({ list, today })}${P.policiesTable({ list, today, note: "the accident cover has ended" })}`);
}

// 4. Renewed
function renewed() {
  const list = L.POLICIES.map((p) => (p.id === "accident" ? renewedAccident() : p)), today = "2027-03-18";
  return frame(`${F.toast("Accident · Owner-driver cover renewed to Mar 2028 · ₹473")}${map({ list, today })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch">${P.comingUp({ n: 4, filter: false, list: list.slice().sort((a, b) => (a.renewOn < b.renewOn ? -1 : 1)), today })}${P.policyDetails(renewedAccident(), { note: `<span class="muted" style="font-size:12px;font-weight:600">Started Mar 21, 2026 · 2 terms paid</span>` })}</div>`);
}

// 5. Cancelled (the car sold)
function cancelled() {
  const list = clone(L.POLICIES, "car", { status: "Cancelled", endedOn: "2026-11-02" }), today = "2026-11-03";
  return frame(`${F.toast("Car · Comprehensive Platinum cancelled")}${map({ list, today })}${P.policiesTable({ list, today, note: "the car is dimmed, and counts for nothing" })}`);
}

// 6. A financed home with no policy
function homeGap() {
  return frame(`${H.heroBox("i2dir", H.coverMap({ who: [...L.WHO_ORDER, "home"], add: false }), { h: 460 })}`);
}

export function statesBoard() {
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Insurance states: empty, a renewal close, lapsed, renewed, cancelled, and a home with no policy</h2>${L.sampleTag(". Dates after Oct 29, 2026 are illustrative")}</div><p>The page, changed one way at a time. A policy is <b>in force</b>, <b>renews soon</b> (within 30 days), <b>lapsed</b> (its term ended and no renewal is recorded) or <b>cancelled</b>. Lapsed is worked out from the dates, never typed in, and it is the one state that turns the strip red. Today, all four of his policies are in force and nothing is due for 143 days, so the page has no strip.</p></div>
${stt("1 · No policies", "The first visit. Four kinds to start from; nothing is invented.", empty())}
${stt("2 · A renewal is close", "Today moved to Feb 25, 2027. The accident cover is 24 days from renewing, so an amber strip appears with Renew, the tile says <b>soon</b>, and its bar turns amber.", soon())}
${stt("3 · A policy has lapsed", "Today moved to Mar 27, 2027 and the accident cover was never renewed. The strip is red and says what that means: the bike's policy leaves owner-driver cover out because this one exists, so nothing covers him as its driver. <b>Renew now</b> opens the late-renewal form; <b>It's cancelled</b> opens Cancel.", lapsed())}
${stt("4 · Just renewed", "After Renew, with Undo for six seconds. The accident cover moves to its second term at an illustrative ₹473, and the renewal date moves to Mar 2028.", renewed())}
${stt("5 · Cancelled", "Sold the car. It's dimmed, counts for nothing, and keeps its payment. Restart brings it back.", cancelled())}
${stt("6 · A home with a loan and no policy", "Not in his data today. If the Loans page has a Home or Auto loan against something with no policy, the page shows a dashed tile for it, and the greeting says so. It states a fact and doesn't say he needs one.", homeGap())}`;
  return `<div class="chai-app board" style="width:1460px;height:__H__">${body}</div>`;
}

// ---------- Phone ----------
const phone = (body) => L.phone({ h: "fit", body });
const phHead = (lede) => `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow">Insurance · Today</div><h1>Good afternoon, Prathik</h1><div class="lede">${lede}</div></div><div class="pg-actions">${btn("Add policy", { icon: I.plus() })}${btn("Renew", { kind: "primary", icon: I.refresh(14) })}</div></header>`;
const sheet = () => {
  const p = L.policy("accident");
  return `<div class="dlg" style="width:100%;border-radius:26px 26px 0 0"><div class="dlg-h"><span class="dlg-ic">${I.refresh(18)}</span><div><h3>Renew policy</h3><p>${p.name} · term 2</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="dlg-b" style="grid-template-columns:1fr;padding:14px 18px"><div class="pv-box" style="gap:6px"><div class="between"><span>New term</span><span>Mar 21, 2027 to Mar 20, 2028</span></div><div class="between"><span>Against last year</span><span class="chg-up" style="font-weight:800">${P.sgn(473 / L.policy("accident").paid - 1)}</span></div></div><div class="fields" style="grid-template-columns:1fr">${F.fld("Premium", F.inp("473", { pre: "₹", suf: "for 1 year", focus: true }), { req: true, help: "The insurer's quote." })}${F.fld("Cover lasts", F.fseg(["1 year", "2 years", "3 years"], "1 year"))}${F.fld("Sum insured", F.inp("15,00,000", { pre: "₹" }), { req: true })}${F.fld("Paid from", F.sel("Not recorded yet"))}</div></div><div class="dlg-f"><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">${I.check(13)} Renew</span></div></div>`;
};
export function phoneBoard() {
  const p1 = phone(`${phHead(`You're covered by <b>4 policies</b>: <b>₹50L</b> of health, <b>₹15L</b> of accident cover, and the car and bike. A year of cover costs <b>₹20,511</b>. Next renewal: the accident cover, <b>Mar 21</b>.`)}${H.coverMap({ stack: true })}`);
  const p2 = phone(`${P.card(`${P.cardHead("Premium runway", "2026 to 2029")}${H.runwayChart({ W: 326, H: 150, from: "2026-01", n: 43, compact: true })}<div class="card-note">77% of what left this year was the health cover, paid once for three years.</div>`, { gap: 12, style: "padding:16px" })}${P.comingUp({ n: 4, filter: false })}${P.card(`${P.cardHead("Premiums paid", "latest")}<div class="tbl">${P.allPayments().slice(0, 4).map(({ p, x, k }) => `<div class="cu" style="grid-template-columns:46px 1fr auto"><div class="dd"><b>${Number(x.paidOn.slice(8))}</b><span>${L.monName(x.paidOn).toUpperCase()}</span></div><div><div class="tt">${p.name.split(" ·")[0]} · ${p.insurer}</div><div class="ss">${L.yearsTxt(x.years)} from ${L.fmt(x.periodStart)} · ${L.yearsTxt(x.years) === "1 year" ? "for the year" : "once"}</div></div><div class="amt" style="color:var(--fg)">${inr(x.amount)}</div></div>`).join("")}</div>`, { gap: 10, style: "padding:16px" })}`);
  const p3 = phone(`${P.policyDetails(L.policy("accident"), { phone: true })}<div style="margin:0 -16px -28px;position:relative">${sheet()}</div>`);
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Insurance on a phone</h2>${L.sampleTag()}</div><p>The same order as the desktop page: greeting, the cover map (one tile per person or vehicle, policies stacked), then the premium runway, renewals and payments. A policy opens its details, and Renew is a bottom sheet with only what changes: the quote, how long it lasts, the cover and where it's paid from.</p></div><div style="display:flex;gap:36px;align-items:flex-start">${p1}${p2}${p3}</div>`;
  return `<div class="chai-app board" style="width:1380px;height:__H__">${body}</div>`;
}
