// Directions Q–U: five selectors, each with a hero that shows whatever is picked.
import * as L from "./lib.mjs";
import * as SC from "./selcore.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, I, btn, iconBtn, rings } = L;
const { facts, subOf, IDS, ORDER, STOPPED, icon, grad, actions, whenLine, changeText, viaText, stat, item, barcode } = SC;

// ================= Q · Dock =================
// The hero is a "screen"; the dock of app icons sits on its bottom edge, and magnifies like macOS.
const Q_CSS = `<style>
  .dock { display: flex; align-items: flex-end; gap: 10px; padding: 12px 16px 9px; border-radius: 24px; background: oklch(1 0 0 / 0.78); border: 1px solid var(--surface-line); box-shadow: var(--pop-shadow), inset 0 1px 0 oklch(1 0 0); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
  .di { position: relative; display: flex; flex-direction: column; align-items: center; transform-origin: bottom center; transition: transform 200ms var(--ease-out); }
  .di .mono { box-shadow: 0 6px 14px oklch(0 0 0 / 0.22), inset 0 1px 0 oklch(1 0 0 / 0.22); }
  .di:hover { transform: scale(1.32) translateY(-6px); z-index: 2; }
  .di:hover + .di, .di:has(+ .di:hover) { transform: scale(1.14) translateY(-3px); }
  .di-lb { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); padding: 4px 9px; border-radius: 8px; background: var(--ink); color: var(--on-ink); font-size: 11px; font-weight: 700; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 120ms; }
  .di:hover .di-lb { opacity: 1; }
  .di-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--fg); margin-top: 6px; opacity: 0; }
  .dock-sep { width: 1px; align-self: stretch; background: var(--divider); margin: 4px 3px 12px; }
  @media (prefers-reduced-motion: reduce) { .di, .di:hover, .di:hover + .di, .di:has(+ .di:hover) { transform: none; transition: none; } }
</style>`;
const qSel = (dsel, id) => `${dsel} .sx-${id} .di-dot { opacity: 1; } ${dsel} .sx-${id} { transform: translateY(-4px); }`;
function dock({ ph = false } = {}) {
  const it = (id) => { const f = facts(subOf(id)); return item("q", id, `<span class="di-lb">${f.alias}</span>${icon(f, ph ? 42 : 52)}<span class="di-dot"></span>`, { cls: "di", ph }); };
  return `<div class="dock" style="${ph ? "overflow:hidden;max-width:100%;gap:8px;padding:10px 12px 8px" : ""}">${it("all")}<span class="dock-sep"></span>${L.byNext.map((s) => it(s.id)).join("")}<span class="dock-sep"></span>${STOPPED.map((s) => it(s.id)).join("")}</div>`;
}
function ring(frac, size, label, sub, color = "var(--accent)") {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="10"></circle><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c * frac} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle><text x="50%" y="${size / 2 + 2}" text-anchor="middle" font-size="${size / 5}" font-weight="800" fill="var(--fg)">${label}</text><text x="50%" y="${size / 2 + size / 7}" text-anchor="middle" font-size="${size / 13}" font-weight="700" fill="var(--muted)">${sub}</text></svg>`;
}
export function qHero(f, { ph = false } = {}) {
  const ringBox = f.all ? ring(f.frac, ph ? 120 : 150, L.pct(paidNowSafe(), paidNowSafe() + SC.toCome), "Oct paid") : f.on ? ring(f.frac, ph ? 120 : 150, `${f.left}`, f.left === 1 ? "day left" : "days left", f.left <= 3 ? "var(--negative)" : "var(--accent)") : ring(0, ph ? 120 : 150, "—", f.status === "Paused" ? "paused" : "cancelled");
  const stats = f.all ? [stat("Renews next", f.nextSub.alias, fmtDow(f.next)), stat("Paid this year", inr(f.paidSoFar), `${f.payCount} payments`), stat("A year", inr(f.yearly), "at today's prices"), stat("Prices", changeText(f), f.change ? `${inr(f.change.more)} more a month` : "")]
    : [stat(f.on ? "Next renewal" : "Status", f.on ? fmtDow(f.next) : f.status, f.on ? rel(f.next) : whenLine(f)), stat("Paid so far", inr(f.paidSoFar), `${f.payCount} payments since ${fmt(f.since)}`), stat("A year", inr(f.yearly), `${inr(f.monthly)} a month`), stat("Price", f.change ? `${inr(f.change.from)} → ${inr(f.change.to)}` : inr(f.amount), f.change ? `on ${fmtY(f.change.date)}` : "never changed")];
  return `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "auto minmax(0,1fr) auto"};gap:${ph ? 16 : 28}px;align-items:center">
      <span style="display:flex;filter:drop-shadow(0 14px 22px oklch(0 0 0 / 0.22))">${icon(f, ph ? 76 : 104)}</span>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="eyebrow">${f.all ? "Everything you pay for" : `${f.category} · ${f.cycle}`}</span><h2 style="font-size:${ph ? 24 : 34}px;font-weight:800;line-height:1.1">${f.name}</h2>
        <div class="row" style="gap:10px;flex-wrap:wrap"><span class="pill pill-on" style="font-size:13px;padding:6px 14px">${inr(f.all ? f.monthly : f.amount)} / ${f.all ? "month" : f.cycleWord}</span>${f.all ? "" : L.statusPill(f.s)}<span class="muted" style="font-size:13px;font-weight:600">${viaText(f)}</span></div>
        <div class="row" style="gap:8px;margin-top:4px">${actions(f)}</div></div>
      ${ph ? "" : `<div>${ringBox}</div>`}
    </div>
    <div style="display:grid;grid-template-columns:${ph ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"};gap:${ph ? "14px" : "0"};margin-top:${ph ? 18 : 26}px;padding-top:18px;border-top:1px solid var(--divider)">${stats.map((x, i) => `<div style="${!ph && i ? "border-left:1px solid var(--divider);padding-left:22px" : ""}">${x}</div>`).join("")}</div>`;
}
const paidNowSafe = () => SC.paidNow;
export function qDesktop() {
  const top = `${Q_CSS}<section class="card glass textured" style="padding:30px 34px 64px;position:relative;overflow:visible;background:linear-gradient(180deg,var(--surface),oklch(0.975 0.01 150))">${rings(1400, 330, { opacity: 0.05, first: 60, step: 36 })}${SC.heroPanes(qHero)}
    <div style="position:absolute;left:50%;bottom:-38px;transform:translateX(-50%);z-index:5">${dock()}</div></section><div style="height:22px"></div>`;
  return SC.page("q", { selCss: qSel, top });
}
export const qPhone = () => SC.phonePage("q", { selCss: qSel, selector: `${Q_CSS}<div style="margin:0 -16px;padding:0 16px;overflow:hidden">${dock({ ph: true })}</div>`, hero: (f, o) => `<section class="card glass" style="padding:20px">${qHero(f, o)}</section>` });

