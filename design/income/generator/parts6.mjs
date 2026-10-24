// Round 3c: four visuals for the left of the second row that still read when one source (the salary) is most of the
// money, now that RSU and ESPP aren't income (decision 7). None of them sizes a block by amount alone.
//   rings    a ring per source, how far through its own year it is (received over the year's total), so every source is as big as any other
//   lens     the salary against everything else, and everything else blown up into its own ring beside it
//   ladder   every payment this year as a dot on a ₹2k to ₹3L scale that grows ×10 per two steps, a row per source
//   receipt  the year so far as a till receipt: a line per source, subtotals by tag, the total, and what's still owed
// Each is also a picker: the cover, the entries, the table and the calendar follow it.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
import { pickCss3 } from "./parts3.mjs";
const { inr, inrS, fmt, col, mono } = L;
const { hc, tip, card, cardHead } = P;

const W = 654;
const vivid = (s, a = 155) => `linear-gradient(${a}deg,var(--card-${s.color}),var(--card-${s.color}-from))`;
const chips = (items) => `<div class="row" style="gap:8px;flex-wrap:wrap">${items.join("")}</div>`;
const pickChip = (s, extra = "") => `<label for="i4-sel-${s.id}" class="chip pickable pk-${s.id}" style="cursor:pointer;opacity:1"><i style="background:${col(s)}"></i>${s.alias}${extra ? ` <em>${extra}</em>` : ""}</label>`;
const pos = (cx, cy, r, deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
const arcPath = (cx, cy, r, a0, a1) => {
  if (a1 - a0 >= 359.9) return `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r}`;
  const [x0, y0] = pos(cx, cy, r, a0), [x1, y1] = pos(cx, cy, r, a1);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
};
const pendingOf = (id) => L.PENDING.filter((p) => p.sourceId === id).reduce((t, p) => t + p.amount, 0);
const toComeOf = (id) => L.UPCOMING.filter((u) => u.sourceId === id && u.expectedDate <= "2026-12-31").reduce((t, u) => t + u.amount, 0);
/** A source's whole 2026: received, plus pending, plus its schedule to Dec 31 at the usual amount (Z7's "how full"). */
const yearOf = (id) => L.ytdOf(id) + pendingOf(id) + toComeOf(id);
const SHOWN = () => L.SOURCES.filter((s) => yearOf(s.id) > 0);
const panelBox = (h, inner, bg = "var(--surface)") => `<div style="position:relative;width:${W}px;height:${h}px;border-radius:24px;background:${bg};border:1px solid var(--surface-line);box-sizing:border-box;overflow:hidden">${inner}</div>`;

// ---------- Year rings: how far through its own year each source is ----------
export function ringMap() {
  const list = SHOWN(), PH = 470, cx = 236, cy = PH / 2, stroke = 26, r0 = 200, step = 38;
  let svg = "";
  list.forEach((s, i) => {
    const r = r0 - i * step, y = yearOf(s.id), f = Math.min(1, L.ytdOf(s.id) / y), deg = f * 360, late = pendingOf(s.id) > 0;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${stroke}"></circle>`;
    if (f < 1) svg += `<path d="${arcPath(cx, cy, r, deg + 3, 357)}" fill="none" stroke="${late ? "oklch(0.72 0.14 75)" : col(s)}" stroke-opacity="${late ? 0.55 : 0.28}" stroke-width="${stroke - 12}" stroke-dasharray="2 6" stroke-linecap="round"></path>`;
    svg += `<path d="${arcPath(cx, cy, r, 0, deg)}" fill="none" stroke="${col(s)}" stroke-width="${stroke}" stroke-linecap="round"${s.status === "Inactive" ? ' opacity="0.55"' : ""}></path>`;
  });
  const total = list.reduce((t, s) => t + yearOf(s.id), 0);
  const centre = `<div style="position:absolute;left:${cx - 60}px;top:${cy - 34}px;width:120px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none"><span class="hk" style="font-size:9.5px">The year</span><b style="font-size:26px;font-weight:800;letter-spacing:-0.02em">${Math.round((L.YTD / total) * 100)}%</b><span style="font-size:11px;font-weight:600;color:var(--muted)">${inrS(L.YTD)} of ${inrS(total)}</span></div>`;
  const legend = list.map((s, i) => {
    const y = yearOf(s.id), f = Math.min(1, L.ytdOf(s.id) / y), late = pendingOf(s.id) > 0;
    const body = hc({ h: s.name, t: inr(L.ytdOf(s.id)), d: `${Math.round(f * 100)}% of ${inr(y)} for 2026`, rows: [["Still to come", inr(y - L.ytdOf(s.id)), ""], ["Share of all income", `${L.pctOf(L.ytdOf(s.id), L.YTD)}%`, ""]], w: 220 });
    return `<label for="i4-sel-${s.id}" class="pickable pk-${s.id} hov" tabindex="0" style="display:flex;flex-direction:column;gap:3px;padding:9px 12px;border-radius:14px;cursor:pointer"><span class="row" style="gap:8px;font-size:12.5px;font-weight:800"><i style="width:10px;height:10px;border-radius:50%;background:${col(s)};display:inline-block"></i>${s.alias}${s.status === "Inactive" ? ' <em style="font-style:normal;color:var(--muted);font-weight:600">done</em>' : ""}</span><span style="font-size:20px;font-weight:800;letter-spacing:-0.02em">${Math.round(f * 100)}%</span><span style="font-size:11px;font-weight:600;color:${late ? "oklch(0.6 0.14 60)" : "var(--muted)"}">${late ? `${inrS(pendingOf(s.id))} late · ` : ""}${inrS(L.ytdOf(s.id))} of ${inrS(y)}</span>${tip(body, { w: 220, x: "r", y: "up" })}</label>`;
  }).join("");
  const panel = panelBox(PH, `${rings(W, PH, { first: 50, step: 28, opacity: 0.06 })}<svg width="${W}" height="${PH}" viewBox="0 0 ${W} ${PH}" style="position:absolute;inset:0">${svg}</svg>${centre}<div style="position:absolute;right:14px;top:22px;width:172px;display:flex;flex-direction:column;gap:2px">${legend}</div>`);
  return card(`${pickCss3()}${cardHead("How each one's year is going", "a ring per source · pick one for the cover")}${panel}<div class="card-note foot">A ring is one source's own 2026: how much of what it pays this year has landed. Every ring is the same size whatever it pays, so the dividends read as clearly as the salary. Dotted is still to come; amber is late.</div>`, { gap: 14 });
}

// ---------- The lens: the salary, and everything else up close ----------
export function lensMap() {
  const PH = 470, big = { cx: 176, cy: 228, r: 128, w: 48 }, small = { cx: 486, cy: 210, r: 104, w: 40 };
  const sal = L.src("salary"), rest = L.SOURCES.filter((s) => s.id !== "salary" && L.ytdOf(s.id) > 0), restSum = rest.reduce((t, s) => t + L.ytdOf(s.id), 0) || 1;
  const salDeg = (L.ytdOf("salary") / L.YTD) * 360;
  let svg = `<path d="${arcPath(big.cx, big.cy, big.r, 0, salDeg - 1.2)}" fill="none" stroke="${col(sal)}" stroke-width="${big.w}"></path>`;
  let a = salDeg;
  for (const s of rest) { const d = (L.ytdOf(s.id) / L.YTD) * 360; svg += `<path d="${arcPath(big.cx, big.cy, big.r, a, a + d - 0.6)}" fill="none" stroke="${col(s)}" stroke-width="${big.w}"></path>`; a += d; }
  // the lens round the small slice, and the beam from it to the blown-up ring
  const mid = (salDeg + 360) / 2, [lx, ly] = pos(big.cx, big.cy, big.r, mid), lr = 40;
  svg += `<path d="M${lx + lr * 0.55},${ly - lr * 0.83} L${small.cx - small.r * 0.5},${small.cy - small.r - small.w / 2 - 4} L${small.cx - small.r * 0.5},${small.cy + small.r + small.w / 2 + 4} L${lx + lr * 0.55},${ly + lr * 0.83} Z" fill="var(--fg)" fill-opacity="0.045"></path>`;
  svg += `<circle cx="${lx}" cy="${ly}" r="${lr}" fill="none" stroke="var(--ink)" stroke-width="2.5"></circle><line x1="${lx - lr * 0.7}" y1="${ly + lr * 0.7}" x2="${lx - lr * 1.25}" y2="${ly + lr * 1.25}" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"></line>`;
  svg += `<circle cx="${small.cx}" cy="${small.cy}" r="${small.r + small.w / 2 + 6}" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"></circle>`;
  let b = 0;
  for (const s of rest) { const d = (L.ytdOf(s.id) / restSum) * 360; svg += `<path d="${arcPath(small.cx, small.cy, small.r, b + 1, b + d - 1)}" fill="none" stroke="${col(s)}" stroke-width="${small.w}"${s.status === "Inactive" ? ' opacity="0.55"' : ""}></path>`; b += d; }
  const fig = (x, y, k, v, s2, w = 120) => `<div style="position:absolute;left:${x - w / 2}px;top:${y - 32}px;width:${w}px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none"><span class="hk" style="font-size:9.5px">${k}</span><b style="font-size:22px;font-weight:800;letter-spacing:-0.02em">${v}</b><span style="font-size:11px;font-weight:600;color:var(--muted)">${s2}</span></div>`;
  const tag = (x, y, t) => `<span style="position:absolute;left:${x}px;top:${y}px;padding:3px 10px;border-radius:999px;background:var(--ink);color:var(--on-ink);font-size:10.5px;font-weight:800;white-space:nowrap">${t}</span>`;
  const rows = rest.map((s) => {
    const body = hc({ h: s.name, t: inr(L.ytdOf(s.id)), d: `${L.pctOf(L.ytdOf(s.id), restSum)}% of everything but salary · ${L.pctOf(L.ytdOf(s.id), L.YTD)}% of all income`, rows: [["Payments", `${L.received(2026, s.id).length}`, ""], ["Lands in", L.ACCOUNTS[s.acct].name, ""]], w: 230 });
    return `<label for="i4-sel-${s.id}" class="pickable pk-${s.id} hov" tabindex="0" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;border-radius:12px;cursor:pointer;font-size:12.5px;font-weight:700"><span class="row" style="gap:8px">${mono(s, 22)}${s.alias}</span><span style="font-variant-numeric:tabular-nums">${inr(L.ytdOf(s.id))} <em style="font-style:normal;color:var(--muted);font-weight:600">${L.pctOf(L.ytdOf(s.id), restSum)}%</em></span>${tip(body, { w: 230, x: "r", y: "up" })}</label>`;
  }).join("");
  const salPick = `<label for="i4-sel-salary" class="pickable pk-salary hov" tabindex="0" style="position:absolute;left:${big.cx - 64}px;top:${big.cy - 64}px;width:128px;height:128px;border-radius:50%;cursor:pointer"></label>`;
  const panel = panelBox(PH, `${rings(W, PH, { first: 50, step: 28, opacity: 0.06 })}<svg width="${W}" height="${PH}" viewBox="0 0 ${W} ${PH}" style="position:absolute;inset:0">${svg}</svg>${salPick}${fig(big.cx, big.cy, "Salary", `${L.SALARY_SHARE}%`, inrS(L.ytdOf("salary")))}${fig(small.cx, small.cy, "Everything else", inrS(restSum), `${L.pctOf(restSum, L.YTD)}% of the year`)}${tag(big.cx - 70, 16, "Received in 2026")}${restSum ? tag(small.cx - 62, 16, "The rest, ×" + Math.round(L.YTD / restSum)) : ""}<div style="position:absolute;left:${small.cx - 150}px;top:${small.cy + small.r + small.w / 2 + 18}px;width:300px;display:flex;flex-direction:column">${rows}</div>`);
  return card(`${pickCss3()}${cardHead("Salary, and the rest up close", "pick one for the cover")}${panel}<div class="card-note foot">The left ring is the whole year, the salary and a thin slice for everything else. The lens blows that slice up into its own ring, so the interest, dividends and refund are big enough to read and pick.</div>`, { gap: 14 });
}

// ---------- The pay ladder: every payment on a scale that grows ×10 every two steps ----------
export function ladderMap() {
  const list = SHOWN(), LO = 2000, HI = 300000, plotL = 150, plotR = W - 128, plotW = plotR - plotL, rowH = 92, top = 44, PH = top + list.length * rowH + 30;
  const x = (v) => plotL + ((Math.log10(v) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO))) * plotW;
  const ticks = [2000, 5000, 10000, 20000, 50000, 100000, 200000];
  let grid = ticks.map((t) => `<line x1="${x(t)}" y1="${top - 8}" x2="${x(t)}" y2="${PH - 26}" stroke="var(--divider)" ${[10000, 100000].includes(t) ? "" : 'stroke-dasharray="2 4"'}></line><text x="${x(t)}" y="${PH - 10}" text-anchor="middle" style="font-size:10.5px;font-weight:800;fill:var(--muted)">${inrS(t)}</text>`).join("");
  const dots = [], rows = [];
  list.forEach((s, i) => {
    const y = top + i * rowH + rowH / 2, es = L.ENTRIES.filter((e) => e.sourceId === s.id && e.expectedDate.startsWith("2026")), amts = es.map((e) => e.amount);
    grid += `<line x1="${plotL}" y1="${y}" x2="${plotR}" y2="${y}" stroke="${col(s)}" stroke-opacity="0.18" stroke-width="22" stroke-linecap="round"></line>`;
    if (amts.length > 1) grid += `<line x1="${x(Math.min(...amts))}" y1="${y}" x2="${x(Math.max(...amts))}" y2="${y}" stroke="${col(s)}" stroke-opacity="0.45" stroke-width="22" stroke-linecap="round"></line>`;
    es.forEach((e, j) => {
      const st = L.stateOf(e), cx = x(e.amount), jitter = ((j % 3) - 1) * 9;
      const body = hc({ h: `${s.alias} · ${e.receivedDate ? fmt(e.receivedDate) : "expected " + fmt(e.expectedDate)}`, t: inr(e.amount), d: e.tag === "Bonus" ? "Bonus" : st === "Pending" ? `${L.delay(e)} days late` : st === "Late" ? `${L.delay(e)} days after expected` : "on time", w: 200 });
      dots.push(`<label for="i4-sel-${s.id}" class="pickable pk-${s.id} hov" tabindex="0" style="position:absolute;left:${cx - 7}px;top:${y + jitter - 7}px;width:14px;height:14px;border-radius:50%;${st === "Pending" ? "background:var(--warning-tint);border:2px dashed oklch(0.72 0.14 75)" : `background:${vivid(s)};box-shadow:0 0 0 2px var(--surface)${e.tag === "Bonus" ? ",0 0 0 4px var(--ink)" : ""}`}">${tip(body, { w: 200, x: "c", y: "up", off: 8 })}</label>`);
    });
    const usual = s.status === "Active" ? `${inrS(s.expectedAmount)} ${s.frequency.toLowerCase()}` : "once";
    rows.push(`<label for="i4-sel-${s.id}" class="pickable pk-${s.id}" style="position:absolute;left:12px;top:${y - 22}px;width:${plotL - 24}px;display:flex;gap:9px;align-items:center;cursor:pointer;border-radius:12px;padding:4px">${mono(s, 30)}<span style="display:flex;flex-direction:column;line-height:1.25"><b style="font-size:12.5px">${s.alias}</b><span style="font-size:10.5px;color:var(--muted);font-weight:600">${usual}</span></span></label>`);
    rows.push(`<div style="position:absolute;left:${plotR + 18}px;top:${y - 19}px;width:${W - plotR - 30}px;display:flex;flex-direction:column;align-items:flex-end;line-height:1.3"><b style="font-size:14px;font-variant-numeric:tabular-nums">${inrS(L.ytdOf(s.id))}</b><span style="font-size:10.5px;color:var(--muted);font-weight:600">${L.plural(L.received(2026, s.id).length, "payment")}</span></div>`);
  });
  const head = `<span class="hk" style="position:absolute;left:${plotL}px;top:16px;font-size:9.5px">Each payment, by its size</span><span class="hk" style="position:absolute;right:16px;top:16px;font-size:9.5px">2026 so far</span>`;
  const panel = panelBox(PH, `<svg width="${W}" height="${PH}" viewBox="0 0 ${W} ${PH}" style="position:absolute;inset:0">${grid}</svg>${head}${rows.join("")}${dots.join("")}`);
  return card(`${pickCss3()}${cardHead("The pay ladder", "every payment this year · pick a row for the cover")}${panel}<div class="card-note foot">Each dot is one payment, placed by its size on a scale that grows ×10 every two lines, so a ₹6k dividend and a ₹1.4L salary both have room. The band is the range a source pays in; a ringed dot is a bonus, dashed is late.</div>`, { gap: 14 });
}

