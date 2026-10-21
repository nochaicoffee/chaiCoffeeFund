// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as D from "./dirs.mjs";
import { chartsBoard } from "./chartsboard.mjs";
import { statesBoard, statesPhone } from "./states.mjs";
import { formsBoard } from "./forms.mjs";
import { readmeBoard } from "./readme.mjs";
import * as D2 from "./dirs2.mjs";
import * as D3 from "./dirs3.mjs";
import * as D4 from "./dirs4.mjs";
import * as D5 from "./dirs5.mjs";
import { ySelBoard, ySelPhoneBoard, YSEL } from "./ysel.mjs";
import { zSelBoard, zSelPhoneBoard } from "./zsel.mjs";
import { z1Board, z1FormsBoard, z1PhoneBoard } from "./z1.mjs";
import { z2Board, z2PhoneBoard } from "./z2.mjs";
import * as FIN from "./final.mjs";
import { z3Board, z3PhoneBoard } from "./z3.mjs";

export const BOARDS = [
  { file: "AccountsReadme.dc.html", w: 1300, page: "readme", render: readmeBoard },
  { file: "AccountsFinal.dc.html", w: 1600, page: "final", render: FIN.finalDesktop },
  { file: "AccountsFinalPhone.dc.html", w: 390, page: "final", render: FIN.finalPhone },
  { file: "AccountsFinalStates.dc.html", w: 1700, page: "final", render: FIN.finalStates },
  { file: "AccountsFinalForms.dc.html", w: 1300, page: "final", render: FIN.finalForms },
  { file: "AccountsZ3.dc.html", w: 1600, page: "z3", render: z3Board },
  { file: "AccountsZ3Phone.dc.html", w: 1800, page: "z3", render: z3PhoneBoard },
  { file: "AccountsA.dc.html", w: 1600, page: "dir-a", render: D.aDesktop },
  { file: "AccountsAPhone.dc.html", w: 390, page: "dir-a", render: D.aPhone },
  { file: "AccountsB.dc.html", w: 1600, page: "dir-b", render: D.bDesktop },
  { file: "AccountsBPhone.dc.html", w: 390, page: "dir-b", render: D.bPhone },
  { file: "AccountsC.dc.html", w: 1600, page: "dir-c", render: D.cDesktop },
  { file: "AccountsCPhone.dc.html", w: 390, page: "dir-c", render: D.cPhone },
  { file: "AccountsD.dc.html", w: 1600, page: "dir-d", render: D.dDesktop },
  { file: "AccountsDPhone.dc.html", w: 390, page: "dir-d", render: D.dPhone },
  ...[...D2.DIRS2.map((d) => [d, D2]), ...D3.DIRS3.map((d) => [d, D3]), ...D4.DIRS4.map((d) => [d, D4]), ...D5.DIRS5.map((d) => [d, D5])].flatMap(([d, M]) => [
    { file: `Accounts${d.k.toUpperCase()}.dc.html`, w: 1600, page: `dir-${d.k}`, render: M[`${d.k}Desktop`] },
    { file: `Accounts${d.k.toUpperCase()}Phone.dc.html`, w: 390, page: `dir-${d.k}`, render: M[`${d.k}Phone`] },
  ]),
  { file: "AccountsZ2.dc.html", w: 1600, page: "z2", render: z2Board },
  { file: "AccountsZ2Phone.dc.html", w: 1800, page: "z2", render: z2PhoneBoard },
  { file: "AccountsZ1.dc.html", w: 1600, page: "z1", render: z1Board },
  { file: "AccountsZ1Forms.dc.html", w: 1600, page: "z1", render: z1FormsBoard },
  { file: "AccountsZ1Phone.dc.html", w: 1800, page: "z1", render: z1PhoneBoard },
  { file: "AccountsZSel.dc.html", w: 1600, page: "zsel", render: zSelBoard },
  { file: "AccountsZSelPhone.dc.html", w: 1800, page: "zsel", render: zSelPhoneBoard },
  { file: "AccountsYSel.dc.html", w: 1600, page: "ysel", render: ySelBoard },
  { file: "AccountsYSelPhone.dc.html", w: 1800, page: "ysel", render: ySelPhoneBoard },
  { file: "AccountsCharts.dc.html", w: 1600, page: "charts", render: chartsBoard },
  { file: "AccountsStates.dc.html", w: 1700, page: "states", render: statesBoard },
  { file: "AccountsStatesPhone.dc.html", w: 1300, page: "states", render: statesPhone },
  { file: "AccountsForms.dc.html", w: 1300, page: "forms", render: formsBoard },
];