// ================= R · Ticket stubs =================
const notch = (side, color, size = 18) => `<span style="position:absolute;${side}:-${size / 2}px;top:50%;width:${size}px;height:${size}px;margin-top:-${size / 2}px;border-radius:50%;background:${color}"></span>`;
const rSel = (dsel, id) => `${dsel} .sx-${id} .stub { transform: translateY(-6px); box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent), var(--tile-shadow); }`;
function stubs({ ph = false } = {}) {
  const st = (id) => {
    const f = facts(subOf(id));
    const when = f.all ? `${L.ACTIVE.length} active` : f.on ? `${fmt(f.next)} · ${f.left}d` : f.status === "Paused" ? "Paused" : "Cancelled";
    return item("r", id, `<div class="stub" style="position:relative;width:${ph ? 150 : 172}px;height:88px;border-radius:14px;padding:12px 16px 12px 20px;color:var(--on-card);background:${grad(f)};box-shadow:var(--tile-shadow);display:flex;flex-direction:column;justify-content:space-between;transition:transform 200ms var(--ease-out),box-shadow 200ms;${f.all || f.on ? "" : "filter:grayscale(0.85);opacity:0.65"}">${notch("left", "var(--surface)", 16)}${notch("right", "var(--surface)", 16)}<span style="position:absolute;left:11px;top:12px;bottom:12px;border-left:1.5px dashed oklch(1 0 0 / 0.3)"></span>
      <div class="between"><b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.alias}</b><span style="font-size:10px;font-weight:700;color:var(--on-card-faint)">${f.all ? "" : f.cycle}</span></div>
      <div class="between" style="align-items:flex-end"><b style="font-size:16px">${inr(f.all ? f.monthly : f.amount)}</b><span class="dt-pill${f.on && !f.all && f.left <= 3 ? " due" : ""}" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--on-card-fill);white-space:nowrap">${when}</span></div></div>`, { cls: "", ph, style: "display:block;flex-shrink:0;padding-top:8px" });
  };
  return `<div style="position:relative;margin:0 ${ph ? -16 : -22}px"><div class="tilerow" style="display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding:2px ${ph ? 16 : 22}px 12px">${IDS.map(st).join("")}</div><span style="position:absolute;right:0;top:0;bottom:0;width:70px;background:linear-gradient(90deg,transparent,var(--surface));pointer-events:none"></span></div>`;
}
export function rHero(f, { ph = false } = {}) {
  const fromD = f.all ? SC.nowKey + "-01" : f.prev, toD = f.all ? L.addDays(L.addMonthsUTC(SC.nowKey + "-01", 1), -1) : f.next;
  const pos = f.all ? (L.daysBetween(fromD, L.TODAY) / L.daysBetween(fromD, toD)) : f.frac;
  const dateBlock = (k, d, sub) => `<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:var(--muted)">${k}</span><b style="font-size:${ph ? 26 : 36}px;font-weight:800;letter-spacing:0.02em;line-height:1">${L.monName(d.slice(0, 7)).toUpperCase()} ${Number(d.slice(8))}</b><span style="font-size:12px;font-weight:600;color:var(--muted)">${sub}</span></div>`;
  const route = `<div style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:${ph ? 12 : 22}px;align-items:center">${dateBlock(f.all ? "MONTH STARTS" : "LAST RENEWED", fromD, f.all ? "Oct 2026" : L.dow(fromD))}
      <div style="position:relative;height:30px"><span style="position:absolute;left:0;right:0;top:14px;border-top:2px dashed var(--fill-strong)"></span><span style="position:absolute;left:0;width:${pos * 100}%;top:14px;border-top:2px solid var(--card-${f.color})"></span><span style="position:absolute;left:${pos * 100}%;top:6px;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;background:var(--card-${f.color});box-shadow:0 0 0 4px var(--surface)"></span><span style="position:absolute;left:${pos * 100}%;top:28px;transform:translateX(-50%);font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap">TODAY</span></div>
      ${f.on || f.all ? dateBlock(f.all ? "MONTH ENDS" : "RENEWS", toD, f.all ? `${inr(SC.toCome)} to come` : `${L.dow(toD)} · ${rel(toD)}`) : dateBlock("WON'T RENEW", toD, f.status === "Paused" ? "paused" : "cancelled")}</div>`;
  const fields = f.all ? [["Active", `${L.ACTIVE.length} subscriptions`], ["Paid this year", inr(f.paidSoFar)], ["Charged to", viaText(f)], ["A year", inr(f.yearly)]] : [["Plan", `${f.cycle}`], ["Charged to", viaText(f)], ["Member since", fmtY(f.since)], ["Paid so far", inr(f.paidSoFar)]];
  return `<div style="position:relative;display:grid;grid-template-columns:${ph ? "1fr" : "minmax(0,1fr) 280px"};border-radius:24px;overflow:hidden;box-shadow:var(--card-shadow);border:1px solid var(--surface-line)">
    <div style="position:relative;background:var(--surface);padding:${ph ? "18px" : "24px 30px"};display:flex;flex-direction:column;gap:${ph ? 16 : 22}px;border-top:6px solid var(--card-${f.color})">
      <div class="between"><span class="row" style="gap:12px">${icon(f, ph ? 34 : 40)}<span><span style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:var(--muted)">SUBSCRIPTION PASS${f.all ? "" : ` · ${f.category.toUpperCase()}`}</span><b style="display:block;font-size:${ph ? 20 : 26}px;font-weight:800;line-height:1.15">${f.name}</b></span></span>${ph ? "" : `<span class="row" style="gap:8px">${actions(f)}</span>`}</div>
      ${route}
      <div style="display:grid;grid-template-columns:${ph ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"};gap:14px;padding-top:14px;border-top:1px dashed var(--fill-strong)">${fields.map(([k, v]) => `<div><span style="font-size:10.5px;font-weight:800;letter-spacing:0.06em;color:var(--muted)">${k.toUpperCase()}</span><b style="display:block;font-size:15px;font-weight:800;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</b></div>`).join("")}</div>
    </div>
    <div class="textured" style="position:relative;background:${grad(f)};color:var(--on-card);padding:${ph ? "18px" : "24px 26px"};display:flex;flex-direction:${ph ? "row" : "column"};justify-content:space-between;align-items:${ph ? "center" : "stretch"};gap:14px;${ph ? "" : "border-left:2px dashed oklch(1 0 0 / 0.35)"}">${rings(280, 300, { stroke: "var(--rings-light)", opacity: 0.06 })}${ph ? "" : `${notch("left", "var(--page)", 26).replace("top:50%", "top:-13px;margin-top:0").replace("left:-13px", "left:-14px")}${notch("left", "var(--page)", 26).replace("top:50%", "bottom:-13px;top:auto;margin-top:0").replace("left:-13px", "left:-14px")}`}
      <div><span style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:var(--on-card-muted)">${f.all ? "EVERY MONTH" : `EVERY ${f.cycleWord.toUpperCase()}`}</span><b style="display:block;font-size:${ph ? 28 : 40}px;font-weight:800;line-height:1.05">${inr(f.all ? f.monthly : f.amount)}</b><span style="font-size:12px;font-weight:600;color:var(--on-card-muted)">${inr(f.monthly)} a month · ${inr(f.yearly)} a year</span></div>
      <div style="color:oklch(1 0 0 / 0.85)">${barcode(f.id, { w: ph ? 110 : 228, h: ph ? 34 : 44 })}<span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.18em;color:var(--on-card-faint);margin-top:4px">${f.id.toUpperCase()}-${(f.since || "").replace(/-/g, "")}</span></div>
    </div></div>`;
}
export function rDesktop() {
  const top = `<section class="card glass" style="gap:10px;padding:16px 22px 10px"><div class="between"><span class="card-t">Your passes<small>pick one to see it below</small></span><span class="card-note">${L.ACTIVE.length} active · ${STOPPED.length} stopped</span></div>${stubs()}</section>${SC.heroPanes(rHero)}`;
  return SC.page("r", { selCss: rSel, top });
}
export const rPhone = () => SC.phonePage("r", { selCss: rSel, selector: stubs({ ph: true }), hero: rHero });

// ================= S · Cover flow =================
function sTransforms(k, { step = 74, near = 150, rot = 58, ph = false } = {}) {
  return IDS.map((id, i) => {
    const d = i - k, a = Math.abs(d), sg = Math.sign(d);
    const x = d === 0 ? 0 : sg * (near + (a - 1) * step);
    return { id, t: d === 0 ? `translateX(-50%) translateZ(60px)` : `translateX(calc(-50% + ${x}px)) rotateY(${-sg * rot}deg) scale(0.84)`, z: 40 - a, o: a > (ph ? 3 : 7) ? 0 : 1 };
  });
}
const sSel = (dsel, id) => sTransforms(IDS.indexOf(id), { ph: dsel.startsWith(".phsel") }).map((p) => `${dsel} .sx-${p.id} { transform: ${p.t}; z-index: ${p.z}; opacity: ${p.o}; }`).join("\n") + `\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--accent), 0 24px 40px oklch(0 0 0 / 0.35); }`;
function coverflow({ ph = false } = {}) {
  const w = ph ? 170 : 220, h = ph ? 124 : 156;
  const cov = (id) => {
    const f = facts(subOf(id));
    return item("s", id, `<div class="cov textured" style="width:${w}px;height:${h}px;border-radius:18px;padding:14px 16px;color:var(--on-card);background:${f.all ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),${grad(f, 150)}` : grad(f)};display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 18px 30px oklch(0 0 0 / 0.28);-webkit-box-reflect:below 6px linear-gradient(transparent 62%, oklch(1 0 0 / 0.22));${f.all || f.on ? "" : "filter:grayscale(0.8)"}">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
      <div class="between"><span style="width:30px;height:30px;border-radius:9px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800">${f.all ? I.subs(14) : f.alias[0]}</span><span style="font-size:10px;font-weight:700;color:var(--on-card-faint)">${f.all ? `${L.ACTIVE.length} active` : f.cycle}</span></div>
      <div><b style="display:block;font-size:${ph ? 15 : 18}px">${f.alias}</b><span style="font-size:12px;font-weight:600;color:var(--on-card-muted)">${inr(f.all ? f.monthly : f.amount)} / ${f.all ? "month" : f.cycleWord}</span></div></div>`, { ph, style: `position:absolute;left:50%;top:${ph ? 14 : 22}px;transition:transform 460ms var(--ease-out), opacity 300ms;` });
  };
  return `<div style="position:relative;height:${ph ? 190 : 250}px;perspective:1300px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">${IDS.map(cov).join("")}</div>`;
}
export function sHero(f, { ph = false } = {}) {
  const st = f.all ? [stat("A month", inr(f.monthly), `${L.ACTIVE.length} active`), stat("Renews next", f.nextSub.alias, fmtDow(f.next)), stat("Paid this year", inr(f.paidSoFar), `${f.payCount} payments`), stat("Prices", `${f.change?.count ?? 0} went up`, f.change ? `${inr(f.change.more)} more a month` : "")]
    : [stat(f.cycle, inr(f.amount), `${inr(f.monthly)} a month`), stat(f.on ? "Renews" : "Status", f.on ? fmtDow(f.next) : f.status, f.on ? rel(f.next) : whenLine(f)), stat("Paid so far", inr(f.paidSoFar), `${f.payCount} payments`), stat("Price", f.change ? `↑ ${inr(f.change.to - f.change.from)}` : "Same", changeText(f))];
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:${ph ? 12 : 16}px;text-align:center">
    <div><span class="eyebrow">${f.all ? "Everything" : `${f.category} · since ${fmtY(f.since)}`}</span><h2 style="font-size:${ph ? 24 : 32}px;font-weight:800;line-height:1.15;margin-top:4px">${f.name}</h2></div>
    <div style="width:min(560px,100%)"><div class="between" style="font-size:11.5px;font-weight:700;color:var(--muted)"><span>${f.all ? "Oct 1" : f.on ? fmt(f.prev) : ""}</span><span style="color:var(--fg)">${whenLine(f)}</span><span>${f.all ? "Oct 31" : f.on ? fmt(f.next) : ""}</span></div><div class="track" style="height:8px;margin-top:6px"><span style="width:${f.frac * 100}%;background:var(--card-${f.color})"></span></div></div>
    <div style="display:grid;grid-template-columns:${ph ? "1fr 1fr" : "repeat(4,minmax(0,170px))"};gap:${ph ? "14px" : "0"};justify-content:center;text-align:left;width:${ph ? "100%" : "auto"}">${st.map((x, i) => `<div style="${!ph && i ? "border-left:1px solid var(--divider);" : ""}padding:0 ${ph ? 0 : 20}px">${x}</div>`).join("")}</div>
    <div class="row" style="gap:8px">${actions(f)}</div></div>`;
}
export function sDesktop() {
  const top = `<section class="card glass" style="gap:6px;padding:8px 22px 24px;background:linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 62%)">${coverflow()}${SC.heroPanes(sHero)}</section>`;
  return SC.page("s", { selCss: sSel, top, second: "changes" });
}
export const sPhone = () => SC.phonePage("s", { selCss: sSel, selector: `<section class="card glass" style="padding:4px 16px 18px;gap:4px;background:linear-gradient(180deg,oklch(0.95 0.008 260),var(--surface) 62%)">${coverflow({ ph: true })}</section>`, hero: (f, o) => `<section class="card glass" style="padding:18px">${sHero(f, o)}</section>` });

