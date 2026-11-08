// One stylesheet for every Expenses artboard: the shared app base (css-base.mjs), round 1's page (css-ex.mjs) and round 2's statements (css-st.mjs).
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
import { EX } from "./css-ex.mjs";
import { ST } from "./css-st.mjs";
export { FONT_LINK };
export const CSS = BASE + EX + ST;
