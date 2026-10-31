// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as D from "./dash.mjs";
import * as D2 from "./dash2.mjs";
import * as D3 from "./dash3.mjs";
import * as D4 from "./dash4.mjs";
import * as FN from "./final.mjs";
import { formsBoard } from "./forms.mjs";

export const PAGES = [{ id: "final", name: "Picked: Orbit (final page, states, phone, forms)" }, { id: "r4", name: "Round 4: Flow, Orbit, Receipt, Calendar (G13–G16)" }, { id: "r3", name: "Round 3: Coloured cards, full widgets (G9–G12)" }, { id: "r2", name: "Round 2: Leaner heroes (G5–G8)" }, { id: "forms", name: "Forms: add goal, sub-goal, set aside, mark bought" }, { id: "r1", name: "Round 1: Hero directions (G1–G4)" }];
export const NOTES = [
  { page: "final", text: "Goals, the pick (2026-10-31): Prathik chose G14 Orbit. GoalsFinal is the page: pick a planet (or All goals) and the sky dims the rest while the side opens that goal, with its pieces or latest set-asides. GoalsStates: no goals, one goal, all funded, overdue, over-funded, paused/dropped/bought, and the Overview attention item. GoalsPhone: the sky small with numbered planets, the picked goal, and Set aside as a bottom sheet. GoalsForms2: the goal's menu, Edit, Take back, Pause, Drop and Delete. The earlier forms (Add goal, Add sub-goal, Set aside, Mark bought) still apply. The other rounds are kept as history. Sample data, made up; today is Oct 29, 2026." },
  { page: "r4", text: "Goals, round 4 (2026-10-31): Prathik asked to explore a few more variations. Four ideas the first rounds hadn't tried, all with coloured cards and the full widget set underneath. G13 Flow (a Sankey: October's income, less obligations, into what you plan for goals, fanning out to every piece), G14 Orbit (a night sky: the nearer a piece's date, the closer to the middle; the bigger the amount, the bigger the planet; an arc fills as it is set aside), G15 Receipt (the whole list as a till receipt with sub-goals indented, beside checkout cards for this month, Needs and the next Wants), G16 Calendar (the next four months as real calendars with the set-aside day and the due dates). Sample data, made up; today is Oct 29, 2026." },
  { page: "r3", text: "Goals, round 3 (2026-10-29): Prathik asked for more variations, with a full set of widgets again (as the other dashboards have), and liked the Queue's coloured card. Each hero is built from coloured cards in the style of Subscriptions' cover, Accounts' cards and the Queue's focus card. G9 Cover (Accounts-style: a focus panel and a tall card per goal; pick a goal and the whole cover takes its colour; the staircase runs along the bottom), G10 Map (a coloured tile per goal sized by amount, the car's sub-goals inside it, beside the funding order), G11 Board (three date lanes of coloured cards), G12 Tickets (the focus card, and the funding order as a coloured ticket per piece). Widgets underneath: goals table, coming up, this month, the staircase, needs and wants, set aside lately, what your money allows, finished. Sample data, made up; today is Oct 29, 2026." },
  { page: "r2", text: "Goals, round 2 (2026-10-29): Prathik asked for a few more variations with fewer widgets. Each page is the greeting (whose figures point), one hero and at most one more card. G5 This month (the set-aside ritual: planned against done, a button for what is left), G6 Skyline (a building per goal, taller is bigger, floors are sub-goals, lit windows are what is saved, a spire marks a Major goal), G7 Queue (the goal that is next, and every piece in funding order with its finish month), G8 Staircase (the money that must be set aside by each date, as steps, against what a monthly amount puts aside). Sample data, made up; today is Oct 29, 2026." },
  { page: "forms", text: "Goal forms (2026-10-29): Add goal (why, how long, a Fixed or Flexible date, planned monthly; the preview works out the needed monthly), Add sub-goal (shows what the parent becomes), Set aside (an optional account, with the earmark warning), and Mark bought (actual cost against the estimate, paid from an account or a card). Sample data, made up." },
  { page: "r1", text: "Goals, round 1 (2026-10-29): the /goals dashboard, four directions with the same greeting (whose figures point), attention strip and widgets, each with its own idea for the hero: G1 Tanks (a vessel per piece of a goal that fills as money is set aside, with a dashed line for where it should be by now), G2 Runway (a timeline from the day saving began to the date, with a dot for where your plan ends), G3 Funding plan (hands-on: pick a monthly amount, see each goal's finish month against its date), G4 Matrix (Need or Want down the side, Minor or Major across the top). Minor/Major is a time horizon you pick per goal (Prathik, 2026-10-29). A goal is an earmark, not money: nothing here changes net worth. Sample data, made up; today is Oct 29, 2026." },
];
export const BOARDS = [
  { file: "GoalsFinal.dc.html", w: 1600, page: "final", render: FN.finalBoard },
  { file: "GoalsStates.dc.html", w: 1460, page: "final", render: FN.statesBoard },
  { file: "GoalsPhone.dc.html", w: 1380, page: "final", render: FN.phoneBoard },
  { file: "GoalsForms2.dc.html", w: 1100, page: "final", render: FN.forms2Board },
  { file: "GoalsG13.dc.html", w: 1600, page: "r4", render: D4.g13 },
  { file: "GoalsG14.dc.html", w: 1600, page: "r4", render: D4.g14 },
  { file: "GoalsG15.dc.html", w: 1600, page: "r4", render: D4.g15 },
  { file: "GoalsG16.dc.html", w: 1600, page: "r4", render: D4.g16 },
  { file: "GoalsG9.dc.html", w: 1600, page: "r3", render: D3.g9 },
  { file: "GoalsG10.dc.html", w: 1600, page: "r3", render: D3.g10 },
  { file: "GoalsG11.dc.html", w: 1600, page: "r3", render: D3.g11 },
  { file: "GoalsG12.dc.html", w: 1600, page: "r3", render: D3.g12 },
  { file: "GoalsG5.dc.html", w: 1600, page: "r2", render: D2.g5 },
  { file: "GoalsG6.dc.html", w: 1600, page: "r2", render: D2.g6 },
  { file: "GoalsG7.dc.html", w: 1600, page: "r2", render: D2.g7 },
  { file: "GoalsG8.dc.html", w: 1600, page: "r2", render: D2.g8 },
  { file: "GoalsForms.dc.html", w: 1100, page: "forms", render: formsBoard },
  { file: "GoalsG1.dc.html", w: 1600, page: "r1", render: D.g1 },
  { file: "GoalsG2.dc.html", w: 1600, page: "r1", render: D.g2 },
  { file: "GoalsG3.dc.html", w: 1600, page: "r1", render: D.g3 },
  { file: "GoalsG4.dc.html", w: 1600, page: "r1", render: D.g4 },
];
