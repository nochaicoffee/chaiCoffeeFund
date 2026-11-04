// Round 1 heroes for Fixed Income: F1 Ladder, F2 Meter, F3 Vault, F4 Cover, F5 Tax year, F6 Real return.
// Each board is the same greeting, attention strip and widgets, with its own idea for the hero.
import * as L from "./lib.mjs";
import * as D from "./data-sample.mjs";
import * as P from "./parts.mjs";
const { I, inr, fmt, fmtY, plural } = L;
const { sum } = D;
const { card, cardHead, grid, col, fillc, grad, lakh, lakhS, bankTile, hc, tip, cc, daysLeft } = P;

const body = (hero) => P.page(`${P.greeting()}${P.attention()}${hero}${P.widgets()}${P.sampleNote()}`);
const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mlabel = (key) => mon[Number(key.slice(5, 7)) - 1];
const nice = (max) => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const settingsChips = () => `<span style="display:inline-flex;gap:8px"><span class="chip-set">Tax slab <b>${D.SETTINGS.slab * 100}%</b></span><span class="chip-set">Inflation <b>${D.SETTINGS.inflation * 100}%</b></span><span class="chip-set">Bank cover <b>${lakhS(D.SETTINGS.cover)}</b></span></span>`;
const svgTip = (x, y, w, lines, { anchor = "middle" } = {}) => {
  const h = 16 * lines.length + 14, x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return `<g class="tt" transform="translate(${x0},${y - h - 8})"><rect width="${w}" height="${h}" rx="10" fill="oklch(0.2 0.01 260)" opacity="0.96"/>${lines.map((t, i) => `<text x="12" y="${22 + i * 16}" font-size="${i ? 11 : 12}" font-weight="${i ? 600 : 800}" fill="${i ? "oklch(0.85 0.01 260)" : "#fff"}">${t}</text>`).join("")}</g>`;
};

