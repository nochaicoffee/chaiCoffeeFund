// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import { render } from "./heroes.mjs";
import { renderF, renderS1, renderS2 } from "./statements.mjs";

export const PAGES = [
  { id: "r2", name: "Round 2 · E1 Split picked, and the Statements pages: every payment month by month, and one month as a statement" },
  { id: "r1", name: "Round 1 · four hero ideas on the same page (E1 Split picked)" },
];
export const NOTES = [
  { page: "r2", text: "Expenses, round 2 (2026-11-08). Prathik picked E1 Split and asked for statements like the Cards and Income pages have. F1: the page with E1 as its hero, a Statements button in the greeting, the month's statement linked from Where the month went and every payment from the table. S1 Statements: every month's spending in one place, in the Cards and Income statements layout: four tiles, a filter by kind (click one: All, Card bills, EMIs, Subscriptions, Insurance, Cash and UPI), month groups with a row per payment, each big spend shown on the bill or the cash line it sits in. S2 One month: one month as a statement: the bank at its start, came in, spent, the bank at its end; every payment under its part with subtotals, the total, and How it adds up beside it. Step through the months with the arrows. Every figure is made up." },
  { page: "r1", text: "Expenses, round 1 (2026-11-08). A page of its own for what Prathik spends each month (spec: docs/design/expenses.md). Spent = came in − invested − lent out − what stayed in the bank, over the savings and salary accounts; it splits into card bills (paid that month), EMIs (in full), subscriptions off cards, insurance and cash and UPI, the part no record explains. Big spends are entered by hand and explain a month, never add to it. Every board shares the pointing greeting, Where the month went beside Big spends, and the months table; only the hero differs. E1 Split: what came in, split into spent, invested and kept, then spent opened into its parts. E2 Bridge: the calculation itself, from the bank at the start of the month to the bank at its end. E3 Year: twelve months as stacked columns with the big spends pinned on them. E4 Receipt: the month printed as a receipt, the months as tabs beside it. Click a month (a chip, a column, a tab or a table row) and the whole page follows. Every figure is made up." },
];
export const BOARDS = [
  { file: "ExF1.dc.html", w: 1600, page: "r2", render: renderF },
  { file: "ExS1.dc.html", w: 1600, page: "r2", render: renderS1 },
  { file: "ExS2.dc.html", w: 1600, page: "r2", render: renderS2 },
  { file: "ExE1.dc.html", w: 1600, page: "r1", render: render("e1") },
  { file: "ExE2.dc.html", w: 1600, page: "r1", render: render("e2") },
  { file: "ExE3.dc.html", w: 1600, page: "r1", render: render("e3") },
  { file: "ExE4.dc.html", w: 1600, page: "r1", render: render("e4") },
];
