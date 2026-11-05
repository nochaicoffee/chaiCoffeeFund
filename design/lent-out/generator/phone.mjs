// L1 Promise ledger on a phone: the cards stack, the picked loan opens under them, the widgets stack, and the forms are bottom sheets.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { l3Hero, view } from "./final.mjs";
import { clockWidget } from "./clock.mjs";
import { F, addFieldsPaid, recordFields, repaidFields, H2 } from "./forms.mjs";
const { I, inr, btn } = L;
const { card, cardHead, link, tile, dm, dmy, rateText, termsText, daysAway } = P;

const phone = ({ body }) => `<div class="chai-app ph" style="width:390px;height:__H__"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div></div>`;
const phHead = () => `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow">Lent out · Today ${P.sampleTag("Sample payments")}</div><h1>Good afternoon, Prathik</h1><div class="lede">${P.pointLede()}</div></div><div class="pg-actions">${btn("Record a repayment", { icon: I.coin(14) })}${btn("Add a loan", { kind: "primary", icon: I.plus() })}</div></header>`;
const hero = (opt) => l3Hero({ live: false, ...opt });
const loanCards = () => card(`${cardHead("Loans", "money lent, outside any bank")}${D.LOANS.map((l) => { const s = D.S[l.id], pay = l.interestMode === "Paid-out", nd = D.nextDue(l, D.TODAY); return `<div class="pph-row">${tile(l, 38)}<div class="nm2"><b>${l.borrowerName}</b><small>${pay ? `${termsText(l)} · ${rateText(s.rate)}` : `${termsText(l)} a year`}</small></div><div class="r"><b class="num">${inr(s.owedToday)}</b><small>owed today</small></div><div class="full">Lent ${dmy(l.startDate)} · ${pay ? `${inr(D.expectedSoFar(l))} expected, ${inr(D.receivedSoFar(l))} in${D.notReceived(l) ? `, <b style="color:var(--loss)">${inr(D.notReceived(l))} missing</b>` : ""}` : `${inr(s.interestOwed)} interest owed, ${inr(D.perDay(l))} a day`} · ${nd ? `next ${dm(nd)}` : "no due date"}</div></div>`; }).join("")}`, { gap: 4 });
const sheet = (inner) => `<div class="tsheet" style="margin:0 -16px -28px"><div class="grab"></div>${inner}</div>`;
const dimTop = (h = 190) => `<div style="height:${h}px;overflow:hidden;opacity:.35;filter:blur(1.5px);pointer-events:none;display:flex;flex-direction:column;gap:14px">${phHead()}</div>`;
const sh = (icon, title, sub, tint = "") => `<div class="dlg-h" style="padding:0"><span class="dlg-ic"${tint ? ` style="${tint}"` : ""}>${icon}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x(14)}</span></div>`;
const flds = (h) => `<div class="fields" style="grid-template-columns:1fr">${h}</div>`;
const pvs = (rows) => F.box(rows);

export function phoneBoard() {
  const p1 = phone({ body: `${phHead()}${P.attention()}${hero({ pick: "all" })}` });
  const p2 = phone({ body: hero({ pick: "a", title: "Who owes what", sub: "" }) });
  const p3 = phone({ body: clockWidget({ live: false, period: "day", phone: true }) });
  const p3b = phone({ body: clockWidget({ live: false, period: "ever", phone: true }) });
  const p4 = phone({ body: `${loanCards()}${P.comingUp()}${P.repaymentsLog()}` });
  const p5 = phone({ body: hero({ v: view(D.CROWD, D.CROWD_REPAYMENTS), pick: "all", flags: false }) });
  const s1 = phone({ body: `${dimTop()}${sheet(`${sh(I.plus(18), "Add a loan", "Interest paid out on a schedule")}${flds(addFieldsPaid())}${pvs([["Works out to", `<b>24%</b> a year`], ["Its block", `<b>${((D.S.b.owedToday / D.TOTAL) * 100).toFixed(1)}%</b> of the total`]])}${btn("Add loan", { kind: "primary", icon: I.plus() })}`)}` });
  const s2 = phone({ body: `${dimTop()}${sheet(`${sh(I.alert(18), "Record a repayment", "More than is still out", "background:var(--warning-tint);color:var(--warning-text)")}${flds(recordFields("Principal", "7,00,000", { warn: `That's ${inr(700000 - D.A.principalAmount)} more than is still out (${inr(D.A.principalAmount)}). The page would show ₹0 out. Check the amount, or choose Interest.` }))}${pvs([["Principal out", `${inr(D.A.principalAmount)} → <b>₹0</b>`], ["Owed today", `${inr(H2.before.owedToday)} → <b>${inr(H2.after.owedToday)}</b>`]])}${btn("Record it anyway", { kind: "primary", icon: I.check(14) })}${btn("Change the amount")}`)}` });
  const s3 = phone({ body: `${dimTop()}${sheet(`${sh(I.check(18), "Mark this loan repaid", "Friend – ₹3L")}${flds(repaidFields("Nov 6, 2026"))}${pvs([["Owed today", `${inr(D.S.b.owedToday)} → <b>₹0</b>`], ["Total owed", `${inr(D.TOTAL)} → <b>${inr(D.TOTAL - D.S.b.owedToday)}</b>`], ["Next due", "1 Dec 2026 → <b>none</b>"]])}${btn("Mark repaid", { kind: "primary", icon: I.check(14) })}`)}` });
  const s4 = phone({ body: `${dimTop()}${sheet(`${sh(I.alert(18), "Delete this loan?", "Friend – ₹3L and its repayments", "background:var(--negative-tint);color:var(--negative)")}${pvs([["The loan", "<b>Friend – ₹3L</b>"], ["Its repayments", "<b>0</b> rows"], ["Net worth, Lent out", `<b>−${inr(D.S.b.owedToday)}</b>`]])}<div class="checkrow"><span class="box off"></span><span>I understand this can't be undone. <b>Mark repaid</b> keeps the history instead.</span></div>${F.fld("Type the loan's name", F.inp("Friend – ₹3L", { focus: true }), { req: true })}<span class="btn btn-danger" style="justify-content:center">${I.alert(14)} Delete loan and repayments</span>${btn("Keep it")}`)}` });
  const items = [["Top: greeting, attention, the map", p1], ["A block opened: without this one", p2], ["Interest clock, a day", p3], ["Interest clock, all time", p3b], ["Loans, coming up, money back", p4], ["Sixteen people: a scrolling list", p5], ["Add a loan (sheet)", s1], ["Record a repayment, a warning (sheet)", s2], ["Mark repaid (sheet)", s3], ["Delete (sheet)", s4]];
  const W = 48 * 2 + items.length * 390 + (items.length - 1) * 36;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Lent out on a phone · the final page</h2><span class="sample">Payments received are sample, made up</span></div><p>The same order as the page: greeting (its figures point on tap), the two attention items, <b>Who owes what</b> (the blocks stack: the biggest full width, the others side by side; tap one to see the total without it), then the <b>Interest clock</b> as its own coloured widget (it keeps its own colour and switch), then loans as cards, interest coming up and money back. Sixteen people turn the blocks into a scrolling list. The forms are <b>bottom sheets</b> over the page.</p></div><div style="display:flex;gap:36px;align-items:flex-start;flex-wrap:nowrap">${items.map(([l, p]) => `<div><div class="frame-l">${l}</div>${p}</div>`).join("")}</div>`;
  return `<div class="chai-app board" style="width:${W}px;height:__H__">${body}</div>`;
}