// ======================== F1 Ladder ========================
export function f1() {
  const W = 1360, H = 340, left = 56, right = 90, top = 36, bottom = 54;
  const months = D.LADDER_MONTHS, n = months.length, over = 1; // one column for "waiting" before the first month
  const cols = n + over + 1; // + "later"
  const cw = (W - left - right) / cols;
  const idxOf = (iso) => { const k = iso.slice(0, 7); const i = months.indexOf(k); return i >= 0 ? i + over : iso < D.monthStart(D.TODAY) ? 0 : cols - 1; };
  const rungs = Array.from({ length: cols }, () => []);
  for (const x of D.HELD) rungs[x.status === "Matured" ? 0 : idxOf(x.maturityDate)].push(x);
  const tot = rungs.map((r) => sum(r.map((x) => x.maturityAmount)));
  const maxV = nice(Math.max(...tot) * 1.05), y = (v) => top + (H - top - bottom) * (1 - v / maxV);
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="${left}" x2="${W - right}" y1="${y(maxV * f)}" y2="${y(maxV * f)}" stroke="var(--divider)"/><text x="${left - 10}" y="${y(maxV * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="var(--muted)">${lakhS(maxV * f)}</text>`).join("");
  // gaps: runs of empty months among the real months
  const gaps = []; let s = null;
  for (let i = over; i < over + n; i++) { if (!rungs[i].length) { if (s === null) s = i; } else if (s !== null) { gaps.push([s, i - 1]); s = null; } }
  if (s !== null) gaps.push([s, over + n - 1]);
  const longest = [...gaps].filter(([a, b]) => b < over + n - 1).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  const gapSvg = gaps.filter(([a, b]) => b - a >= 2 && b < over + n - 1).map(([a, b]) => `<g><rect x="${left + a * cw + 2}" y="${top}" width="${(b - a + 1) * cw - 4}" height="${H - top - bottom}" rx="10" fill="var(--fill)"/><text x="${left + ((a + b + 1) / 2) * cw}" y="${top + (H - top - bottom) / 2}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--muted)">${b - a + 1} months, nothing matures</text></g>`).join("");
  const bars = rungs.map((r, i) => {
    if (!r.length) return "";
    const bw = cw * 0.64, bx = left + i * cw + (cw - bw) / 2; let acc = 0; const t = tot[i];
    const segs = r.map((x) => { const v = x.maturityAmount, y1 = y(acc + v), y0 = y(acc); acc += v; return `<rect class="bar" x="${bx}" y="${y1}" width="${bw}" height="${y0 - y1 - 1.5}" rx="5" fill="${col(D.BANKS[x.bank].color)}" ${i === 0 ? `stroke="var(--loss)" stroke-width="2" stroke-dasharray="4 3" fill-opacity="0.55"` : ""}/>`; }).join("");
    const lbl = `<text x="${bx + bw / 2}" y="${y(t) - 8}" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--fg)">${lakhS(t)}</text>`;
    const tt = svgTip(bx + bw / 2, y(t) - 14, 210, [i === 0 ? "Matured, not closed" : i === cols - 1 ? "Later" : `${D.LADDER_MONTHS[i - over]}`.replace(/^(\d{4})-(\d{2})$/, (_, yy, m) => `${mon[+m - 1]} ${yy}`), ...r.map((x) => `${x.name} · ${inr(x.maturityAmount)}`)], { anchor: i > cols - 5 ? "end" : "middle" });
    return `<g class="hv">${segs}${lbl}${tt}</g>`;
  }).join("");
  const xl = Array.from({ length: cols }, (_, i) => { const k = i === 0 ? "Due" : i === cols - 1 ? "Later" : months[i - over]; const lab = i === 0 || i === cols - 1 ? k : mlabel(k); const yr = i > 0 && i < cols - 1 && (k.endsWith("-01") || i === over) ? `<text x="${left + i * cw + cw / 2}" y="${H - 14}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">${k.slice(0, 4)}</text>` : ""; return `<text x="${left + i * cw + cw / 2}" y="${H - 32}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${lab}</text>${yr}`; }).join("");
  const nowLine = `<line x1="${left + over * cw}" x2="${left + over * cw}" y1="${top - 6}" y2="${H - bottom}" stroke="var(--accent-edge)" stroke-dasharray="3 4"/><text x="${left + over * cw + 6}" y="${top - 10}" font-size="10.5" font-weight="800" fill="var(--accent-text)">Today</text>`;
  const within12 = D.UPCOMING.filter((u) => u.days <= 365);
  const big = [...D.UPCOMING].sort((a, b) => b.amount - a.amount)[0];
  const gapTxt = longest ? `${longest[1] - longest[0] + 1} months` : "none";
  const gapSub = longest ? `${L.monYear(months[longest[0] - over])} to ${L.monYear(months[longest[1] - over])}` : "";
  const legend = Object.values(D.BANKS).filter((b) => D.HELD.some((x) => D.BANKS[x.bank] === b)).map((b) => `<span><i style="background:${col(b.color)}"></i>${b.short}</span>`).join("");
  const stats = `<div class="statrow"><div class="kv"><span class="k">Back within a year</span><span class="v">${lakh(sum(within12.map((u) => u.amount)))}</span><span class="s">${plural(within12.length, "deposit")} mature by ${L.monYear(L.addDays(D.TODAY, 365).slice(0, 7))}</span></div><div class="kv"><span class="k">Longest quiet stretch</span><span class="v">${gapTxt}</span><span class="s">${gapSub}, nothing to reinvest</span></div><div class="kv"><span class="k">Biggest single rung</span><span class="v">${lakh(big.amount)}</span><span class="s">${big.x.name}, ${L.monYear(big.date.slice(0, 7))} · ${Math.round((big.amount / D.sum(D.ACTIVE.map((x) => x.maturityAmount))) * 100)}% of all that matures</span></div></div>`;
  const svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}">${grid}${gapSvg}${nowLine}<line x1="${left}" x2="${W - right}" y1="${y(0)}" y2="${y(0)}" stroke="var(--fill-strong)" stroke-width="1.5"/>${bars}${xl}</svg>`;
  return card(`${cardHead("The maturity ladder", "what comes back, month by month, with the interest in it", `<span class="legend">${legend}</span>`)}${svg}${stats}`, { cls: "heroc" });
}

