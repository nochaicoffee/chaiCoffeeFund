// Every board, all rounds.
import { BOARDS as B1, PAGES as P1, NOTES as N1, PICK as PICK1, render } from "./boards.mjs";
import { BOARDS2, PAGES2, NOTES2 } from "./multi.mjs";
import { BOARDS3, PAGES3, NOTES3 } from "./multiZ.mjs";
import { pickZ } from "./cssz.mjs";
import { MEASURES } from "./data.mjs";
export const BOARDS = [...BOARDS3, ...BOARDS2, ...B1];
export const PAGES = [...PAGES3, ...PAGES2, ...P1];
export const NOTES = [...NOTES3, ...NOTES2, ...N1];
export const PICK = PICK1 + pickZ({ measures: MEASURES });
export { render };
