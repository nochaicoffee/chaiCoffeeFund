// The hero of the Insurance page (the cover map, picked by Prathik 2026-10-29) and the charts around it.
// Round 1 (2026-10-29) also drew I1 Premium runway, I3 Premium creep and I4 Year wheel on made-up policies; I1 lives on as the runway
// card, the other two are described in docs/design/insurance.md (creep needs earlier terms, which the PDFs don't hold).
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrS, fmt, fmtY, col, btn, plural } = L;
const { hc, tip, card, cardHead, inrC, pc, coverWord, polKey } = P;

// ---------- The hero's top: label, a big figure, and four figures on the right ----------
export const bigRupee = (v) => `<div class="hbig"><small>₹</small>${Math.round(v).toLocaleString("en-IN")}</div>`;
export const figs = (list) => `<div class="row" style="gap:40px;align-items:flex-start;flex-wrap:nowrap">${list.map(([k, v, s, cls]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${cls ?? ""}">${v}</span><span class="s">${s}</span></div>`).join("")}</div>`;
export const heroTop = ({ label, big, sub, list }) => `<div class="between" style="align-items:flex-start;gap:32px;position:relative"><div style="display:flex;flex-direction:column;gap:10px"><div class="hk">${label}</div>${big}<div class="row" style="gap:10px">${sub}</div></div>${figs(list)}</div>`;
export const heroBox = (cls, inner, { w = 1416, h = 640 } = {}) => `<section class="hero feat ${cls}" style="padding:28px 28px 24px;display:flex;flex-direction:column;gap:20px">${rings(w, h, { first: 60, step: 30, opacity: 0.09, stroke: "var(--rings-ink)" })}${inner}</section>`;
const nx = L.NEXT;

// ---------- The premium runway: what leaves, month by month ----------
/** Premiums by month, stacked by policy. Paid ones solid, the ones to come as dashed outlines. A three-year premium is one tall bar. */
export function runwayChart({ W = 1360, H = 210, compact = false, from = "2026-01", n = 43 } = {}) {
  const ms = L.monthsRunway(from, n), N = ms.length, PADL = 48, PADT = 26, PADB = 46, PADR = 14, slot = (W - PADL - PADR) / N, bw = Math.min(26, slot * 0.64);
  const MAXV = 40000, Y = (v) => PADT + H - (v / MAXV) * H, X = (i) => PADL + i * slot + (slot - bw) / 2;
  const ti = ms.findIndex((m) => m.key === L.TODAY.slice(0, 7)), xt = PADL + (ti + 1) * slot, showToday = ti >= 0;
  const grid2 = [10000, 20000, 30000, 40000].map((v) => `<line x1="${PADL}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--divider)"></line><text x="${PADL - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--muted)">${inrS(v)}</text>`).join("");
  const bars = ms.map((m, i) => {
    let acc = 0;
    return m.items.slice().sort((a, b) => b.amount - a.amount).map((it) => {
      const base = Y(acc), top = Y(acc + it.amount), h = Math.max(3, base - top); acc += it.amount;
      const c = col(it.p);
      return it.paid ? `<rect x="${X(i)}" y="${base - h}" width="${bw}" height="${h - 1}" rx="4" fill="${c}"></rect>` : `<rect x="${X(i)}" y="${base - h}" width="${bw}" height="${h - 1}" rx="4" fill="color-mix(in oklch,${c} 26%,white)" stroke="${c}" stroke-width="1.5" class="exp"></rect>`;
    }).join("");
  }).join("");
  const tot = ms.map((m) => m.items.reduce((t, x) => t + x.amount, 0));
  const vals = ms.map((m, i) => (tot[i] ? `<text x="${X(i) + bw / 2}" y="${Y(tot[i]) - 6}" text-anchor="middle" font-size="${compact ? 9.5 : 11}" font-weight="800" fill="var(--fg)">${inrS(tot[i])}</text>` : "")).join("");
  const labs = ms.map((m, i) => `<text x="${X(i) + bw / 2}" y="${PADT + H + 18}" text-anchor="middle" font-size="${compact ? 9 : 10.5}" font-weight="800" fill="${i === ti ? "var(--fg)" : "var(--muted)"}">${compact && Number(m.key.slice(5)) % 3 !== 1 ? "" : L.monName(m.key).slice(0, 1)}</text>${m.key.endsWith("-01") || i === 0 ? `<text x="${X(i)}" y="${PADT + H + 36}" font-size="11" font-weight="800" fill="var(--muted)">${m.key.slice(0, 4)}</text>` : ""}`).join("");
  const my = Y(L.MONTHLY);
  const line = `<line x1="${PADL}" x2="${W}" y1="${my}" y2="${my}" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.7"></line>`;
  const today = !showToday ? "" : `<line x1="${xt}" x2="${xt}" y1="${PADT - 8}" y2="${PADT + H + 4}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 4"></line>`;
  const zones = ms.map((m, i) => {
    if (!m.items.length) return "";
    const tot2 = tot[i], left = ((PADL + i * slot) / W) * 100, w = (slot / W) * 100;
    const card2 = hc({ h: L.monYear(m.key), hr: m.items.every((x) => x.paid) ? `<span class="pill pill-on" style="padding:2px 8px;font-size:10px">paid</span>` : `<span class="pill pill-soon2" style="padding:2px 8px;font-size:10px">to come</span>`, t: inr(tot2), d: m.items.length > 1 ? plural(m.items.length, "premium") : m.items[0].p.insurer, rows: m.items.map((x) => [`${x.p.name.split(" ·")[0]} · ${fmt(x.on)}${x.p.years > 1 ? ` · ${x.p.years} years` : ""}`, inr(x.amount), col(x.p)]), f: m.items.some((x) => !x.paid) ? "At the last premium, until the insurer's quote is entered" : m.items.some((x) => x.p.years > 1) ? `Covers ${m.items.filter((x) => x.p.years > 1).map((x) => `${x.p.name.split(" ·")[0].toLowerCase()} for ${x.p.years} years`).join(" and ")}` : "Paid", w: 260 });
    return `<div class="zone hov" tabindex="0" style="left:${left}%;width:${w}%;top:${PADT - 4}px;bottom:${PADB - 24}px">${tip(card2, { w: 260, x: i > N * 0.7 ? "r" : i < 3 ? "l" : "c", y: "up", off: 0 })}</div>`;
  }).join("");
  const tag = !showToday ? "" : `<div style="position:absolute;left:${(xt / W) * 100}%;top:0;transform:translateX(-50%);padding:4px 10px;border-radius:999px;background:var(--surface);box-shadow:var(--soft-shadow);font-size:11px;font-weight:800;white-space:nowrap;border:1px solid var(--surface-line)">Today · ${fmt(L.TODAY)}</div>`;
  const setTag = `<div style="position:absolute;right:0;top:${my - 30}px;padding:4px 10px;border-radius:999px;background:var(--ink);color:var(--on-ink);font-size:11px;font-weight:800;white-space:nowrap">${inr(Math.round(L.MONTHLY))} a month if spread evenly</div>`;
  return `<div class="chart-wrap" style="width:${W}px;height:${PADT + H + PADB}px"><svg width="${W}" height="${PADT + H + PADB}" viewBox="0 0 ${W} ${PADT + H + PADB}">${grid2}${today}${bars}${line}${vals}${labs}</svg>${zones}${tag}${setTag}</div>`;
}
export const runwayLegend = () => `<div class="between" style="flex-wrap:wrap;gap:10px">${polKey()}<div class="row" style="gap:16px"><span class="lg"><i style="background:var(--card-sapphire)"></i>Paid</span><span class="lg"><i class="exp" style="background:transparent;border:1.5px dashed var(--card-sapphire)"></i>To come, at the last premium</span></div></div>`;
export function runwayCard({ W = 773, H = 190, from, n } = {}) {
  const health = L.policy("health");
  return card(`${cardHead("Premium runway", "what leaves, month by month · hover a bar", L.seg([{ label: "2026 to 2029", on: true }, { label: "Next 12" }]))}${runwayChart({ W, H, compact: W < 900, from, n })}${runwayLegend()}<div class="card-note">${pc(health.paid / L.PAID_YTD)} of what left in ${L.TODAY.slice(0, 4)} was the health cover, paid once for three years. The next two bills are small: ${inr(L.policy("accident").paid)} in March and ${inr(L.policy("car").paid)} in August. The dashed line is a year of cover spread evenly.</div>`, { gap: 14 });
}