// ======================== F2 Meter ========================
export function f2() {
  // the gauge
  const cx = 290, cy = 262, R = 226, r = 168, max = 800, a0 = Math.PI, a1 = 2 * Math.PI;
  const ang = (v) => a0 + (v / max) * (a1 - a0);
  const pt = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const arc = (v0, v1, ro = R, ri = r) => { const [x0, y0] = pt(ang(v0), ro), [x1, y1] = pt(ang(v1), ro), [x2, y2] = pt(ang(v1), ri), [x3, y3] = pt(ang(v0), ri); return `M${x0} ${y0} A${ro} ${ro} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 0 0 ${x3} ${y3}Z`; };
  const list = [...D.ACTIVE].sort((a, b) => D.perDay(b) - D.perDay(a)); let acc = 0;
  const segs = list.map((x) => { const v = D.perDay(x), p = `<path class="bar" d="${arc(acc, acc + v)}" fill="${col(D.BANKS[x.bank].color)}" stroke="var(--surface)" stroke-width="2"/>`; acc += v; return `<g class="hv">${p}</g>`; }).join("");
  const track = `<path d="${arc(0, max)}" fill="var(--fill)"/>`;
  const ticks = Array.from({ length: 9 }, (_, i) => i * 100).map((v) => { const [x0, y0] = pt(ang(v), R + 4), [x1, y1] = pt(ang(v), R + 14), [tx, ty] = pt(ang(v), R + 30); return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="var(--muted)" stroke-width="1.5"/><text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${v ? v : "0"}</text>`; }).join("");
  const [nx, ny] = pt(ang(D.PER_DAY), R + 2), [bx, by] = pt(ang(D.PER_DAY), r - 22);
  const needle = `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--ink)" stroke-width="3.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="10" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="4" fill="var(--surface)"/>`;
  const gauge = `<svg class="chart-svg" viewBox="0 0 580 372">${track}${segs}${ticks}${needle}<text x="${cx}" y="${cy + 62}" text-anchor="middle" font-size="46" font-weight="800" letter-spacing="-1" fill="var(--fg)">${inr(D.PER_DAY)}</text><text x="${cx}" y="${cy + 88}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--muted)">earned every day, right now</text></svg>`;
  const mo = D.PER_DAY * 30.4;
  const earned = `<div class="statrow"><div class="kv"><span class="k">So far today</span><span class="v">${inr(D.PER_DAY * 0.6)}</span><span class="s">at 2 pm, if it counts by the hour</span></div><div class="kv"><span class="k">A month, at this pace</span><span class="v">${inr(mo)}</span><span class="s">${inr(mo * 12)} a year</span></div><div class="kv"><span class="k">Since April</span><span class="v">${inr(D.FY_SO)}</span><span class="s">this tax year, to date</span></div></div>`;
  const legend = `<div class="legend">${list.map((x) => `<span><i style="background:${col(D.BANKS[x.bank].color)}"></i>${x.name} <b>${inr(D.perDay(x))}</b></span>`).join("")}</div>`;
  // the pace chart: the tax year, interest earned so far
  const W = 640, H = 420, l = 58, rr = 20, t = 24, b = 40, days = D.daysBetween(D.FY_START, D.FY_END);
  const step = 7, pts = [];
  for (let d = 0; d <= days; d += step) { const dt = L.addDays(D.FY_START, d); pts.push([d, sum(D.ALL.map((x) => D.interestIn(x, L.addDays(D.FY_START, -1), dt)))]); }
  pts.push([days, sum(D.ALL.map((x) => D.interestIn(x, L.addDays(D.FY_START, -1), D.FY_END)))]);
  const maxY = nice(pts.at(-1)[1] * 1.05), px = (d) => l + (W - l - rr) * (d / days), py = (v) => t + (H - t - b) * (1 - v / maxY);
  const todayD = D.daysBetween(D.FY_START, D.TODAY);
  const past = pts.filter(([d]) => d <= todayD), fut = pts.filter(([d]) => d >= todayD);
  const nowV = sum(D.ALL.map((x) => D.interestIn(x, L.addDays(D.FY_START, -1), D.TODAY)));
  past.push([todayD, nowV]); fut.unshift([todayD, nowV]);
  const line = (a) => a.map(([d, v], i) => `${i ? "L" : "M"}${px(d)} ${py(v)}`).join(" ");
  const area = `${line(past)} L${px(todayD)} ${py(0)} L${px(0)} ${py(0)}Z`;
  const gy = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="${l}" x2="${W - rr}" y1="${py(maxY * f)}" y2="${py(maxY * f)}" stroke="var(--divider)"/><text x="${l - 8}" y="${py(maxY * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="var(--muted)">${lakhS(maxY * f)}</text>`).join("");
  const mlab = Array.from({ length: 12 }, (_, i) => { const d = D.daysBetween(D.FY_START, L.addMonthsUTC(D.FY_START, i)); return `<text x="${px(d) + 14}" y="${H - 18}" font-size="10.5" font-weight="700" fill="var(--muted)">${mon[(3 + i) % 12]}</text>`; }).join("");
  const marks = D.ACTIVE.filter((x) => x.maturityDate <= D.FY_END && x.maturityDate > D.TODAY).map((x) => { const d = D.daysBetween(D.FY_START, x.maturityDate); return `<g class="hv"><line x1="${px(d)}" x2="${px(d)}" y1="${py(0)}" y2="${py(maxY * 0.9)}" stroke="${col(D.BANKS[x.bank].color)}" stroke-dasharray="3 4"/><circle cx="${px(d)}" cy="${py(maxY * 0.9)}" r="6" fill="${col(D.BANKS[x.bank].color)}"/>${svgTip(px(d), py(maxY * 0.9) - 4, 190, [`${x.name} matures`, `${fmtY(x.maturityDate)} · ${inr(x.maturityAmount)}`], { anchor: "end" })}</g>`; }).join("");
  const pace = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="pa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0.02"/></linearGradient></defs>${gy}<line x1="${l}" x2="${W - rr}" y1="${py(0)}" y2="${py(0)}" stroke="var(--fill-strong)"/><path d="${area}" fill="url(#pa)"/><path d="${line(past)}" fill="none" stroke="var(--accent-text)" stroke-width="3" stroke-linecap="round"/><path d="${line(fut)}" fill="none" stroke="var(--accent-text)" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round" opacity="0.7"/><line x1="${px(todayD)}" x2="${px(todayD)}" y1="${t - 4}" y2="${py(0)}" stroke="var(--accent-edge)" stroke-dasharray="3 4"/><circle cx="${px(todayD)}" cy="${py(nowV)}" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2.5"/><text x="${px(todayD) - 10}" y="${py(nowV) - 14}" text-anchor="end" font-size="13" font-weight="800" fill="var(--fg)">${lakhS(nowV)} so far</text><text x="${W - rr}" y="${py(pts.at(-1)[1]) - 12}" text-anchor="end" font-size="12" font-weight="800" fill="var(--muted)">${lakhS(pts.at(-1)[1])} by March</text>${marks}${mlab}</svg>`;
  const left = `<div style="display:flex;flex-direction:column;gap:14px">${gauge}${legend}${earned}</div>`;
  const right = `<div class="vsep" style="display:flex;flex-direction:column;gap:14px"><div><div class="card-t" style="font-size:14px">Interest piling up this tax year<small>April to March, dots are maturities</small></div></div>${pace}<div class="card-note">The solid line is what has built up; the dotted line carries on at today's pace, with a maturity's interest counted up to its date. A payout deposit adds a step each time it pays.</div></div>`;
  return card(`${cardHead("The interest meter", "what your money earns while you sleep", `<span class="pill pill-derived">${I.link(10)} Worked out</span>`)}<div class="two">${left}${right}</div>`, { cls: "heroc" });
}

// ======================== F3 Vault ========================
export function f3() {
  const order = [...D.HELD].sort((a, b) => (a.status === "Matured" ? -1 : 0) - (b.status === "Matured" ? -1 : 0) || a.maturityDate.localeCompare(b.maturityDate));
  const stamp = (x) => x.status === "Matured" ? ["due", "Matured"] : D.daysBetween(D.TODAY, x.maturityDate) <= 60 ? ["soon", "Matures soon"] : x.lock ? ["lock", "Locked"] : ["ok", "Active"];
  const one = (x) => {
    const b = D.BANKS[x.bank], f = Math.min(1, D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate)), [sc, st] = stamp(x);
    return `<div class="cert" style="${cc(b.color)}"><div class="bk"><span>${b.short}</span><span>${x.kind === "FD" ? "FD" : x.kind === "RD" ? "Recurring" : "NSC"} · ${D.rate(x.interestRate)}</span></div><div class="am">${inr(D.valueOf(x))}<small>worth today · ${inr(x.maturityAmount)} at the end</small></div><div class="ln" style="align-items:center"><span>${x.name}</span><span class="stamp ${sc}">${st}</span></div><div class="rib"><i style="width:${f * 100}%"></i></div><div class="ln"><span>${fmtY(x.startDate).replace(",", "")}</span><span>${fmtY(x.maturityDate).replace(",", "")}</span></div></div>`;
  };
  const legend = `<span class="legend"><span><i style="background:oklch(0.55 0.12 150)"></i>Active</span><span><i style="background:oklch(0.62 0.14 70)"></i>Matures soon</span><span><i style="background:oklch(0.5 0.1 260)"></i>Locked</span><span><i style="background:oklch(0.5 0.17 25)"></i>Matured</span></span>`;
  const drawer = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px">${order.map(one).join("")}<div class="addcert">${I.plus(22)}Add a deposit</div></div>`;
  return card(`${cardHead("The certificate drawer", "one certificate a deposit, earliest to mature first", legend)}${drawer}<div class="card-note">The coloured spine is the bank, the ribbon is how far through its term each deposit is, and the stamp is its state. Passbook holdings (EPF, PPF, NPS) are below, as books.</div>`, { cls: "heroc" });
}

