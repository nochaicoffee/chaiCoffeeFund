// Round 4 (2026-11-19): four options for the top of the hero, on desktop and on a phone.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as X from "./parts-r4.mjs";

const label = (code, name, note) => `<div class="sec"><div class="sec-t"><h2>${code} · ${name}</h2><small>${note}</small></div>${P.sampleTag()}</div>`;
const OPTIONS = {
  h1: ["H1", "Compact stat chips", "one slim row; the date, then two chips, each with a little something under its figure", X.head1, true],
  h2: ["H2", "Date tile, today and a month ring", "a calendar tile for the date, today with its split, the month as a ring against the limit", X.head2],
  h3: ["H3", "Two tiles side by side", "a slim date line, then Today and This month as equal tiles with a bar each", X.head3, true],
  h4: ["H4", "One big figure with its sentence", "this month as the headline, today and the date as pills beside it", X.head4],
};
export const desktop = (key) => () => { const [c, n, note, head, navIn] = OPTIONS[key]; return P.page(`${label(c, n, note)}${X.heroWith(head, { navIn })}`); };
export const phone = (key) => () => { const [c, n, , head] = OPTIONS[key]; return L.phone({ h: "auto", body: `${label(c, n, "")}${X.heroWith(head, { compact: true })}` }); };
