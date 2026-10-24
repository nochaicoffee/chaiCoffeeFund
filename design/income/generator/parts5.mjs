// The income heatmap, built the way the Cards dashboard's spending heatmap is: a row of twelve months per year, shaded one to five
// against the biggest month shown, the peak and this month marked, a dashed cell for a month still to come, hatching for none,
// and each year's total with its monthly average on the right. It follows the cover's pick: pick a source and the cells are that source's.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { inr, inrS, col } = L;
const { hc, tip, card } = P;

const heatLevel = (amount, max) => (max <= 0 || amount <= 0 ? 1 : Math.min(5, Math.max(1, Math.ceil((amount / max) * 5))));
const YEARS = [2026, 2025];
const GRID = "44px repeat(12,minmax(46px,1fr)) 156px";
const HATCH = "repeating-linear-gradient(135deg, var(--heat-no-data) 0 5px, transparent 5px 11px)";
const GLOW = "radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.26), transparent 58%)";
const monthsOf = (y) => L.monthsFrom(`${y}-01`, 12);

function body(sid) {
  const label = (k) => L.monYear(k);
  const amountOf = (k) => L.monthReceived(k, sid);
  const all = YEARS.flatMap((y) => monthsOf(y).filter((k) => k <= L.NOW_KEY).map(amountOf));
  const max = Math.max(...all, 1), peak = all.indexOf(max) >= 0 ? YEARS.flatMap((y) => monthsOf(y).filter((k) => k <= L.NOW_KEY)).find((k) => amountOf(k) === max) : null;
  const rows = YEARS.map((y) => {
    const ks = monthsOf(y), done = ks.filter((k) => k <= L.NOW_KEY), vals = done.map(amountOf), withData = vals.filter((v) => v > 0), total = vals.reduce((t, v) => t + v, 0);
    const cells = ks.map((k) => {
      if (k > L.NOW_KEY) {
        const exp = L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k && (!sid || u.sourceId === sid)).reduce((t, u) => t + u.amount, 0);
        return `<div style="height:52px;border-radius:13px;border:1.5px dashed var(--heat-upcoming);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);font-size:11px;font-weight:700">${exp ? inrS(exp) : ""}${exp ? `<span style="font-size:9px;font-weight:600">expected</span>` : ""}</div>`;
      }
      const v = amountOf(k), cur = k === L.NOW_KEY, ring = cur ? "box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent);" : "";
      const rows2 = L.SOURCES.filter((s) => L.monthReceived(k, s.id)).map((s) => [s.alias, inr(L.monthReceived(k, s.id)), col(s)]);
      const pend = L.PENDING.filter((p) => L.monthKey(p.expectedDate) === k && (!sid || p.sourceId === sid));
      if (!v) return `<div style="height:52px;border-radius:13px;background:${HATCH};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--muted);${ring}"><span>–</span>${cur ? `<span style="font-size:9px">This month</span>` : ""}</div>`;
      const lvl = heatLevel(v, max), dark = lvl >= 4, cap = cur ? "This month" : k === peak ? "Peak" : "";
      const card2 = hc({ h: label(k), hr: cap ? `<span class="pill pill-ink" style="padding:2px 8px;font-size:10px">${cap.toLowerCase()}</span>` : "", t: inr(v), d: `${v >= L.AVG_MONTH && !sid ? inr(v - L.AVG_MONTH) + " above" : !sid ? inr(L.AVG_MONTH - v) + " below" : `${L.pctOf(v, L.YTD)}% of a year`} ${sid ? "" : "a usual month"}`.trim(), rows: [...rows2.filter((r) => !sid || r[0] === L.src(sid).alias), ...pend.map((p) => [`${L.src(p.sourceId).alias} · pending`, inr(p.amount), "oklch(0.72 0.14 75)"])], f: pend.length ? "Pending income isn't counted" : "Counted by the day it landed", w: 250 });
      return `<div class="hov" tabindex="0" style="position:relative"><div class="textured" style="height:52px;border-radius:13px;background:var(--heat-${lvl});color:${dark ? "var(--on-accent)" : "var(--heat-ink)"};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:700;overflow:hidden;${ring}">${rings(97.2, 52, { dx: 10, dy: 12, first: 10, step: 11, stroke: dark ? "var(--rings-light)" : "var(--rings-ink)", opacity: dark ? 0.1 : 0.11, sheen: GLOW })}<span>${inrS(v)}</span>${cap ? `<span style="font-size:9px;font-weight:600;opacity:.85;margin-top:1px">${cap}</span>` : ""}</div>${tip(card2, { w: 250, x: "c", y: "up" })}</div>`;
    }).join("");
    return `<div style="display:grid;grid-template-columns:${GRID};gap:6px;align-items:center"><span style="font-size:12px;font-weight:800">${y}</span>${cells}<div style="text-align:right;line-height:1.25"><div style="font-size:14px;font-weight:800">${inr(total)}</div><div style="font-size:10px;font-weight:600;color:var(--muted)">${L.plural(withData.length, "month")} · avg ${inr(withData.length ? total / withData.length : 0)}</div></div></div>`;
  }).join("");
  const head = `<div style="display:grid;grid-template-columns:${GRID};gap:6px;align-items:center"><span></span>${monthsOf(2026).map((k) => `<span style="text-align:center;font-size:10px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:${k === L.NOW_KEY ? "var(--fg)" : "var(--muted)"}">${L.monName(k)}${k === L.NOW_KEY ? `<i style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--accent);margin-left:4px;vertical-align:middle"></i>` : ""}</span>`).join("")}<span style="text-align:right;font-size:10px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:var(--muted)">Year</span></div>`;
  return `<div style="display:flex;flex-direction:column;gap:8px">${head}${rows}</div>`;
}

export function heatmapCard() {
  const ids = ["all", ...L.SOURCES.map((s) => s.id)];
  const css = `<style>.i4dir [class*="hmv-"], .i4dir [class*="hmt-"] { display: none; } ${ids.map((id) => `.i4dir:has(#i4-sel-${id}:checked) .hmv-${id} { display: block; } .i4dir:has(#i4-sel-${id}:checked) .hmt-${id} { display: inline; }`).join(" ")}</style>`;
  const legend = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:7px;font-size:11px;color:var(--muted)"><i style="width:12px;height:12px;border-radius:4px;background:repeating-linear-gradient(135deg,var(--fill-strong) 0 2px,transparent 2px 4px)"></i><span>No payment</span><i style="width:12px;height:12px;border-radius:4px;border:1.5px dashed var(--heat-upcoming);margin-left:8px"></i><span>Expected</span><span style="margin-left:12px">Low</span>${[1, 2, 3, 4, 5].map((l) => `<i style="width:12px;height:12px;border-radius:4px;background:var(--heat-${l})"></i>`).join("")}<span>High</span></div>`;
  const titles = ids.map((id) => `<span class="hmt-${id}">· ${id === "all" ? "every source" : L.src(id).name}</span>`).join("");
  return card(`${css}<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px"><div class="card-t">Income heatmap <small style="margin-left:6px">2025 and 2026 ${titles}</small></div>${legend}</div>${ids.map((id) => `<div class="hmv-${id}">${body(id === "all" ? null : id)}</div>`).join("")}<div class="card-note">Shaded against the biggest month shown, by the day each payment landed. Pick a source in the cover and the cells are that source's; the period pill moves the years.</div>`, { gap: 14 });
}
