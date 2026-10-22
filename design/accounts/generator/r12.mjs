// Round 12 (2026-10-22): the cover-flow section as a selector. Prathik liked a strip of coloured account cards (a monogram,
// the bank, the name, the balance, a small line, an "Updated" chip and the change) and asked for it as the selector in
// the cover flow, in a few cool variations with nice interactions. Five styles, S1–S5, under one live hero; a switch
// swaps the style, and picking a card (or the dropdown) recolours the hero. All CSS, no script. Sample data, made up.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as W from "./wparts.mjs";
import { desktopPage } from "./widgets.mjs";
import * as R from "./r11.mjs";
const { inr, inrS, signed, fmt, I } = L;
const { IDS, FACTS } = P;

export const grad = (id) => `linear-gradient(158deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to))`;
const glassW = "oklch(1 0 0 / 0.16)";
const delta = (f) => (f.all ? f.sinceJan : L.change(f.id));
const N = IDS.length;
const live = IDS.filter((i) => FACTS[i].on && i !== "all").length;

/** What a card says: the monogram, the bank, the name, the balance, a line, a chip and the change. */
export function face(id, { line = true, big = 26, lineW = 160, lineH = 30 } = {}) {
  const f = FACTS[id], on = f.on, d = delta(f);
  const mono = `<span class="cs-mono">${f.all ? I.home?.(15) ?? I.bank?.(15) ?? "⌂" : f.name[0]}</span>`;
  const chip = f.all ? `<span class="cs-chip">${f.fresh} of ${f.count} up to date</span>` : !on ? `<span class="cs-chip">${I.lock(10)} Closed</span>` : f.stale ? `<span class="cs-chip cs-warn">${I.clock(10)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)}d</span>` : `<span class="cs-chip">Updated ${fmt(f.asOf)}</span>`;
  return `<span class="cs-top">${mono}<span class="cs-bank">${f.all ? `${f.count} accounts` : f.bank}</span></span><span class="cs-name">${f.name}</span><b class="cs-bal" style="font-size:${big}px">${on ? inr(f.balance) : "₹0"}</b>${line && on ? `<span class="cs-line">${P.spark(id, { w: lineW, h: lineH, stroke: "oklch(1 0 0 / 0.85)", fill: "oklch(1 0 0 / 0.12)", width: 2 })}</span>` : ""}<span class="cs-foot">${chip}${d == null || !on ? "" : `<b class="cs-d ${d >= 0 ? "up" : "dn"}">${signed(d)}</b>`}</span>`;
}
const check = `<i class="cs-tick">${I.check(12)}</i>`;
export const tile = (p, id, cls, inner, style = "") => `<label for="${p}-sel-${id}" class="cs ${cls} tl-${id}${FACTS[id].on ? "" : " cs-off"}" style="background:${grad(id)};${style}" tabindex="0">${inner}${check}</label>`;

