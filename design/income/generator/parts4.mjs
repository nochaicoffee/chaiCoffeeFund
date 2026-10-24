// Round 3b: four new visuals for the left of the second row, none of them a block or a tile.
//   orbits   each source circles "you"; how far round its ring is how far it is through its cycle; 12 o'clock is payday
//   coins    every coin is ₹10,000; the year as a waffle of coins, dashed for the ones still to come
//   dial     the days of the month round a dial: when in the month each source lands, and the days it really did
//   vials    a beaker of the whole year filling in layers, and a test tube per source showing how full its year is
// Each is also a picker: the cover, the entries, the table and the calendar follow it.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
import { pickCss3 } from "./parts3.mjs";
const { I, inr, inrS, fmt, col, grad, mono } = L;
const { hc, tip, card, cardHead } = P;

const W = 654, H = 488;
const vivid = (s, a = 155) => `linear-gradient(${a}deg,var(--card-${s.color}),var(--card-${s.color}-from))`;
const bright = (s) => `color-mix(in oklch, var(--card-${s.color}) 70%, white)`;
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const chips = (items) => `<div class="row" style="gap:8px;flex-wrap:wrap">${items.join("")}</div>`;
const pickChip = (s, extra = "") => `<label for="i4-sel-${s.id}" class="chip pickable pk-${s.id}" style="cursor:pointer;opacity:1"><i style="background:${col(s)}"></i>${s.alias}${extra ? ` <em>${extra}</em>` : ""}</label>`;

// the cycle every active source is in: its last payment, its next one, and how far through it is
function cycle(s) {
  const prev = L.ENTRIES.filter((e) => e.sourceId === s.id && e.receivedDate && !(s.id === "salary" && e.tag === "Bonus")).sort((a, b) => (a.expectedDate < b.expectedDate ? 1 : -1))[0];
  const nx = L.nextOf(s.id), step = L.MONTHS_IN_CYCLE[s.frequency];
  const nextD = nx?.expectedDate ?? L.addMonthsUTC(prev.expectedDate, step), days = L.daysBetween(prev.expectedDate, nextD), elapsed = L.daysBetween(prev.expectedDate, L.TODAY);
  return { prev, nextD, days, elapsed, phase: elapsed / days, late: nx?.status === "Pending" };
}

