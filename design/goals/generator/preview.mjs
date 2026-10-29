// The single page to publish or hand over: every board in a tab, each scaled to fit. A build artifact (out/), never committed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, FONT_LINK } from "./css.mjs";
import { BOARDS } from "./boards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..");
const heights = JSON.parse(readFileSync(join(HERE, "heights.json"), "utf8"));
const doc = (inner) => `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${CSS}</style></head><body style="margin:0">${inner}</body></html>`;
const TABS = [
  ["G9 Cover", "GoalsG9.dc.html"], ["G10 Map", "GoalsG10.dc.html"], ["G11 Board", "GoalsG11.dc.html"], ["G12 Tickets", "GoalsG12.dc.html"],
  ["G5 This month", "GoalsG5.dc.html"], ["G6 Skyline", "GoalsG6.dc.html"], ["G7 Queue", "GoalsG7.dc.html"], ["G8 Staircase", "GoalsG8.dc.html"],
  ["G1 Tanks", "GoalsG1.dc.html"], ["G2 Runway", "GoalsG2.dc.html"], ["G3 Funding plan", "GoalsG3.dc.html"], ["G4 Matrix", "GoalsG4.dc.html"], ["Forms", "GoalsForms.dc.html"],
];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const panes = TABS.map(([label, file], i) => {
  const b = BOARDS.find((x) => x.file === file), h = heights[file];
  const html = doc(b.render().replace("__H__", `${h}px`));
  return `<section class="pane" data-w="${b.w}" data-h="${h}" ${i ? "hidden" : ""}><div class="fit"><iframe title="${label}" scrolling="no" style="width:${b.w}px;height:${h}px" srcdoc="${esc(html)}"></iframe></div></section>`;
}).join("");
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Goals designs</title>
<style>:root{color-scheme:light dark;--bg:#f4f3f0;--fg:#1c1d20;--mut:#6b6e75;--chip:#e6e4df;--on:#17181b}@media(prefers-color-scheme:dark){:root{--bg:#141517;--fg:#ecedef;--mut:#9a9da4;--chip:#26282c;--on:#ecedef}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}header{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 20px 10px;border-bottom:1px solid #0001}h1{font-size:15px;margin:0 0 8px}nav{display:flex;gap:6px;flex-wrap:wrap}
button{border:0;border-radius:999px;padding:7px 14px;background:var(--chip);color:var(--fg);font:600 13px system-ui;cursor:pointer}button[aria-selected=true]{background:var(--on);color:var(--bg)}
.pane{padding:20px}.fit{transform-origin:0 0}iframe{border:0;display:block;background:#fff;border-radius:12px}</style></head><body>
<header><h1>chaiCoffeeFund · Goals designs <span style="color:var(--mut);font-weight:500">(G9 to G12: round 3, coloured cards · G5 to G8: leaner · G1 to G4: round 1)</span></h1><nav>${TABS.map(([l], i) => `<button type="button" aria-selected="${i === 0}" data-i="${i}">${l}</button>`).join("")}</nav></header>${panes}
<script>const panes=[...document.querySelectorAll('.pane')],btns=[...document.querySelectorAll('button')];
function fit(){panes.forEach(p=>{if(p.hidden)return;const w=+p.dataset.w,h=+p.dataset.h,k=Math.min(1,(innerWidth-40)/w),f=p.querySelector('.fit');f.style.transform='scale('+k+')';f.style.height=h*k+'px';f.style.width=w+'px'})}
btns.forEach(b=>b.onclick=()=>{btns.forEach(x=>x.setAttribute('aria-selected',x===b));panes.forEach((p,i)=>p.hidden=i!==+b.dataset.i);fit();scrollTo(0,0)});addEventListener('resize',fit);fit()</script></body></html>`;
mkdirSync(join(HERE, "out", "preview"), { recursive: true });
writeFileSync(join(HERE, "out", "preview", "goals-designs.html"), page);
console.log("preview written");
