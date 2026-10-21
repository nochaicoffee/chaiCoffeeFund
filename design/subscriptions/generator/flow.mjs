// Directions S7–S16: the S1 cover flow Prathik liked, refined (2026-10-21).
// - The cards turn round in a circle with the wheel, a trackpad, a drag or swipe, or the arrow keys.
// - No separate colour band: the carousel card's own stage carries the pick's colour (in the tinted and coloured stages).
// - A full-width chart at the end of the page, like the Cards trend, that follows the pick.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as CORE from "./core.mjs";
import * as SC from "./selcore.mjs";
import * as S1 from "./sel1.mjs";
import * as CR from "./carousels.mjs";
import * as CH from "./charts.mjs";
import * as C2 from "./charts2.mjs";
const { inr, fmt, I, seg, rings, desktop, phone } = L;
const { facts, subOf, IDS, icon } = SC;

/** Turns the carousel on wheel, trackpad, drag, swipe and arrow keys. Each step checks the next radio, so CSS does the motion. */
export const FLOW_JS = `(() => {
  if (window.__subsFlow) return; window.__subsFlow = true;
  const stageOf = (e) => e.target && e.target.closest && e.target.closest(".cstage");
  const step = (st, dir) => { const rs = [...document.querySelectorAll('input[name="' + st.dataset.radio + '"]')]; if (!rs.length) return; const i = Math.max(0, rs.findIndex((r) => r.checked)); const n = rs[(i + dir + rs.length) % rs.length]; n.checked = true; n.dispatchEvent(new Event("change", { bubbles: true })); };
  const acc = new WeakMap(), last = new WeakMap();
  document.addEventListener("wheel", (e) => {
    const st = stageOf(e); if (!st) return; e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, now = performance.now(), a = (acc.get(st) || 0) + d;
    if (Math.abs(a) >= 40 && now - (last.get(st) || 0) > 90) { step(st, a > 0 ? 1 : -1); acc.set(st, 0); last.set(st, now); } else acc.set(st, Math.max(-80, Math.min(80, a)));
  }, { passive: false });
  let drag = null;
  document.addEventListener("pointerdown", (e) => { const st = stageOf(e); if (!st || e.button > 0) return; drag = { st, x: e.clientX, moved: false }; });
  document.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) >= 56) { step(drag.st, dx < 0 ? 1 : -1); drag.x = e.clientX; drag.moved = true; } });
  document.addEventListener("pointerup", () => { if (drag && drag.moved) { const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); }; document.addEventListener("click", stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener("click", stop, { capture: true }), 350); } drag = null; });
  document.addEventListener("pointercancel", () => { drag = null; });
  document.addEventListener("keydown", (e) => { const st = stageOf(e); if (!st) return; if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(st, 1); } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(st, -1); } });
})();`;