// ---------- Orbits ----------
export function orbitMap() {
  const PH = 504, cx = W / 2, cy = PH / 2, order = ["salary", "fd", "rsu", "espp", "div"].filter(L.src), radii = [66, 108, 152, 192, 226];
  const R = rnd(7), stars = Array.from({ length: 46 }, () => `<i style="position:absolute;left:${R() * W}px;top:${R() * (504 - 10)}px;width:${1 + R() * 2}px;height:${1 + R() * 2}px;border-radius:50%;background:var(--fg);opacity:${0.1 + R() * 0.2}"></i>`).join("");
  const pos = (r, deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const arc = (r, deg, color, extra = "") => { const [x, y] = pos(r, Math.min(deg, 359.9)); return `<path d="M${cx},${cy - r} A${r},${r} 0 ${deg > 180 ? 1 : 0} 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" ${extra}></path>`; };
  let svg = "", planets = "";
  order.forEach((id, i) => {
    const s = L.src(id), c = cycle(s), r = radii[i], over = c.phase > 1, deg = (over ? c.phase - 1 : c.phase) * 360, pr = 8 + Math.sqrt(s.expectedAmount / 1000) * 1.9;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fg)" stroke-opacity="0.14" stroke-dasharray="2 5"></circle>`;
    svg += over ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col(s)}" stroke-width="3.2" opacity="0.9"></circle>${arc(r, deg, "oklch(0.72 0.14 75)")}` : arc(r, deg, col(s));
    const [x, y] = pos(r, deg);
    const left = deg > 180, body = hc({ h: s.name, hr: over ? `<span class="pill pill-due" style="padding:2px 8px;font-size:10px">pending</span>` : "", t: inr(s.expectedAmount), d: over ? `${L.delay(L.nextOf(s.id))} days past its payday` : `${Math.round(c.phase * 100)}% of the way to its next payday`, rows: [["Last paid", fmt(c.prev.receivedDate), ""], [over ? "Expected" : "Next", fmt(c.nextD), ""], ["Lands in", L.ACCOUNTS[s.acct].name, ""]], w: 230 });
    planets += `<label for="i4-sel-${s.id}" class="pickable pk-${s.id} hov" tabindex="0" style="position:absolute;left:${x - pr}px;top:${y - pr}px;width:${pr * 2}px;height:${pr * 2}px;border-radius:50%;background:${vivid(s)};color:var(--on-card);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.3),0 6px 14px oklch(0.2 0.05 260 / 0.35);${over ? "animation:due-pulse 2.2s ease-in-out infinite;" : ""}">${L.srcIcon(s, Math.round(pr * 0.7))}<span style="position:absolute;${id === "div" ? "left:calc(100% + 8px);top:50%;transform:translateY(-50%)" : `top:${pr * 2 + 3}px;left:50%;transform:translateX(-50%)`};white-space:nowrap;font-size:10.5px;font-weight:800;background:var(--surface);border:1px solid var(--surface-line);padding:2px 8px;border-radius:999px;color:var(--fg);box-shadow:var(--soft-shadow)">${s.alias} · ${over ? `<span style="color:var(--negative)">${L.delay(L.nextOf(s.id))}d late</span>` : fmt(c.nextD)}</span>${tip(body, { w: 230, x: "c", y: "up", off: pr + 6 })}</label>`;
  });
  const sun = `<div style="position:absolute;left:${cx - 46}px;top:${cy - 46}px;width:92px;height:92px;border-radius:50%;background:radial-gradient(circle at 35% 30%,oklch(0.78 0.17 145),var(--card-emerald) 55%,var(--card-emerald-to));box-shadow:0 0 0 7px oklch(0.72 0.19 145 / 0.16),0 0 34px oklch(0.72 0.19 145 / 0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--on-card);text-align:center"><b style="font-size:13px;font-weight:800">You</b><span style="font-size:11px;font-weight:700;opacity:.9">${inrS(L.YTD)}</span></div>`;
  const pd = `<svg width="${W}" height="${PH}" viewBox="0 0 ${W} ${PH}" style="position:absolute;inset:0">${svg}<line x1="${cx}" y1="${cy - 50}" x2="${cx}" y2="${cy - 240}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 4"></line></svg><span style="position:absolute;left:${cx}px;top:2px;transform:translateX(-50%);padding:3px 10px;border-radius:999px;background:var(--ink);color:var(--on-ink);font-size:10px;font-weight:800">Payday</span>`;
  const panel = `<div style="position:relative;width:${W}px;height:${PH}px;border-radius:24px;background:var(--fill);overflow:hidden">${stars}${pd}${sun}${planets}</div>`;
  return card(`${pickCss3()}${cardHead("Payday orbits", "a ring per source · pick one for the cover")}${panel}<div class="card-note foot">Each planet is a source: its size is what it pays, and how far round its ring it is is how far through its cycle it is. The line at the top is payday; a planet that passes it without paying turns amber.</div>`, { gap: 14 });
}

