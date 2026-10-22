// Round 13 (2026-10-22): the selector goes inside the hero, as Subscriptions does (its covers sit inside the hero card).
// Five ways, H1–H5, each a full hero on the green stage that takes the picked bank's colour; pick a card and the stage,
// the figure and the line follow. All CSS, no script. Sample data, made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D5 from "./dirs5.mjs";
import * as Y from "./ysel.mjs";
import * as Z1 from "./z1.mjs";
import * as W from "./wparts.mjs";
import * as R from "./r11.mjs";
import * as S from "./r12.mjs";
import * as Z2 from "./z2.mjs";
import * as O2 from "./objects2.mjs";
import { ANIM, tag, TILE } from "./widgets.mjs";
const { inr, inrS, signed, I } = L;
const { IDS, FACTS, panes, greenStage } = P;
const { statRow, heroActions, whiteLine } = D5;
const { ink } = Y;
const { tip, hc } = W;

export const stageBg = (id) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to))`;
const layers = () => IDS.filter((id) => id !== "all").map((id) => `<span class="stg stg-${id}" style="background:${stageBg(id)}"></span>`).join("");
const idx = (id) => IDS.indexOf(id);
const WAL = IDS.filter((id) => FACTS[id].on);

// ---------- Pieces of the hero every variant shares ----------
const figure = (size = 76) => panes((f) => `<b style="display:block;font-size:${size}px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">${f.on ? inr(f.balance) : "₹0"}</b>`);
const when = () => panes((f) => `<span style="font-size:14px;font-weight:700;color:var(--muted)">${P.whenLine(f)}</span>`);
const inName = () => `<div class="row" style="gap:12px"><span style="font-size:20px;font-weight:700;color:var(--muted)">in</span>${panes((f) => `<b style="font-size:22px;font-weight:800">${f.name}</b>`)}</div>`;
const actions = () => panes((f) => heroActions(f));
const line = (p, h = 200) => panes((f) => whiteLine(f, { w: 1440, h, ph: false, key: p, mono: true }));
const stats = () => panes((f) => statRow(f));
const hint = (t) => `<span class="h-hint">${t}</span>`;
const caption = (p) => `<div style="display:flex;flex-direction:column;gap:12px;min-width:0"><span class="eyebrow">Your balance</span>${figure()}${inName()}${when()}<div style="margin-top:4px">${actions()}</div></div>`;

// ---------- CSS for the in-hero selectors ----------
export const CSS2 = (p) => `<style>
.gpick { position: relative; }
.h-hint { font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.55); letter-spacing: 0.01em; }
.h-arrow { position: absolute; top: 50%; width: 40px; height: 40px; margin-top: -20px; border-radius: 50%; display: grid; place-items: center; background: oklch(1 0 0 / 0.16); border: 1px solid oklch(1 0 0 / 0.22); color: #fff; cursor: pointer; z-index: 40; transition: background 200ms, transform 200ms; }
.h-arrow:hover { background: oklch(1 0 0 / 0.3); transform: scale(1.08); }
.h-arrow.l { left: 6px; } .h-arrow.r { right: 6px; }
/* H1: cover flow inside the hero */
.h1-flow { position: relative; height: 262px; margin: 10px -8px 0; }
.h1-flow .s2-stage { height: 258px; overflow: visible; }
.h1-flow .s2-t { top: 6px; }
/* H2: a glass strip along the bottom */
.h2-strip { display: flex; gap: 12px; overflow-x: auto; padding: 6px 4px 8px; margin: 0 -4px; scrollbar-width: none; mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 28px), transparent); }
.h2-strip::-webkit-scrollbar { display: none; }
.g-t { flex: 0 0 auto; width: 208px; display: flex; flex-direction: column; gap: 4px; padding: 13px 15px; border-radius: 18px; background: oklch(1 0 0 / 0.1); border: 1px solid oklch(1 0 0 / 0.18); color: #fff; cursor: pointer; position: relative; overflow: hidden; transition: transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1.2), background 220ms, color 220ms, box-shadow 220ms; backdrop-filter: blur(6px); }
.g-t::after { content: ""; position: absolute; top: -60%; left: -40%; width: 40%; height: 220%; background: linear-gradient(100deg, transparent, oklch(1 0 0 / 0.25), transparent); transform: translateX(-120%) rotate(14deg); transition: transform 700ms; pointer-events: none; }
.g-t:hover { transform: translateY(-4px); background: oklch(1 0 0 / 0.2); } .g-t:hover::after { transform: translateX(520%) rotate(14deg); }
.g-t .top { display: flex; align-items: center; gap: 9px; } .g-t .mn { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-size: 12.5px; font-weight: 800; flex-shrink: 0; }
.g-t .nm { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .g-t .bl { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px; } .g-t .dl { font-size: 11.5px; font-weight: 800; }
.g-t.off { opacity: 0.6; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .g-t.tl-${id} { background: #fff; color: ${ink(id)}; transform: translateY(-6px); box-shadow: 0 16px 30px oklch(0 0 0 / 0.3); border-color: transparent; }`).join("\n")}
.g-t .mn { background: oklch(1 0 0 / 0.2); }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .g-t.tl-${id} .mn { background: color-mix(in srgb, ${ink(id)} 16%, white); }`).join("\n")}
/* H3: a wallet stack on the right */
.h3-wal { position: relative; width: 470px; height: 480px; margin-left: auto; }
.h3-t { position: absolute; left: 0; right: 0; height: 174px; transition: transform 460ms cubic-bezier(0.3, 0.9, 0.3, 1.1), box-shadow 300ms; }
.h3-t .cs-line { display: none; } .h3-t:hover { filter: brightness(1.08); }
.h3-t .cs-top { gap: 12px; }
${IDS.map((sel) => { const si = WAL.indexOf(sel); return WAL.map((id, j) => { const y = j * 32 + (si >= 0 && j > si ? 142 : 0); return `.${p}dir:has(#${p}-sel-${sel}:checked) .h3-t.tl-${id} { transform: translateY(${y}px) ${j === si ? "scale(1.02)" : ""}; z-index: ${j + 1}; ${j === si ? "box-shadow: 0 0 0 3px oklch(1 0 0 / 0.9), 0 22px 40px oklch(0 0 0 / 0.35);" : ""} } .${p}dir:has(#${p}-sel-${sel}:checked) .h3-t.tl-${id}:hover { transform: translateY(${y - (j === si ? 0 : 5)}px) ${j === si ? "scale(1.02)" : ""}; }${j === si ? ` .${p}dir:has(#${p}-sel-${sel}:checked) .h3-t.tl-${id} .cs-line { display: block; }` : ""}`; }).join("\n"); }).join("\n")}
/* H4: the cards are the hero; the picked one opens into it */
.h4-row { display: flex; gap: 10px; height: 262px; }
.h4-t { flex: 1 1 0; min-width: 0; position: relative; border-radius: 24px; overflow: hidden; color: #fff; cursor: pointer; isolation: isolate; box-shadow: 0 10px 22px oklch(0 0 0 / 0.22); transition: flex-grow 520ms cubic-bezier(0.3, 0.9, 0.3, 1), background 300ms, box-shadow 300ms, transform 300ms; }
.h4-t::before { content: ""; position: absolute; inset: 0; z-index: -1; background: repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.07) 0 1px, transparent 1px 22px); }
.h4-t:hover { flex-grow: 1.5; transform: translateY(-3px); }
.h4-t .mini { display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; padding: 16px 8px; }
.h4-t .mini b { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 13px; white-space: nowrap; max-height: 104px; overflow: hidden; text-overflow: ellipsis; }
.h4-t .mini .nm { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 12px; font-weight: 700; opacity: 0.8; white-space: nowrap; max-height: 84px; overflow: hidden; text-overflow: ellipsis; }
.h4-t .mini .mn, .h5-c .mn { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: oklch(1 0 0 / 0.2); font-weight: 800; font-size: 14px; }
.h4-t .full { position: relative; display: none; opacity: 0; flex-direction: column; gap: 9px; height: 100%; padding: 22px 26px; min-width: 560px; transition: opacity 420ms 140ms; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .h4-t.tl-${id} { flex-grow: 7; cursor: default; background: radial-gradient(circle at 10% -25%, oklch(1 0 0 / 0.14), transparent 52%), linear-gradient(158deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to)) !important; box-shadow: 0 0 0 2px oklch(1 0 0 / 0.5), 0 24px 44px oklch(0 0 0 / 0.45); transform: none; } .${p}dir:has(#${p}-sel-${id}:checked) .h4-t.tl-${id} .full { display: flex; opacity: 1; } .${p}dir:has(#${p}-sel-${id}:checked) .h4-t.tl-${id} .mini { display: none; }`).join("\n")}
.h4-cat { position: absolute; top: 20px; right: 24px; font-size: 12px; padding: 6px 12px; background: oklch(1 0 0 / 0.16); }
/* H5: a rail of rings; the picked one opens into a pill */
.h5-rail { display: flex; align-items: center; gap: 10px; overflow-x: auto; padding: 8px 6px 10px; margin: 0 -6px; scrollbar-width: none; }
.h5-rail::-webkit-scrollbar { display: none; }
.h5-c { flex: 0 0 auto; height: 58px; max-width: 58px; border-radius: 999px; display: flex; align-items: center; gap: 12px; padding: 5px; color: #fff; cursor: pointer; overflow: visible; position: relative; box-shadow: 0 0 0 2px oklch(1 0 0 / 0.28), 0 8px 18px oklch(0 0 0 / 0.22); transition: max-width 520ms cubic-bezier(0.3, 0.9, 0.3, 1), transform 300ms, box-shadow 300ms, background 300ms; white-space: nowrap; }
.h5-c:hover { transform: translateY(-4px) scale(1.06); }
.h5-c .mn { width: 46px; height: 46px; border-radius: 50%; font-size: 18px; flex-shrink: 0; background: oklch(1 0 0 / 0.22); }
.h5-c .tx { display: flex; flex-direction: column; gap: 1px; padding-right: 18px; opacity: 0; transition: opacity 300ms 120ms; overflow: hidden; }
.h5-c .tx b { font-size: 14px; } .h5-c .tx span { font-size: 12.5px; font-weight: 800; opacity: 0.9; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .h5-c.tl-${id} { max-width: 280px; box-shadow: 0 0 0 3px #fff, 0 14px 28px oklch(0 0 0 / 0.32); } .${p}dir:has(#${p}-sel-${id}:checked) .h5-c.tl-${id} .tx { opacity: 1; }`).join("\n")}
.h5-c.off { filter: grayscale(0.9) brightness(0.8); }
.h5-c .hc-wrap { white-space: normal; }
</style>`;

const glassTile = (p, id) => { const f = FACTS[id], d = f.all ? f.sinceJan : L.change(id); return `<label for="${p}-sel-${id}" class="g-t tl-${id}${f.on ? "" : " off"}" tabindex="0"><span class="top"><span class="mn">${f.all ? "⌂" : f.name[0]}</span><span class="nm">${f.name}</span></span><b class="bl">${f.on ? inr(f.balance) : "₹0"}</b><span class="dl" style="opacity:0.85">${!f.on ? "Closed" : f.all ? `${f.fresh} of ${f.count} up to date · ${signed(d)}` : f.stale ? `${I.clock?.(10) ?? ""} not read ${L.daysBetween(f.asOf, L.TODAY)} days` : `${d == null ? "" : signed(d)} · ${L.fmt(f.asOf)}`}</span></label>`; };

// ---------- The five pages ----------
const wrap = (p, n, name, idea, stage) => {
  const pk = P.picker(p, Z1.heroSel);
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${W.WCSS}${S.CSS(p)}${CSS2(p)}${pk.css}${pk.open}${tag(n, name, idea)}${R.pointGreeting()}${stage}${pk.close}` });
};
const col = (inner) => `<div class="gpick" style="display:flex;flex-direction:column;gap:20px">${inner}</div>`;
const arrows = () => panes((f) => { const i = idx(f.id), pr = IDS[i - 1], nx = IDS[i + 1]; return `<span style="display:contents">${pr ? `<label for="__P__-sel-${pr}" class="h-arrow l" aria-label="Previous">${I.chev ? `<span style="display:flex;transform:rotate(90deg)">${I.chev(16)}</span>` : "‹"}</label>` : ""}${nx ? `<label for="__P__-sel-${nx}" class="h-arrow r" aria-label="Next">${I.chev ? `<span style="display:flex;transform:rotate(-90deg)">${I.chev(16)}</span>` : "›"}</label>` : ""}</span>`; }, {}, { style: "display:contents" });

export const h1 = () => wrap("ha", "H1", "Cover flow inside the hero", "The cards turn in a cover flow at the top of the hero, as the covers do on Subscriptions; the figure and the line sit beneath. Click a side card or an arrow.", greenStage(`${layers()}${col(`<div class="h1-flow"><div class="s2-stage">${IDS.map((id) => S.tile("ha", id, "s2-t", S.face(id, { big: 30, lineW: 220, lineH: 36 }))).join("")}</div>${arrows().replace(/__P__/g, "ha")}</div>${caption("ha")}${line("ha")}${stats()}`)}`, { pad: "26px 32px" }));
export const h2 = () => wrap("hb", "H2", "Glass strip along the bottom", "The hero as it is, with the cards as a strip of glass tiles under the stats. The picked tile turns solid white with the account's colour as its ink.", greenStage(`${layers()}${col(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:24px;align-items:center">${caption("hb")}<div style="display:flex;justify-content:center">${panes((f) => `<div class="objin">${Z2.objFor(TILE, f.id, { allMode: O2.allBand })}</div>`)}</div></div>${line("hb", 180)}${stats()}<div class="row" style="justify-content:space-between"><span class="h-hint">${IDS.filter((i) => FACTS[i].on && i !== "all").length} accounts · pick one</span>${hint("scroll for more")}</div><div class="h2-strip">${IDS.map((id) => glassTile("hb", id)).join("")}</div>`)}`, { pad: "30px 32px 22px" }));
export const h3 = () => wrap("hc", "H3", "Wallet stack beside the figure", "The cards stack on the right like a wallet, each showing its top strip; the picked one slides out fully and the others tuck above and below it.", greenStage(`${layers()}${col(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:24px;align-items:start">${caption("hc")}<div class="h3-wal">${WAL.map((id) => S.tile("hc", id, "h3-t", S.face(id, { big: 28, lineW: 400, lineH: 26 }))).join("")}<span class="h-hint" style="position:absolute;left:0;bottom:-2px">${L.CLOSED.map((a) => `${a.name} is closed`).join(", ")}</span></div></div>${line("hc", 180)}${stats()}`)}`, { pad: "30px 32px" }));
export const h4Tiles = (p) => IDS.map((id) => { const f = FACTS[id]; return `<label for="${p}-sel-${id}" class="h4-t tl-${id}${f.on ? "" : " cs-off"}" style="background:${S.grad(id)}" tabindex="0"><span class="mini"><span class="mn">${f.all ? "⌂" : f.name[0]}</span><span class="nm">${f.all ? "All" : f.name}</span></span><span class="full"><span class="h4-cat cs-chip">${f.all ? `${f.count} accounts · ${f.fresh} up to date` : `${L.purposeIcon(f.purpose, 12)}${L.purposeName(f.purpose)}${f.on ? "" : " · Closed"}`}</span><span class="eyebrow" style="color:oklch(1 0 0 / 0.7)">Your balance${f.all ? "" : ` · ${f.bank}`}</span><b style="font-size:62px;letter-spacing:-0.02em;line-height:1.05">${f.on ? inr(f.balance) : "₹0"}</b><span style="font-size:20px;font-weight:800">${f.name}</span><span style="font-size:13.5px;font-weight:700;color:oklch(1 0 0 / 0.78)">${P.whenLine(f)}</span><span style="margin-top:auto">${heroActions(f)}</span></span></label>`; }).join("");
export const h4Stage = (p) => greenStage(`${layers()}${col(`<div class="h4-row">${h4Tiles(p)}</div>${line(p, 170)}${stats()}`)}`, { pad: "26px 30px" });
export const h4 = () => wrap("hd", "H4", "The cards are the hero", "A row of cards across the top; the picked one opens into the hero itself, with the figure and buttons inside it, and the others fold to spines in their own colours.", h4Stage("hd"));
export const h5 = () => wrap("he", "H5", "A rail of rings", "A row of account rings across the top, like story rings; the picked one opens into a pill with its name and balance. Hover a ring for its card.", greenStage(`${layers()}${col(`<div class="h5-rail">${IDS.map((id) => { const f = FACTS[id]; return `<label for="he-sel-${id}" class="h5-c tl-${id} hov${f.on ? "" : " off"}" style="background:${S.grad(id)}" tabindex="0"><span class="mn">${f.all ? "⌂" : f.name[0]}</span><span class="tx"><b>${f.name}</b><span>${f.on ? inr(f.balance) : "Closed"}</span></span>${tip(hc({ h: f.name, t: f.on ? inr(f.balance) : "₹0", d: f.all ? `${f.count} accounts` : f.bank, w: 200 }), { w: 200, x: "c", y: "down" })}</label>`; }).join("")}</div><div style="display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:24px;align-items:center">${caption("he")}<div style="display:flex;justify-content:center">${panes((f) => `<div class="objin">${Z2.objFor(TILE, f.id, { allMode: O2.allBand })}</div>`)}</div></div>${line("he", 180)}${stats()}`)}`, { pad: "24px 32px 28px" }));

export const R13_DESKTOPS = [
  { file: "AccountsR13H1.dc.html", w: 1600, render: h1 },
  { file: "AccountsR13H2.dc.html", w: 1600, render: h2 },
  { file: "AccountsR13H3.dc.html", w: 1600, render: h3 },
  { file: "AccountsR13H4.dc.html", w: 1600, render: h4 },
  { file: "AccountsR13H5.dc.html", w: 1600, render: h5 },
];

/** The phone hero: the picked account as a card (the hero itself), a row of the others to switch to, then the line and four figures. */
export const CSSP = (p) => `<style>
.h4s-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 4px 2px 8px; margin: 0 -2px; }
.h4s-row::-webkit-scrollbar { display: none; }
.h4-s { flex: 0 0 76px; height: 78px; border-radius: 16px; padding: 9px 10px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; cursor: pointer; position: relative; isolation: isolate; overflow: hidden; box-shadow: 0 6px 14px oklch(0 0 0 / 0.25); transition: transform 300ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 300ms, opacity 250ms; }
.h4-s .mn { width: 26px; height: 26px; border-radius: 9px; display: grid; place-items: center; background: oklch(1 0 0 / 0.2); font-weight: 800; font-size: 12.5px; }
.h4-s .nm { font-size: 10.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h4-s::before { content: ""; position: absolute; inset: 0; z-index: -1; background: repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.07) 0 1px, transparent 1px 22px); }
.${p}dir:not(:has(#${p}-sel-all:checked)) .h4-s { opacity: 0.8; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .h4-s.tl-${id} { opacity: 1; transform: translateY(-3px); box-shadow: 0 0 0 2px oklch(1 0 0 / 0.6), 0 10px 20px oklch(0 0 0 / 0.35); }`).join("\n")}
</style>`;
export const heroCard = (f) => `<div style="position:relative;isolation:isolate;overflow:hidden;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:7px;color:#fff;background:${S.grad(f.id)};box-shadow:0 0 0 1.5px oklch(1 0 0 / 0.45), 0 18px 34px oklch(0 0 0 / 0.4)"><span style="position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 10% -25%, oklch(1 0 0 / 0.14), transparent 52%), repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.07) 0 1px, transparent 1px 22px)"></span><span class="row" style="justify-content:space-between;gap:8px"><span class="eyebrow" style="color:oklch(1 0 0 / 0.7)">Your balance</span><span class="cs-chip" style="font-size:11px;padding:4px 10px;background:oklch(1 0 0 / 0.16)">${f.all ? `${f.count} accounts` : `${L.purposeIcon(f.purpose, 12)}${L.purposeName(f.purpose)}${f.on ? "" : " · Closed"}`}</span></span><b style="font-size:38px;letter-spacing:-0.02em;line-height:1.05">${f.on ? inr(f.balance) : "₹0"}</b><span style="font-size:17px;font-weight:800">${f.name}</span><span style="font-size:12.5px;font-weight:700;color:oklch(1 0 0 / 0.78)">${P.whenLine(f)}</span><span style="margin-top:4px">${heroActions(f)}</span></div>`;
export const h4PhoneStage = (p) => greenStage(`${layers()}<div class="gpick" style="display:flex;flex-direction:column;gap:12px">${panes((f) => heroCard(f))}<div class="h4s-row">${IDS.map((id) => { const f = FACTS[id]; return `<label for="${p}-sel-${id}" class="h4-s tl-${id}${f.on ? "" : " cs-off"}" style="background:${S.grad(id)}" tabindex="0"><span class="mn">${f.all ? "⌂" : f.name[0]}</span><span class="nm">${f.all ? "All" : f.name}</span></label>`; }).join("")}</div>${panes((f) => whiteLine(f, { w: 330, h: 120, ph: true, key: p, mono: true }))}${panes((f) => statRow(f, { ph: true }))}</div>`, { ph: true, pad: "16px" });
