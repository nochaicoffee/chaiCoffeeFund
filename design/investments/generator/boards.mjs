// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as H from "./heroes.mjs";
import * as H2 from "./heroes2.mjs";
import * as H3 from "./heroes3.mjs";
import * as H5 from "./heroes5.mjs";
import * as FN from "./final.mjs";
import * as SV from "./splitvariants.mjs";
import * as SV2 from "./splitvariants2.mjs";
import * as DN from "./donuts.mjs";

export const PAGES = [{ id: "donuts", name: "Exploration · Donuts and pies: six unusual takes" }, { id: "split2", name: "Exploration · How it's split: five cooler layouts" }, { id: "split", name: "Exploration · How it's split: five fuller layouts" }, { id: "final", name: "FINAL: L1 Giant, the page" }, { id: "phone", name: "FINAL: phone" }, { id: "states", name: "FINAL: states" }, { id: "forms", name: "FINAL: forms" }, { id: "r4", name: "Exploration · Round 4: Time machine, calmer hero (L1–L4)" }, { id: "r3", name: "Exploration · Round 3: Dark stage + lens, full-width (K1–K5)" }, { id: "r2", name: "Exploration · Round 2: Interactive, after the dashboard he shared (J1–J5)" }, { id: "r1", name: "Exploration · Round 1: Hero directions (I1–I5)" }];
PAGES.sort((a, b) => (b.name.startsWith("FINAL") ? 1 : 0) - (a.name.startsWith("FINAL") ? 1 : 0));
export const NOTES = [
  { page: "donuts", text: "Donuts and pies, six unusual takes (2026-11-04): Morph (ten arcs that glide into each slicing), Spin wheel, Explode (a pie that unfolds its holdings), Gauge, a tilted 3D stack and a Rose. All interactive in the browser with no script. Sample data, made up." },
  { page: "split2", text: "How it's split, five cooler and more interactive layouts (2026-11-02): a Sunburst you zoom into, packed Bubbles, a Flow from one slicing into another, an accordion Pillar and animated Orbits, with the Treemap beside them. Sample data, made up." },
  { page: "split", text: "How it's split, five fuller layouts (2026-11-02): the donut and list leaves white space when a slice has few rows. Today's widget (first) beside a Treemap, a Waffle, Columns, nested Rings and Rows that show what is inside. The six slice chips drive every card at once. Sample data, made up." },
  { page: "final", text: "Investments, the picked design (2026-11-02): L1 Giant. The holdings strip picks what to look at (Everything, or one holding); the dark stage holds the big number, the chart, Go back to a day, Worth or Race and the range; the returns sit under it; then the holdings as they stood, the cash at your brokers (2026-11-04), money in, the same money elsewhere and Understand it. Sample data, made up; today is Saturday Oct 31, 2026. Redrawn 2026-11-04 for the key metrics: the greeting gains a yearly-return sentence, the Returns row has six cards (Yearly return as XIRR, Against the index, Total return all in, Made on shares sold, Dividends, Deepest fall), a holding has eight stats and a past day eight cards. How an RSU vest and an ESPP purchase count is answered (PRD Q12)." },
  { page: "phone", text: "Investments on a phone: the same order as the page. Only the stage is live (go back to a day, Worth or Race, the range)." },
  { page: "states", text: "Investments states: no trades, the price sources down, a sell that is more than was held, going back to before you started, a holding with no price ticker, (2026-11-04) a holding too new for a yearly return, cash at a broker that is old, and a buy bigger than the cash." },
  { page: "forms", text: "Investments forms: Add a trade, Edit a trade, Sell (too many), Edit an RSU vest, Record an RSU vest, Record an ESPP purchase, Add an instrument, Your targets and limits, Delete with Undo." },
  { page: "r4", text: "Investments, round 4 (2026-10-31): Prathik liked K5 Time machine but found its hero overdone. The holdings carousel moves above the hero and is the picker; the returns (KPI cards, or a holding's stats) move out, below the hero; the hero keeps a thin control row (go back to a day, Worth or Race, range), the portfolio number and the chart. Four ways to make the number big: L1 Giant, L2 Poster (laid over the chart), L3 Split (a bar under it: put in and made), L4 Flip (split-flap tiles that flip in on load). Everything else of K5 stays: the as-of holdings table, money in, the same money, and Understand it. Sample data, made up; today is Saturday Oct 31, 2026." },
  { page: "r3", text: "Investments, round 3 (2026-10-31): Prathik liked J1 Stage and J2 Lens and asked to see them together on a dark background, with the Race as a toggle, the holdings carousel across the whole width, the money-in grid, the same money somewhere else, and the holdings table. One dark stage serves both: pick Everything (Worth or Race toggle, range chips, a crosshair) or any holding (its price, what you paid, every trade marked). K1 Cockpit (picker as chips), K2 Rail (a watchlist down the left), K3 Dock (the sparkline cards are the picker, docked in the stage), K4 Night (the whole page dark, a ticker tape that scrolls and picks), K5 Time machine (an As-of control takes the stage, the figures and the holdings table back to a day). Holdings table filters India/US. Sample data, made up; today is Saturday Oct 31, 2026." },
  { page: "r2", text: "Investments, round 2 (2026-10-31): Prathik shared a dashboard he liked (a dark performance stage with range chips and a crosshair, KPI cards, a trading-activity grid, trending cards, a transactions feed) and asked for beautiful, unique variations with good widgets and interactions. Every board is interactive in the browser, with no script: range chips, a crosshair on every chart, a holding picker, line toggles, a source filter, hover flows. J1 Stage (the dark stage with money-added bars, KPI cards that point, portfolio card, money-in matrix, sparkline cards, feed), J2 Lens (pick a holding: its price, what you paid and every trade of yours marked on the line), J3 Race (you against Nifty, the S&P in rupees, gold and a 7% deposit; the same money elsewhere), J4 Rings (a ring a year, a spoke a month, how money came in), J5 Flow (where the money came from, what it became, where it sits). History, benchmarks, yearly return and deepest fall are made up and need the price history behind F-IV-03 (proposed). Today is Saturday Oct 31, 2026." },
  { page: "r1", text: "Investments, round 1 (2026-10-31): the /investments dashboard, five directions with the same greeting (whose figures point), attention strip and widgets, each with its own idea for the hero. I1 Bridge (who made the money: cost, then each holding's gain or loss, then what it is worth, with the rupee's move held apart), I2 Strata (the layers money was laid down in, month by month, capped by today's gain), I3 Exposure (how the whole is split, and the one company that is also the employer), I4 Board (a departures board: a row of flaps per holding), I5 Rulers (a ruler per holding: 52-week range, what you paid, where it is now). Sample data, made up; today is Saturday Oct 31, 2026, so every price is Friday's close. Prices and rates are F-IV-03 (not built); realised gain and the rupee split are proposals." },
];
export const BOARDS = [
  { file: "InvDonuts.dc.html", w: 1600, page: "donuts", render: DN.donutsBoard },
  { file: "InvSplit2.dc.html", w: 1600, page: "split2", render: SV2.split2Board },
  { file: "InvSplit.dc.html", w: 1600, page: "split", render: SV.splitBoard },
  { file: "InvFinal.dc.html", w: 1600, page: "final", render: FN.final },
  { file: "InvPhone.dc.html", w: 2600, page: "phone", render: FN.phoneBoard },
  { file: "InvStates.dc.html", w: 1600, page: "states", render: FN.statesBoard },
  { file: "InvForms.dc.html", w: 1100, page: "forms", render: FN.formsBoard },
  { file: "InvL1.dc.html", w: 1600, page: "r4", render: H5.l1 },
  { file: "InvL2.dc.html", w: 1600, page: "r4", render: H5.l2 },
  { file: "InvL3.dc.html", w: 1600, page: "r4", render: H5.l3 },
  { file: "InvL4.dc.html", w: 1600, page: "r4", render: H5.l4 },
  { file: "InvK1.dc.html", w: 1600, page: "r3", render: H3.k1 },
  { file: "InvK2.dc.html", w: 1600, page: "r3", render: H3.k2 },
  { file: "InvK3.dc.html", w: 1600, page: "r3", render: H3.k3 },
  { file: "InvK4.dc.html", w: 1600, page: "r3", render: H3.k4 },
  { file: "InvK5.dc.html", w: 1600, page: "r3", render: H3.k5 },
  { file: "InvJ1.dc.html", w: 1600, page: "r2", render: H2.j1 },
  { file: "InvJ2.dc.html", w: 1600, page: "r2", render: H2.j2 },
  { file: "InvJ3.dc.html", w: 1600, page: "r2", render: H2.j3 },
  { file: "InvJ4.dc.html", w: 1600, page: "r2", render: H2.j4 },
  { file: "InvJ5.dc.html", w: 1600, page: "r2", render: H2.j5 },
  { file: "InvI1.dc.html", w: 1600, page: "r1", render: H.i1 },
  { file: "InvI2.dc.html", w: 1600, page: "r1", render: H.i2 },
  { file: "InvI3.dc.html", w: 1600, page: "r1", render: H.i3 },
  { file: "InvI4.dc.html", w: 1600, page: "r1", render: H.i4 },
  { file: "InvI5.dc.html", w: 1600, page: "r1", render: H.i5 },
];
