// One stylesheet for every Lent out artboard: the shared app base (css-base.mjs, the same shell, tokens and widgets as the other dashboards) plus Lent out's own (css-lent.mjs).
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
import { LENT } from "./css-lent.mjs";
export { FONT_LINK };
export const CSS = BASE + LENT;