// ---------- Coins: every coin is ₹10,000 ----------
export function coinMap() {
  const order = ["salary", "rsu", "espp", "fd", "div", "tax"].filter(L.src), COIN = 10000, cols = 24, size = 21.5, gap = 5;
  const coins = [];
  for (const id of order) {
    const s = L.src(id), got = Math.round(L.ytdOf(id) / COIN), pendS = L.PENDING.filter((p) => p.sourceId === id).reduce((t, p) => t + p.amount, 0), toCome = Math.round((L.UPCOMING.filter((u) => u.sourceId === id && u.expectedDate <= "2026-12-31").reduce((t, u) => t + u.amount, 0) + pendS) / COIN);
    for (let i = 0; i < got; i++) coins.push({ s, k: "got" });
    for (let i = 0; i < toCome; i++) coins.push({ s, k: pendS && i === toCome - 1 ? "pend" : "soon" });
  }
  const have = coins.filter((c) => c.k === "got").length, soon = coins.length - have;
  const dots = coins.map(({ s, k }) => `<label for="i4-sel-${s.id}" class="pickable pk-${s.id}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;${k === "got" ? `background:${vivid(s, 145)};box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.4),inset 0 -2px 0 oklch(0 0 0 / 0.18),0 2px 3px oklch(0.2 0.05 260 / 0.3)` : k === "pend" ? "border:1.8px dashed oklch(0.72 0.14 75);background:oklch(0.95 0.06 85)" : `border:1.6px dashed ${col(s)};background:color-mix(in oklch,${col(s)} 12%,transparent)`}"></label>`).join("");
  const rows = Math.ceil(coins.length / cols);
  const panel = `<div style="display:grid;grid-template-columns:repeat(${cols},${size}px);gap:${gap}px;justify-content:center;padding:18px 0;border-radius:24px;background:var(--fill);width:${W}px;position:relative;overflow:hidden">${rings(W, rows * (size + gap) + 36, { first: 50, step: 28, opacity: 0.07 })}${dots}</div>`;
  const key = L.SOURCES.map((s) => pickChip(s, `${Math.round(L.ytdOf(s.id) / COIN)}`)).join("");
  return card(`${pickCss3()}${cardHead("Coins", "every coin is ₹10,000 · pick a colour for the cover")}<div class="row" style="gap:30px"><div class="hfig"><span class="k">In the jar</span><span class="v">${have} <small style="font-size:13px;color:var(--muted);font-weight:700">coins</small></span><span class="s">${inr(L.YTD)} received</span></div><div class="hfig"><span class="k">Still to come this year</span><span class="v" style="color:var(--muted)">${soon} <small style="font-size:13px;font-weight:700">coins</small></span><span class="s">dashed, at the usual amounts</span></div><div class="hfig"><span class="k">Biggest stack</span><span class="v">Salary</span><span class="s">${Math.round(L.ytdOf("salary") / COIN)} coins · ${L.SALARY_SHARE}% of the jar</span></div></div>${panel}${chips([key])}<div class="card-note foot">A coin is ₹10,000, rounded: ${L.SOURCES.map((s) => s.alias).join(", ")} in that order. Amber is the pending dividend.</div>`, { gap: 14 });
}