export const STYLES = `<style>
  .cstage { cursor: grab; user-select: none; -webkit-user-select: none; touch-action: pan-y; outline: none; border-radius: 18px; }
  .cstage:active { cursor: grabbing; }
  .cstage:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
  .cstage .sx { transition: transform 520ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity 380ms, filter 380ms !important; -webkit-user-drag: none; }
  .chint { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 70; display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 999px; background: oklch(1 0 0 / 0.72); border: 1px solid var(--surface-line); font-size: 11px; font-weight: 700; color: var(--muted); white-space: nowrap; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); pointer-events: none; }
  .chint kbd { font: inherit; font-weight: 800; padding: 0 5px; border-radius: 5px; background: var(--fill); color: var(--fg); }
  .stg { position: absolute; inset: 0; border-radius: inherit; opacity: 0; z-index: -2; transition: opacity 650ms ease; pointer-events: none; }
  .stage-dark { --fg: oklch(0.97 0.004 260); --muted: oklch(1 0 0 / 0.62); --divider: oklch(1 0 0 / 0.14); --fill: oklch(1 0 0 / 0.12); --fill-strong: oklch(1 0 0 / 0.22); --accent-text: var(--on-card-lime); --surface: oklch(0.22 0.012 260); --surface-line: oklch(1 0 0 / 0.1); color: var(--fg); border-color: transparent !important; }
  .stage-dark .btn-primary { background: var(--on-card-lime); color: var(--ink); }
  .stage-dark .btn-soft { background: oklch(1 0 0 / 0.14); color: var(--fg); }
  .stage-dark .btn-icon { background: oklch(1 0 0 / 0.14); color: var(--fg); border-color: transparent; }
  .stage-dark .chint { background: oklch(0 0 0 / 0.35); border-color: oklch(1 0 0 / 0.12); }
  .stage-deep { --sel-ring: var(--pick-soft, var(--on-card-lime)); }
  .stage-deep .track > span { background: var(--pick-soft, var(--on-card-lime)) !important; transition: background 500ms; }
  .stage-deep .btn-primary { background: var(--pick-soft, var(--on-card-lime)); color: var(--pick-ink, var(--ink)); transition: background 500ms, color 500ms; }
  .stage-deep .chint kbd { background: var(--pick-soft, var(--fill)); color: var(--pick-ink, var(--fg)); }
  @media (prefers-reduced-motion: reduce) { .cstage .sx, .stg { transition: none !important; } }
</style>`;