export const PAGES = [
  { id: "readme", name: "Read me first" },
  { id: "final", name: "Final design" },
  { id: "z3", name: "Bank objects, simpler (B1–B7)" },
  { id: "z2", name: "Z1 · account objects, round 2" },
  { id: "z1", name: "Z1 · stage colour and account objects" },
  { id: "zsel", name: "Y · six selectors for any number" },
  { id: "ysel", name: "Y · seven selectors" },
  { id: "dir-a", name: "A · Cover flow" },
  { id: "dir-b", name: "B · Tiles and details" },
  { id: "dir-c", name: "C · Money map" },
  { id: "dir-d", name: "D · Passbooks" },
  ...[...D5.DIRS5, ...D4.DIRS4, ...D2.DIRS2, ...D3.DIRS3].map((d) => ({ id: `dir-${d.k}`, name: `${d.k.toUpperCase()} · ${d.name}` })),
  { id: "charts", name: "Chart widget (C1–C6)" },
  { id: "states", name: "States" },
  { id: "forms", name: "Forms" },
];

export const NOTES = [
  { page: "z3", text: "Round 9: the cheque felt like too much, so seven simpler objects (B1 monogram tile, B2 quiet passbook, B3 envelope, B4 note bundle, B5 nameplate, B6 key card, B7 stamp), in one live hero with a switch, each on its own stage. Sample data, made up." },
  { page: "final", text: "FINAL, picked by Prathik 2026-10-22: Z1's hero (the account in the headline is a dropdown; the stage takes the bank's colour; the line stays white), the monogram tile (B1) as the account's object, All as its own green tile with a colour band (A4). Desktop, phone, states, forms. Sample data, made up." },
  { page: "readme", text: "The Bank Accounts page (/accounts), design only. Read this board first: how to pick, and the decisions the design depends on. Sample data, made up; today is Oct 21, 2026." },
  ...[...D.DIRS, ...D2.DIRS2, ...D3.DIRS3, ...D4.DIRS4, ...D5.DIRS5].map((d) => ({ page: `dir-${d.k}`, text: `${d.k.toUpperCase()} · ${d.name}. ${d.blurb} Live: pick an account and everything follows it. Sample data, made up.` })),
  { page: "z2", text: "Account objects, round 2: cheques with every field filled (C1–C5), passbooks (P1–P5), cards without a chip (D1–D4), five inline ways to show All (A1–A5), and a compact phone hero. Live; sample data, made up." },
  { page: "z1", text: "Z1, picked, with the stage in the bank's colour and six account objects (passbook, cheque book, debit card standing up, seal, tag, vault door), each in the hero, for every account, and in Add account. Live; sample data, made up." },
  { page: "zsel", text: "Y's hero with six selectors that hold any number of banks and add no graphs: headline dropdown, purpose tabs, pager, launcher, switch with More, search. Each with a 14-account frame. Live; sample data, made up." },
  { page: "ysel", text: "Y's hero, which Prathik liked, with seven other ways to pick a bank: sliding switch, lanes, waffle, donut, vault dial, type menu, line legend. Live; sample data, made up." },
  { page: "charts", text: "The chart widget: six options at full width, each following the pick. Pick one, or two for a switch." },
  { page: "states", text: "No accounts, one, many, a stale balance, a closed account, a new account with no balance, and just after saving. Desktop, then phone." },
  { page: "forms", text: "Add / Edit account, Update balance, the monthly check-in, Close account, editing one balance, and the phone sheets." },
];