// ======================== F4 Cover ========================
export function f4() {
  const maxV = nice(Math.max(...D.COVER.map((c) => c.total)) * 1.05);
  const tw = 100;
  const bar = (c) => {
    const x = (v) => `${(v / maxV) * tw}%`, b = c.bank;
    const lineX = x(D.SETTINGS.cover);
    const depW = x(c.dep), savW = x(c.savings), overW = x(c.over);
    return `<div style="display:grid;grid-template-columns:170px 1fr 110px;gap:14px;align-items:center;padding:20px 0;border-bottom:1px solid var(--divider)"><div class="cell-name">${bankTile(c.key, 34)}<div class="nm2"><b>${b.short}</b><small>${lakhS(c.dep)}${c.savings ? ` + ${lakhS(c.savings)} savings` : " in deposits"}</small></div></div>
<div class="hv" style="position:relative;height:30px"><div style="position:absolute;inset:0;border-radius:8px;background:var(--fill)"></div><div class="bar" style="position:absolute;left:0;top:0;height:30px;width:${depW};border-radius:8px 0 0 8px;background:${fillc(b.color)}"></div><div class="bar hatch" style="position:absolute;left:${depW};top:0;height:30px;width:${savW};background:${fillc(b.color)};opacity:0.55"></div><div style="position:absolute;left:${lineX};top:-6px;bottom:-6px;border-left:2px dashed var(--ink)"></div>${c.over ? `<div style="position:absolute;left:${lineX};top:0;height:30px;width:${overW};border-radius:0 8px 8px 0;background:repeating-linear-gradient(135deg,oklch(0.55 0.17 25 / 0.9) 0 4px,oklch(0.55 0.17 25 / 0.45) 4px 8px)"></div>` : ""}</div>
<div class="r"><b class="num ${c.over ? "dn" : "up"}">${c.over ? `${lakhS(c.over)} over` : `${lakhS(D.SETTINGS.cover - c.total)} room`}</b><small>${lakhS(c.total)} in all</small></div></div>`;
  };
  const left = `<div><div class="card-t" style="font-size:14px">Each bank against its cover<small>deposits plus the savings you hold there</small></div><div style="margin-top:4px">${D.COVER.map(bar).join("")}</div><div class="legend" style="margin-top:12px"><span><i style="background:oklch(0.5 0.12 258)"></i>Deposits</span><span><i style="background:oklch(0.5 0.12 258);opacity:0.55"></i>Savings (from Accounts)</span><span><i style="background:oklch(0.55 0.17 25)"></i>Above the cover</span><span style="color:var(--ink)">┆ ${lakh(D.SETTINGS.cover)} cover</span></div></div>`;
  const total = sum(D.LAYERS.map((l) => l.v));
  const strip = `<div style="display:flex;height:54px;border-radius:14px;overflow:hidden;gap:3px">${D.LAYERS.map((l) => `<div class="hv bar" style="flex:${l.v};background:${l.key === "over" ? "repeating-linear-gradient(135deg,oklch(0.55 0.17 25) 0 5px,oklch(0.45 0.15 25) 5px 10px)" : fillc(l.color)}"></div>`).join("")}</div>`;
  const rows = D.LAYERS.map((l) => `<div style="display:grid;grid-template-columns:14px 1fr auto auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--divider)"><i style="width:12px;height:12px;border-radius:4px;background:${l.key === "over" ? "oklch(0.55 0.17 25)" : col(l.color)}"></i><div class="nm2"><b>${l.label}</b><small>${l.sub}</small></div><b class="num">${lakh(l.v)}</b><span class="pill pill-off" style="min-width:48px;justify-content:center">${Math.round((l.v / total) * 100)}%</span></div>`).join("");
  const right = `<div class="vsep"><div class="card-t" style="font-size:14px">Who stands behind the money<small>all ${lakh(total)} of it</small></div><div style="margin:14px 0 4px">${strip}</div>${rows}<div class="card-note" style="margin-top:12px">Banks are insured up to ${lakhS(D.SETTINGS.cover)} for each depositor at each bank, principal and interest together, across savings and every deposit there. A company FD, EPF, PPF and the NSC are outside that rule. This is a measure against a number you set, not a reason to move money.</div></div>`;
  return card(`${cardHead("Cover and concentration", "how much sits with each bank, and what stands behind it", settingsChips())}<div class="two">${left}${right}</div>`, { cls: "heroc" });
}

