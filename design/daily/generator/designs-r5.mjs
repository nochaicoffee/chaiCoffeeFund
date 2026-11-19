// Round 5 (2026-11-19): the budget strip under the hero, three ways, on desktop and on a phone.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as U from "./parts-r5.mjs";

const label = (code, name, note) => `<div class="sec"><div class="sec-t"><h2>${code} \u00b7 ${name}</h2><small>${note}</small></div>${P.sampleTag()}</div>`;
const OPTIONS = {
  s1: ["S1", "The strip as it was, under the hero", "light card, full width; nothing dropped"],
  s2: ["S2", "One slim row", "what's left, the bar with the pace tick, the pill, left today; the hero already says what's spent"],
  s3: ["S3", "Left to spend plus three figures", "a card: what's left with its bar, and left today, the pace and days to go beside it"],
};
export const desktop = (key) => () => { const [c, n, note] = OPTIONS[key]; return P.page(`${label(c, n, note)}${U.under(key)}`); };
export const phone = (key) => () => { const [c, n] = OPTIONS[key]; return L.phone({ h: "auto", body: `${label(c, n, "")}${U.under(key, { compact: true })}` }); };
