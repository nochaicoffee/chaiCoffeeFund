// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import { c1, c2, c3, s1, s2, s3 } from "./designs-cal.mjs";
import { a1, a2, a3, a4 } from "./designs-alt.mjs";
import { b1 } from "./designs-budget.mjs";
import { e1, e2, e3, n1, n1c, n2, n3 } from "./designs-r3.mjs";
import { m1, m1b, m1c, m2, m3, m4, m5, d1 } from "./designs-r2.mjs";
import { pC1, pC2, pC3, pA1, pA2, pA3, pA4, pS1, pB1 } from "./designs-phone.mjs";

export const PAGES = [
  { id: "r3d", name: "Round 3 · desktop: details on top of the hero, quick add beside the calendar, widgets outside it, a year period, adding categories" },
  { id: "r3p", name: "Round 3 · phone" },
  { id: "r2p", name: "Round 2 · phone first: the hero calendar with quick add, a pinned budget strip and four at-a-glance widgets" },
  { id: "r2d", name: "Round 2 · desktop" },
  { id: "cal", name: "Round 1 · calendar designs: C1 beside Where it went, C2 hero, C3 its own view" },
  { id: "alt", name: "Round 1 · alternatives where the calendar isn't the main widget: A1 Ring, A2 Feed, A3 Weeks, A4 Keypad" },
  { id: "budget", name: "Round 1 · the monthly limit: where it's set and where it shows (proposal, with questions)" },
  { id: "phones", name: "Round 1 · phone layouts for every design, the add-a-spend sheet and the limit sheet" },
  { id: "states", name: "Round 1 · states (on C1): adding a spend, an empty month, a busy month" },
];
export const NOTES = [
  { page: "r3d", text: "Daily, round 3 (2026-11-18), desktop. The hero now has today's details across its top (the date, what's been spent today, what's been spent this month) and quick add beside the calendar, with the day's panel under it. The four widgets left the hero: the ones about right now (left today, week so far, on track to end at) sit in a Right now row that stays put; the rest follow a period (a year by default, a month, later a range): spent, top category, biggest spend, UPI vs credit card, quiet days, months inside the limit, then Where it went and Month by month. Widgets sit on one 12-column grid, four to a row, and every card in a row is the same height with its picture at the same level; Where it went and Month by month line up on the same columns. E2 shows the period set to This month with the picker open. E3 is a proposal for adding categories (a + New chip with a name and a colour, Manage to rename, recolour and hide, never delete) with questions. Every figure is made up." },
  { page: "r3p", text: "Daily round 3, phone: the same page: details on top of the hero, Right now widgets, the period section with its picker, Where it went and Month by month for the year; quick add stays the pinned bar. N3: the add sheet with a new category being made; N4: Manage categories. Every figure is made up." },
  { page: "r2p", text: "Daily, round 2 (2026-11-18), phone first. Prathik picked the hero calendar (C2) and asked for quick add, how much is left of the budget, and a design that works on a phone, where he'll mostly enter spends. M1: the top of the page: the budget strip is pinned under the app bar (left to spend, the bar with the pace marked, left today), then four widgets (spent so far, left today, week so far, on track to end at), then the hero calendar; the quick-add bar is pinned at the bottom (amount, UPI or card, a chevron for more, the add button). M1b: scrolled to the calendar: the strip shrinks to one line, the bar stays. M1c: the whole page unrolled. M2: the chevron opened (day, category, note). M3: just added: toast with Undo, every figure already moved. M4: the limit sheet, from tapping the strip. M5: over the limit. Left today is what's left of the limit before today, shared over the days to go counting today, less what's gone today: it moves as you spend (open question). Every figure is made up." },
  { page: "r2d", text: "Daily round 2, desktop: the budget strip under the greeting (pinned as the page scrolls), the hero calendar with quick add as a row at the top of it, the day's panel beside the calendar, the four widgets, then Where it went and Month by month. Every figure is made up." },
  { page: "cal", text: "Daily, round 1 (2026-11-18). Three places for the calendar: C1 takes Day by day's place with the selected day's panel beside it; C2 is a dark hero calendar above everything with the panel inside it; C3 is a Calendar view you switch to, with the months down the left and a Week column. Click a day and the panel beside the calendar shows it, with Add a spend. A day square shows its total, a teal dot for UPI, a red dot for credit card, and its shade is the total. Weeks start on Monday. Every figure is made up." },
  { page: "alt", text: "Daily, round 1: four ways to do it where the calendar isn't the hero, taken from how budget apps work. A1 Ring: what's left of the limit as a ring with the pace marked, the weeks beside it, a form that is always open. A2 Feed: a one-line composer on top, a feed of days under it. A3 Weeks: each week against its share of the limit, and a strip of days that counts the streak under a daily pace. A4 Keypad: a calculator pad to add a spend fast, today beside it. Every one has the limit, a placeholder until you decide it. Every figure is made up." },
  { page: "budget", text: "The monthly limit, as a proposal. Nothing here is decided: the board shows how the limit would be set (a pop-up from the Left to spend tile), where it could show elsewhere (an Overview tile and a greeting line; a diary-against-bank check on Expenses, which is a separate idea), and where the number would be kept (a Budgets tab in the Sheet). Five questions for Prathik are at the bottom. Every figure is made up." },
  { page: "phones", text: "Daily phone layouts (390 wide), one for each design: the same pieces stacked, the calendar's squares smaller (a day shows its total and the two dots), the selected day's panel under the calendar, and the add form as a sheet that slides up over the dimmed page. Every figure is made up." },
  { page: "states", text: "Daily states, drawn on C1. Adding a spend: the panel turns into the form for the day you clicked, and a toast confirms the last one. An empty month: every figure is zero and the panel says so. A busy month (October): every day has spends, so a day can have many and the panel scrolls. Every figure is made up." },
];
export const BOARDS = [
  { file: "DyE1.dc.html", w: 1600, page: "r3d", render: e1 },
  { file: "DyE2.dc.html", w: 1600, page: "r3d", render: e2 },
  { file: "DyE3.dc.html", w: 1600, page: "r3d", render: e3 },
  { file: "DyN1.dc.html", w: 390, page: "r3p", render: n1 },
  { file: "DyN1c.dc.html", w: 390, page: "r3p", render: n1c },
  { file: "DyN2.dc.html", w: 390, page: "r3p", render: n2 },
  { file: "DyN3.dc.html", w: 390, page: "r3p", render: n3 },
  { file: "DyM1.dc.html", w: 390, page: "r2p", render: m1 },
  { file: "DyM1b.dc.html", w: 390, page: "r2p", render: m1b },
  { file: "DyM1c.dc.html", w: 390, page: "r2p", render: m1c },
  { file: "DyM2.dc.html", w: 390, page: "r2p", render: m2 },
  { file: "DyM3.dc.html", w: 390, page: "r2p", render: m3 },
  { file: "DyM4.dc.html", w: 390, page: "r2p", render: m4 },
  { file: "DyM5.dc.html", w: 390, page: "r2p", render: m5 },
  { file: "DyD1.dc.html", w: 1600, page: "r2d", render: d1 },
  { file: "DyC1.dc.html", w: 1600, page: "cal", render: c1 },
  { file: "DyC2.dc.html", w: 1600, page: "cal", render: c2 },
  { file: "DyC3.dc.html", w: 1600, page: "cal", render: c3 },
  { file: "DyA1.dc.html", w: 1600, page: "alt", render: a1 },
  { file: "DyA2.dc.html", w: 1600, page: "alt", render: a2 },
  { file: "DyA3.dc.html", w: 1600, page: "alt", render: a3 },
  { file: "DyA4.dc.html", w: 1600, page: "alt", render: a4 },
  { file: "DyB1.dc.html", w: 1600, page: "budget", render: b1 },
  { file: "DyS1.dc.html", w: 1600, page: "states", render: s1 },
  { file: "DyS2.dc.html", w: 1600, page: "states", render: s2 },
  { file: "DyS3.dc.html", w: 1600, page: "states", render: s3 },
  { file: "DyC1Phone.dc.html", w: 390, page: "phones", render: pC1 },
  { file: "DyC2Phone.dc.html", w: 390, page: "phones", render: pC2 },
  { file: "DyC3Phone.dc.html", w: 390, page: "phones", render: pC3 },
  { file: "DyA1Phone.dc.html", w: 390, page: "phones", render: pA1 },
  { file: "DyA2Phone.dc.html", w: 390, page: "phones", render: pA2 },
  { file: "DyA3Phone.dc.html", w: 390, page: "phones", render: pA3 },
  { file: "DyA4Phone.dc.html", w: 390, page: "phones", render: pA4 },
  { file: "DyS1Phone.dc.html", w: 390, page: "phones", render: pS1 },
  { file: "DyB1Phone.dc.html", w: 390, page: "phones", render: pB1 },
];
