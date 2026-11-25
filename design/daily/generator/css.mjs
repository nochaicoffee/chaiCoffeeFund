// One stylesheet for every Daily artboard: the shared app base (css-base.mjs) and the Daily page's own (css-dy.mjs).
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
import { DY, R2, R3, R4, R5 } from "./css-dy.mjs";
import { R6 } from "./css-r6.mjs";
export { FONT_LINK };
export const CSS = BASE + DY + R2 + R3 + R4 + R5 + R6;
