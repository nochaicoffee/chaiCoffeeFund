// Round 3: the layout Prathik described. The cover (I4) with its details and edit actions, then a colourful visual beside
// the entries, a wide trend card that switches to pay rhythm, every source, and the pay calendar beside pay changes drawn as bars.
import * as P from "./parts.mjs";
import * as Q from "./parts2.mjs";
import * as R from "./parts3.mjs";
import * as V from "./parts4.mjs";
import { heatmapCard } from "./parts5.mjs";
import * as X from "./parts6.mjs";
import { i4Hero, page, row } from "./dash.mjs";

const wrap = (visual, hint = "or pick one in the map", heat = "") => page(`${P.greeting()}${P.attention()}${i4Hero(false, { detail: true })}${Q.pickCss()}${heat}${row("1fr 1fr", [visual, Q.latestEntries({ n: 8, hint })])}${R.trendCard()}${P.sourcesCard()}${row("1fr 1fr", [P.payCalendar(), R.payChangesVisual({ n: 6 })])}`, "i4dir");
/** Z1: the cost map's grammar, blocks sized by what each source pays. */
export const z1 = () => wrap(R.incomeMap(), "or pick one in the map", heatmapCard());
/** Z2: a bento of colourful tiles, a year of months in each. */
export const z2 = () => wrap(R.bentoMap());
/** Z3: packed bubbles, the area of each is what it pays. */
export const z3 = () => wrap(R.bubbleMap());
/** Z4 to Z7: the same page, with a new kind of visual in row 2 instead of blocks and tiles. */
export const z4 = () => wrap(V.orbitMap(), "or pick a planet");
export const z5 = () => wrap(V.coinMap(), "or pick a colour of coin");
export const z6 = () => wrap(V.dialMap(), "or pick a ring");
export const z7 = () => wrap(V.vialMap(), "or pick a tube");
/** Z8 to Z11: Z1's page (heatmap included) with a visual that still reads when the salary is most of the money (no RSU or ESPP). */
export const z8 = () => wrap(X.ringMap(), "or pick a ring", heatmapCard());
export const z9 = () => wrap(X.lensMap(), "or pick one in the lens", heatmapCard());
export const z10 = () => wrap(X.ladderMap(), "or pick a row", heatmapCard());
export const z11 = () => wrap(X.receiptMap(), "or pick a line", heatmapCard());
