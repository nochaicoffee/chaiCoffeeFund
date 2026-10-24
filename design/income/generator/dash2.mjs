// Round 2: the picked hero (I4, Year in columns) with four different sets of widgets. Every page has the same hero,
// greeting and attention strip; the hero's source chips also drive the sources, entries, pay rhythm and calendar.
// Rows hold one widget or two, never more.
import * as P from "./parts.mjs";
import * as Q from "./parts2.mjs";
import { i4Hero, page, row } from "./dash.mjs";

const wrap = (rows) => page(`${P.greeting()}${P.attention()}${i4Hero(false)}${Q.pickCss()}${rows.join("")}`, "i4dir");
const two = (a, b, cols = "1fr 1fr") => row(cols, [a, b]);

/** Y1 Everyday: what you open it for first (the records and what's next), then the calendar, the list, the comparisons. */
export const y1 = () => wrap([
  two(Q.latestEntries({ n: 6 }), P.comingUp({ n: 5, filter: false })),
  two(P.payCalendar(), P.rhythmCard()),
  P.sourcesCard(),
  two(Q.yoyCardSw({ w: 700, h: 280 }), Q.fyCard()),
  two(Q.aheadCard(), Q.categoryCard()),
]);
/** Y2 Planner: looking forward first (the financial year, what's ahead), the records last, wide. */
export const y2 = () => wrap([
  two(Q.fyCard(), Q.aheadCard()),
  two(P.payCalendar(), P.comingUp({ n: 6, filter: false })),
  P.sourcesCard(),
  two(Q.yoyCardSw({ w: 700, h: 280 }), P.rhythmCard()),
  Q.latestEntries({ n: 8, wide: true }),
]);
/** Y3 Analyst: the comparison first, wide, then what the money is made of and where it goes. */
export const y3 = () => wrap([
  Q.yoyCardSw({ w: 1360, h: 320 }),
  two(Q.categoryCard(), P.landsCard()),
  P.sourcesCard(),
  two(P.rhythmCard(), Q.payChangesCard({ n: 6 })),
  two(P.payCalendar(), Q.latestEntries({ n: 6 })),
]);
/** Y4 Records-led: like Subscriptions, the list of records under the hero, then the sources. */
export const y4 = () => wrap([
  Q.latestEntries({ n: 9, wide: true }),
  P.sourcesCard(),
  two(P.rhythmCard(), Q.aheadCard()),
  two(Q.yoyCardSw({ w: 700, h: 280 }), Q.payChangesCard({ n: 6 })),
  two(P.payCalendar(), Q.fyCard()),
]);