// ---------- The receipt: the year so far, itemised ----------
export function receiptMap() {
  const list = SHOWN().filter((s) => L.ytdOf(s.id) > 0), mono2 = "ui-monospace,SFMono-Regular,Menlo,monospace";
  const line = (l, r, { b = false, sub = "", pick = "" } = {}) => {
    const inner = `<span style="display:flex;align-items:baseline;gap:6px;font-weight:${b ? 800 : 600}"><span style="white-space:nowrap">${l}</span><span style="flex:1;border-bottom:1.5px dotted var(--fill-strong);transform:translateY(-3px)"></span><span style="font-variant-numeric:tabular-nums;white-space:nowrap">${r}</span></span>${sub ? `<span style="font-size:10.5px;color:var(--muted);font-weight:600">${sub}</span>` : ""}`;
    return pick ? `<label for="i4-sel-${pick.id}" class="pickable pk-${pick.id} hov" tabindex="0" style="display:flex;flex-direction:column;gap:2px;padding:5px 8px;margin:0 -8px;border-radius:8px;cursor:pointer">${inner}</label>` : `<div style="display:flex;flex-direction:column;gap:2px">${inner}</div>`;
  };
  const tear = `<svg width="100%" height="12" viewBox="0 0 300 12" preserveAspectRatio="none" style="display:block"><path d="${Array.from({ length: 31 }, (_, i) => `${i ? "L" : "M"}${i * 10},${i % 2 ? 12 : 0}`).join(" ")} L300,0 L300,0 L0,0 Z" fill="oklch(0.995 0.004 95)"></path></svg>`;
  const items = list.map((s) => {
    const months = L.monthlyOf(s.id), mx = Math.max(...months, 1);
    const spark = `<span style="display:inline-flex;gap:2px;align-items:flex-end;height:10px">${months.map((v, i) => `<i style="width:4px;height:${v ? Math.max(3, (v / mx) * 10) : 1.5}px;background:${v ? col(s) : "var(--fill-strong)"};${i > 9 ? "opacity:.4" : ""}"></i>`).join("")}</span>`;
    return line(`<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${col(s)};margin-right:6px"></span>${s.name.toUpperCase()}`, inr(L.ytdOf(s.id)), { pick: s, sub: `<span class="row" style="gap:8px;justify-content:space-between">${L.plural(L.received(2026, s.id).length, "payment")} · into ${L.ACCOUNTS[s.acct].name}${spark}</span>` });
  }).join("");
  const p = L.PENDING[0], ps = p && L.src(p.sourceId);
  const paper = `<div style="width:340px;filter:drop-shadow(0 14px 22px oklch(0.2 0.05 260 / 0.22));transform:rotate(-1.2deg)"><div style="background:oklch(0.995 0.004 95);color:oklch(0.25 0.02 260);padding:20px 22px 16px;font-family:${mono2};font-size:12px;display:flex;flex-direction:column;gap:9px;border-radius:4px 4px 0 0">
<div style="text-align:center;display:flex;flex-direction:column;gap:2px"><b style="font-size:13px;letter-spacing:0.12em">INCOME · 2026</b><span style="font-size:10.5px;color:var(--muted)">JAN 1 – OCT 24 · ${L.rcv26.length} PAYMENTS</span></div>
<div style="border-top:1.5px dashed var(--fill-strong)"></div>${items}<div style="border-top:1.5px dashed var(--fill-strong)"></div>
${line("REGULAR", inr(L.byTag("Regular")))}${line("BONUS", inr(L.byTag("Bonus")))}${line("ONE-OFF", inr(L.byTag("Other")))}
<div style="border-top:1.5px solid oklch(0.25 0.02 260)"></div><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:14px;letter-spacing:0.08em">TOTAL</b><b style="font-size:22px;font-variant-numeric:tabular-nums;letter-spacing:-0.02em">${inr(L.YTD)}</b></div>
${p ? `<div style="padding:7px 9px;border-radius:6px;background:var(--warning-tint);display:flex;justify-content:space-between;font-weight:800;font-size:11px"><span>OWED · ${ps.alias.toUpperCase()}</span><span>${inr(p.amount)} · ${L.delay(p)}D LATE</span></div>` : ""}
<div style="display:flex;gap:1.5px;height:30px;justify-content:center;margin-top:4px">${Array.from({ length: 46 }, (_, i) => `<i style="width:${[1, 2, 3][(i * 7) % 3]}px;background:oklch(0.25 0.02 260)"></i>`).join("")}</div>${L.UPCOMING[0] ? `<span style="text-align:center;font-size:10px;color:var(--muted)">NEXT · ${fmt(L.UPCOMING[0].expectedDate).toUpperCase()} · ${L.src(L.UPCOMING[0].sourceId).alias.toUpperCase()} ${inrS(L.UPCOMING[0].amount)}</span>` : ""}</div>${tear}</div>`;
  const PH = 470;
  const panel = `<div style="position:relative;width:${W}px;min-height:${PH}px;border-radius:24px;background:var(--fill);display:flex;align-items:center;justify-content:center;padding:22px 0;box-sizing:border-box;overflow:hidden">${rings(W, PH + 120, { first: 50, step: 28, opacity: 0.07 })}${paper}</div>`;
  return card(`${pickCss3()}${cardHead("The year's receipt", "itemised · pick a line for the cover")}${panel}<div class="card-note foot">The year so far as a till receipt: a line per source with its months, subtotals by tag, the total, and what's still owed. It's a list, so a ₹17k line reads as clearly as a ₹15L one.</div>`, { gap: 14 });
}
