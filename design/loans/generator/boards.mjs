// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as D from "./dash.mjs";
import * as M from "./dash2.mjs";
import { formsBoard } from "./forms.mjs";
import * as N from "./dash3.mjs";
import { ringsBoard, palettesBoard, gaugeBoard } from "./dash5.mjs";

export const PAGES = [
  { id: "r4", name: "Round 4: picks (payoff widget, colours)" },
  { id: "r3", name: "Round 3: one page, dark cover (N1–N3)" },
  { id: "forms", name: "Forms: add loan, mark paid, prepayment" },
  { id: "r2", name: "Round 2: Hands-on directions (M1–M4)" },
  { id: "r1", name: "Round 1: Dashboard directions (L1–L6)" },
];
export const NOTES = [
  { page: "r4", text: "Round 4 (2026-10-25): Prathik liked the tiles cover (N1) but not the rings or the green and orange for principal and interest, and asked for widgets of a similar size laid out as on the other dashboards. Payoff widget: five ways (R1 clean rings, R2 half dial, R3 donut by what you owe, R4 capsules, R5 three dials). Palettes: six principal and interest colour pairs on the monthly chart. N1 is redone with equal halves everywhere, the Loans table full width, and a Payments card like Subscriptions' (a table, a Payments / Prepayments toggle, the 6 most recent, a hint line). Sample data, made up." },
  { page: "r3", text: "Loans, round 3 (2026-10-25): the hero visuals of rounds 1 and 2 as widgets on ONE page. The page stays light; only the cover on top is dark, as on Subscriptions. Pick a loan (tiles, pills) and the whole page follows: the cover's background and the page's accent take the loan's colour, the charts fade the other loans, and the widgets that show one loan's own numbers switch to it. N1 Tiles cover (the cover holds the loan tiles, the descent and the rings), N2 Figures cover (pills, big figures and the descent), N3 Rings cover (rings on the left; four sections below). Widgets: the descent, EMI cliffs, payoff rings, time machine, EMI tally, cost anatomy, debt-free clock, EMI load gauge, what-if prepayment, inside an EMI. Sample data, made up." },
  { page: "forms", text: "Loan forms (2026-10-25), following the prepayment design in system-design.md: Add loan (first EMI date, stamp duty, pre-EMI interest, the usual prepayment effect, charge and limits; the preview shows what reaches the account), Mark paid (anything above the EMI becomes a prepayment, in the same save), Add prepayment (effect, charge, the bank's own figures, limits as warnings), and the cost of borrowing with interest and charges apart. Sample data, made up; the first form uses the numbers from the HDFC agreement." },
  { page: "r2", text: "Loans, round 2 (2026-10-25): four hands-on directions with few visuals. Everything is a chip you can pick (hover and click in the preview). M1 Time machine (pick a date, past or future: a wall of ₹1L bricks, one colour per loan), M2 What if (pick a loan and an extra monthly amount: when it ends, interest saved; a what-if only, prepayment is not designed), M3 EMI anatomy (pick a loan and an EMI: how much of it is interest, on a curve of the whole loan), M4 Load gauge (a needle for the share of salary that goes to EMIs, today and after each loan ends). Sample data, made up." },
  { page: "r1", text: "Loans, round 1 (2026-10-25): the /loans dashboard, six directions with the same greeting and attention strip, each with its own idea for the hero, taken from the subject: L1 The descent (what you owe, stacked by loan, falling to the debt-free date), L2 EMI cliffs (what leaves each month, stepping down as loans end), L3 Payoff rings (a ring per loan, and a dot for how far through its term it is), L4 EMI tally (a tick for every EMI on one calendar), L5 Cost anatomy (what each ₹1 borrowed costs), L6 Debt-free clock (a countdown, and what each loan ending frees up). The widgets under each hero are the same shared ones in a different order; the real layout is picked after the hero. Sample data, made up; today is Oct 25, 2026." },
];
export const BOARDS = [
  { file: "LoansGauge.dc.html", w: 1500, page: "r4", render: gaugeBoard },
  { file: "LoansRings.dc.html", w: 1500, page: "r4", render: ringsBoard },
  { file: "LoansPalettes.dc.html", w: 1500, page: "r4", render: palettesBoard },
  { file: "LoansN1.dc.html", w: 1600, page: "r3", render: N.n1 },
  { file: "LoansN2.dc.html", w: 1600, page: "r3", render: N.n2 },
  { file: "LoansN3.dc.html", w: 1600, page: "r3", render: N.n3 },
  { file: "LoansForms.dc.html", w: 1100, page: "forms", render: formsBoard },
  { file: "LoansM1.dc.html", w: 1600, page: "r2", render: M.m1 },
  { file: "LoansM2.dc.html", w: 1600, page: "r2", render: M.m2 },
  { file: "LoansM3.dc.html", w: 1600, page: "r2", render: M.m3 },
  { file: "LoansM4.dc.html", w: 1600, page: "r2", render: M.m4 },
  { file: "LoansL1.dc.html", w: 1600, page: "r1", render: D.l1 },
  { file: "LoansL2.dc.html", w: 1600, page: "r1", render: D.l2 },
  { file: "LoansL3.dc.html", w: 1600, page: "r1", render: D.l3 },
  { file: "LoansL4.dc.html", w: 1600, page: "r1", render: D.l4 },
  { file: "LoansL5.dc.html", w: 1600, page: "r1", render: D.l5 },
  { file: "LoansL6.dc.html", w: 1600, page: "r1", render: D.l6 },
];
