// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as D from "./dash.mjs";
import * as E from "./entries.mjs";
import * as Y from "./dash2.mjs";
import * as Z from "./dash3.mjs";
import { formsBoard } from "./forms3.mjs";
import { readmeBoard } from "./readme.mjs";

export const PAGES = [
  { id: "readme", name: "Read me first" },
  { id: "r4", name: "Round 4: visuals without RSU/ESPP (Z8–Z11)" },
  { id: "r3", name: "Round 3: the picked layout (Z1–Z7)" },
  { id: "r2", name: "Round 2: Year in columns + widgets (Y1–Y4)" },
  { id: "dash", name: "Round 1: Dashboard (I1–I4)" },
  { id: "entries", name: "Round 1: Entries page (E1–E3)" },
];
export const NOTES = [
  { page: "r4", text: "Round 4 (2026-10-24): RSU and ESPP aren't income any more (decision 7), so the salary is about 93% of the year and Z1's map became one big block. Four visuals for the same slot that still read: Z8 Year rings (each source's own year, every ring the same size), Z9 Lens (the salary, and the rest blown up beside it), Z10 Pay ladder (every payment on a scale that grows ×10 every two steps), Z11 Receipt (the year itemised). Z4 to Z7 on the Round 3 page are redrawn without RSU and ESPP too. Sample data, made up." },
  { page: "r3", text: "Round 3 (2026-10-24): the layout Prathik described. 1 the cover (I4) full width, now with the pick's details and Edit / Mark received / ⋯ actions; 2 a colourful visual beside the entries; 3 a full-width trend card that switches between this year and last, month by month and pay rhythm; 4 every source; 5 the pay calendar beside pay changes drawn as bars (by percent or in rupees). Z1 treemap, Z2 bento tiles, Z3 bubbles; Z1 is the picked visual (2026-10-24) and now has the income heatmap straight under the cover. Z4 orbits, Z5 coins, Z6 payday dial and Z7 vials are the same page with visuals that aren't blocks or tiles. Pick a block, tile or bubble and the cover, entries, sources and calendar follow. Sample data, made up." },
  { page: "r2", text: "Round 2 (2026-10-24): Prathik picked the I4 hero, Year in columns. Four pages with that hero and different widgets, never more than two to a row. Y1 Everyday, Y2 Planner, Y3 Analyst, Y4 Records-led. Every page has Sources, Pay calendar, Pay rhythm, This year and last (with a Month by month switch) and an Entries card; new are Financial year, What's ahead, Salary investments and one-offs, and Pay changes. The source chips in the hero also filter the entries, sources, pay rhythm and calendar. Sample data, made up." },
  { page: "readme", text: "Income, round 1 (2026-10-24). Read this first: what is on the canvas, the money rules the mockups use, and the open decisions with their defaults." },
  { page: "dash", text: "Round 1 (2026-10-24): the /income dashboard, four directions with the same greeting and each its own hero. I1 Payday river, I2 Money flow, I3 Income wheel, I4 Year in columns. Sample data, made up; today is Oct 24, 2026." },
  { page: "entries", text: "Round 1 (2026-10-24): the Entries page, /income/entries, the Income counterpart of Cards' Statements, Subscriptions' Renewals and Accounts' Balance history. E1 Ledger (Renewals' layout), E2 Pay grid (sources by month), E3 Passbook (one source's whole history). Sample data, made up." },
];
// `frozen`: drawn while RSU and ESPP counted as income (before decision 7, 2026-10-24). Their .dc.html files are kept as
// shown and never rebuilt; the sample data no longer has those sources, so rendering them would crash or quietly change them.
const FROZEN = /^Income(I\d|Y\d|Z[23]|E2)\./;
export const BOARDS = [
  { file: "IncomeReadme.dc.html", w: 1300, page: "readme", render: readmeBoard },
  { file: "IncomeZ8.dc.html", w: 1600, page: "r4", render: Z.z8 },
  { file: "IncomeZ9.dc.html", w: 1600, page: "r4", render: Z.z9 },
  { file: "IncomeZ10.dc.html", w: 1600, page: "r4", render: Z.z10 },
  { file: "IncomeZ11.dc.html", w: 1600, page: "r4", render: Z.z11 },
  { file: "IncomeZ1.dc.html", w: 1600, page: "r3", render: Z.z1 },
  { file: "IncomeZ2.dc.html", w: 1600, page: "r3", render: Z.z2 },
  { file: "IncomeZ3.dc.html", w: 1600, page: "r3", render: Z.z3 },
  { file: "IncomeZ4.dc.html", w: 1600, page: "r3", render: Z.z4 },
  { file: "IncomeZ5.dc.html", w: 1600, page: "r3", render: Z.z5 },
  { file: "IncomeZ6.dc.html", w: 1600, page: "r3", render: Z.z6 },
  { file: "IncomeZ7.dc.html", w: 1600, page: "r3", render: Z.z7 },
  { file: "IncomeZForms.dc.html", w: 1900, page: "r3", render: formsBoard },
  { file: "IncomeY1.dc.html", w: 1600, page: "r2", render: Y.y1 },
  { file: "IncomeY2.dc.html", w: 1600, page: "r2", render: Y.y2 },
  { file: "IncomeY3.dc.html", w: 1600, page: "r2", render: Y.y3 },
  { file: "IncomeY4.dc.html", w: 1600, page: "r2", render: Y.y4 },
  { file: "IncomeI1.dc.html", w: 1600, page: "dash", render: D.i1 },
  { file: "IncomeI2.dc.html", w: 1600, page: "dash", render: D.i2 },
  { file: "IncomeI3.dc.html", w: 1600, page: "dash", render: D.i3 },
  { file: "IncomeI4.dc.html", w: 1600, page: "dash", render: D.i4 },
  { file: "IncomeE1.dc.html", w: 1600, page: "entries", render: E.e1 },
  { file: "IncomeE2.dc.html", w: 1600, page: "entries", render: E.e2 },
  { file: "IncomeE3.dc.html", w: 1600, page: "entries", render: E.e3 },
].map((b) => ({ ...b, frozen: FROZEN.test(b.file) }))
