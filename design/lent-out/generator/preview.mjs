// The page to hand over: an index with a tab per board, each board in its own file (so no single file is huge). A build artifact (out/), never committed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, FONT_LINK } from "./css.mjs";
import { BOARDS } from "./boards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const heights = JSON.parse(readFileSync(join(HERE, "heights.json"), "utf8"));
const OUT = join(HERE, "out", "preview"), BD = join(OUT, "boards");
mkdirSync(BD, { recursive: true });
const doc = (inner) => `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${CSS}</style></head><body style="margin:0">${inner}</body></html>`;
const TABS = [["FINAL page (L3 + clock)", "LeFinal"], ["FINAL phone", "LePhone"], ["FINAL states", "LeStates"], ["FINAL forms", "LeForms"], ["L1 Promise ledger (not picked)", "LeL1"], ["L2 Interest clock (now a widget)", "LeL2"], ["L4 Year of promises (not picked)", "LeL4"]];
const SETS = [["lent-out-designs.html", "final: L3 Who owes what + the interest clock; round 1 explorations", TABS]];
const metaOf = (list) => list.map(([label, name]) => { const b = BOARDS.find((x) => x.file === `${name}.dc.html`), h = heights[`${name}.dc.html`]; return { label, name, w: b.w, h, html: doc(b.render().replace("__H__", `${h}px`)) }; });
const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const mkPage = (title, meta) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lent out designs</title>
<style>:root{color-scheme:light dark;--bg:#f4f3f0;--fg:#1c1d20;--mut:#6b6e75;--chip:#e6e4df;--on:#17181b}@media(prefers-color-scheme:dark){:root{--bg:#141517;--fg:#ecedef;--mut:#9a9da4;--chip:#26282c;--on:#ecedef}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}header{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 20px 10px;border-bottom:1px solid #0001}h1{font-size:15px;margin:0 0 8px}nav{display:flex;gap:6px;flex-wrap:wrap}
button{border:0;border-radius:999px;padding:7px 14px;background:var(--chip);color:var(--fg);font:600 13px system-ui;cursor:pointer}button[aria-selected=true]{background:var(--on);color:var(--bg)}
.pane{padding:20px}.fit{transform-origin:0 0}iframe{border:0;display:block;background:#fff;border-radius:12px}</style></head><body>
<header><h1>chaiCoffeeFund · Lent out designs <span style="color:var(--mut);font-weight:500">(${title} · his real loans, sample payments)</span></h1><nav>${meta.map((m, i) => `<button type="button" aria-selected="${i === 0}" data-i="${i}">${m.label}</button>`).join("")}</nav></header>
<div id="host">${meta.map((m, i) => `<section class="pane" data-w="${m.w}" data-h="${m.h}" ${i ? "hidden" : ""}><div class="fit"><iframe title="${m.label}" scrolling="no" style="width:${m.w}px;height:${m.h}px" srcdoc="${esc(m.html)}"></iframe></div></section>`).join("")}</div>
<script>const panes=[...document.querySelectorAll('.pane')],btns=[...document.querySelectorAll('button')];
function fit(){panes.forEach(p=>{if(p.hidden)return;const w=+p.dataset.w,h=+p.dataset.h,k=Math.min(1,(innerWidth-40)/w),f=p.querySelector('.fit');f.style.transform='scale('+k+')';f.style.height=h*k+'px';f.style.width=w+'px'})}
btns.forEach((b,i)=>b.onclick=()=>{btns.forEach(x=>x.setAttribute('aria-selected',x===b));panes.forEach((p,j)=>p.hidden=j!==i);fit();scrollTo(0,0)});addEventListener('resize',fit);fit()</script></body></html>`;
for (const [file, title, list] of SETS) { writeFileSync(join(OUT, file), mkPage(title, metaOf(list))); }
console.log("preview written");
