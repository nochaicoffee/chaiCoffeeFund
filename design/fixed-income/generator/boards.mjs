// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import { render } from "./heroes.mjs";
import { render2 } from "./heroes2.mjs";
import { render3 } from "./heroes3.mjs";
import { render4 } from "./heroes4.mjs";
import { phoneBoard } from "./phone5.mjs";
import { statesBoard } from "./states5.mjs";
import { formsBoard } from "./forms5.mjs";

export const PAGES = [{ id: "fin", name: "FINAL: J1 Doors + widgets, the page" }, { id: "phone", name: "FINAL: phone" }, { id: "states", name: "FINAL: states" }, { id: "forms", name: "FINAL: forms" }, { id: "r4", name: "Exploration · Round 4: J2 Pillars (not picked)" }, { id: "r3", name: "Round 3: your real numbers (H1–H5)" }, { id: "r2", name: "Exploration · made-up data · Round 2: coloured stages (G1–G4)" }, { id: "r1", name: "Exploration · made-up data · Round 1: six heroes (F1–F6)" }];
export const NOTES = [
  { page: "fin", text: "Fixed Income, the picked design (2026-11-04): J1 Doors + widgets, on his real numbers (FD app and EPFO passbooks). Three doors (Everything, EPF, Fixed deposits) pick what the stage shows; under it money in each month, credits on time (with the passbook check), growth path, the deposits table, coming up and the EPF card." },
  { page: "phone", text: "Fixed Income on a phone: the doors slide sideways, the stage is one column, the widgets stack. Add EPF statement is a bottom sheet followed by a review sheet." },
  { page: "states", text: "Fixed Income states: nothing yet, an EPF credit that is late, a deposit matured and not closed, the year's interest arriving against its estimate, and closed deposits. Dates after today are examples." },
  { page: "forms", text: "Fixed Income forms: Add an EPF statement (drop the PDF), Review (checks pass), Review (doesn't add up, nothing saved), Already imported, Add a deposit (tenure, bank and maturity amount optional), Add a contribution (typed, less certain), Close a deposit with Undo, EPF settings." },
  { page: "r4", text: "Fixed Income, round 4 (2026-11-04): Prathik liked H1 Two pillars and asked for the missing widgets and a variation with cooler interactions. J1 is H1 as it was (three coloured doors) with three new widgets; J2 is the literal pillars (height is money: EPF 89%, deposits 11%) with a Go back to a day scrub that makes the pillars rise and fall. New widgets under both: Money in each month (a heat grid), Credits on time (days from the wage month to the credit, plus the passbook check an import would run), Growth path (EPF in 5, 10 and 20 years if nothing changes, arithmetic only). Real numbers from his FD app and EPFO passbooks." },
  { page: "r3", text: "Fixed Income, round 3 (2026-11-04): redrawn on Prathik's REAL numbers from his FD app and EPFO passbooks (his UAN and date of birth are left out). EPF is ₹9.53L, the seven FDs ₹1.23L, so EPF leads. H1 Two pillars (pick Everything, EPF or Deposits), H2 Ladder pick (a rung per deposit, plus EPF), H3 Interest stage (a day, a month, this year, all time), H4 Drawer (EPF passbook and a certificate per FD), H5 Real return (FDs against EPF after tax and inflation). The bank cover and tax-year boards are dropped (₹1.2L of deposits and ₹3,020 of interest make them moot); they remain in rounds 1 and 2 as made-up explorations. EPF interest here is worked out by a rule that reproduces his credited interest to the rupee for FY 24-25 and FY 25-26." },
  { page: "r2", text: "Exploration on made-up data. Fixed Income, round 2 (2026-11-04): Prathik asked for a colourful hero with good interaction, like the other dashboards. Four stages that take the colour of what you pick (open any board and click): G1 Ladder pick (the maturity ladder is the picker; pick a rung and the stage follows that deposit), G2 Bank doors (pick a bank: its cover, its deposits, its tax-year interest), G3 Bubbles (rate against time left; pick a bubble), G4 Interest stage (chips for a day, a month, this tax year, all time). Same greeting, attention strip and widgets underneath. Sample data is made up." },
  { page: "r1", text: "Exploration on made-up data. Fixed Income, round 1 (2026-11-04): the /fixed-income dashboard, six directions. Every board has the same greeting (its figures point), an attention strip (a deposit that matured but isn't closed, banks over the cover) and the same widgets underneath: deposits table, coming up, passbook holdings. Only the hero differs. F1 Ladder (what matures when, and the quiet stretches), F2 Meter (what the money earns each day), F3 Vault (a certificate for each deposit), F4 Cover (each bank against the ₹5L insurance, and who stands behind the money), F5 Tax year (interest by payer against the limit before tax is cut), F6 Real return (rate, then tax, then inflation). All sample data is made up; today is Wed Nov 4, 2026." },
];
export const BOARDS = [
  { file: "FiJ1.dc.html", w: 1600, page: "fin", render: render4("j1") },
  { file: "FiPhone.dc.html", w: 3200, page: "phone", render: phoneBoard },
  { file: "FiStates.dc.html", w: 1600, page: "states", render: statesBoard },
  { file: "FiForms.dc.html", w: 1100, page: "forms", render: formsBoard },
  { file: "FiJ2.dc.html", w: 1600, page: "r4", render: render4("j2") },
  { file: "FiH1.dc.html", w: 1600, page: "r3", render: render3("h1") },
  { file: "FiH2.dc.html", w: 1600, page: "r3", render: render3("h2") },
  { file: "FiH3.dc.html", w: 1600, page: "r3", render: render3("h3") },
  { file: "FiH4.dc.html", w: 1600, page: "r3", render: render3("h4") },
  { file: "FiH5.dc.html", w: 1600, page: "r3", render: render3("h5") },
  { file: "FiG1.dc.html", w: 1600, page: "r2", render: render2("g1") },
  { file: "FiG2.dc.html", w: 1600, page: "r2", render: render2("g2") },
  { file: "FiG3.dc.html", w: 1600, page: "r2", render: render2("g3") },
  { file: "FiG4.dc.html", w: 1600, page: "r2", render: render2("g4") },
  { file: "FiF1.dc.html", w: 1600, page: "r1", render: render("f1") },
  { file: "FiF2.dc.html", w: 1600, page: "r1", render: render("f2") },
  { file: "FiF3.dc.html", w: 1600, page: "r1", render: render("f3") },
  { file: "FiF4.dc.html", w: 1600, page: "r1", render: render("f4") },
  { file: "FiF5.dc.html", w: 1600, page: "r1", render: render("f5") },
  { file: "FiF6.dc.html", w: 1600, page: "r1", render: render("f6") },
];
