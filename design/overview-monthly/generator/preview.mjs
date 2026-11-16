// The page to hand over: a tab per board, each in an iframe. A build artifact (out/), never committed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, FONT_LINK } from "./css.mjs";
import { BOARDS, PICK, render } from "./all.mjs";
const HERE = dirname(fileURLToPath(import.meta.url));
const heights = JSON.parse(readFileSync(join(HERE, "heights.json"), "utf8"));
const OUT = join(HERE, "out", "preview"); mkdirSync(OUT, { recursive: true });
const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const doc = (b) => `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${CSS}${PICK}</style></head><body style="margin:0">${render(b).replace("__H__", `${heights[b.file]}px`)}</body></html>`;
const TABS = BOARDS.map((b) => [b.cap[0], b]);
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overview month by month</title>
<style>:root{color-scheme:light dark;--bg:#f4f3f0;--fg:#1c1d20;--mut:#6b6e75;--chip:#e6e4df;--on:#17181b}@media(prefers-color-scheme:dark){:root{--bg:#141517;--fg:#ecedef;--mut:#9a9da4;--chip:#26282c;--on:#ecedef}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}header{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 20px 10px;border-bottom:1px solid #0001}h1{font-size:15px;margin:0 0 8px}nav{display:flex;gap:6px;flex-wrap:wrap}
button{border:0;border-radius:999px;padding:7px 14px;background:var(--chip);color:var(--fg);font:600 13px system-ui;cursor:pointer}button[aria-selected=true]{background:var(--on);color:var(--bg)}
.pane{padding:20px}.fit{transform-origin:0 0}iframe{border:0;display:block;background:#fff;border-radius:12px}</style></head><body>
<header><h1>chaiCoffeeFund · Overview · Month by month <span style="color:var(--mut);font-weight:500">(five measures, five layouts · made-up sample figures · hover a month; C and E are interactive)</span></h1><nav>${TABS.map(([l], i) => `<button type="button" aria-selected="${i === 0}" data-i="${i}">${l.replace(/ · .*/, "")}</button>`).join("")}</nav></header>
<div id="host">${TABS.map(([l, b], i) => `<section class="pane" data-w="${b.w}" data-h="${heights[b.file]}" ${i ? "hidden" : ""}><div class="fit"><iframe title="${l}" scrolling="no" style="width:${b.w}px;height:${heights[b.file]}px" srcdoc="${esc(doc(b))}"></iframe></div></section>`).join("")}</div>
<script>const panes=[...document.querySelectorAll('.pane')],btns=[...document.querySelectorAll('button')];
function fit(){panes.forEach(p=>{if(p.hidden)return;const w=+p.dataset.w,h=+p.dataset.h,k=Math.min(1,(innerWidth-40)/w),f=p.querySelector('.fit');f.style.transform='scale('+k+')';f.style.height=h*k+'px';f.style.width=w+'px'})}
btns.forEach((b,i)=>b.onclick=()=>{btns.forEach(x=>x.setAttribute('aria-selected',x===b));panes.forEach((p,j)=>p.hidden=j!==i);fit();scrollTo(0,0)});addEventListener('resize',fit);fit()</script></body></html>`;
writeFileSync(join(OUT, "overview-monthly.html"), page);
console.log("preview written");
