// Round 2 (2026-11-16): the same widgets over a range of several years. A row per calendar year, as the Cards heatmap does.
import { sectionA } from "./multiA.mjs";
import { sectionB } from "./multiB.mjs";
import { sectionC } from "./multiC.mjs";
import { sectionD } from "./multiD.mjs";

export const BOARDS2 = [
  { file: "MyA.dc.html", w: 1480, page: "r2", cap: ["A · Five heatmaps, years as rows", "The range picker works. Height grows a row per year, so a long range is a tall widget."], body: sectionA, cls: "mo-y" },
  { file: "MyB.dc.html", w: 1480, page: "r2", cap: ["B · Five tiles, a small row per year", "Stays tile-sized; the months are squares and the average a month tells the direction."], body: sectionB },
  { file: "MyC.dc.html", w: 1480, page: "r2", cap: ["C · One heatmap, five tabs", "One slot at any range; year rows plus a year-on-year line for the picked measure."], body: sectionC, cls: "mo-c" },
  { file: "MyD.dc.html", w: 1480, page: "r2", cap: ["D · Five bar cards, 36 bars", "Fixed height at any range; each year's dashed average shows the trend. Bars get thin past about three years."], body: sectionD },
];
export const PAGES2 = [{ id: "r2", name: "Round 2 · the same widgets over three years: range picker, a row per year, and gaps where records start late" }];
export const NOTES2 = [{ page: "r2", text: "Round 2 (2026-11-16): a range of several years, Nov 2023 to Oct 2026. The last twelve months are the Expenses canvas's; the earlier two years are made up. Records start late for some measures (cash expenses Jan 2025, card bills Aug 2025, EMIs Aug 2026), so a long range has honest blanks at the start." }];