// ---------- The cover map ----------
const addTile = () => `<div class="who gap"><div class="who-h"><span class="mono" style="width:40px;height:40px;border-radius:12px;background:var(--fill-strong);color:var(--muted)">${I.plus(18)}</span><div class="grow"><b>Something else?</b><small>Not recorded</small></div></div><div class="gapbox"><b>Nothing else yet</b><p>Parents' health, a term plan, the home.</p>${btn("Add a policy", { kind: "soft", icon: I.plus(12), cls: "btn-sm" })}</div></div>`;
const whoTile = (w, { pick = false, today = L.TODAY, list = L.POLICIES, stack = false } = {}) => {
  const ps = L.polsOf(w.id, list), yearly = ps.filter((p) => p.status !== "Cancelled").reduce((t, p) => t + p.premium, 0);
  const head = `<div class="who-h">${L.whoMono(w, 40)}<div class="grow"><b>${w.name}</b><small>${w.sub}</small></div>${ps.length > 1 ? `<span style="text-align:right;font-size:12px;font-weight:800;line-height:1.2">${inr(yearly)}<small style="display:block;font-size:10.5px;color:var(--muted);font-weight:600">a year</small></span>` : ""}</div>`;
  if (!ps.length) {
    const g = w.loan;
    return `<div class="who gap">${head}<div class="gapbox"><b>No policy recorded</b><p>${g ? `${g.lender}'s ${g.name.toLowerCase()} is on your Loans page, and nothing here insures it.` : "Nothing is recorded for this."}</p>${btn("Add a policy", { kind: "soft", icon: I.plus(12), cls: "btn-sm" })}</div></div>`;
  }
  const boxes = ps.map((p) => {
    const s = L.stateOf(p, today), d = L.daysLeft(p, today), soon = s === "Renew soon" || s === "Lapsed", off = s === "Cancelled";
    const tag = pick ? "label" : "div";
    const days = d >= 700 ? `${(d / 365).toFixed(1).replace(/\.0$/, "")} years left` : `${d} days left`;
    const when = `${fmt(p.renewOn)}, ${p.renewOn.slice(0, 4)}`;
    const inner = `<div class="pol-t"><div><b>${p.name.split(" ·")[0]}</b><small>${p.insurer}</small></div>${soon ? `<span class="pill ${s === "Lapsed" ? "pill-lapsed" : "pill-soon2"}" style="padding:2px 8px;font-size:10px">${s === "Lapsed" ? "lapsed" : "soon"}</span>` : ""}</div><div class="pol-cover">${inrC(p.sumInsured)}<small>${coverWord(p)}</small></div>${P.termBar(p, { today, w: 260 })}<div class="pol-f"><span class="${soon ? "soon" : ""}">${off ? `Cancelled ${fmt(p.endedOn ?? today)}` : s === "Lapsed" ? `Ended ${-d} days ago` : days}</span><span>${off ? "stays on record" : when}</span></div><div class="pol-f"><span>${p.years > 1 ? `${inr(p.paid)} once` : `${inr(p.paid)} a year`}</span><span>${p.years > 1 ? `${inr(p.premium)} a year` : ""}</span></div>`;
    return `<${tag} class="pol pick pk-${p.id}${off ? " off" : ""}" ${pick ? `for="ins-sel-${p.id}"` : ""} style="--c:${col(p)}">${inner}</${tag}>`;
  }).join("");
  return `<div class="who" style="grid-column:span ${ps.length > 1 && !stack ? 2 : 1}">${head}<div class="who-body" style="display:grid;grid-template-columns:repeat(${stack ? 1 : ps.length},minmax(0,1fr));gap:10px">${boxes}</div></div>`;
};
export function coverMap({ pick = false, today = L.TODAY, list = L.POLICIES, stack = false, who = L.WHO_ORDER, add = true } = {}) {
  const spans = who.reduce((t, id) => t + (L.polsOf(id, list).length > 1 && !stack ? 2 : 1), 0) + (add ? 1 : 0);
  return `<div style="display:grid;grid-template-columns:repeat(${stack ? 1 : spans},minmax(0,1fr));gap:${stack ? 12 : 16}px;align-items:stretch">${who.map((id) => whoTile(L.WHO[id], { pick, today, list, stack })).join("")}${add ? addTile() : ""}</div>`;
}
export const mapLegend = () => `<div class="between" style="flex-wrap:wrap;gap:10px"><div class="row" style="gap:16px"><span class="lg"><i style="background:var(--card-sapphire)"></i>Term gone by</span><span class="lg"><i style="background:repeating-linear-gradient(135deg,oklch(0.72 0.14 75) 0 4px,oklch(0.8 0.12 78) 4px 8px)"></i>Renews within a month</span><span class="lg"><i class="exp" style="background:transparent;border:1.5px dashed var(--muted)"></i>Nothing recorded</span></div><span class="muted" style="font-size:12px;font-weight:600">Cover is the sum insured, or the IDV for a vehicle. Each policy covers only the person or vehicle named.</span></div>`;
export const mapHero = ({ pick = false, label = "What's protected · by what, and for how much", sub = "", extra = "", ...opts } = {}) => {
  const health = L.policy("health");
  const top = heroTop({ label, big: `<div class="hbig">${L.IN_FORCE.length}<small style="margin-left:8px;font-size:26px">policies in force</small></div>`, sub: sub || `<span class="delta">${I.check(11)} nothing has lapsed</span><span class="hsub">${plural(L.SOONEST.length, "renewal")} within a month · next ${fmt(nx.renewOn)}, ${nx.renewOn.slice(0, 4)}</span>`, list: [["Health cover", inrC(health.sumInsured), `${L.yearsTxt(health.years)}, to ${fmt(L.addDays(health.renewOn, -1))}, ${health.renewOn.slice(0, 4)}`], ["Accident cover", inrC(L.COVER.accident), "owner-driver, to Mar 2027"], ["Car insured up to", inrC(L.COVER.car), "IDV, Honda City"], ["Bike insured up to", inrC(L.COVER.bike), "IDV, Gixxer"]] });
  return heroBox("i2dir", `${top}${extra}${coverMap({ pick, ...opts })}${mapLegend()}`);
};
