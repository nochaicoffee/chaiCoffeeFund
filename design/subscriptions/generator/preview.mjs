// The page that's published: the Read me inline, and every other artboard as its own file under boards/,
// fetched when its tab opens (the boards together are bigger than one artifact page may be), scaled to fit.
import { FLOW_JS } from "./flow.mjs";
// It's a build artifact. The source is design/subscriptions/*.dc.html and canvas.json.
const TABS = [
  { id: "readme", label: "Read me", boards: [["SubsReadme.dc.html", "Read me"]] },
  { id: "final", label: "Final design", group: "Picked", boards: [["SubsFinal.dc.html", "Desktop"], ["SubsFinalPhone.dc.html", "Phone"], ["SubsFinalStates.dc.html", "States"], ["SubsRenewals.dc.html", "Renewals page"], ["SubsRenewalsPhone.dc.html", "Renewals · phone"], ["SubsRenewalsStates.dc.html", "Renewals · states"]] },
  { id: "s7", label: "S7 · Trend bars", group: "Explored", boards: [["SubsS7.dc.html", "Desktop"], ["SubsS7Phone.dc.html", "Phone"]] },
  { id: "s8", label: "S8 · Glow line", boards: [["SubsS8.dc.html", "Desktop"], ["SubsS8Phone.dc.html", "Phone"]] },
  { id: "s9", label: "S9 · Day by day", boards: [["SubsS9.dc.html", "Desktop"], ["SubsS9Phone.dc.html", "Phone"]] },
  { id: "s10", label: "S10 · By category", boards: [["SubsS10.dc.html", "Desktop"], ["SubsS10Phone.dc.html", "Phone"]] },
  { id: "s11", label: "S11 · Every payment", boards: [["SubsS11.dc.html", "Desktop"], ["SubsS11Phone.dc.html", "Phone"]] },
  { id: "s12", label: "S12 · Lifelines", boards: [["SubsS12.dc.html", "Desktop"], ["SubsS12Phone.dc.html", "Phone"]] },
  { id: "s13", label: "S13 · Waterfall", boards: [["SubsS13.dc.html", "Desktop"], ["SubsS13Phone.dc.html", "Phone"]] },
  { id: "s14", label: "S14 · Lifetime cost", boards: [["SubsS14.dc.html", "Desktop"], ["SubsS14Phone.dc.html", "Phone"]] },
  { id: "s15", label: "S15 · Stream", boards: [["SubsS15.dc.html", "Desktop"], ["SubsS15Phone.dc.html", "Phone"]] },
  { id: "s16", label: "S16 · Rhythm", boards: [["SubsS16.dc.html", "Desktop"], ["SubsS16Phone.dc.html", "Phone"]] },
  { id: "s1", label: "S1 · Cover-flow ring", group: "Carousels", boards: [["SubsS1.dc.html", "Desktop"], ["SubsS1Phone.dc.html", "Phone"]] },
  { id: "s2", label: "S2 · 3D ring", boards: [["SubsS2.dc.html", "Desktop"], ["SubsS2Phone.dc.html", "Phone"]] },
  { id: "s3", label: "S3 · Turntable", boards: [["SubsS3.dc.html", "Desktop"], ["SubsS3Phone.dc.html", "Phone"]] },
  { id: "s4", label: "S4 · Rolodex", boards: [["SubsS4.dc.html", "Desktop"], ["SubsS4Phone.dc.html", "Phone"]] },
  { id: "s5", label: "S5 · Wheel", boards: [["SubsS5.dc.html", "Desktop"], ["SubsS5Phone.dc.html", "Phone"]] },
  { id: "s6", label: "S6 · Halo", boards: [["SubsS6.dc.html", "Desktop"], ["SubsS6Phone.dc.html", "Phone"]] },
  { id: "q", label: "Q · Dock", group: "Selectors", boards: [["SubsQ.dc.html", "Desktop"], ["SubsQPhone.dc.html", "Phone"]] },
  { id: "r", label: "R · Tickets", boards: [["SubsR.dc.html", "Desktop"], ["SubsRPhone.dc.html", "Phone"]] },
  { id: "s", label: "S · Cover flow", boards: [["SubsS.dc.html", "Desktop"], ["SubsSPhone.dc.html", "Phone"]] },
  { id: "t", label: "T · Orbit", boards: [["SubsT.dc.html", "Desktop"], ["SubsTPhone.dc.html", "Phone"]] },
  { id: "u", label: "U · Ruler", boards: [["SubsU.dc.html", "Desktop"], ["SubsUPhone.dc.html", "Phone"]] },
  { id: "v", label: "V · Card fan", boards: [["SubsV.dc.html", "Desktop"], ["SubsVPhone.dc.html", "Phone"]] },
  { id: "w", label: "W · Ribbon", boards: [["SubsW.dc.html", "Desktop"], ["SubsWPhone.dc.html", "Phone"]] },
  { id: "x", label: "X · Keyboard", boards: [["SubsX.dc.html", "Desktop"], ["SubsXPhone.dc.html", "Phone"]] },
  { id: "y", label: "Y · Shelf", boards: [["SubsY.dc.html", "Desktop"], ["SubsYPhone.dc.html", "Phone"]] },
  { id: "z", label: "Z · Tabs", boards: [["SubsZ.dc.html", "Desktop"], ["SubsZPhone.dc.html", "Phone"]] },
  { id: "l", label: "L · Equation", group: "Heroes", boards: [["SubsL.dc.html", "Desktop"], ["SubsLPhone.dc.html", "Phone"], ["SubsLPStates.dc.html", "States (L–P)"]] },
  { id: "m", label: "M · Departure board", boards: [["SubsM.dc.html", "Desktop"], ["SubsMPhone.dc.html", "Phone"], ["SubsLPStates.dc.html", "States (L–P)"]] },
  { id: "n", label: "N · Rings", boards: [["SubsN.dc.html", "Desktop"], ["SubsNPhone.dc.html", "Phone"], ["SubsLPStates.dc.html", "States (L–P)"]] },
  { id: "o", label: "O · Two-year chart", boards: [["SubsO.dc.html", "Desktop"], ["SubsOPhone.dc.html", "Phone"], ["SubsLPStates.dc.html", "States (L–P)"]] },
  { id: "p", label: "P · Year dial", boards: [["SubsP.dc.html", "Desktop"], ["SubsPPhone.dc.html", "Phone"], ["SubsLPStates.dc.html", "States (L–P)"]] },
  { id: "a", label: "A · One list", group: "Earlier", boards: [["SubsA.dc.html", "Desktop"], ["SubsAPhone.dc.html", "Phone"], ["SubsAStates.dc.html", "States"]] },
  { id: "b", label: "B · Calendar", boards: [["SubsB.dc.html", "Desktop"], ["SubsBPhone.dc.html", "Phone"], ["SubsBStates.dc.html", "States"]] },
  { id: "c", label: "C · Tiles", boards: [["SubsC.dc.html", "Desktop"], ["SubsCPhone.dc.html", "Phone"], ["SubsCStates.dc.html", "States"]] },
  { id: "d", label: "D · Cost map", boards: [["SubsD.dc.html", "Desktop"], ["SubsDPhone.dc.html", "Phone"], ["SubsDHStates.dc.html", "States (D–H)"]] },
  { id: "e", label: "E · Wall calendar", boards: [["SubsE.dc.html", "Desktop"], ["SubsEPhone.dc.html", "Phone"], ["SubsDHStates.dc.html", "States (D–H)"]] },
  { id: "f", label: "F · Cards twin", boards: [["SubsF.dc.html", "Desktop"], ["SubsFPhone.dc.html", "Phone"], ["SubsDHStates.dc.html", "States (D–H)"]] },
  { id: "g", label: "G · Check-in", boards: [["SubsG.dc.html", "Desktop"], ["SubsGPhone.dc.html", "Phone"], ["SubsDHStates.dc.html", "States (D–H)"]] },
  { id: "h", label: "H · By card", boards: [["SubsH.dc.html", "Desktop"], ["SubsHPhone.dc.html", "Phone"], ["SubsDHStates.dc.html", "States (D–H)"]] },
  { id: "i", label: "I · Two panes", boards: [["SubsI.dc.html", "Desktop"], ["SubsIPhone.dc.html", "Phone"], ["SubsNewStates.dc.html", "States (I–K)"]] },
  { id: "j", label: "J · Year in review", boards: [["SubsJ.dc.html", "Desktop"], ["SubsJPhone.dc.html", "Phone"], ["SubsNewStates.dc.html", "States (I–K)"]] },
  { id: "k", label: "K · Bento", boards: [["SubsK.dc.html", "Desktop"], ["SubsKPhone.dc.html", "Phone"], ["SubsNewStates.dc.html", "States (I–K)"]] },
  { id: "renewals", label: "R1 · Table (picked)", group: "Renewals page", boards: [["SubsRenewals.dc.html", "Desktop"], ["SubsRenewalsPhone.dc.html", "Phone"], ["SubsRenewalsStates.dc.html", "States"]] },
  { id: "r2", label: "R2 · Ledger", boards: [["SubsRenewals2.dc.html", "Desktop"], ["SubsRenewals2Phone.dc.html", "Phone"], ["SubsNewStates.dc.html", "States (R2–R3)"]] },
  { id: "r3", label: "R3 · Grid", boards: [["SubsRenewals3.dc.html", "Desktop"], ["SubsRenewals3Phone.dc.html", "Phone"], ["SubsNewStates.dc.html", "States (R2–R3)"]] },
  { id: "forms", label: "Forms", group: " ", boards: [["SubsForms.dc.html", "Forms"]] },
];

