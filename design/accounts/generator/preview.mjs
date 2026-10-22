// The page that's published: the Read me inline, and every other artboard as its own file under boards/,
// fetched when its tab opens, scaled to fit. It's a build artifact. The source is design/accounts/*.dc.html and canvas.json.
import { FLOW_JS } from "./dirs.mjs";
import { DEFS } from "./charts.mjs";
const TABS = [
  { id: "readme", label: "Read me", boards: [["AccountsReadme.dc.html", "Read me"]] },
  { id: "history", label: "Balance history", group: "Newest", boards: [["AccountsHistoryH1.dc.html", "H1 Ledger"], ["AccountsHistoryH1Phone.dc.html", "H1 phone"], ["AccountsHistoryH2.dc.html", "H2 Check-in grid"], ["AccountsHistoryH2Phone.dc.html", "H2 phone"], ["AccountsHistoryH3.dc.html", "H3 Passbook"], ["AccountsHistoryH3Phone.dc.html", "H3 phone"]] },
  { id: "final", label: "Final page", group: "Final", boards: [["AccountsFinalPage.dc.html", "Final page"], ["AccountsFinalPagePhone.dc.html", "Final phone"], ["AccountsFinalPageStates.dc.html", "States"], ["AccountsFinalPageStatesPhone.dc.html", "Phone states"], ["AccountsFinalPageForms.dc.html", "Forms"], ["AccountsFinalPageFormsPhone.dc.html", "Phone forms"], ["AccountsFinal.dc.html", "Hero (earlier)"], ["AccountsFinalStates.dc.html", "States (earlier)"], ["AccountsFinalForms.dc.html", "Forms (earlier)"], ["AccountsFinalPhone.dc.html", "Phone (earlier)"]] },
  { id: "r13", label: "Round 13", group: "Round 13", boards: [["AccountsR13H1.dc.html", "H1 Cover flow"], ["AccountsR13H2.dc.html", "H2 Glass strip"], ["AccountsR13H3.dc.html", "H3 Wallet"], ["AccountsR13H4.dc.html", "H4 Cards are the hero"], ["AccountsR13H5.dc.html", "H5 Rings"]] },
  { id: "r12", label: "Round 12", group: "Round 12", boards: [["AccountsR12Selectors.dc.html", "Cards as selector"]] },
  { id: "r11", label: "Round 11", group: "Round 11", boards: [["AccountsR11A.dc.html", "W1-A"], ["AccountsR11B.dc.html", "W1-B"], ["AccountsR11C.dc.html", "W1-C"], ["AccountsR11D.dc.html", "W1-D"], ["AccountsR11InOut.dc.html", "In & out ×5"], ["AccountsR11Mix.dc.html", "Mix ×5"]] },
  { id: "widgets", label: "Round 10", group: "Round 10", boards: [["AccountsWidgetsW1.dc.html", "W1 Movers"], ["AccountsWidgetsW2.dc.html", "W2 Runway"], ["AccountsWidgetsW3.dc.html", "W3 Check-in"], ["AccountsWidgetsW4.dc.html", "W4 Mix"], ["AccountsWidgetsW5.dc.html", "W5 Scoreboard"], ["AccountsWidgetsPhone.dc.html", "Phone"]] },
  { id: "z3", label: "Bank objects 3", group: "Explored", boards: [["AccountsZ3.dc.html", "Desktop"], ["AccountsZ3Phone.dc.html", "Phone"]] },
  { id: "z2", label: "Z1 · Objects 2", boards: [["AccountsZ2.dc.html", "Desktop"], ["AccountsZ2Phone.dc.html", "Phone"]] },
  { id: "z1", label: "Z1 · Objects", boards: [["AccountsZ1.dc.html", "Desktop"], ["AccountsZ1Forms.dc.html", "Add account"], ["AccountsZ1Phone.dc.html", "Phone"]] },
  { id: "zsel", label: "Y · Any number", boards: [["AccountsZSel.dc.html", "Desktop"], ["AccountsZSelPhone.dc.html", "Phone"]] },
  { id: "ysel", label: "Y · Selectors", boards: [["AccountsYSel.dc.html", "Desktop"], ["AccountsYSelPhone.dc.html", "Phone"]] },
  { id: "u", label: "U · Split bar", group: "Green", boards: [["AccountsU.dc.html", "Desktop"], ["AccountsUPhone.dc.html", "Phone"]] },
  { id: "v", label: "V · List", boards: [["AccountsV.dc.html", "Desktop"], ["AccountsVPhone.dc.html", "Phone"]] },
  { id: "w", label: "W · Passbooks", boards: [["AccountsW.dc.html", "Desktop"], ["AccountsWPhone.dc.html", "Phone"]] },
  { id: "x", label: "X · Tabs", boards: [["AccountsX.dc.html", "Desktop"], ["AccountsXPhone.dc.html", "Phone"]] },
  { id: "y", label: "Y · Ticker", boards: [["AccountsY.dc.html", "Desktop"], ["AccountsYPhone.dc.html", "Phone"]] },
  { id: "a", label: "A · Cover flow", boards: [["AccountsA.dc.html", "Desktop"], ["AccountsAPhone.dc.html", "Phone"]] },
  { id: "o", label: "O · Statement", group: "Round 3", boards: [["AccountsO.dc.html", "Desktop"], ["AccountsOPhone.dc.html", "Phone"]] },
  { id: "p", label: "P · Khata", boards: [["AccountsP.dc.html", "Desktop"], ["AccountsPPhone.dc.html", "Phone"]] },
  { id: "q", label: "Q · Receipts", boards: [["AccountsQ.dc.html", "Desktop"], ["AccountsQPhone.dc.html", "Phone"]] },
  { id: "r", label: "R · Report", boards: [["AccountsR.dc.html", "Desktop"], ["AccountsRPhone.dc.html", "Phone"]] },
  { id: "s", label: "S · Planner", boards: [["AccountsS.dc.html", "Desktop"], ["AccountsSPhone.dc.html", "Phone"]] },
  { id: "t", label: "T · Ledger", boards: [["AccountsT.dc.html", "Desktop"], ["AccountsTPhone.dc.html", "Phone"]] },
  { id: "f", label: "F · Passbook", group: "Kept", boards: [["AccountsF.dc.html", "Desktop"], ["AccountsFPhone.dc.html", "Phone"]] },
  { id: "k", label: "K · Diary", boards: [["AccountsK.dc.html", "Desktop"], ["AccountsKPhone.dc.html", "Phone"]] },
  { id: "l", label: "L · T-accounts", boards: [["AccountsL.dc.html", "Desktop"], ["AccountsLPhone.dc.html", "Phone"]] },
  { id: "m", label: "M · Slips", boards: [["AccountsM.dc.html", "Desktop"], ["AccountsMPhone.dc.html", "Phone"]] },
  { id: "e", label: "E · Reservoir", group: "Set aside", boards: [["AccountsE.dc.html", "Desktop"], ["AccountsEPhone.dc.html", "Phone"]] },
  { id: "g", label: "G · Cluster", boards: [["AccountsG.dc.html", "Desktop"], ["AccountsGPhone.dc.html", "Phone"]] },
  { id: "h", label: "H · Rings", boards: [["AccountsH.dc.html", "Desktop"], ["AccountsHPhone.dc.html", "Phone"]] },
  { id: "i", label: "I · Bubbles", boards: [["AccountsI.dc.html", "Desktop"], ["AccountsIPhone.dc.html", "Phone"]] },
  { id: "j", label: "J · Ladder", boards: [["AccountsJ.dc.html", "Desktop"], ["AccountsJPhone.dc.html", "Phone"]] },
  { id: "n", label: "N · Stacks", boards: [["AccountsN.dc.html", "Desktop"], ["AccountsNPhone.dc.html", "Phone"]] },
  { id: "b", label: "B · Tiles", group: "Round 1", boards: [["AccountsB.dc.html", "Desktop"], ["AccountsBPhone.dc.html", "Phone"]] },
  { id: "c", label: "C · Money map", boards: [["AccountsC.dc.html", "Desktop"], ["AccountsCPhone.dc.html", "Phone"]] },
  { id: "d", label: "D · Passbooks", boards: [["AccountsD.dc.html", "Desktop"], ["AccountsDPhone.dc.html", "Phone"]] },
  { id: "charts", label: "Chart widget", group: "Shared", boards: [["AccountsCharts.dc.html", "Six options"]] },
  { id: "states", label: "States", boards: [["AccountsStates.dc.html", "Desktop"], ["AccountsStatesPhone.dc.html", "Phone"]] },
  { id: "forms", label: "Forms", boards: [["AccountsForms.dc.html", "Forms"]] },
];

