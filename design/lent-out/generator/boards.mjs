// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import { render } from "./heroes.mjs";
import { finalPage } from "./final.mjs";
import { formsBoard } from "./forms.mjs";
import { statesBoard } from "./states.mjs";
import { phoneBoard } from "./phone.mjs";

export const PAGES = [
  { id: "fin", name: "FINAL: the page (L3 Who owes what + the interest clock)" },
  { id: "phone", name: "FINAL: phone" },
  { id: "states", name: "FINAL: states" },
  { id: "forms", name: "FINAL: forms" },
  { id: "r1", name: "Exploration · Round 1 · not picked: L1 Promise ledger, L2 Interest clock (now a widget), L4 Year of promises" },
];
export const NOTES = [
  { page: "fin", text: "Lent out, the picked design (2026-11-06): L3 Who owes what as the hero, with the Interest clock (L2) as its own widget under it. The greeting's figures point (hover, focus or tap). Then the attention strip, the hero (a block per loan sized by what it owes; pick one to see the total without it), a two-card row that ends level (the Interest clock on the left: dial, a day / month / year / all-time switch, per-loan rows; Interest adding up on the right: the pot, the payouts in lumps and the chart), sharing one pick and its colour, which never follow the hero, the loans table, interest coming up (an overdue payout leads) and money back. His three real loans; the interest payouts that ARRIVED are made-up sample payments. Open the board and click." },
  { page: "phone", text: "Lent out on a phone (the final page): the blocks stack, the picked block opens under them, the clock and Interest adding up stack as two cards, loans become cards, sixteen people become a scrolling list, and the forms are bottom sheets." },
  { page: "states", text: "Lent out states on the final page, each with its clock row: nothing lent yet, a payout that is late (flagged on its block, its row and in Interest coming up), a loan repaid (its block leaves the map, a dashed strip stays), part of the principal returned (the block shrinks, interest worked out in two stretches), and sixteen people (the map becomes a scrolling list). Repayments and closing days here are examples." },
  { page: "forms", text: "Lent out forms of the final page: Add a loan (accruing, paid-out), Record a repayment (and the warning when more than is out), Mark repaid (closing day required), Edit, Delete with its repayments. Each says where it opens from and previews what happens to the blocks." },
  { page: "r1", text: "Exploration, not picked (round 1, 2026-11-06). L1 Promise ledger, L2 Interest clock (its clock became a widget on the final page) and L4 Year of promises, each a coloured stage on his three real loans with sample payments. L3 Who owes what was picked and is the FINAL page. These boards use the earlier page layout (no clock widget under the hero)." },
];
export const BOARDS = [
  { file: "LeFinal.dc.html", w: 1600, page: "fin", render: finalPage },
  { file: "LePhone.dc.html", w: 4320, page: "phone", render: phoneBoard },
  { file: "LeStates.dc.html", w: 1600, page: "states", render: statesBoard },
  { file: "LeForms.dc.html", w: 1100, page: "forms", render: formsBoard },
  { file: "LeL1.dc.html", w: 1600, page: "r1", render: render("l1") },
  { file: "LeL2.dc.html", w: 1600, page: "r1", render: render("l2") },
  { file: "LeL4.dc.html", w: 1600, page: "r1", render: render("l4") },
];