export const boardPath = (file) => `boards/${file.replace(".dc.html", "")}.html`;
export function previewPage(boards, css, font) {
  const byFile = Object.fromEntries(boards.map((b) => [b.file, b]));
  const html = (file) => {
    let h = byFile[file].html;
    // Only the C desktop board owns the tile radios; elsewhere a tile is just a picture.
    if (file !== "SubsC.dc.html") h = h.replace(/ for="c-(sel|v)-/g, ' data-for="c-$1-');
    return h;
  };
  const panes = TABS.map((t) => `<section class="pane" id="pane-${t.id}" data-tab="${t.id}" hidden>
    ${t.boards.length > 1 ? `<div class="views" role="tablist" aria-label="${t.label} views">${t.boards.map(([f, l], i) => `<button type="button" role="tab" class="view" id="view-${t.id}-${i}" data-view="${i}" aria-selected="${i === 0}">${l}</button>`).join("")}<span class="hint" id="hint-${t.id}"></span></div>` : ""}
    ${t.id === "readme" ? `<div class="native">${html("SubsReadme.dc.html").replace('class="chai-app board" style="width:1300px;height:' + byFile["SubsReadme.dc.html"].h + 'px"', 'class="chai-app board readme-native"')}</div>` : t.boards.map(([f, l], i) => `<div class="fit" data-w="${byFile[f].w}" data-h="${byFile[f].h}" data-view="${i}" data-src="${boardPath(f)}"${i ? " hidden" : ""}><div class="fit-in"><div class="fit-load" style="width:${byFile[f].w}px;height:${byFile[f].h}px">Loading ${l.toLowerCase()}…</div></div></div>`).join("")}
  </section>`).join("");
  const used = [...new Set(TABS.filter((t) => t.id !== "readme").flatMap((t) => t.boards.map(([f]) => f)))];
  const fragments = used.map((f) => ({ path: boardPath(f), html: html(f) }));
  const index = `<title>Subscriptions Page Designs</title>
<meta name="claude:viewport-fit-sides" content="cover">
${font}
<style>
:root { color-scheme: light; --p-page: oklch(0.965 0.004 90); --p-surface: oklch(0.995 0 0); --p-line: oklch(0 0 0 / 0.08); --p-fg: oklch(0.19 0.008 260); --p-muted: oklch(0.52 0.012 260); --p-fill: oklch(0 0 0 / 0.055); --p-ink: oklch(0.16 0.008 260); --p-on-ink: oklch(0.99 0 0); --p-accent: oklch(0.72 0.19 145); --p-accent-text: oklch(0.42 0.14 145); --p-warn: oklch(0.95 0.05 85); --p-warn-text: oklch(0.47 0.1 70); }
html, body { background: var(--p-page); color: var(--p-fg); }
body { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
.top { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 100; background: oklch(0.965 0.004 90 / 0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--p-line); padding-block: 12px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
.brand { display: flex; flex-direction: column; gap: 2px; margin-right: auto; min-width: 0; }
.brand b { font-size: 16px; font-weight: 800; }
.brand span { font-size: 12px; color: var(--p-muted); font-weight: 600; }
.tabs { display: flex; gap: 4px; padding: 3px; border-radius: 999px; background: var(--p-fill); overflow-x: auto; max-width: 100%; scrollbar-width: none; }
.tab, .view, .zoom button { font: inherit; border: 0; cursor: pointer; background: transparent; color: var(--p-muted); font-size: 13px; font-weight: 700; padding: 8px 14px; border-radius: 999px; white-space: nowrap; min-height: 36px; }
.tab[aria-selected="true"], .view[aria-selected="true"], .zoom button[aria-pressed="true"] { background: var(--p-surface); color: var(--p-accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }
.tab:focus-visible, .view:focus-visible, .zoom button:focus-visible { outline: 2px solid var(--p-accent); outline-offset: 2px; }
.tab-group { align-self: center; padding: 0 4px 0 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--p-muted); white-space: nowrap; }
.tab-group:empty { padding: 0 2px; }
.zoom { display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: var(--p-fill); }
.zoom button { font-size: 12px; padding: 6px 12px; min-height: 32px; }
.sample-note { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--p-warn); color: var(--p-warn-text); font-size: 12px; font-weight: 800; }
main.wrap { padding-block: 20px 60px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.views { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 16px; }
.views .view { background: var(--p-fill); }
.hint { font-size: 12px; color: var(--p-muted); font-weight: 600; margin-left: 10px; }
.fit { position: relative; margin: 0 auto; }
.fit-in { transform-origin: top left; width: max-content; }
.fit-load { display: flex; align-items: center; justify-content: center; border-radius: 28px; background: var(--p-surface); border: 1px dashed var(--p-line); color: var(--p-muted); font-size: 28px; font-weight: 700; }
.fit.actual { overflow-x: auto; }
.fit.actual .fit-in { transform: none !important; }
.fit .chai-app { box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 10px 30px oklch(0 0 0 / 0.08); border-radius: 28px; }
.fit .chai-app.ph { border-radius: 34px; }
.native { max-width: 1300px; margin: 0 auto; }
.chai-app.readme-native { width: auto; height: auto; border-radius: 28px; box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 10px 30px oklch(0 0 0 / 0.08); }
@media (max-width: 860px) {
  .chai-app.readme-native { padding: 22px 18px; gap: 26px; }
  .readme-native [style*="grid-template-columns:repeat(4"], .readme-native [style*="grid-template-columns:repeat(5"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .readme-native [style*="grid-template-columns:repeat(3"], .readme-native [style*="grid-template-columns:repeat(2"] { grid-template-columns: 1fr !important; }
  .readme-native .card[style*="flex-direction:row"] { flex-direction: column !important; align-items: flex-start !important; }
  .readme-native .board-h h2 { font-size: 22px; }
  .readme-native .board-h .row { flex-wrap: wrap; }
}
@media (max-width: 560px) { .readme-native [style*="grid-template-columns:repeat(4"], .readme-native [style*="grid-template-columns:repeat(5"] { grid-template-columns: 1fr !important; } .brand span { display: none; } .hint { display: none; } .zoom { display: none; } .top { gap: 8px 12px; } .brand b { font-size: 15px; } }
${css}
</style>
<header class="top">
  <div class="brand"><b>Subscriptions page designs</b><span>chaiCoffeeFund · /subscriptions · the final design, and everything explored on the way</span></div>
  <span class="sample-note">Sample data, made up</span>
  <nav class="tabs" role="tablist" aria-label="Boards">${TABS.map((t, i) => `${t.group ? `<span class="tab-group" aria-hidden="true">${t.group.trim()}</span>` : ""}<button type="button" role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="pane-${t.id}" aria-selected="${i === 0}">${t.label}</button>`).join("")}</nav>
  <div class="zoom" role="group" aria-label="Size"><button type="button" data-zoom="fit" aria-pressed="true">Fit width</button><button type="button" data-zoom="actual" aria-pressed="false">Actual size</button></div>
</header>
<main class="wrap">${panes}</main>
<script>
(() => {
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let zoom = store.get("subs-zoom") || "fit";
  const tabs = [...document.querySelectorAll(".tab")];
  const panes = [...document.querySelectorAll(".pane")];
  function fitAll() {
    const avail = document.querySelector("main.wrap").clientWidth - parseFloat(getComputedStyle(document.querySelector("main.wrap")).paddingLeft) - parseFloat(getComputedStyle(document.querySelector("main.wrap")).paddingRight);
    document.querySelectorAll(".pane:not([hidden]) .fit:not([hidden])").forEach((f) => {
      load(f);
      const w = +f.dataset.w, h = +f.dataset.h;
      const s = zoom === "fit" || window.innerWidth < 560 ? Math.min(1, avail / w) : 1;
      f.classList.toggle("actual", zoom !== "fit");
      f.querySelector(".fit-in").style.transform = "scale(" + s + ")";
      f.style.width = zoom === "fit" ? w * s + "px" : "100%";
      f.style.height = (zoom === "fit" ? h * s : h + 16) + "px";
      const pane = f.closest(".pane"); const hint = pane && pane.querySelector(".hint");
      if (hint) hint.textContent = s < 1 ? "Shown at " + Math.round(s * 100) + "%. Actual size scrolls sideways." : "";
    });
  }
  function load(f) {
    if (!f.dataset.src || f.dataset.loaded) return;
    f.dataset.loaded = "1";
    fetch(f.dataset.src).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => { f.querySelector(".fit-in").innerHTML = t; fitAll(); })
      .catch(() => { delete f.dataset.loaded; f.querySelector(".fit-in").innerHTML = '<div class="fit-load" style="width:' + f.dataset.w + 'px;height:' + f.dataset.h + 'px">This board did not load. Open the tab again to retry.</div>'; });
  }
  function show(id) {
    if (!panes.some((p) => p.dataset.tab === id)) id = "readme";
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === id)));
    panes.forEach((p) => (p.hidden = p.dataset.tab !== id));
    const pane = document.getElementById("pane-" + id);
    const v = store.get("subs-view-" + id) || (window.innerWidth < 700 && pane.querySelector('.view[data-view="1"]') ? "1" : null);
    if (v) pick(pane, v);
    fitAll();
  }
  function pick(pane, v) {
    if (!pane) return;
    pane.querySelectorAll(".view").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    pane.querySelectorAll(".fit").forEach((f) => (f.hidden = f.dataset.view !== v));
  }
  tabs.forEach((t) => t.addEventListener("click", () => { show(t.dataset.tab); history.replaceState(null, "", "#" + t.dataset.tab); window.scrollTo({ top: 0 }); }));
  document.querySelectorAll(".view").forEach((b) => b.addEventListener("click", () => { const pane = b.closest(".pane"); pick(pane, b.dataset.view); store.set("subs-view-" + pane.dataset.tab, b.dataset.view); fitAll(); }));
  document.querySelectorAll(".zoom button").forEach((b) => b.addEventListener("click", () => { zoom = b.dataset.zoom; store.set("subs-zoom", zoom); document.querySelectorAll(".zoom button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); fitAll(); }));
  document.querySelectorAll(".zoom button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.zoom === zoom)));
  // Menus in the boards: one open at a time, and Esc or a click elsewhere closes them.
  document.addEventListener("click", (e) => { document.querySelectorAll("details.sel[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("details.sel[open]").forEach((d) => (d.open = false)); });
  const rowNext = (b) => { const row = b.parentElement.querySelector(".tilerow"); row.scrollBy({ left: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 ? -row.scrollWidth : 440 }); };
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".tilerow-next"); if (b) rowNext(b); });
  document.addEventListener("keydown", (e) => { const b = e.target.closest && e.target.closest(".tilerow-next"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); rowNext(b); } });
  window.addEventListener("resize", fitAll);
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show((location.hash || "#readme").slice(1));
})();
${FLOW_JS}
</script>`;
  return { index, fragments };
}