export const boardPath = (file) => `boards/${file.replace(".dc.html", "")}.html`;
export function previewPage(boards, css, font) {
  const byFile = Object.fromEntries(boards.map((b) => [b.file, b]));
  // The chart gradients live once on the index: a def inside a hidden tab's board wouldn't paint for the others.
  const html = (file) => {
    let h = byFile[file].html.split(DEFS()).join("");
    return h;
  };
  const panes = TABS.map((t) => `<section class="pane" id="pane-${t.id}" data-tab="${t.id}" hidden>
    ${t.boards.length > 1 ? `<div class="views" role="tablist" aria-label="${t.label} views">${t.boards.map(([f, l], i) => `<button type="button" role="tab" class="view" id="view-${t.id}-${i}" data-view="${i}" aria-selected="${i === 0}">${l}</button>`).join("")}<span class="hint" id="hint-${t.id}"></span></div>` : ""}
    ${t.id === "readme" ? `<div class="native">${html("AccountsReadme.dc.html").replace('class="chai-app board" style="width:1300px;height:' + byFile["AccountsReadme.dc.html"].h + 'px"', 'class="chai-app board readme-native"')}</div>` : t.boards.map(([f, l], i) => `<div class="fit" data-w="${byFile[f].w}" data-h="${byFile[f].h}" data-view="${i}" data-src="${boardPath(f)}"${i ? " hidden" : ""}><div class="fit-in"><div class="fit-load" style="width:${byFile[f].w}px;height:${byFile[f].h}px">Loading ${l.toLowerCase()}…</div></div></div>`).join("")}
  </section>`).join("");
  const used = [...new Set(TABS.filter((t) => t.id !== "readme").flatMap((t) => t.boards.map(([f]) => f)))];
  const fragments = used.map((f) => ({ path: boardPath(f), html: html(f) }));
  const index = `<title>Bank Accounts Page Designs</title>
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
  <div class="brand"><b>Bank Accounts page designs</b><span>chaiCoffeeFund · /accounts · twenty-five directions, six chart options, states and forms</span></div>
  <span class="sample-note">Sample data, made up</span>
  <nav class="tabs" role="tablist" aria-label="Boards">${TABS.map((t, i) => `${t.group ? `<span class="tab-group" aria-hidden="true">${t.group.trim()}</span>` : ""}<button type="button" role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="pane-${t.id}" aria-selected="${i === 0}">${t.label}</button>`).join("")}</nav>
  <div class="zoom" role="group" aria-label="Size"><button type="button" data-zoom="fit" aria-pressed="true">Fit width</button><button type="button" data-zoom="actual" aria-pressed="false">Actual size</button></div>
</header>
<div class="chai-app" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${DEFS()}</div><main class="wrap">${panes}</main>
<script>
(() => {
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let zoom = store.get("acct-zoom") || "fit";
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
    const v = store.get("acct-view-" + id) || (window.innerWidth < 700 && pane.querySelector('.view[data-view="1"]') ? "1" : null);
    if (v) pick(pane, v);
    fitAll();
  }
  function pick(pane, v) {
    if (!pane) return;
    pane.querySelectorAll(".view").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    pane.querySelectorAll(".fit").forEach((f) => (f.hidden = f.dataset.view !== v));
  }
  tabs.forEach((t) => t.addEventListener("click", () => { show(t.dataset.tab); history.replaceState(null, "", "#" + t.dataset.tab); window.scrollTo({ top: 0 }); }));
  document.querySelectorAll(".view").forEach((b) => b.addEventListener("click", () => { const pane = b.closest(".pane"); pick(pane, b.dataset.view); store.set("acct-view-" + pane.dataset.tab, b.dataset.view); fitAll(); }));
  document.querySelectorAll(".zoom button").forEach((b) => b.addEventListener("click", () => { zoom = b.dataset.zoom; store.set("acct-zoom", zoom); document.querySelectorAll(".zoom button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); fitAll(); }));
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