// ---------- The payday dial: the days of the month ----------
export function dialMap() {
  const DH = 492, cx = W / 2, cy = 246, rim = 192, bands = Object.fromEntries(L.ACTIVE.map((s, i) => [s.id, 170 - i * Math.min(24, 100 / Math.max(1, L.ACTIVE.length - 1))])), band = 16;
  const ang = (d) => ((d - 1) / 31) * 360, pos = (r, deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const arcP = (r, a0, a1) => { const [x0, y0] = pos(r, a0), [x1, y1] = pos(r, a1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
  let svg = `<circle cx="${cx}" cy="${cy}" r="${rim + 8}" fill="none" stroke="var(--divider)"></circle>`;
  for (let d = 1; d <= 31; d++) { const [x0, y0] = pos(rim + 8, ang(d)), [x1, y1] = pos(rim + ([1, 5, 10, 15, 20, 25, 30].includes(d) ? 15 : 12), ang(d)); svg += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="var(--muted)" stroke-opacity="${[1, 5, 10, 15, 20, 25, 30].includes(d) ? 0.7 : 0.35}" stroke-width="1.5"></line>`; }
  [1, 5, 10, 15, 20, 25, 30].forEach((d) => { const [x, y] = pos(rim + 26, ang(d)); svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" style="font-size:11px;font-weight:800;fill:var(--muted)">${d}</text>`; });
  const dots = [];
  for (const s of L.ACTIVE) {
    const r = bands[s.id], es = L.ENTRIES.filter((e) => e.sourceId === s.id && e.expectedDate.startsWith("2026")), days = es.filter((e) => e.receivedDate && e.tag !== "Bonus").map((e) => Number(e.receivedDate.slice(8)));
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${band}"></circle>`;
    if (days.length) svg += `<path d="${arcP(r, ang(Math.min(...days) - 0.45), ang(Math.max(...days) + 0.45))}" fill="none" stroke="${col(s)}" stroke-opacity="0.32" stroke-width="${band}" stroke-linecap="round"></path>`;
    for (const e of es) {
      const d = Number((e.receivedDate ?? e.expectedDate).slice(8)), [x, y] = pos(r, ang(d)), st = L.stateOf(e);
      const body = hc({ h: `${s.alias} · ${e.receivedDate ? fmt(e.receivedDate) : "expected " + fmt(e.expectedDate)}`, t: inr(e.amount), d: e.receivedDate ? (L.delay(e) <= 0 ? "on the day" : `${L.delay(e)} days after expected`) : `${L.delay(e)} days late`, w: 210 });
      dots.push(`<label for="i4-sel-${s.id}" class="pickable pk-${s.id} hov" tabindex="0" style="position:absolute;left:${x - 6.5}px;top:${y - 6.5}px;width:13px;height:13px;border-radius:50%;${st === "Pending" ? "background:var(--warning-tint);border:2px dashed oklch(0.72 0.14 75);animation:due-pulse 2.2s ease-in-out infinite" : `background:${col(s)};box-shadow:0 0 0 2px var(--surface)${st === "Late" ? ",0 0 0 3.5px oklch(0.72 0.14 75)" : ""}`}">${tip(body, { w: 210, x: "c", y: "up", off: 8 })}</label>`);
    }
  }
  const [hx, hy] = pos(rim + 4, ang(24));
  const [h0x, h0y] = pos(70, ang(24));
  svg += `<line x1="${h0x}" y1="${h0y}" x2="${hx}" y2="${hy}" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"></line><circle cx="${hx}" cy="${hy}" r="4" fill="var(--ink)"></circle>`;
  const nx = L.UPCOMING[0], s0 = L.src(nx.sourceId);
  const centre = `<div style="position:absolute;left:${cx - 62}px;top:${cy - 40}px;width:124px;text-align:center;display:flex;flex-direction:column;gap:3px;align-items:center;pointer-events:none"><span class="hk" style="font-size:9.5px">Next payday</span><b style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-top:34px">${fmt(nx.expectedDate)}</b><span style="font-size:11px;font-weight:600;color:var(--muted)">${s0.alias} ${inrS(nx.amount)}<br>${L.inDays(nx.expectedDate)}</span></div>`;
  const todayTag = `<span style="position:absolute;left:${hx - 52}px;top:${hy - 11}px;padding:2px 8px;border-radius:999px;background:var(--ink);color:var(--on-ink);font-size:10px;font-weight:800;white-space:nowrap">Today · 24</span>`;
  const panel = `<div style="position:relative;width:${W}px;height:${DH}px;border-radius:24px;background:var(--surface);border:1px solid var(--surface-line);box-sizing:border-box"><svg width="${W}" height="${DH}" viewBox="0 0 ${W} ${DH}" style="position:absolute;inset:0">${svg}</svg>${dots.join("")}${centre}${todayTag}</div>`;
  return card(`${pickCss3()}${cardHead("Payday dial", "the days of the month · pick a source for the cover")}${panel}${chips(L.ACTIVE.map((s) => pickChip(s, `day ${Number(L.src(s.id) && cycle(s).prev.expectedDate.slice(8))}`)))}<div class="card-note foot">Each ring is a source and each dot a payment this year, on the day of the month it landed. The shaded stretch is where it usually lands; amber is late. The hand is today.</div>`, { gap: 12 });
}

// ---------- Vials: how full is the year ----------
export function vialMap() {
  const order = ["salary", "rsu", "espp", "fd", "div", "tax"].filter(L.src);
  const total = (id) => L.ytdOf(id) + L.PENDING.filter((p) => p.sourceId === id).reduce((t, p) => t + p.amount, 0) + L.UPCOMING.filter((u) => u.sourceId === id && u.expectedDate <= "2026-12-31").reduce((t, u) => t + u.amount, 0);
  const year = order.reduce((t, id) => t + total(id), 0), BH = 392, TH = 314;
  const layers = order.map((id) => { const s = L.src(id), h = Math.max(4, (L.ytdOf(id) / year) * BH); return `<label for="i4-sel-${id}" class="pickable pk-${id}" style="display:block;height:${h}px;background:${vivid(s, 90)};box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.3);flex-shrink:0"></label>`; }).join("");
  const rest = year - L.YTD;
  const beaker = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:196px"><div class="hfig" style="align-items:center;text-align:center"><span class="k">The whole year</span><span class="v">${Math.round((L.YTD / year) * 100)}% full</span></div><div style="position:relative;width:196px;height:${BH}px;border:3px solid var(--fill-strong);border-top:0;border-radius:8px 8px 46px 46px;overflow:hidden;background:repeating-linear-gradient(135deg,transparent 0 6px,var(--fill) 6px 7px)"><div style="position:absolute;inset:0;display:flex;flex-direction:column-reverse">${layers}</div><span style="position:absolute;left:0;right:0;top:0;height:${(rest / year) * BH}px;border-bottom:2px dashed var(--positive);display:flex;align-items:flex-start;justify-content:center;padding-top:8px;font-size:11px;font-weight:800;color:var(--positive)">${inrS(rest)} still to come</span></div><span style="font-size:12px;font-weight:700;color:var(--muted)">${inr(L.YTD)} of ${inr(year)}</span></div>`;
  const wave = (c) => `<svg width="100%" height="12" viewBox="0 0 56 12" preserveAspectRatio="none" style="position:absolute;left:0;top:-6px"><path d="M0,6 Q7,0 14,6 T28,6 T42,6 T56,6 L56,12 L0,12 Z" fill="${c}"></path></svg>`;
  const tubes = order.map((id) => {
    const s = L.src(id), t = total(id), f = Math.min(1, L.ytdOf(id) / t), off = s.status === "Inactive", todo = t - L.ytdOf(id);
    const body = hc({ h: s.name, t: inr(L.ytdOf(id)), d: `${Math.round(f * 100)}% of ${inr(t)} for the year`, rows: [["Still to come", inr(todo), ""], ["Lands in", L.ACCOUNTS[s.acct].name, ""]], w: 220 });
    const bub = [[0.2, 0.25, 5], [0.62, 0.45, 3.5], [0.35, 0.7, 4]].map(([x, y, r]) => `<i style="position:absolute;left:${x * 100}%;bottom:${y * f * 100}%;width:${r}px;height:${r}px;border-radius:50%;background:oklch(1 0 0 / 0.45)"></i>`).join("");
    return `<label for="i4-sel-${id}" class="pickable pk-${id} hov" tabindex="0" style="display:flex;flex-direction:column;align-items:center;gap:7px;width:58px;${off ? "filter:grayscale(.8)" : ""}"><b style="font-size:12.5px;font-weight:800">${Math.round(f * 100)}%</b><div style="position:relative;width:46px;height:${TH}px;border:2.5px solid var(--fill-strong);border-radius:23px 23px 23px 23px;overflow:hidden;background:var(--fill)">${todo > 0 ? `<span style="position:absolute;left:0;right:0;bottom:0;top:0;background:repeating-linear-gradient(135deg,color-mix(in oklch,${col(s)} 16%,transparent) 0 4px,transparent 4px 8px)"></span>` : ""}<div style="position:absolute;left:0;right:0;bottom:0;height:${f * 100}%;background:${vivid(s, 90)}">${wave(`color-mix(in oklch,var(--card-${s.color}) 85%,white)`)}${bub}</div></div><span style="font-size:11px;font-weight:800;text-align:center;line-height:1.2;white-space:nowrap">${{ salary: "Salary", rsu: "RSUs", espp: "ESPP", fd: "FD", div: "Dividends", tax: "Refund" }[id]}</span><span style="font-size:10.5px;font-weight:600;color:var(--muted);margin-top:-5px">${inrS(L.ytdOf(id))}</span>${tip(body, { w: 220, x: "c", y: "up", off: 0 })}</label>`;
  }).join("");
  const panel = `<div style="display:flex;gap:26px;align-items:flex-end;justify-content:center;padding:18px 20px 14px;border-radius:24px;background:var(--surface);border:1px solid var(--surface-line);width:${W}px;position:relative;box-sizing:border-box">${beaker}<div style="display:flex;gap:12px;align-items:flex-start;align-self:flex-end;padding-bottom:22px">${tubes}</div></div>`;
  return card(`${pickCss3()}${cardHead("How full is the year", "this year's income so far against what's expected by Dec 31")}${panel}<div class="card-note foot">The beaker fills in layers, a colour per source; dashed is what's still to come at the usual amounts. A tube is one source's own year, so the tax refund is already full.</div>`, { gap: 14 });
}