export const STAGES = {
  light: { name: "Light", cls: "", bg: "linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 62%)" },
  tint: { name: "Tinted by the pick", cls: "", bg: "var(--surface)", layer: (f) => `linear-gradient(180deg, color-mix(in oklch, var(--card-${f.color}) 30%, var(--surface)) 0%, color-mix(in oklch, var(--card-${f.color}) 9%, var(--surface)) 52%, var(--surface) 100%)` },
  deep: { name: "Coloured by the pick", cls: "stage-dark stage-deep", bg: "var(--ink)", layer: (f) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.2), transparent 55%), linear-gradient(165deg, var(--card-${f.color}-from), var(--card-${f.color}-to))` },
  dark: { name: "Dark", cls: "stage-dark", bg: "radial-gradient(circle at 50% -10%, oklch(0.34 0.02 260), var(--ink) 68%)" },
};
/** The pick's colour, lightened for marks on the coloured stage (bar, button, ring), and its deep shade for text on them. */
export const pickVars = (id) => { const c = facts(subOf(id)).color; return `--pick-soft: color-mix(in oklch, var(--card-${c}) 46%, white); --pick-ink: var(--card-${c}-to);`; };
const stageCss = (stage) => (dsel, id) => (STAGES[stage].layer ? `${dsel} .stg-${id} { opacity: 1; }` : "") + (stage === "deep" ? `\n${dsel} .stage-deep { ${pickVars(id)} }` : "");

function flowCard(prefix, stage, { ph = false } = {}) {
  const st = STAGES[stage];
  const layers = st.layer ? IDS.map((id) => `<span class="stg stg-${id}" style="background:${st.layer(facts(subOf(id)))}"></span>`).join("") : "";
  const tex = st.cls ? rings(1400, 540, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 }) : rings(1400, 540, { opacity: 0.04, first: 60, step: 34 });
  const w = ph ? 150 : 220, h = ph ? 106 : 156;
  const stageEl = `<div class="cstage" data-radio="${prefix}-sel" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Subscriptions. Scroll, drag or use the arrow keys to turn it." style="position:relative;height:${ph ? 196 : 270}px;perspective:${ph ? 900 : 1300}px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">
    ${CR.cards(prefix, (f) => CR.tile(f, w, h, { reflect: true, small: ph }), { base: `left:50%;top:${ph ? 14 : 24}px;` })}${ph ? "" : CR.nav(prefix, { inset: 28 })}
    <span class="chint">${ph ? "Swipe to turn" : `Scroll or drag to turn <kbd>←</kbd><kbd>→</kbd>`}</span></div>`;
  return `<section class="card glass textured ${st.cls}" style="gap:6px;padding:${ph ? "4px 16px 18px" : "8px 22px 26px"};background:${st.bg};overflow:hidden">${layers}${tex}${stageEl}${SC.heroPanes(S1.sHero, { ph })}</section>`;
}

// ---------- The charts ----------
const showing = () => `<span class="row" style="gap:8px"><span class="card-note">Showing</span>${SC.heroPanes((f) => `<span class="chip" style="gap:8px">${icon(f, 18)}${f.alias}</span>`)}</span>`;
const caption = (fn) => SC.heroPanes((f) => `<p style="font-size:13.5px;line-height:1.55;font-weight:500;color:var(--muted)">${fn(f).replace(/<b>/g, '<b style="color:var(--fg)">')}</p>`);
const legendPaid = `<span class="legend"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-4)"></i>Expected</span></span>`;
function chart(kind, prefix, ph) {
  const w = ph ? 322 : 1368;
  const ALL = {
    trend: { title: "Payment trend", sub: "the last 12 months paid and the next 6 expected · the pick is drawn in its colour", right: ph ? "" : `<span class="row" style="gap:10px">${legendPaid}${seg([{ label: "6M" }, { label: "1Y", on: true }, { label: "2Y" }])}</span>`, body: C2.trendCard(prefix, { w, h: ph ? 200 : 330, ph }), css: () => "" },
    glow: { title: "Spend over two years", sub: "each month's total as a line · pins mark the yearly and quarterly ones", right: ph ? "" : `<span class="row" style="gap:10px"><span class="legend"><span><i style="background:var(--accent-text);height:3px;border-radius:2px"></i>Paid</span><span><i style="border-top:2px dashed var(--accent-text);height:0;border-radius:0;width:14px"></i>Expected</span></span>${seg([{ label: "1Y" }, { label: "2Y", on: true }])}</span>`, body: C2.glowCard(prefix, { w, h: ph ? 200 : 340, ph }), css: () => "" },
    days: { title: "2026, day by day", sub: "every renewal on its day · darker costs more · the pick lights up", right: ph ? "" : `<span class="legend"><span>Less <i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i><i style="background:var(--heat-5)"></i> More</span><span><i style="border:1.5px dashed var(--heat-4)"></i>Expected</span><span><i style="background:var(--warning-tint);border:1.5px solid var(--warning)"></i>Not recorded</span></span>`, body: C2.yearOfDays({ ph }), css: C2.yearCss },
    cats: { title: "By category, month by month", sub: "what each category cost · the pick's category stays lit", right: ph ? "" : C2.catLegend(), body: C2.stackedCats({ w, h: ph ? 200 : 330, ph }), css: C2.catCss },
    bee: { title: "Every payment", sub: "each dot is one payment, sized by what it cost · hollow ones are still to come", right: ph ? "" : `<span class="legend">${L.byCategory().map((c) => `<span><i style="background:var(--card-${c.color});border-radius:50%"></i>${c.name}</span>`).join("")}</span>`, body: `${caption((f) => (f.all ? `<b>${L.PAYMENTS.length} payments</b> since you started, the biggest Microsoft 365 at ${inr(6199)}.` : `<b>${f.alias}</b>: ${f.payCount} payments, ${inr(f.paidSoFar)} in all.`))}${C2.beeswarm({ w, h: ph ? 150 : 230, ph })}`, css: C2.beeCss },
    life: { title: "Lifelines", sub: "when each one started, what it cost along the way, and what's next", right: ph ? "" : `<span class="legend"><span><i style="background:var(--negative);clip-path:polygon(50% 100%,0 0,100% 0)"></i>Price went up</span><span><i style="border:2px solid var(--fg);transform:rotate(45deg);border-radius:2px;width:8px;height:8px"></i>Next renewal</span></span>`, body: C2.lifelines({ w, rowH: ph ? 28 : 36, ph }), css: C2.lifeCss },
    water: { title: `How you got to ${inr(L.MONTHLY)} a month`, sub: "what changed your monthly total in the last 12 months", right: "", body: `${caption(C2.waterCaption)}${C2.waterfall({ w, h: ph ? 200 : 360, ph })}`, css: C2.waterCss },
    lifetime: { title: "Lifetime cost", sub: "everything you've paid each one, since it started", right: ph ? "" : `<span class="legend"><span>The line shows what each payment cost</span></span>`, body: `${caption(C2.lifetimeCaption)}${C2.lifetime({ ph })}`, css: C2.lifetimeCss },
    stream: { title: "Two years, as a stream", sub: "each category's monthly spend · the pick's category stands out", right: ph ? "" : C2.catLegend(), body: CH.streamgraph({ w, h: ph ? 200 : 320, ph }), css: CH.streamCss },
    ridge: { title: "Renewal rhythm", sub: "every payment as a peak · dashed ones are still to come · the pick stands out", right: ph ? "" : `<span class="legend"><span><i style="background:var(--warning);border-radius:50%"></i>Not recorded</span></span>`, body: CH.ridgeline({ w, rowH: ph ? 22 : 30, ph }), css: CH.ridgeCss },
  };
  if (kind === "switch") return switchChart(ALL, prefix, ph);
  const C = ALL[kind];
  return { css: C.css, html: `<section class="card glass" style="gap:14px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">${C.title}${ph ? "" : `<small>${C.sub}</small>`}</span>${ph ? "" : `<span class="row" style="gap:16px">${C.right}${showing()}</span>`}</div>${C.body}</section>` };
}