// ================= T · Orbit =================
const tSel = (dsel, id) => `${dsel} .sx-${id} .orb { box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--accent); transform: scale(1.12); } ${dsel} .tl-${id} { opacity: 1; }`;
function orbit({ size = 560, ph = false } = {}) {
  const c = size / 2, R = size * 0.4;
  const subs = ORDER;
  const max = Math.max(...L.ACTIVE.map(L.monthlyEq));
  const pos = subs.map((s, i) => { const a = -Math.PI / 2 + (i / subs.length) * Math.PI * 2; return { s, x: c + R * Math.cos(a), y: c + R * Math.sin(a), sz: L.isOn(s) ? Math.round((ph ? 26 : 34) + ((ph ? 18 : 26) * Math.sqrt(L.monthlyEq(s) / max))) : (ph ? 24 : 30) }; });
  const lines = `<svg width="${size}" height="${size}" style="position:absolute;inset:0" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="var(--divider)" stroke-width="1.5" stroke-dasharray="3 6"></circle><circle cx="${c}" cy="${c}" r="${R * 0.62}" fill="none" stroke="var(--divider)"></circle>${pos.map((p) => `<line class="tl tl-${p.s.id}" x1="${c}" y1="${c}" x2="${p.x}" y2="${p.y}" stroke="var(--card-${L.catColor(p.s.category)})" stroke-width="2.5" stroke-linecap="round"></line>`).join("")}</svg><style>.tl { opacity: 0; transition: opacity 200ms; }</style>`;
  const orbs = pos.map((p) => item("t", p.s.id, `<span class="orb" style="display:flex;border-radius:${Math.round(p.sz * 0.32)}px;transition:transform 200ms var(--ease-out),box-shadow 200ms">${mono(p.s, p.sz)}</span>${ph ? "" : `<span style="position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap">${p.s.alias}</span>`}`, { ph, style: `position:absolute;left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);display:flex` })).join("");
  return { lines, orbs, c, size };
}
function tCenter(f, { ph = false } = {}) {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">${icon(f, ph ? 34 : 44)}<b style="font-size:${ph ? 22 : 30}px;font-weight:800;line-height:1.1;margin-top:6px">${inr(f.all ? f.monthly : f.amount)}</b><span style="font-size:12px;font-weight:700;color:var(--muted)">${f.all ? "a month" : `a ${f.cycleWord}`}</span><span class="pill ${f.all || f.on ? (f.left <= 3 ? "pill-due" : "pill-on") : "pill-off"}" style="margin-top:6px">${f.all ? `Next: ${f.nextSub.alias}` : f.on ? `${f.left} days left` : f.status}</span></div>`;
}
export function tHero(f, { ph = false } = {}) {
  const list = f.all ? [["Renews next", `${f.nextSub.alias} · ${fmtDow(f.next)}`], ["A year", inr(f.yearly)], ["Paid this year", `${inr(f.paidSoFar)} · ${f.payCount} payments`], ["Prices", changeText(f)], ["Charged to", viaText(f)]]
    : [["Status", whenLine(f)], ["A month", `${inr(f.monthly)} · ${L.pct(f.monthly, L.MONTHLY)} of the total`], ["A year", inr(f.yearly)], ["Paid so far", `${inr(f.paidSoFar)} · ${f.payCount} payments`], ["Price", changeText(f)], ["Charged to", viaText(f)], ["Since", fmtY(f.since)]];
  return `<div style="display:flex;flex-direction:column;gap:${ph ? 12 : 16}px;height:100%"><div><span class="eyebrow">${f.all ? "In orbit" : `${f.category} · ${f.cycle}`}</span><h2 style="font-size:${ph ? 22 : 30}px;font-weight:800;line-height:1.15;margin-top:4px">${f.name}</h2></div>
    <div class="spread" style="gap:0">${list.map(([k, v]) => `<div class="between" style="padding:11px 0;border-bottom:1px solid var(--divider);font-size:13.5px"><span class="muted" style="font-weight:600">${k}</span><b style="text-align:right">${v}</b></div>`).join("")}</div>
    <div class="row" style="gap:8px">${actions(f)}</div></div>`;
}
export function tDesktop() {
  const o = orbit();
  const top = `<section class="card glass" style="flex-direction:row;gap:28px;padding:24px 30px;align-items:stretch">
    <div style="position:relative;width:${o.size}px;height:${o.size}px;flex-shrink:0">${o.lines}<div style="position:absolute;left:${o.c}px;top:${o.c}px;transform:translate(-50%,-50%);width:220px">${SC.heroPanes(tCenter)}</div>${o.orbs}
      ${SC.item("t", "all", `<span class="chip" style="gap:8px">${I.subs(11)}All subscriptions</span>`, { style: "position:absolute;left:0;top:0" })}
      <span class="card-note" style="position:absolute;right:0;top:0;text-align:right;line-height:1.4">Clockwise from the top,<br>in renewal order. Bigger costs more.</span></div>
    <div class="grow" style="min-width:0;display:flex;flex-direction:column">${SC.heroPanes(tHero).replace(/class="hp hp-/g, 'style="flex:1 1 auto" class="hp hp-')}</div></section>`;
  return SC.page("t", { selCss: (d, id) => tSel(d, id) + `${d} .hp-${id}[style] { display: flex; flex-direction: column; }`, top });
}
export const tPhone = () => { const o = orbit({ size: 330, ph: true }); return SC.phonePage("t", { selCss: tSel, selector: `<section class="card glass" style="padding:14px;align-items:center"><div style="position:relative;width:330px;height:330px">${o.lines}<div style="position:absolute;left:${o.c}px;top:${o.c}px;transform:translate(-50%,-50%);width:150px">${tCenter(facts(L.sub("netflix")), { ph: true })}</div>${o.orbs}</div></section>`, hero: (f, x) => `<section class="card glass" style="padding:18px">${tHero(f, x)}</section>` }); };