export const CSS = (p) => `<style>
.cs { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border-radius: 22px; color: #fff; cursor: pointer; flex-shrink: 0; overflow: hidden; isolation: isolate; box-shadow: 0 1px 2px oklch(0 0 0 / 0.2), 0 12px 26px oklch(0 0 0 / 0.2); transition: transform 380ms cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 260ms, filter 260ms, box-shadow 260ms, flex-grow 460ms cubic-bezier(0.3, 0.9, 0.3, 1), width 460ms cubic-bezier(0.3, 0.9, 0.3, 1); }
.cs::before { content: ""; position: absolute; inset: 0; z-index: -1; background: repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.07) 0 1px, transparent 1px 22px); }
.cs::after { content: ""; position: absolute; top: -60%; left: -40%; width: 40%; height: 220%; background: linear-gradient(100deg, transparent, oklch(1 0 0 / 0.22), transparent); transform: translateX(-120%) rotate(14deg); transition: transform 700ms ease; pointer-events: none; }
.cs:hover::after, .cs:focus-visible::after { transform: translateX(520%) rotate(14deg); }
.cs-off { filter: grayscale(0.85) brightness(0.8); }
.cs > * { flex-shrink: 0; }
.cs-top { padding-right: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cs-mono { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; background: ${glassW}; font-size: 13px; font-weight: 800; flex-shrink: 0; }
.cs-bank { font-size: 11.5px; font-weight: 700; opacity: 0.78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cs-name { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
.cs-bal { font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; white-space: nowrap; }
.cs-line { display: block; margin: 2px 0 0; opacity: 0.95; }
.cs-line svg { width: 100%; height: auto; }
.cs-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
.cs-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: ${glassW}; font-size: 11px; font-weight: 700; white-space: nowrap; }
.cs-warn { background: oklch(0.8 0.12 85 / 0.9); color: oklch(0.28 0.06 70); }
.cs-d { font-size: 12.5px; font-weight: 800; white-space: nowrap; }
.cs-d.up { color: oklch(0.88 0.19 145); } .cs-d.dn { color: oklch(0.82 0.13 25); }
.cs-tick { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: oklch(0.72 0.19 145); color: #fff; display: grid; place-items: center; box-shadow: 0 2px 8px oklch(0 0 0 / 0.3); transform: scale(0); transition: transform 360ms cubic-bezier(0.2, 0.9, 0.3, 1.6); }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .tl-${id} > .cs-tick { transform: scale(1); }`).join("\n")}
.cs-pane { display: none; } ${["s1", "s2", "s3", "s4", "s5"].map((k) => `.${p}dir:has(#${p}-sty-${k}:checked) .cs-pane.${k} { display: block; }`).join(" ")}
.cs-scroll { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x proximity; padding: 14px 4px 18px; margin: 0 -4px; scrollbar-width: none; mask-image: linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 28px), transparent); }
.cs-scroll::-webkit-scrollbar { display: none; }
/* S1 strip */
.s1-t { width: 218px; min-height: 176px; scroll-snap-align: start; }
.s1-t:hover { transform: translateY(-6px); }
.${p}dir:not(:has(#${p}-sel-all:checked)) .s1-t { opacity: 0.8; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .s1-t.tl-${id} { opacity: 1; transform: translateY(-10px) scale(1.02); box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px color-mix(in oklch, var(--card-${P.hue(id)}) 80%, white), 0 20px 36px oklch(0 0 0 / 0.28); }`).join("\n")}
/* S2 cover flow */
.s2-stage { position: relative; height: 252px; perspective: 1500px; perspective-origin: 50% 40%; overflow: hidden; }
.s2-t { position: absolute; left: 50%; top: 18px; width: 262px; height: 188px; margin-left: -131px; }
.s2-t .cs-name { font-size: 16px; }
.s2-ref { position: absolute; left: 50%; top: 18px; width: 262px; height: 188px; margin-left: -131px; pointer-events: none; opacity: 0.18; transform-origin: 50% 100%; }
${IDS.map((sel, si) => IDS.map((id, j) => { const o = j - si, a = Math.abs(o), s = Math.sign(o); const tf = o === 0 ? "translateX(0) translateZ(90px) rotateY(0deg) scale(1.1)" : `translateX(${s * (a === 1 ? 232 : 232 + (a - 1) * 92)}px) translateZ(${-60 - a * 70}px) rotateY(${-s * 52}deg) scale(0.92)`; return `.${p}dir:has(#${p}-sel-${sel}:checked) .s2-t.tl-${id} { transform: ${tf}; z-index: ${20 - a}; opacity: ${a > 3 ? 0 : 1}; filter: ${o === 0 ? "none" : `brightness(${(1 - a * 0.13).toFixed(2)}) saturate(0.9)`}; pointer-events: ${a > 3 ? "none" : "auto"}; ${o === 0 ? "box-shadow: 0 30px 50px oklch(0 0 0 / 0.35);" : ""} }`; }).join("\n")).join("\n")}
.s2-t:not(:hover) { }
.s2-t:hover { filter: brightness(1.08); }
/* S3 accordion */
.s3-row { display: flex; gap: 10px; height: 238px; }
.s3-t { flex: 1 1 0; min-width: 0; padding: 14px 12px; }
.s3-t .full { display: none; justify-content: space-between; opacity: 0; flex-direction: column; gap: 6px; flex: 1; min-width: 250px; transition: opacity 400ms 120ms; }
.s3-t .mini { display: flex; flex-direction: column; align-items: center; justify-content: space-between; flex: 1; gap: 8px; min-width: 0; }
.s3-t .mini b { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 14px; letter-spacing: 0; white-space: nowrap; }
.s3-t .mini .nm { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11.5px; font-weight: 700; opacity: 0.8; white-space: nowrap; max-height: 90px; overflow: hidden; }
.s3-t:hover { flex-grow: 1.5; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .s3-t.tl-${id} { flex-grow: 6; padding: 16px 18px; cursor: default; } .${p}dir:has(#${p}-sel-${id}:checked) .s3-t.tl-${id} .full { display: flex; opacity: 1; } .${p}dir:has(#${p}-sel-${id}:checked) .s3-t.tl-${id} .mini { display: none; }`).join("\n")}
/* S4 dock */
.s4-dock { display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 240px; padding-bottom: 6px; }
.s4-t { width: 142px; height: 124px; padding: 12px 14px; transform-origin: 50% 100%; }
.s4-t .cs-bal { font-size: 17px; } .s4-t .cs-name { font-size: 13px; margin-top: 2px; } .s4-t .cs-line, .s4-t .cs-foot { display: none; }
.s4-t:hover { transform: scale(1.34) translateY(-10px); z-index: 4; }
.s4-t:hover + .s4-t, .s4-t:has(+ .s4-t:hover) { transform: scale(1.14) translateY(-4px); z-index: 3; }
.s4-t:hover .cs-line, .s4-t:hover .cs-foot { display: flex; }
.s4-t:hover { height: 176px; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .s4-t.tl-${id} { width: 204px; height: 176px; transform: translateY(-14px); box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px color-mix(in oklch, var(--card-${P.hue(id)}) 80%, white), 0 24px 40px oklch(0 0 0 / 0.3); } .${p}dir:has(#${p}-sel-${id}:checked) .s4-t.tl-${id} .cs-line, .${p}dir:has(#${p}-sel-${id}:checked) .s4-t.tl-${id} .cs-foot { display: flex; }`).join("\n")}
/* S5 fan */
.s5-fan { display: flex; justify-content: center; padding: 34px 0 14px; height: 268px; }
.s5-t { width: 232px; height: 200px; margin-left: -128px; transform-origin: 50% 120%; }
.s5-t:first-child { margin-left: 0; }
.s5-t:hover { transform: translateY(-14px) rotate(-1.5deg); z-index: 8; }
.s5-t:hover ~ .s5-t { transform: translateX(120px); }
${IDS.map((id, i) => `.${p}dir:has(#${p}-sel-${id}:checked) .s5-t.tl-${id} { transform: translateY(-26px) scale(1.06); z-index: 9; box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px color-mix(in oklch, var(--card-${P.hue(id)}) 80%, white), 0 26px 44px oklch(0 0 0 / 0.32); } .${p}dir:has(#${p}-sel-${id}:checked) .s5-t.tl-${id} ~ .s5-t { transform: translateX(120px); }`).join("\n")}
.s5-t:hover ~ .s5-t { transform: translateX(120px); }
@media (prefers-reduced-motion: reduce) { .cs, .cs::after, .cs-tick { transition: none; } }
</style>`;

function selector(p) {
  const sty = W.tgl(p, "sty", [["s1", "S1 Strip"], ["s2", "S2 Cover flow"], ["s3", "S3 Accordion"], ["s4", "S4 Dock"], ["s5", "S5 Fan"]], { size: 12, pad: "6px 13px" });
  // The style switch uses its own radio names (p-sty-*): tgl names them that way already.
  const s1 = `<div class="cs-pane s1"><div class="cs-scroll">${IDS.map((id) => tile(p, id, "s1-t", face(id))).join("")}</div></div>`;
  const s2 = `<div class="cs-pane s2"><div class="s2-stage">${IDS.map((id) => tile(p, id, "s2-t", face(id, { big: 30, lineW: 220, lineH: 36 }))).join("")}</div></div>`;
  const s3 = `<div class="cs-pane s3"><div class="s3-row">${IDS.map((id) => { const f = FACTS[id]; return tile(p, id, "s3-t", `<span class="mini"><span class="cs-mono">${f.all ? "⌂" : f.name[0]}</span><b>${f.on ? inrS(f.balance) : "₹0"}</b><span class="nm">${f.all ? "All" : f.name}</span></span><span class="full">${face(id, { big: 30, lineW: 360, lineH: 40 })}</span>`); }).join("")}</div></div>`;
  const s4 = `<div class="cs-pane s4"><div class="s4-dock">${IDS.map((id) => tile(p, id, "s4-t", face(id, { big: 17, lineW: 120, lineH: 26 }))).join("")}</div></div>`;
  const s5 = `<div class="cs-pane s5"><div class="s5-fan">${IDS.map((id) => tile(p, id, "s5-t", face(id, { big: 26, lineW: 190, lineH: 30 }))).join("")}</div></div>`;
  const hints = { s1: "Scroll sideways for more, the picked card lifts and gets a tick.", s2: "Click a side card and the row turns to it.", s3: "The picked card opens wide; the others fold to a spine. Hover a spine to peek.", s4: "Hover and the cards swell like a dock; the picked one stays open.", s5: "A fan of cards: hover to part them, the picked one rises." };
  const note = `<div class="row card-note" style="gap:6px">${Object.entries(hints).map(([k, v]) => `<span class="cs-pane ${k}"">${v}</span>`).join("")}</div>`;
  return `${sty.css}${sty.radios}${CSS(p)}<section class="card glass" style="gap:6px;overflow:hidden"><div class="card-h"><span class="card-t">${live} accounts <small>pick a card · it recolours the hero</small></span>${sty.ui}</div>${s1}${s2}${s3}${s4}${s5}${note}</section>`;
}

export const r12Selectors = () => desktopPage("rs", "S1–S5", "Cards as the selector", "A strip of coloured account cards in the cover flow, five ways: strip, cover flow, accordion, dock, fan. Pick a card and the hero follows.", (p) => [selector(p)].join(""), { greeting: R.pointGreeting, slack: 60 });
export const R12_DESKTOPS = [{ file: "AccountsR12Selectors.dc.html", w: 1600, render: r12Selectors }];