// ======================== F5 Tax year ========================
export function f5() {
  const rows = D.FYROWS;
  const maxV = 60000;
  const x = (v) => `${Math.min(100, (v / maxV) * 100)}%`;
  const bar = (r) => {
    const b = r.bank, lim = r.limit;
    const tag = r.over ? `<span class="tagb warn">Tax is cut at source</span>` : b.sovereign ? `<span class="tagb gov">Govt</span>` : "";
    return `<div style="display:grid;grid-template-columns:175px 1fr 150px;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--divider)"><div class="cell-name">${bankTile(r.key, 34)}<div class="nm2"><b>${b.short}${tag}</b><small>${b.company ? `limit ${inr(D.SETTINGS.tdsCompany)} (company)` : b.sovereign ? "no tax taken at source" : `limit ${inr(D.SETTINGS.tdsBank)}`}</small></div></div>
<div class="hv" style="position:relative;height:28px"><div style="position:absolute;inset:0;border-radius:8px;background:var(--fill)"></div><div class="bar hatch" style="position:absolute;left:0;top:0;height:28px;width:${x(r.full)};border-radius:8px;background:${fillc(b.color)};opacity:0.5"></div><div class="bar" style="position:absolute;left:0;top:0;height:28px;width:${x(r.so)};border-radius:8px;background:${fillc(b.color)}"></div>${lim !== Infinity ? `<div style="position:absolute;left:${x(lim)};top:-6px;bottom:-6px;border-left:2px dashed var(--ink)"></div>` : ""}</div>
<div class="r"><b class="num">${inr(r.full)}</b><small>${inr(r.so)} so far${r.tds ? ` · tax cut ≈ ${inr(r.tds)}` : ""}</small></div></div>`;
  };
  const left = `<div><div class="card-t" style="font-size:14px">Interest by payer, FY 26-27<small>solid is earned, striped is still to come by March</small></div><div style="margin-top:4px">${rows.map(bar).join("")}</div><div class="legend" style="margin-top:12px"><span><i style="background:var(--card-sapphire)"></i>Earned so far</span><span><i style="background:var(--card-sapphire);opacity:0.5"></i>By 31 March</span><span style="color:var(--ink)">┆ the limit before tax is cut</span></div></div>`;
  // the months
  const months = Array.from({ length: 12 }, (_, i) => { const s = L.addMonthsUTC(D.FY_START, i), e = L.addDays(L.addMonthsUTC(D.FY_START, i + 1), -1); return { key: s.slice(0, 7), v: Math.round(sum(D.ALL.map((x) => D.interestIn(x, L.addDays(s, -1), e)))), future: e > D.TODAY }; });
  const maxM = nice(Math.max(...months.map((m) => m.v)) * 1.1);
  const W = 560, H = 250, l = 46, t = 22, b = 30, bw = (W - l - 8) / 12;
  const my = (v) => t + (H - t - b) * (1 - v / maxM);
  const mb = months.map((m, i) => `<g class="hv"><rect class="bar" x="${l + i * bw + 5}" y="${my(m.v)}" width="${bw - 10}" height="${my(0) - my(m.v)}" rx="5" fill="var(--accent)" ${m.future ? `fill-opacity="0.35"` : ""}/>${m.v >= maxM * 0.8 ? "" : ""}<text x="${l + i * bw + bw / 2}" y="${H - 10}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${mlabel(m.key)}</text>${svgTip(l + i * bw + bw / 2, my(m.v), 130, [`${mlabel(m.key)} ${m.key.slice(0, 4)}`, inr(m.v)], { anchor: i > 8 ? "end" : "middle" })}</g>`).join("");
  const gy = [0.5, 1].map((f) => `<line x1="${l}" x2="${W}" y1="${my(maxM * f)}" y2="${my(maxM * f)}" stroke="var(--divider)"/><text x="${l - 8}" y="${my(maxM * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="var(--muted)">${lakhS(maxM * f)}</text>`).join("");
  const stats = `<div class="statrow"><div class="kv"><span class="k">Earned so far</span><span class="v">${lakh(D.FY_SO)}</span><span class="s">since 1 April</span></div><div class="kv"><span class="k">By 31 March</span><span class="v">${lakh(D.FY_FULL)}</span><span class="s">at today's pace</span></div><div class="kv"><span class="k">Tax at your slab</span><span class="v">≈ ${lakh(D.FY_TAX)}</span><span class="s">${inr(D.FY_TDS)} of it cut at source</span></div></div>`;
  const right = `<div class="vsep" style="display:flex;flex-direction:column;gap:14px"><div class="card-t" style="font-size:14px">Interest month by month<small>every month's accrual and payouts</small></div><svg class="chart-svg" viewBox="0 0 ${W} ${H}">${gy}<line x1="${l}" x2="${W}" y1="${my(0)}" y2="${my(0)}" stroke="var(--fill-strong)"/>${mb}</svg>${stats}</div>`;
  const fy = `<span class="seg"><span class="seg-i">FY 25-26</span><span class="seg-i on">FY 26-27</span></span>`;
  return card(`${cardHead("The tax year", "what these deposits pay you, and who is told about it", `<span style="display:flex;gap:10px;align-items:center">${settingsChips()}${fy}</span>`)}<div class="two">${left}${right}</div><div class="card-note">Interest is taxed as income at your slab whether or not it is paid out. A bank cuts tax at source once its interest to you passes a limit in a year, across every branch. These are estimates from the same straight-line spread as the rest of the page, never a tax return.</div>`, { cls: "heroc" });
}