// ================= U · Renewal ruler =================
const U_DAYS = 92;
const uSel = (dsel, id) => `${dsel} .sx-${id} .pin-ic { box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--accent); transform: scale(1.18); } ${dsel} .sx-${id} .pin-lb { color: var(--fg); } ${dsel} .sx-${id} .pin-stem { background: var(--accent); }`;
function ruler({ w = 1180, ph = false } = {}) {
  const X = (iso) => 20 + (L.daysBetween(L.TODAY, iso) / U_DAYS) * (w - 40);
  const pins = L.byNext.filter((s) => L.daysBetween(L.TODAY, L.nextRenewal(s)) <= U_DAYS).map((s) => ({ s, x: X(L.nextRenewal(s)) }));
  const later = L.byNext.filter((s) => L.daysBetween(L.TODAY, L.nextRenewal(s)) > U_DAYS);
  const levels = [];
  for (const p of pins) { let lv = 0; while (levels[lv] != null && p.x - levels[lv] < (ph ? 34 : 112)) lv++; levels[lv] = p.x; p.lv = lv; }
  const base = ph ? 150 : 40 + Math.max(...pins.map((p) => p.lv)) * 52 + 48, lvH = ph ? 42 : 52;
  const ticks = [];
  for (let i = 0; i <= U_DAYS; i++) { const d = L.addDays(L.TODAY, i); const first = d.endsWith("-01"); const mon = L.dow(d) === "Mon"; if (first || mon || i === 0) ticks.push(`<span style="position:absolute;left:${X(d)}px;top:${base}px;width:${first ? 2 : 1}px;height:${first ? 14 : 7}px;background:${first ? "var(--fg)" : "var(--fill-strong)"}"></span>${first ? `<span style="position:absolute;left:${X(d) + 5}px;top:${base + 4}px;font-size:11px;font-weight:800">${L.monName(d.slice(0, 7))}</span>` : ""}`); }
  const pinEls = pins.map((p) => { const top = base - 40 - p.lv * lvH; return SC.item("u", p.s.id, `<span class="pin-stem" style="position:absolute;left:-1px;top:${top + 18}px;width:2px;height:${base - top - 18}px;background:var(--fill-strong);transition:background 200ms"></span><span class="pin-ic" style="position:absolute;left:0;top:${top}px;transform-origin:center;display:flex;margin-left:-18px;border-radius:11px;transition:transform 200ms var(--ease-out),box-shadow 200ms">${mono(p.s, 36)}</span>${ph ? "" : `<span class="pin-lb" style="position:absolute;left:24px;top:${top + 2}px;font-size:11.5px;font-weight:800;color:var(--muted);white-space:nowrap;line-height:1.25">${p.s.alias}<br><span style="font-weight:600">${fmt(L.nextRenewal(p.s))}</span></span>`}`, { ph, style: `position:absolute;left:${p.x}px;top:0;width:1px;height:${base}px` }); }).join("");
  return `<div style="position:relative;height:${base + 30}px;width:${w}px"><span style="position:absolute;left:0;right:0;top:${base}px;height:2px;background:var(--divider)"></span><span style="position:absolute;left:20px;top:8px;height:${base - 8}px;width:2px;background:var(--accent);opacity:0.6"></span><span style="position:absolute;left:26px;top:4px;font-size:11px;font-weight:800;color:var(--accent-text)">Today</span>${ticks.join("")}${pinEls}</div>
    ${ph ? "" : `<div class="row" style="gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--divider)"><span class="card-note">Later:</span>${later.map((s) => SC.item("u", s.id, `<span class="chip">${mono(s, 16)}${s.alias}<em>${fmt(L.nextRenewal(s))}</em></span>`, { cls: "", style: "" })).join("")}<span class="card-note" style="margin-left:12px">Not renewing:</span>${STOPPED.map((s) => SC.item("u", s.id, `<span class="chip">${mono(s, 16)}${s.alias}<em>${s.status === "Paused" ? "paused" : "cancelled"}</em></span>`)).join("")}${SC.item("u", "all", `<span class="chip" style="margin-left:auto">${I.subs(11)}All subscriptions</span>`, { style: "margin-left:auto" })}</div>`}`;
}
export function uHero(f, { ph = false } = {}) {
  const n = f.all ? f.left : f.on ? f.left : null;
  const nexts = f.all ? L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 40)).slice(0, 4).map((r) => `${r.s.alias} ${fmt(r.date)}`) : f.on ? [1, 2, 3].map((i) => fmt(L.addMonthsUTC(f.next, i * L.STEP[f.cycle]))) : [];
  return `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "220px minmax(0,1fr) minmax(0,0.9fr)"};gap:${ph ? 14 : 30}px;align-items:center">
    <div class="textured" style="border-radius:22px;padding:18px 20px;background:${n != null && n <= 3 ? "var(--negative-tint)" : "var(--feature-tile)"};border:1px solid ${n != null && n <= 3 ? "oklch(0.55 0.16 25 / 0.2)" : "var(--feature-tile-line)"};display:flex;flex-direction:column;gap:2px">${rings(220, 160, { opacity: 0.1 })}<span style="font-size:${ph ? 56 : 76}px;font-weight:800;line-height:0.95;letter-spacing:-0.03em;color:${n != null && n <= 3 ? "var(--negative)" : "var(--fg)"}">${n == null ? "—" : n}</span><span style="font-size:14px;font-weight:700;color:var(--muted)">${n == null ? (f.status === "Paused" ? "paused" : "won't renew") : n === 1 ? "day to go" : "days to go"}</span></div>
    <div style="display:flex;flex-direction:column;gap:10px;min-width:0"><span class="row" style="gap:10px">${icon(f, 34)}<span><b style="font-size:${ph ? 20 : 26}px;font-weight:800;display:block;line-height:1.15">${f.name}</b><span class="muted" style="font-size:13px;font-weight:600">${f.all ? `until ${f.nextSub.alias} renews, ${fmtDow(f.next)}` : whenLine(f)}</span></span></span>
      ${f.all || f.on ? `<div><div class="between" style="font-size:11.5px;font-weight:700;color:var(--muted)"><span>${f.all ? "Oct 1" : `Last ${fmt(f.prev)}`}</span><span>${f.all ? "Oct 31" : `Next ${fmt(f.next)}`}</span></div><div class="track" style="height:8px;margin-top:5px"><span style="width:${f.frac * 100}%;background:var(--card-${f.color})"></span></div></div>` : ""}
      <div class="row" style="gap:8px">${actions(f)}</div></div>
    <div style="display:flex;flex-direction:column;gap:10px"><div class="between"><span class="muted" style="font-size:12px;font-weight:700">${f.all ? "A month" : `Each ${f.cycleWord}`}</span><b style="font-size:24px">${inr(f.all ? f.monthly : f.amount)}</b></div><div class="between" style="font-size:13px"><span class="muted" style="font-weight:600">Charged to</span><b>${viaText(f)}</b></div><div class="between" style="font-size:13px"><span class="muted" style="font-weight:600">Paid so far</span><b>${inr(f.paidSoFar)}</b></div>${nexts.length ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="muted" style="font-size:12px;font-weight:600">Then</span>${nexts.map((x) => `<span class="chip" style="padding:4px 10px;font-size:11.5px">${x}</span>`).join("")}</div>` : ""}</div></div>`;
}
export function uDesktop() {
  const top = `<section class="card glass" style="gap:12px"><div class="between"><span class="card-t">Renewal ruler<small>the next three months · pick a pin</small></span><span class="card-note">${L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).length} renewals in the next 30 days</span></div>${ruler({ w: 1368 })}</section><section class="card glass" style="padding:24px 28px">${SC.heroPanes(uHero)}</section>`;
  return SC.page("u", { selCss: uSel, top, second: "changes" });
}
export const uPhone = () => SC.phonePage("u", { selCss: uSel, selector: `<section class="card glass" style="padding:14px;gap:8px"><span class="card-t">Renewal ruler</span><div style="overflow:hidden">${ruler({ w: 330, ph: true })}</div></section>`, hero: (f, o) => `<section class="card glass" style="padding:18px">${uHero(f, o)}</section>` });