/** One full-width card that switches between charts (the final design: Day by day, Payment trend, Lifetime cost). */
export const SWITCH_VIEWS = [["days", "Day by day"], ["trend", "Payment trend"], ["lifetime", "Lifetime cost"]];
function switchChart(ALL, prefix, ph) {
  const d = `.${prefix}dir`;
  const radios = SWITCH_VIEWS.map(([v], i) => `<input type="radio" class="pk-in" name="${prefix}-cv" id="${prefix}-cv-${v}"${i === 0 ? " checked" : ""}>`).join("");
  const css = `<style>${d} .cvp { display: none; } ${SWITCH_VIEWS.map(([v]) => `${d}:has(#${prefix}-cv-${v}:checked) .cvp-${v} { display: block; } ${d}:has(#${prefix}-cv-${v}:checked) label[for="${prefix}-cv-${v}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); } ${d}:has(#${prefix}-cv-${v}:focus-visible) label[for="${prefix}-cv-${v}"] { outline: 2px solid var(--accent); outline-offset: 1px; }`).join(" ")}</style>`;
  const sw = `<span class="seg" role="tablist" aria-label="Chart">${SWITCH_VIEWS.map(([v, l]) => `<label for="${prefix}-cv-${v}" class="seg-i" style="cursor:pointer${ph ? ";padding:6px 10px;font-size:11.5px" : ""}">${ph && v === "trend" ? "Trend" : ph && v === "lifetime" ? "Lifetime" : l}</label>`).join("")}</span>`;
  const legends = ph ? "" : SWITCH_VIEWS.map(([v]) => `<span class="cvp cvp-${v}">${ALL[v].right.replace(/<span class="seg">[\s\S]*?<\/span><\/span>$/, "</span>")}</span>`).join("");
  const panes = SWITCH_VIEWS.map(([v]) => `<div class="cvp cvp-${v}">${ph ? "" : `<p class="card-note" style="margin-bottom:12px">${ALL[v].sub.charAt(0).toUpperCase() + ALL[v].sub.slice(1)}.</p>`}${ALL[v].body}</div>`).join("");
  return { css: (dsel, id) => SWITCH_VIEWS.map(([v]) => ALL[v].css(dsel, id)).join("\n"),
    html: `${css}<section class="card glass" style="gap:12px${ph ? ";padding:16px" : ""}">${radios}<div class="card-h"><span class="row" style="gap:14px">${ph ? "" : `<span class="card-t">Over time</span>`}${sw}</span>${ph ? "" : `<span class="row" style="gap:16px">${legends}${showing()}</span>`}</div>${panes}</section>` };
}

export const DIRS = [
  { k: "s7", name: "Trend bars", stage: "light", chart: "trend", second: "charged", blurb: "The Cards trend for subscriptions: textured bars, the pick drawn in its colour, a hover card per month." },
  { k: "s8", name: "Glow line", stage: "tint", chart: "glow", second: "changes", blurb: "A glowing line over two years, with the yearly and quarterly ones pinned where they land." },
  { k: "s9", name: "Day by day", stage: "deep", chart: "days", second: "charged", blurb: "2026 as a grid of days: every renewal on its day, the pick lit in its colour." },
  { k: "s10", name: "By category", stage: "dark", chart: "cats", second: "changes", blurb: "Stacked columns by category, month by month; the pick's category stays lit." },
  { k: "s11", name: "Every payment", stage: "light", chart: "bee", second: "charged", blurb: "Each payment a dot sized by cost, swarming along the timeline; the pick's dots stay." },
  { k: "s12", name: "Lifelines", stage: "tint", chart: "life", second: "changes", blurb: "A lane per subscription from its start: payments, price rises, pauses and the next renewal." },
  { k: "s13", name: "Waterfall", stage: "deep", chart: "water", second: "charged", blurb: "How the monthly total got from a year ago to today, one change at a time." },
  { k: "s14", name: "Lifetime cost", stage: "dark", chart: "lifetime", second: "changes", blurb: "Everything you've paid each one since it started, biggest first, with its price line." },
  { k: "s15", name: "Stream", stage: "tint", chart: "stream", second: "charged", blurb: "Two years of categories flowing as a stream; the pick's category stands out." },
  { k: "fin", name: "Final", stage: "deep", chart: "switch", second: "charged", final: true, blurb: "Your pick: the coloured cover-flow hero, with a chart that switches between Day by day, Payment trend and Lifetime cost." },
  { k: "s16", name: "Rhythm", stage: "light", chart: "ridge", second: "changes", blurb: "Every payment as a peak on its subscription's line, so the rhythm shows." },
];

function build(cfg, { ph = false } = {}) {
  const prefix = ph ? `${cfg.k}p` : cfg.k;
  const ch = chart(cfg.chart, prefix, ph);
  const place = ph ? CR.s1Place({ near: 110, step: 46, rot: 58 }) : CR.s1Place();
  const selCss = (dsel, id) => `${CR.s1Sel(place)(dsel, id)}\n${stageCss(cfg.stage)(dsel, id)}\n${ch.css(dsel, id)}`;
  const pk = SC.picker(prefix, selCss, "all");
  const card = flowCard(prefix, cfg.stage, { ph });
  if (ph) return phone({ h: "auto", body: `${STYLES}${CR.NAV_CSS}${pk.css}${pk.open}${CORE.greeting({ phone: true })}${card}${CORE.phoneMap()}${CR.phoneAllPayments()}${ch.html}${pk.close}<script>${FLOW_JS}</script>` });
  return desktop({ h: "auto", body: `${STYLES}${CR.NAV_CSS}${pk.css}${pk.open}${CORE.greeting()}${card}${SC.bottom(prefix, cfg.second)}${ch.html}${pk.close}<script>${FLOW_JS}</script>` });
}
export const desktopOf = (k) => () => build(DIRS.find((d) => d.k === k));
export const phoneOf = (k) => () => build(DIRS.find((d) => d.k === k), { ph: true });
