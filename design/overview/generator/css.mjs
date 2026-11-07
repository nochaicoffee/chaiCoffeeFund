// One stylesheet for every Overview artboard: the shared app base (css-base.mjs) plus Overview's own: round 1 (css-ov.mjs) and round 2 (css-r2.mjs) and round 3 (css-r3.mjs).
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
import { OV } from "./css-ov.mjs";
import { R2 } from "./css-r2.mjs";
import { R3 } from "./css-r3.mjs";
import { R4 } from "./css-r4.mjs";
import { R5 } from "./css-r5.mjs";
import { R6 } from "./css-r6.mjs";
import { R7 } from "./css-r7.mjs";
import { R8 } from "./css-r8.mjs";
export { FONT_LINK };
export const CSS = BASE + OV + R2 + R3 + R4 + R5 + R6 + R7 + R8;
