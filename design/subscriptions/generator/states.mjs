// Key states for each direction: empty, one subscription, a renewal due soon, paused and cancelled.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as A from "./a.mjs";
import * as B from "./b.mjs";
import * as C from "./c.mjs";
const { inr, inrK, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

export const section = (n, title, desc, content) => `<section style="display:flex;flex-direction:column;gap:16px"><div class="sec-h"><span class="sec-n">${n}</span><div><h3>${title}</h3><p>${desc}</p></div></div>${content}</section>`;
export const frame = (label, html) => `<div><div class="frame-l">${label}</div>${html}</div>`;
export const board = ({ title, intro, body }) => `<div class="chai-app board" style="width:1700px;height:__H__"><div class="board-h"><div class="row" style="gap:12px"><h2>${title}</h2>${L.sampleTag(". Today is Oct 20, 2026")}</div><p>${intro}</p></div>${body}</div>`;
const toast = (text) => `<div style="position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:14px;background:var(--ink);color:var(--on-ink);border-radius:14px;padding:10px 10px 10px 16px;font-size:13px;font-weight:600;box-shadow:var(--pop-shadow);overflow:hidden;white-space:nowrap">${I.check(13)}<span>${text}</span><span style="padding:7px 12px;border-radius:10px;background:oklch(1 0 0 / 0.14);font-weight:800">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:62%;background:var(--accent)"></span></div>`;
const NET = L.sub("netflix");

// ---------- Shared empty-state pieces ----------
const STARTERS = ["Netflix", "Spotify", "YouTube Premium", "Amazon Prime", "iCloud+", "Google One", "ChatGPT Plus"];
export function emptyCard({ ph = false } = {}) {
  return `<section class="card glass" style="align-items:center;text-align:center;padding:${ph ? "28px 18px" : "44px 24px"};gap:14px">
    <span style="width:56px;height:56px;border-radius:18px;background:var(--accent-tint);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${I.subs(24)}</span>
    <h3 style="font-size:${ph ? 18 : 20}px;font-weight:800">Add your first subscription</h3>
    <p class="muted" style="font-size:14px;font-weight:500;line-height:1.6;max-width:520px">Add the things you pay for again and again. This page then works out what they cost each month and year, what renews next, and when a price goes up.</p>
    ${btn("Add subscription", { kind: "primary", icon: I.plus() })}
    <div style="display:flex;flex-direction:column;gap:9px;align-items:center;margin-top:6px"><span class="th">Or start from one of these</span><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:${ph ? 320 : 640}px">${STARTERS.map((n) => `<span class="chip">${I.plus(10)}${n}</span>`).join("")}</div><span class="card-note">They fill in the name and category. You add the price.</span></div>
  </section>`;
}
const emptyLede = "Nothing here yet. Once you add a subscription, this page shows what you pay a month and a year, and what renews next.";
const oneLede = `You pay <b>${inr(649)} a month</b> for <b>1 subscription</b>, or <b>${inr(7788)} a year</b>. <b>Netflix</b> renews on <b>${fmtDow(L.nextRenewal(NET))}</b>. No payments are recorded yet.`;
const ghostTile = (k) => `<div class="stile" style="border:1.5px dashed var(--fill-strong)"><span class="k">${k}</span><span class="v muted" style="color:var(--fill-strong)">—</span><span class="s">Fills in once you add one</span></div>`;

// ================= A =================
function aEmpty() {
  return desktop({ h: "fit", body: `${header({ lede: emptyLede, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}<div class="tiles" style="grid-template-columns:repeat(4,1fr)">${["Every month", "Renews next", "Next 30 days", "Costs the most"].map(ghostTile).join("")}</div>${emptyCard()}` });
}
function aOne() {
  const s = NET;
  const tiles = `<div class="tiles" style="grid-template-columns:repeat(4,1fr)">
    <div class="stile feature">${rings(360, 120, { dx: 12, dy: 30, first: 30, step: 22, opacity: 0.12 })}<span class="k">Every month</span><span class="v">${inr(649)}</span><span class="s"><b style="color:oklch(0.3 0.08 152)">${inr(7788)}</b> a year · 1 active</span></div>
    <div class="stile glass"><span class="k">Renews next</span><span class="row" style="gap:9px">${mono(s, 26)}<span class="v" style="font-size:24px">Netflix</span>${L.duePill(s)}</span><span class="s"><b>${inr(649)}</b> on ${fmtDow("2026-10-23")} · Millennia</span></div>
    <div class="stile glass"><span class="k">Next 30 days</span><span class="v">${inr(649)}</span><span class="s">1 renewal</span></div>
    <div class="stile" style="border:1.5px dashed var(--fill-strong);justify-content:center"><span class="k">Costs the most</span><span class="s" style="font-size:13px;line-height:1.5">Add another subscription to compare what each one costs.</span></div></div>`;
  const r = A.row(s, { last: `<span><span class="muted" style="font-weight:600">None yet</span><span class="sub2"><span class="link" style="font-size:11px">Add past payments</span></span></span>` }).replace(/12%/, "100%").replace(/width:[\d.]+%;background:var\(--card-ruby\)/, "width:100%;background:var(--card-ruby)");
  const rows = `<div class="tgroup" style="padding:14px 10px 8px">Active <span>1 · ${inr(649)} a month</span></div>${r}<p class="card-note" style="padding:10px 10px 0">Netflix started on Feb 23, 2024. Add its past payments to see its price history, or let them build up from now on.</p>`;
  return desktop({ h: "fit", body: `${header({ lede: oneLede, actions: L.headerActions() })}${tiles}${A.listCard({ rowsFor: [s], notice: false, customRows: rows }).replace(/<span class="seg-i on">All<em>12<\/em>/, '<span class="seg-i on">All<em>1</em>')}` });
}
function aDue() {
  const head = A.tableHead();
  const net = A.row(NET);
  const after = A.row(NET, { next: `<span><b style="font-weight:700">Nov 23</b><span class="sub2">in 34 days</span></span>`, last: `<span><b class="num" style="font-weight:700">Oct 23 · ${inr(649)}</b><span class="sub2">Millennia</span></span>`, action: `<span class="pill pill-on">${I.check(10)} Paid</span>` });
  return `<div style="display:grid;grid-template-columns:1fr;gap:20px">
    ${frame("Due in 3 days or less: a red pill that pulses, and Mark paid on the row", `<section class="card glass">${head}${net}${A.row(L.sub("icloud"))}</section>`)}
    ${frame("One click later: paid at the plan's price, to its usual card, with Undo", `<section class="card glass" style="position:relative;padding-bottom:84px">${head}${after}${A.row(L.sub("icloud"))}${toast("Netflix: ₹649 paid on Oct 23 to Millennia")}</section>`)}
    ${frame("A renewal that passed with no payment stays flagged until it's recorded", `<section class="card glass"><div class="notice">${I.alert(16)}<span class="grow"><b>iCloud+ renewed on Sep 24</b>, but no payment is recorded for it.</span>${btn("Record payment", { cls: "btn-sm" })}</div>${head}${A.row(L.sub("icloud"))}</section>`)}
    ${frame("4 to 7 days: amber, no button yet. After that, just the date", `<section class="card glass">${head}${A.row(L.sub("spotify"))}${A.row(L.sub("timesprime"))}</section>`)}
  </div>`;
}
function aOff() {
  const grp = `${A.tableHead()}<div class="tgroup" style="padding-left:10px;padding-right:10px">Paused <span>Left out of the totals until you resume</span></div>${A.row(L.sub("headspace"))}<div class="tgroup" style="padding-left:10px;padding-right:10px">Cancelled <span>Kept for their payment history</span></div>${A.row(L.sub("sonyliv"))}`;
  return `<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start">${frame("At the bottom of the list, in their own groups, left out of every total", `<section class="card glass">${grp}</section>`)}
    ${frame("What changes", `<section class="card glass" style="gap:12px;font-size:13px;line-height:1.6"><div class="row" style="gap:10px;align-items:flex-start">${I.pause(14)}<span><b>Paused</b> (Headspace): no renewals expected and not in the totals. Resume picks it up from its next renewal date. Its payments stay.</span></div><div class="row" style="gap:10px;align-items:flex-start">${I.stop(14)}<span><b>Cancelled</b> (SonyLIV): it won't renew on Nov 3. It's kept with its payments so the history and "paid so far" stay right. Restart makes it active again.</span></div><div class="row" style="gap:10px;align-items:flex-start">${I.info(14)}<span>Hide them with the <b>Active</b> filter. The Sheet needs a <b>Cancelled</b> status for this; today it only has Active and Paused.</span></div></section>`)}</div>`;
}
function aPhones() {
  return `<div style="display:flex;gap:40px">${frame("Phone · empty", phone({ h: 860, body: `${header({ lede: emptyLede, phone: true, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}${emptyCard({ ph: true })}` }))}
    ${frame("Phone · due soon, after Mark paid", phone({ h: 860, body: `${header({ title: "Subscriptions", lede: oneLede.replace("No payments are recorded yet.", ""), phone: true })}<section class="card glass" style="padding:16px;gap:0;position:relative;min-height:330px"><div style="padding:12px 0;border-bottom:1px solid var(--divider)"><div class="row" style="gap:12px">${mono(NET, 36)}<div class="grow"><div class="between"><b style="font-size:14px">Netflix</b><b style="font-size:14px">${inr(649)}<span class="muted" style="font-weight:600;font-size:12px"> /mo</span></b></div><div class="between" style="margin-top:3px"><span class="muted" style="font-size:12px;font-weight:600">Streaming · renews in 34 days</span><span class="pill pill-on">${I.check(10)} Paid</span></div></div></div></div>${toast("₹649 paid to Millennia").replace("left:50%;bottom:22px", "left:50%;bottom:16px")}</section>` }))}</div>`;
}

export function aStates() {
  return board({ title: "A · One list: states", intro: "How the list direction handles no data, a single subscription, a renewal that's due, and the ones you've paused or cancelled. Everything else matches the main board.", body: [
    section(1, "Empty", "Ghost tiles keep the layout, so nothing jumps when the first one lands. The starters only fill in the name and category, never a price.", aEmpty()),
    section(2, "One subscription", "Just added, so no payments yet. The comparison tile waits for a second subscription instead of showing 100%.", aOne()),
    section(3, "A renewal due soon", "The same rules as a card bill: red and pulsing within 3 days, amber within a week. Mark paid records the plan's price on the renewal date, to the usual card, with 6 seconds to undo.", aDue()),
    section(4, "Paused and cancelled", "Kept, but out of the way.", aOff()),
    section(5, "Phone", "", aPhones()),
  ].join("") });
}

// ================= B =================
function bEmpty() {
  const months = L.monthsFrom("2026-11", 12);
  return desktop({ h: "fit", body: `${header({ lede: emptyLede, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}
    <section class="card glass" style="gap:6px"><div class="card-h"><span class="card-t">Next 30 days<small>Oct 20 – Nov 19</small></span><b style="font-size:20px">₹0</b></div><div style="position:relative;height:150px"><span style="position:absolute;left:0;right:0;top:90px;border-top:1px solid var(--divider)"></span><span style="position:absolute;left:30px;top:20px;width:2px;height:70px;background:var(--accent);opacity:0.5"></span><span style="position:absolute;left:50%;top:40px;transform:translateX(-50%);font-size:13px;color:var(--muted);font-weight:600">Renewals show up here, on the day they're due.</span><span style="position:absolute;left:30px;top:104px;transform:translateX(-50%);font-size:11px;font-weight:700">Today</span></div></section>
    ${emptyCard()}` });
}
function bOne() {
  const ren = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30), [NET]);
  const tl = B.timeline({ open: "" }).replace(/<div class="hov[\s\S]*?<\/div>\s*<\/div>/g, "");
  const items = L.renewalsBetween("2026-11-01", "2027-10-31", [NET]);
  const past = L.monthsFrom("2025-11", 12), fut = L.monthsFrom("2026-11", 12);
  const grid = `<div class="heat" style="grid-template-columns:96px repeat(12,minmax(0,1fr)) 150px"><span></span>${past.map((k) => `<div class="heat-m${k === "2026-10" ? " now" : ""}">${L.monName(k)}</div>`).join("")}<div class="heat-m" style="text-align:right">Total</div>
    <span style="font-size:12px;font-weight:800;line-height:1.3">Last 12<br><span class="muted" style="font-weight:600">paid</span></span>${past.map((k) => `<div class="hcell none">–</div>`).join("")}<div style="text-align:right"><b style="font-size:16px">₹0</b><div class="muted" style="font-size:11px;font-weight:600">nothing recorded</div></div>
    <span style="font-size:12px;font-weight:800;line-height:1.3">Next 12<br><span class="muted" style="font-weight:600">expected</span></span>${fut.map(() => `<div class="hcell up">₹649</div>`).join("")}<div style="text-align:right"><b style="font-size:16px">${inr(7788)}</b><div class="muted" style="font-size:11px;font-weight:600">Nov 2026 – Oct 2027</div></div></div>`;
  return desktop({ h: "fit", body: `${header({ lede: oneLede, actions: L.headerActions() })}
    <section class="card glass" style="gap:6px"><div class="card-h"><span class="card-t">Next 30 days<small>Oct 20 – Nov 19</small></span><b style="font-size:20px">${inr(649)}</b></div>${oneStem()}</section>
    <section class="card glass"><div class="card-h"><span class="card-t">Month by month<small>the same months a year apart</small></span><span class="card-note">Striped months have no payments recorded.</span></div>${grid}</section>` });
}
function oneStem() {
  const w = 1370, X = (iso) => 30 + (L.daysBetween(L.TODAY, iso) / 30) * (w - 60), base = 150;
  return `<div style="position:relative;height:200px"><span style="position:absolute;left:0;right:0;top:${base}px;height:1px;background:var(--divider)"></span><span style="position:absolute;left:${X(L.TODAY) - 1}px;top:10px;width:2px;height:${base - 10}px;background:var(--accent);opacity:0.5"></span>
    <span style="position:absolute;left:${X("2026-10-23") - 1}px;top:${base - 80}px;width:2px;height:80px;background:linear-gradient(var(--card-ruby),oklch(0 0 0 / 0.08))"></span><span style="position:absolute;left:${X("2026-10-23")}px;top:${base - 80}px;transform:translate(-50%,-50%);border-radius:10px;box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--negative);display:flex">${mono(NET, 30)}</span><span style="position:absolute;left:${X("2026-10-23")}px;top:${base - 138}px;transform:translateX(-50%);text-align:center"><b style="display:block;font-size:13px">${inr(649)}</b><span class="muted" style="font-size:11px;font-weight:600">Netflix</span></span>
    <span style="position:absolute;left:${X(L.TODAY)}px;top:${base + 14}px;transform:translateX(-50%);font-size:11px;font-weight:700">Today</span><span style="position:absolute;left:${X("2026-11-02")}px;top:${base + 14}px;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--muted)">Mon Nov 2</span><span style="position:absolute;left:${X("2026-11-16")}px;top:${base + 14}px;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--muted)">Mon Nov 16</span></div>`;
}
function bDue() {
  const ag = B.agenda();
  const grab = (title) => { const i = ag.indexOf(`<div class="tgroup">${title}`); return ag.slice(ag.lastIndexOf("<div>", i), ag.indexOf('<div><div class="tgroup">', i + 10)); };
  const thisWeek = grab("This week");
  const after = thisWeek.replace(/<span class="btn btn-accent btn-sm">[\s\S]*?Mark paid<\/span>/, `<span class="pill pill-on">${I.check(10)} Paid</span>`).replace("in 3 days · Millennia", "paid Oct 23 · Millennia");
  const missing = ag.slice(0, ag.indexOf('<div><div class="tgroup">This week'));
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    ${frame("Due in 3 days or less: red date, red ring on the timeline, Mark paid in the agenda", `<section class="card glass" style="gap:4px">${thisWeek}</section>`)}
    ${frame("One click later, with Undo", `<section class="card glass" style="gap:4px;position:relative;padding-bottom:84px">${after}${toast("Netflix: ₹649 paid on Oct 23 to Millennia")}</section>`)}
    ${frame("Not recorded: amber, above everything else", `<section class="card glass" style="gap:4px">${missing}</section>`)}
    ${frame("Hover a renewal on the timeline", `<section class="card glass" style="align-items:flex-start"><div style="position:relative">${P.renewalCard(NET, "2026-10-23")}</div></section>`)}
  </div>`;
}
function bOff() {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
    ${frame("Cancelled: a dashed stem where it would have renewed, struck through", `<section class="card glass" style="overflow:hidden"><div style="margin-left:-560px">${B.timeline({ open: "" })}</div></section>`)}
    ${frame("Paused: off the timeline and out of the totals, named under Costs the most", `<section class="card glass"><div class="card-h"><span class="card-t">Costs the most<small>a month</small></span>${L.select({ value: "Include paused", kind: "small", align: "align-end", open: true, options: [{ label: "Active", meta: 10 }, { label: "Include paused", meta: 11, on: true }] })}</div>${B.costRank({ max: 3 })}<div class="row" style="gap:12px;opacity:0.7"><span class="muted" style="width:16px"></span>${mono(L.sub("headspace"), 26)}<span class="grow"><span class="between"><b style="font-size:13px">Headspace <span class="pill pill-off" style="margin-left:6px">Paused</span></b><b class="num">${inr(299)}</b></span></span></div><p class="card-note">Not counted: SonyLIV (cancelled).</p></section>`)}
  </div>`;
}
function bDrawer() {
  const s = NET;
  const drawer = `<div style="position:absolute;top:24px;right:24px;bottom:24px;width:520px;z-index:60;background:var(--surface);border-radius:28px;box-shadow:var(--pop-shadow);padding:24px;display:flex;flex-direction:column;gap:16px;overflow:hidden">
    <div class="row" style="gap:12px">${mono(s, 40)}<div class="grow"><h3 style="font-size:18px;font-weight:800">${s.name}</h3><span class="muted" style="font-size:12px;font-weight:600">Streaming · Monthly · since Feb 2024</span></div><span class="dlg-x">${I.x()}</span></div>
    <div class="stile feature" style="padding:16px">${rings(470, 110, { dx: 12, dy: 30, first: 30, step: 22, opacity: 0.12 })}<span class="k">Renews ${fmtDow("2026-10-23")} · in 3 days</span><span class="v">${inr(649)} <small>a month</small></span><span class="s">${inr(7788)} a year · charged to Millennia</span></div>
    <div><div class="between" style="margin-bottom:6px"><span class="th">What each payment cost</span><span class="chg chg-up">${I.up(10)}${inr(150)} on Jul 23</span></div>${P.priceStep(s, { w: 470, h: 130 })}</div>
    <div><div class="between"><span class="th">Payments</span><span class="link" style="font-size:12px">All 32 ${I.arrowR(11)}</span></div>${P.paymentRows(s, 4)}</div>
    <div class="row" style="gap:8px;margin-top:auto">${btn("Mark paid", { kind: "primary", icon: I.check(11) })}${btn("Edit", { kind: "soft" })}${btn("Pause", { kind: "soft" })}${btn("Cancel", { kind: "soft" })}</div></div>`;
  return `<div style="position:relative">${B.bDesktop().replace(/hov is-open/g, "hov").replace("__H__", "1000px").replace('class="chai-app desk"', 'class="chai-app desk" data-x').replace("</main>", `</main><div style="position:absolute;inset:0;background:oklch(0.16 0.008 260 / 0.25);z-index:10"></div>${drawer}`)}</div>`;
}
function bPhones() {
  return `<div style="display:flex;gap:40px">${frame("Phone · empty", phone({ h: 860, body: `${header({ lede: emptyLede, phone: true, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}${emptyCard({ ph: true })}` }))}
    ${frame("Phone · a subscription opened (a sheet)", phone({ h: 860, body: `<div style="margin:-18px -16px -28px;flex:1;position:relative;background:oklch(0.16 0.008 260 / 0.3)"><div style="position:absolute;left:0;right:0;bottom:0;top:40px;background:var(--surface);border-radius:26px 26px 0 0;padding:10px 16px 20px;display:flex;flex-direction:column;gap:14px"><span style="width:40px;height:5px;border-radius:9px;background:var(--fill-strong);align-self:center"></span><div class="row" style="gap:12px">${mono(NET, 36)}<div class="grow"><b style="font-size:16px">Netflix Premium</b><div class="muted" style="font-size:12px;font-weight:600">Renews Fri, Oct 23 · in 3 days</div></div><span class="pill pill-due">In 3 days</span></div><div class="stile feature" style="padding:14px">${rings(340, 90, { opacity: 0.12 })}<span class="v">${inr(649)} <small>a month</small></span><span class="s">${inr(7788)} a year · Millennia</span></div><div><div class="between"><span class="th">What each payment cost</span>${L.changeChip(NET)}</div>${P.priceStep(NET, { w: 330, h: 110, pad: 18 })}</div><div>${P.paymentRows(NET, 3, { phone: true })}</div><div class="row" style="gap:8px;margin-top:auto">${btn("Mark paid", { kind: "primary", cls: "grow", icon: I.check(11) })}${btn("Edit", { kind: "soft" })}${iconBtn(I.more(), "More")}</div></div></div>` }))}</div>`;
}
export function bStates() {
  return board({ title: "B · Calendar: states", intro: "The calendar direction with no data, one subscription, a renewal that's due, paused and cancelled ones, and where a subscription's own history lives: a drawer that opens from any renewal or row.", body: [
    section(1, "Empty", "The timeline keeps its axis and today line, so it's clear what will appear.", bEmpty()),
    section(2, "One subscription", "One stem, and a year of expected months. Past months are striped until payments are recorded.", bOne()),
    section(3, "A renewal due soon", "Same rules as a card bill: red within 3 days, amber within a week. Mark paid records the plan's price on the renewal date, to the usual card.", bDue()),
    section(4, "Paused and cancelled", "", bOff()),
    section(5, "One subscription's history", "Clicking a renewal, an agenda row or a Costs-the-most row opens a drawer with its price history and payments.", bDrawer()),
    section(6, "Phone", "", bPhones()),
  ].join("") });
}

// ================= C =================
function cEmpty() {
  return desktop({ h: "fit", body: `${header({ lede: emptyLede, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}
    <div style="display:flex;gap:16px;padding-top:6px"><div class="dtile" style="width:270px;height:180px;background:linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to));opacity:0.55">${rings(270, 180, { stroke: "var(--rings-light)", opacity: 0.07, count: 10 })}<span style="display:flex">${I.subs(18)}</span><div><div style="font-size:16px;font-weight:800">All subscriptions</div><div class="dt-muted" style="margin-top:6px">₹0 a month</div></div></div><span class="addtile" style="width:206px;height:180px;border-color:var(--accent-edge);color:var(--accent-text)">${I.plus(18)}Add subscription</span></div>
    ${emptyCard()}` });
}
function cOne() {
  const s = NET;
  const tile = C.tileRow({ sel: "netflix", list: [s], nums: { monthly: 649, active: 1, frac: 0, pill: "1 to renew in Oct", right: `${inr(0)} of ${inr(649)} paid` } }).replace(/<span style="position:absolute;right:0;top:0;bottom:0;width:90px[\s\S]*?<\/span><span class="btn btn-icon"[\s\S]*?<\/span><\/div>$/, "</div>");
  const details = C.cDesktop().match(/<div class="dpane dpane-netflix">([\s\S]*?)<\/div><div class="dpane dpane-icloud">/)[1].replace(/₹16,418 <span class="muted" style="font-weight:600">· 32<\/span>/, "₹0").replace(/<span class="chg chg-up">[\s\S]*?on Jul 23<\/span>/, "<b>None yet</b>");
  return desktop({ h: "fit", body: `${header({ lede: oneLede, actions: L.headerActions() })}${tile.replace(/dtile sel"/g, 'dtile"').replace('for="c-sel-netflix" class="dtile"', 'for="c-sel-netflix" class="dtile sel"')}
    <div style="display:grid;grid-template-columns:minmax(0,0.95fr) minmax(0,1.25fr);gap:20px;align-items:start">${details}
    <section class="card glass" style="align-items:center;text-align:center;justify-content:center;min-height:330px"><span style="width:44px;height:44px;border-radius:14px;background:var(--fill);color:var(--muted);display:flex;align-items:center;justify-content:center">${I.cal(20)}</span><b style="font-size:15px">No payments recorded yet</b><p class="card-note" style="max-width:360px">Mark Netflix paid when it renews on Oct 23. Past payments since Feb 2024 can be added too, which also fills in its price history.</p><div class="row">${btn("Add past payments", { kind: "soft", cls: "btn-sm" })}</div></section></div>` });
}
function cDue() {
  const tiles = (paid) => {
    const row = C.tileRow({ sel: "netflix", list: L.byNext.slice(0, 3), add: false });
    return paid ? row.replace(/<span class="dt-pill due">Oct 23 · 3d<\/span>/, `<span class="dt-pill" style="background:oklch(0.88 0.17 138 / 0.3)">${I.check(9)} Paid Oct 23</span>`).replace(/₹649 \/ month<\/span><span class="dt-muted" style="font-weight:700">90%/, "₹649 / month</span><span class=\"dt-muted\" style=\"font-weight:700\">0%").replace(/width:90(\.\d+)?%;height:100%;background:oklch\(1 0 0 \/ 0.85\)/, "width:0%;height:100%;background:oklch(1 0 0 / 0.85)") : row;
  };
  return `<div style="display:grid;grid-template-columns:1fr;gap:20px">
    ${frame("Due in 3 days or less: the tile's date pulses, and its bar is nearly full", `<section class="card glass" style="overflow:hidden;padding:4px 22px">${tiles(false)}</section>`)}
    ${frame("After Mark paid: the bar starts again for the next cycle", `<section class="card glass" style="overflow:hidden;padding:4px 22px 70px;position:relative">${tiles(true)}${toast("Netflix: ₹649 paid on Oct 23 to Millennia")}</section>`)}
    ${frame("Not recorded: an amber dot on the tile and a line on its details", `<section class="card glass" style="overflow:hidden;padding:4px 22px">${C.tileRow({ sel: "", list: [L.sub("icloud")], add: false }).replace(/<span class="dt-pill soon">Oct 24 · 4d<\/span>/, `<span class="dt-pill" style="background:oklch(0.8 0.13 80 / 0.4)">Sep 24 not recorded</span>`)}<div class="notice" style="margin-top:4px">${I.alert(16)}<span class="grow"><b>iCloud+ renewed on Sep 24</b>, but no payment is recorded for it.</span>${btn("Record payment", { cls: "btn-sm" })}</div></section>`)}
    ${frame("The All tile counts what's left this month", `<section class="card glass" style="overflow:hidden;padding:4px 22px">${C.tileRow({ sel: "all", list: [], add: false })}</section>`)}
  </div>`;
}
function cOff() {
  const s = L.sub("sonyliv");
  const card = `<section class="card glass" style="padding:0;gap:0;overflow:hidden"><div class="textured" style="margin:10px;border-radius:18px;padding:18px 20px;color:var(--on-card);background:linear-gradient(150deg,var(--card-onyx-from),var(--card-onyx-to));filter:grayscale(0.6)">${rings(560, 170, { stroke: "var(--rings-light)", opacity: 0.06 })}<div class="between"><span class="dt-muted" style="font-size:12px">SonyLIV Premium · Streaming</span><span class="dt-pill" style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--on-card-fill)">Cancelled</span></div><div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span style="font-size:34px;font-weight:800">${inr(999)}</span><span class="dt-muted" style="font-size:13px;font-weight:700">a year, until you cancelled</span></div><div class="dt-muted" style="margin-top:14px;font-size:12px">Cancelled on Sep 14 · it won't renew on Nov 3</div></div>
    <div style="padding:6px 20px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;font-size:13px"><div class="between"><span class="muted" style="font-weight:600">Started</span><b>${fmtY(s.startDate)}</b></div><div class="between"><span class="muted" style="font-weight:600">Paid in all</span><b>${inr(L.paidSoFar(s))} · 2</b></div><div class="between"><span class="muted" style="font-weight:600">Last paid</span><b>Nov 3, 2025</b></div><div class="between"><span class="muted" style="font-weight:600">Charged to</span>${cardChip(s.via)}</div><div style="grid-column:1/-1;display:flex;gap:8px">${btn("Restart", { kind: "soft", cls: "btn-sm", icon: I.play(10) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}</div></div></section>`;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
    ${frame("At the end of the row, greyed", `<section class="card glass" style="overflow:hidden;padding:4px 22px">${C.tileRow({ sel: "", list: L.SUBS.filter((x) => !L.isOn(x)), add: true })}</section>`)}
    ${frame("Selected: what it cost while it ran, and Restart", card)}
  </div>`;
}
function cPhones() {
  return `<div style="display:flex;gap:40px">${frame("Phone · empty", phone({ h: 860, body: `${header({ lede: emptyLede, phone: true, actions: btn("Add subscription", { kind: "primary", icon: I.plus() }) })}${emptyCard({ ph: true })}` }))}
    ${frame("Phone · one subscription", phone({ h: 860, body: `${header({ lede: oneLede, phone: true })}<div style="margin:0 -16px;overflow:hidden"><div style="display:flex;gap:12px;padding:10px 16px 16px">${C.tileRow({ sel: "netflix", list: [NET], tileW: 180, h: 164 }).match(/<label for="c-sel-netflix"[\s\S]*?<\/label>/)[0].replace('class="dtile', 'class="dtile sel')}<span class="addtile" style="width:150px;height:164px">${I.plus(18)}Add</span></div></div><section class="card glass" style="padding:16px;align-items:center;text-align:center"><b>No payments recorded yet</b><p class="card-note">Mark it paid when it renews on Oct 23.</p></section>` }))}</div>`;
}
export function cStates() {
  return board({ title: "C · Tiles and details: states", intro: "The tile direction with no data, one subscription, a renewal that's due, and paused or cancelled ones. A tile's bar shows how far through its cycle it is, so it fills up as the renewal gets close.", body: [
    section(1, "Empty", "The All tile waits at ₹0 beside the add tile.", cEmpty()),
    section(2, "One subscription", "Its details are complete from the start. Payments fill in as they're recorded.", cOne()),
    section(3, "A renewal due soon", "Same rules as a card bill: the date pulses within 3 days, amber within a week.", cDue()),
    section(4, "Paused and cancelled", "", cOff()),
    section(5, "Phone", "", cPhones()),
  ].join("") });
}
