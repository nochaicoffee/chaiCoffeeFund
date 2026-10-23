// Round 3: the hero visuals from rounds 1 and 2 together on ONE page. The page stays light; only the cover on top is dark,
// as on Subscriptions: its background and the page's accent take the picked loan's colour, and every widget follows the pick.
//   N1 Tiles cover       PICKED by Prathik, then revised: the cover holds the loan tiles, the EMI cliffs and the rings; under it the principal and
//                        interest by month beside the EMI history, the loans, the schedule and the rest. No time machine, no EMI tally.
//   N2 Figures cover     pills, the big figures and the descent on the cover; two columns of widgets below
//   N3 Rings cover       the rings on the left of the cover, figures and the cliffs on the right; the rest as four sections
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as N from "./nwidgets.mjs";
const { grid, coverPage } = N;
const header = () => L.header({ lede: P.pointLede(), actions: L.greetingActions() });
const frame = (cover, rest, cls = "") => coverPage({ header: header(), attention: P.attention(), cover, rest, cls });
const kicker = (t) => `<div class="hk">${t}</div>`;

export function n1() {
  // Every two-up row below is the same equal split (as Accounts and Income: "an equal two-column split; every row below is the same split so edges line up and cards end level"),
  // and the Loans table is full width like Income's Sources table. The cover is the tiles cover, with the EMI cliffs and the payoff widget (R4, capsules) as equal halves. Palette P6: solid principal, interest as a dashed outline.
  return frame(`${N.pickerTiles()}${grid([[6, N.cliffs({ H: 230, bare: true })], [6, N.payoff("capsule", { bare: true })]])}`,
    `${grid([[6, N.splitMonthly()], [6, N.payments()]])}${grid([[12, P.loansTable()]])}${grid([[6, N.scheduleFollow()], [6, P.comingUp({ n: 5, filter: false })]])}${grid([[6, N.anatomy5()], [6, N.clock()]])}${grid([[6, N.whatIf()], [6, N.emiAnatomy()]])}${grid([[6, N.load("bar")], [6, P.costCard()]])}`, "pal-outline");
}
export function n2() {
  return frame(`<div class="between" style="align-items:flex-start;gap:24px">${kicker("Pick a loan · the page follows")}${N.pickerPills()}</div>${N.figures({ bare: true })}${N.descent({ H: 230, bare: true })}`,
    `${grid([[6, N.cliffs({ H: 235 })], [6, N.rings({ S: 290 })]])}${grid([[12, N.tally()]])}${grid([[6, N.bricks()], [6, N.anatomy5()]])}${grid([[4, N.gauge()], [4, N.clock()], [4, N.emiAnatomy()]])}${grid([[7, N.whatIf()], [5, P.comingUp({ n: 4, filter: false })]])}`);
}
const sec = (n, title, desc) => `<div class="nsec"><span class="nsn">${n}</span><div><h2>${title}</h2><p>${desc}</p></div></div>`;
export function n3() {
  const cover = `<div style="display:grid;grid-template-columns:360px minmax(0,1fr);gap:36px;align-items:center"><div>${N.rings({ S: 330, bare: true })}</div><div style="display:flex;flex-direction:column;gap:22px">${N.pickerPills()}${N.figures({ bare: true })}${N.cliffs({ H: 190, bare: true })}</div></div>`;
  return frame(cover,
    `${sec("01", "Where you are", "What a date in the past or future looks like, and the countdown to the last EMI.")}${grid([[7, N.bricks()], [5, N.clock()]])}${sec("02", "Where it's heading", "The balance falling to zero, loan by loan.")}${grid([[12, N.descent({ H: 210 })]])}${sec("03", "What it costs", "Interest against principal, what an extra payment would change, and how heavy the EMIs are.")}${grid([[7, N.anatomy5()], [5, N.gauge()]])}${grid([[7, N.whatIf()], [5, N.emiAnatomy()]])}${sec("04", "Day by day", "Every EMI on one calendar, and the next ones due.")}${grid([[12, N.tally()]])}${grid([[6, P.comingUp({ n: 4, filter: false })], [6, P.costCard()]])}`);
}