// ======================== F6 Real return ========================
export function f6() {
  const B = D.BLEND, S = D.SETTINGS;
  // waterfall
  const steps = [
    { k: "What the banks quote", v: B.stated, from: 0, color: "sapphire" },
    { k: "Compounding adds", v: B.eff - B.stated, from: B.stated, color: "teal", delta: true },
    { k: "Tax at your slab", v: -(B.eff - B.after), from: B.eff, color: "ruby", delta: true },
    { k: "Inflation", v: -S.inflation, from: B.after, color: "ruby", delta: true },
    { k: "What is really left", v: B.real, from: 0, color: B.real >= 0 ? "emerald" : "ruby" },
  ];
  const W = 600, H = 330, l = 14, t = 34, b = 62, bw = 84, gap = (W - l * 2 - bw * 5) / 4;
  const lo = Math.min(0, B.real) - 0.005, hi = 0.08;
  const y = (v) => t + (H - t - b) * (1 - (v - lo) / (hi - lo));
  const wf = steps.map((s, i) => {
    const x0 = l + i * (bw + gap), a = s.from, c = s.from + s.v, top = Math.max(a, c), bot = Math.min(a, c);
    const label = `${s.delta ? (s.v >= 0 ? "+" : "−") : ""}${Math.abs(s.v * 100).toFixed(2)}%`;
    const next = steps[i + 1] ? `<line x1="${x0 + bw}" x2="${x0 + bw + gap}" y1="${y(c)}" y2="${y(c)}" stroke="var(--fill-strong)" stroke-dasharray="3 3"/>` : "";
    return `<g class="hv"><rect class="bar" x="${x0}" y="${y(top)}" width="${bw}" height="${Math.max(3, y(bot) - y(top))}" rx="8" fill="${col(s.color)}"/><text x="${x0 + bw / 2}" y="${y(top) - 9}" text-anchor="middle" font-size="14" font-weight="800" fill="var(--fg)">${label}</text><text x="${x0 + bw / 2}" y="${H - 34}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${s.k.split(" ").slice(0, 2).join(" ")}</text><text x="${x0 + bw / 2}" y="${H - 20}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${s.k.split(" ").slice(2).join(" ")}</text>${next}</g>`;
  }).join("");
  const zero = `<line x1="${l}" x2="${W - l}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink)" stroke-width="1.5"/>`;
  const wfSvg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}">${zero}${wf}</svg>`;
  const left = `<div style="display:flex;flex-direction:column;gap:14px"><div class="card-t" style="font-size:14px">From the rate to what is left<small>all your deposits, weighted by their worth</small></div>${wfSvg}<div class="card-note">After a ${S.slab * 100}% slab and ${S.inflation * 100}% inflation (two numbers you set), your deposits grow your buying power by about <b>${(B.real * 100).toFixed(1)}%</b> a year.</div></div>`;
  // dumbbells
  const items = [
    ...D.ACTIVE.map((x) => ({ n: x.name, c: D.BANKS[x.bank].color, ...D.realOf(x), taxfree: false })),
    ...D.PASSBOOKS.filter((p) => p.rate).map((p) => ({ n: p.name, c: p.color, eff: p.rate / 100, after: p.rate / 100, real: p.rate / 100 - S.inflation, taxfree: true })),
  ].sort((a, b) => b.real - a.real);
  const DW = 600, rowH = 34, DH = items.length * rowH + 44, dl = 170, dr = 24, lo2 = -0.01, hi2 = 0.095;
  const dx = (v) => dl + (DW - dl - dr) * ((v - lo2) / (hi2 - lo2));
  const rows = items.map((it, i) => {
    const yy = 28 + i * rowH + rowH / 2;
    return `<g class="hv"><text x="0" y="${yy + 4}" font-size="12" font-weight="800" fill="var(--fg)">${it.n}</text>${it.taxfree ? `<text x="0" y="${yy + 17}" font-size="9.5" font-weight="800" fill="var(--muted)">TAX-FREE (ASSUMED)</text>` : ""}<line x1="${dx(Math.min(it.real, it.eff))}" x2="${dx(Math.max(it.real, it.eff))}" y1="${yy}" y2="${yy}" stroke="var(--fill-strong)" stroke-width="5" stroke-linecap="round"/><circle cx="${dx(it.eff)}" cy="${yy}" r="6.5" fill="var(--card-sapphire)"/><circle cx="${dx(it.after)}" cy="${yy}" r="6.5" fill="oklch(0.72 0.14 75)" ${it.taxfree ? 'opacity="0"' : ""}/><circle cx="${dx(it.real)}" cy="${yy}" r="7.5" fill="${it.real >= 0.01 ? "var(--accent)" : it.real >= 0 ? "oklch(0.72 0.14 75)" : "var(--loss)"}" stroke="var(--surface)" stroke-width="2"/>${svgTip(dx(it.eff), yy - 4, 210, [it.n, `Yield ${(it.eff * 100).toFixed(2)}%`, `After tax ${(it.after * 100).toFixed(2)}%`, `Really left ${(it.real * 100).toFixed(2)}%`], { anchor: "middle" })}</g>`;
  }).join("");
  const ticks = [0, 0.02, 0.04, 0.06, 0.08].map((v) => `<line x1="${dx(v)}" x2="${dx(v)}" y1="18" y2="${DH - 26}" stroke="${v === 0 ? "var(--ink)" : "var(--divider)"}" stroke-width="${v === 0 ? 1.5 : 1}"/><text x="${dx(v)}" y="${DH - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${(v * 100).toFixed(0)}%</text>`).join("");
  const legend = `<div class="legend"><span><i style="background:var(--card-sapphire);border-radius:50%"></i>Yearly yield</span><span><i style="background:oklch(0.72 0.14 75);border-radius:50%"></i>After tax</span><span><i style="background:var(--accent);border-radius:50%"></i>After inflation</span></div>`;
  const right = `<div class="vsep" style="display:flex;flex-direction:column;gap:12px"><div class="card-t" style="font-size:14px">Each one, from yield to what is left<small>best first</small></div><svg class="chart-svg" viewBox="0 0 ${DW} ${DH}">${ticks}${rows}</svg>${legend}</div>`;
  return card(`${cardHead("Real return", "what your deposits really earn once tax and inflation have had their share", settingsChips())}<div class="two">${left}${right}</div>`, { cls: "heroc" });
}

export const BOARDS_FN = { f1, f2, f3, f4, f5, f6 };
export const render = (k) => () => body(BOARDS_FN[k]());
