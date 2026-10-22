// Canvas furniture for the non-page boards (charts, states, forms, read me): a titled board, numbered sections, labelled frames.
import * as L from "./lib.mjs";

export const board = ({ w, title, sub = "", body, extra = "" }) => `<div class="chai-app board" style="width:${w}px;height:__H__">${extra}<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>${title}</h2>${L.sampleTag(". Today is Oct 21, 2026")}</div>${sub ? `<p>${sub}</p>` : ""}</div>${body}</div>`;
export const section = (n, title, desc, inner) => `<section style="display:flex;flex-direction:column;gap:16px"><div class="sec-h"><span class="sec-n">${n}</span><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ""}</div></div>${inner}</section>`;
export const frame = (label, inner, { style = "" } = {}) => `<div style="min-width:0;${style}"><div class="frame-l">${label}</div>${inner}</div>`;
export const grid = (cols, items, gap = 20) => `<div style="display:grid;grid-template-columns:${cols};gap:${gap}px;align-items:start">${items.join("")}</div>`;
