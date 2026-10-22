// Round 11 pages: W1 Movers with Prathik's changes, in four arrangements, plus two boards that lay out every variation of the
// money in/out widget (I1–I5) and the Mix (M1–M5). The widgets are in r11.mjs; the page shell is widgets.mjs's.
import * as C from "./charts.mjs";
import * as P from "./parts.mjs";
import * as W from "./wparts.mjs";
import * as R from "./r11.mjs";
import { desktopPage, cols, stack } from "./widgets.mjs";

const glow = (p) => C.switchCard(["glow", "river", "bridge", "flow"], p, { title: "Over time" });
const hist = (p, n = 7) => P.historyCard(p, { n, spread: true, fill: W.trendFill });
const opt = { greeting: R.pointGreeting, slack: 140 };
const A = { n: "W1-A", name: "Movers, in and out", idea: "Band above the glow chart; money in and out as paired columns with the saved amount under each month; the mix as blocks." };
const B = { n: "W1-B", name: "Movers, saved strip", idea: "The glow chart first with a strip of saved-per-month under it; where each ₹100 went beside Balance history; the mix as bubbles." };
const Cc = { n: "W1-C", name: "Movers, month ledger", idea: "Band on top; a month ledger you step through beside Balance history; the glow chart; the mix as a hundred squares." };
const D = { n: "W1-D", name: "Movers, scoreboard", idea: "A mirror chart with in above the line and out below it; saved tiles beside Balance history; the glow chart; the mix as one bar." };

export const r11A = () => desktopPage("ra", A.n, A.name, A.idea, (p) => [
  R.savedBand(p),
  glow(p),
  cols("1fr 1fr", R.inOutCols(p), hist(p, 8)),
  cols("1fr 1fr", R.mixBlocks(p), W.coming(p)),
].join(""), opt);
export const r11B = () => desktopPage("rb", B.n, B.name, B.idea, (p) => [
  glow(p),
  R.savedStrip(p),
  cols("1fr 1fr", R.inOutHundred(p), hist(p, 10)),
  cols("1fr 1fr", R.mixBubbles(p), W.coming(p)),
].join(""), opt);
export const r11C = () => desktopPage("rc", Cc.n, Cc.name, Cc.idea, (p) => [
  R.savedBand(p),
  cols("1fr 1fr", R.inOutLedger(p), hist(p, 9)),
  glow(p),
  cols("1fr 1fr", R.mixWaffle(p), W.coming(p)),
].join(""), opt);
export const r11D = () => desktopPage("rd", D.n, D.name, D.idea, (p) => [
  R.inOutMirror(p),
  cols("1fr 1fr", R.inOutTiles(p), hist(p, 11)),
  glow(p),
  cols("1fr 1fr", R.mixBar(p), W.coming(p)),
].join(""), opt);

/** Every money in / money out variation on one page, each full width. */
export const r11InOut = () => desktopPage("ri", "I1–I5", "Money in and money out, five ways", "Each widget replaces Month over month: what came in, what went out (expenses apart from investing), and what was saved.", (p) => [
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">I1</span><b>Paired columns</b><span class="wi">a column in beside a column out, the saved amount under each month</span></div>`, R.inOutCols(p),
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">I2</span><b>Month ledger</b><span class="wi">pick a month and see it step from came in to kept</span></div>`, R.inOutLedger(p),
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">I3</span><b>Where each ₹100 went</b><span class="wi">one bar a month, split three ways</span></div>`, R.inOutHundred(p),
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">I4</span><b>Mirror</b><span class="wi">in above the line, out below it, a dot for what was saved</span></div>`, R.inOutMirror(p),
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">I5</span><b>Scoreboard tiles</b><span class="wi">a tile a month, darker the more was saved</span></div>`, R.inOutTiles(p),
  `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">Above the chart</span><b>The band and the strip</b><span class="wi">the same idea, on top of or under the Over time chart</span></div>`, R.savedBand(p), R.savedStrip(p),
].join(""), { greeting: R.pointGreeting, slack: 140 });

/** Every Mix variation on one page. */
export const r11Mix = () => desktopPage("rm", "M1–M5", "The mix, five ways", "M1 is today's two rings; M2 to M5 are new. Pick a bank in the hero: its piece stays lit.", (p) => [R.RT,
  W.mix(p, { size: 272 }), cols("1fr 1fr", R.mixBlocks(p, { h: 330 }), R.mixBubbles(p)), cols("1fr 1fr", R.mixWaffle(p), R.mixBar(p)),
].join(""), { greeting: R.pointGreeting, slack: 140 });

export const R11_DESKTOPS = [
  { file: "AccountsR11A.dc.html", w: 1600, render: r11A },
  { file: "AccountsR11B.dc.html", w: 1600, render: r11B },
  { file: "AccountsR11C.dc.html", w: 1600, render: r11C },
  { file: "AccountsR11D.dc.html", w: 1600, render: r11D },
  { file: "AccountsR11InOut.dc.html", w: 1600, render: r11InOut },
  { file: "AccountsR11Mix.dc.html", w: 1600, render: r11Mix },
];
