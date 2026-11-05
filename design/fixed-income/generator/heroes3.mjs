// Round 3: his real numbers. H1 Two pillars, H2 Ladder pick, H3 Interest stage, H4 Drawer, H5 Real return.
// EPF (₹9.5L) is bigger than the deposits (₹1.2L), so it leads. Coloured stages take the colour of what you pick (radios + :has()).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts3.mjs";
import { P_KEYS, L_KEYS, T_KEYS } from "./css-fi3.mjs";
const { I, inr, fmt, fmtY, plural } = L;
const { sum } = D;
const { card, cardHead, col, grad, fillc, lakh, lakhS, daysLeft, dmy, fdTile } = P;

const body = (hero) => P.page(`${P.greeting()}${P.attention()}${hero}${P.widgets()}${P.note()}`);
const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const radios = (p, keys, def = keys[0]) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");
const nice = (max) => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
export const big = (n) => (Math.abs(n) >= 100000 ? `<small>₹</small>${(n / 100000).toFixed(2)}<small>L</small>` : `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`);
export const tile = (k, v, s = "") => `<div class="s-tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
export const chip = (t, b) => `<span class="s-chip">${t} <b>${b}</b></span>`;
const rupees2 = (n) => `₹${n.toFixed(2)}`;
const kfmt = (n) => `₹${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}k`;
const WHITE = (o) => `fill="#fff" fill-opacity="${o}"`;

// ---------- Left halves ----------
export function fdInfo(x) {
  const toCome = x.maturityAmount - D.fdWorth(x);
  return `<div><div class="s-eb">${fdTile(x, 30)}<span>Fixed deposit · bank not set</span></div><h2 class="s-name">${x.name}</h2><div class="s-big">${big(D.fdWorth(x))}</div><div class="s-sub">worth today, from ${inr(x.principalAmount)} placed</div><div class="s-chips">${chip("Rate", "7.75%")}${chip("Term", x.tenure)}${chip("Matures", dmy(x.maturityDate))}</div><div class="s-tiles">${tile("Interest so far", rupees2(x.shown), "as your FD app shows it")}${tile("Still to come", inr(toCome), "an estimate to " + dmy(x.maturityDate).split(" ").slice(1).join(" "))}${tile("Earning a day", rupees2(D.fdPerDay(x)), `${inr(D.fdPerDay(x) * 30.44)} a month`)}${tile("Yearly yield", D.pct(D.effectiveYield(x.interestRate)), "7.75% compounded quarterly")}</div><div class="s-acts"><span class="s-act solid">${I.pencil(13)} Edit</span><span class="s-act">Close early</span><span class="s-act">Renew</span></div></div>`;
}
export function epfInfo() {
  const e = D.EPF;
  return `<div><div class="s-eb">${P.epfTile(30)}<span>Employees' Provident Fund · NetApp India</span></div><h2 class="s-name">EPF passbook</h2><div class="s-big">${big(e.total)}</div><div class="s-sub">as your passbook says: interest to 31 Mar 2026, contributions to ${dmy(e.lastCredit)}</div><div class="s-chips">${chip("Confirmed to", dmy(D.CONFIRMED_THROUGH).slice(0, -5))}${chip("Rate", D.RATE_TAG)}${chip("Employee", lakh(e.each))}${chip("Employer", lakh(e.each))}${chip("Pension", "₹0")}</div><div class="s-tiles">${tile("Put in this year", inr(e.contributedThisYear), `${e.creditsThisYear} credits · ${inr(e.lastMonthly)} a month now`)}${tile("Interest not credited", `≈ ${inr(e.pending)}`, `April to October at ${D.RATE_NOW}, ${D.RATE_SRC}`)}${tile("Credited last year", inr(2 * D.EPF_INTEREST[2].each), "on 31 Mar 2026")}${tile("Earning a day", rupees2(e.perDay), "on the passbook balance")}</div><div class="s-acts"><span class="s-act solid">${I.plus(13)} Add a statement</span><span class="s-act">Add a contribution</span></div></div>`;
}

// ---------- Charts (white on the colour) ----------
const axisY = (W, l, r, y, maxV, fmtV = lakhS) => [0.5, 1].map((f) => `<line x1="${l}" x2="${W - r}" y1="${y(maxV * f)}" y2="${y(maxV * f)}" stroke="#fff" stroke-opacity="0.16"/><text x="${l - 8}" y="${y(maxV * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.75">${fmtV(maxV * f)}</text>`).join("");
const wrap = (title, sub, svg, note) => `<div class="s-chart"><div class="s-ct">${title}<small>${sub}</small></div>${svg}<div class="s-note">${note}</div></div>`;
const SVG = (W, H, inner) => `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${inner}</svg>`;

/** Every contribution as it was credited, month by month, with the interest credited each March on top. */
export function epfChart(W = 700, H = 300) {
  const months = D.monthEnds("2024-02", "2026-11").map((d) => d.slice(0, 7));
  const l = 52, r = 10, t = 22, b = 34, bw = (W - l - r) / months.length;
  const data = months.map((m) => ({ m, put: 2 * sum(D.EPF_CREDITS.filter((c) => c.date.slice(0, 7) === m).map((c) => c.each)), int: 2 * sum(D.EPF_INTEREST.filter((i) => i.date.slice(0, 7) === m).map((i) => i.each)), future: m === "2026-11" }));
  data[data.length - 1].put = D.EPF.lastMonthly;
  const maxV = Math.ceil(Math.max(...data.map((d) => d.put + d.int)) / 10000) * 10000, y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = data.map((d, i) => { const x0 = l + i * bw + 2, w = bw - 4; return `<g><rect x="${x0}" y="${y(d.put)}" width="${w}" height="${y(0) - y(d.put)}" rx="3" ${WHITE(d.future ? 0.3 : 0.92)}/>${d.int ? `<rect x="${x0}" y="${y(d.put + d.int)}" width="${w}" height="${y(d.put) - y(d.put + d.int)}" rx="3" fill="oklch(0.86 0.16 85)"/><text x="${x0 + w / 2}" y="${y(d.put + d.int) - 6}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${lakhS(d.int)}</text>` : ""}</g>`; }).join("");
  const xl = months.map((m, i) => (m.endsWith("-01") || i === 0 ? `<text x="${l + i * bw}" y="${H - 12}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}</text>` : m.endsWith("-07") ? `<text x="${l + i * bw}" y="${H - 12}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">Jul</text>` : "")).join("");
  const jump = months.indexOf("2026-08");
  return wrap("What went in each month, and each March's interest", "white is contributions, amber is interest credited", SVG(W, H, `${axisY(W, l, r, y, maxV)}<line x1="${l}" x2="${W - r}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${xl}<text x="${l + jump * bw + bw / 2}" y="${y(data[jump].put) - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">wage rise</text>`), "From Jul 2026 each credit is ₹39,308 instead of ₹28,646. The last bar is the next one, expected about the 17th.");
}
/** The seven deposits as bars from start to maturity, filled up to today. */
export function fdGantt(W = 700, H = 350) {
  const from = "2026-03-01", to = "2028-12-31", l = W < 500 ? 112 : 150, r = 12, t = 34, rowH = 38, span = D.daysBetween(from, to);
  const x = (iso) => l + (W - l - r) * (D.daysBetween(from, iso) / span);
  const rows = D.FDS.map((s, i) => { const y0 = t + i * rowH; return `<g><text x="0" y="${y0 + 16}" font-size="12" font-weight="800" fill="#fff">${s.name.replace(" FD · ", " · ")}</text><text x="0" y="${y0 + 30}" font-size="10.5" font-weight="600" fill="#fff" fill-opacity="0.7">${s.tenure}</text><rect x="${x(s.startDate)}" y="${y0 + 4}" width="${x(s.maturityDate) - x(s.startDate)}" height="22" rx="11" ${WHITE(0.22)}/><rect x="${x(s.startDate)}" y="${y0 + 4}" width="${Math.max(6, x(D.TODAY) - x(s.startDate))}" height="22" rx="11" ${WHITE(0.95)}/><text x="${x(s.maturityDate) - 8}" y="${y0 + 19}" text-anchor="end" font-size="11" font-weight="800" fill="#fff">${lakhS(s.maturityAmount)}</text></g>`; }).join("");
  const ticks = (W < 500 ? ["2026-10", "2027-10", "2028-10"] : ["2026-04", "2026-10", "2027-04", "2027-10", "2028-04", "2028-10"]).map((m) => `<line x1="${x(`${m}-01`)}" x2="${x(`${m}-01`)}" y1="${t - 8}" y2="${H - 22}" stroke="#fff" stroke-opacity="0.14"/><text x="${x(`${m}-01`)}" y="${H - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}</text>`).join("");
  return wrap("The seven deposits across time", "solid is time already gone", SVG(W, H, `${ticks}${rows}<line x1="${x(D.TODAY)}" x2="${x(D.TODAY)}" y1="${t - 14}" y2="${H - 22}" stroke="#fff" stroke-dasharray="3 4"/><text x="${x(D.TODAY)}" y="${t - 18}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">Today</text>`), "Each is ₹15,000 except the 26 Aug one (₹30,000). The figure at the end is the estimated maturity amount.");
}
/** The deposits' step-down: each leaves as it matures. */
export function fdRunoff() {
  const months = D.monthEnds("2026-11", "2028-12"), W = 700, H = 300, l = 52, r = 10, t = 22, b = 34, bw = (W - l - r) / months.length;
  const cols = months.map((d) => FDS_AT(d));
  const maxV = Math.ceil(Math.max(...cols.map((c) => sum(c.map((s) => s.v)))) / 50000) * 50000, y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = cols.map((c, i) => { let acc = 0; return c.map((s) => { const y1 = y(acc + s.v), y0 = y(acc); acc += s.v; return `<rect x="${l + i * bw + 2}" y="${y1}" width="${bw - 4}" height="${Math.max(0, y0 - y1 - 1)}" fill="color-mix(in oklch, ${col(s.x.color)} 35%, white)"/>`; }).join(""); }).join("");
  const xl = months.map((d, i) => (i % 3 === 0 ? `<text x="${l + i * bw + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+d.slice(5, 7) - 1]}${d.slice(5, 7) === "01" || i === 0 ? ` ${d.slice(2, 4)}` : ""}</text>` : "")).join("");
  return wrap("What the deposits are worth, month by month", "if none is renewed", SVG(W, H, `${axisY(W, l, r, y, maxV)}<line x1="${l}" x2="${W - r}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${xl}`), "Each step down is a deposit maturing. Colours match the deposits below. Pick a rung to follow one.");
}
const FDS_AT = (date) => D.FDS.filter((x) => x.maturityDate > date).map((x) => ({ x, v: D.fdWorth(x, date) }));
/** One deposit's steps: what was placed, and the interest that has built up, a quarter at a time. */
export function fdStairs(x) {
  const cols = []; const r = x.interestRate / 100;
  for (let i = 1, d = L.addMonthsUTC(x.startDate, 3); ; i++, d = L.addMonthsUTC(x.startDate, 3 * i)) { const last = d >= x.maturityDate, date = last ? x.maturityDate : d; cols.push({ date, v: (last ? x.maturityAmount : x.principalAmount * (1 + r / 4) ** i) - x.principalAmount, past: date <= D.TODAY }); if (last) break; }
  const W = 700, H = 300, l = 52, rr = 10, t = 22, b = 34, total = x.maturityAmount - x.principalAmount, maxV = nice(total * 1.12), bw = (W - l - rr) / cols.length, y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = cols.map((c, i) => { const x0 = l + i * bw + 5, w = bw - 10; return `<rect x="${x0}" y="${y(c.v)}" width="${w}" height="${y(0) - y(c.v)}" rx="3" ${WHITE(c.past ? 0.95 : 0.35)}/>`; }).join("");
  const todayX = l + Math.min(1, D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate)) * (W - l - rr);
  const showToday = D.TODAY < x.maturityDate;
  return wrap("The interest, a quarter at a time", `on ${inr(x.principalAmount)} placed · bright is built up, faded is to come`, SVG(W, H, `${axisY(W, l, rr, y, maxV, (v) => inr(v))}<line x1="${l}" x2="${W - rr}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${showToday ? `<line x1="${todayX}" x2="${todayX}" y1="${t - 8}" y2="${y(0)}" stroke="#fff" stroke-dasharray="3 4"/><text x="${todayX}" y="${t - 12}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">Today</text>` : ""}<text x="${l}" y="${H - 12}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+x.startDate.slice(5, 7) - 1]} ${x.startDate.slice(0, 4)}</text><text x="${W - rr}" y="${H - 12}" text-anchor="end" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+x.maturityDate.slice(5, 7) - 1]} ${x.maturityDate.slice(0, 4)}</text><text x="${W - rr}" y="${y(total) - 8}" text-anchor="end" font-size="13" font-weight="800" fill="#fff">${inr(total)} by the end, ${inr(x.maturityAmount)} in all</text>`), "The steps are illustrative: the app keeps what was placed and the maturity amount, and spreads the rest.");
}
/** What EPF and the deposits were worth, month by month since the first contribution. */
export function worthChart(W = 700, H = 300) {
  const l = 52, r = 10, t = 22, b = 34, d = D.WORTH_OVER_TIME, bw = (W - l - r) / d.length;
  const maxV = 1200000, y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = d.map((p, i) => { const x0 = l + i * bw + 2, w = bw - 4; return `<g><rect x="${x0}" y="${y(p.epf)}" width="${w}" height="${y(0) - y(p.epf)}" rx="2" ${WHITE(0.75)}/>${p.fd ? `<rect x="${x0}" y="${y(p.epf + p.fd)}" width="${w}" height="${y(p.epf) - y(p.epf + p.fd) - 1}" rx="2" fill="oklch(0.88 0.16 85)"/>` : ""}</g>`; }).join("");
  const xl = d.map((p, i) => (p.date.slice(5, 7) === "01" ? `<text x="${l + i * bw}" y="${H - 12}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${p.date.slice(0, 4)}</text>` : p.date.slice(5, 7) === "07" ? `<text x="${l + i * bw}" y="${H - 12}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">Jul</text>` : "")).join("");
  return wrap("What you've built up, since your first contribution", "white is EPF, amber is the deposits", SVG(W, H, `${axisY(W, l, r, y, maxV)}<line x1="${l}" x2="${W - r}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${xl}`), "EPF steps up each March when the year's interest is credited. The deposits began in March 2026.");
}

// ======================== H1 Two pillars ========================
export function h1() {
  const door = (k, name, v, sub, c, share) => `<label class="pkl door" for="p-${k}" style="background:${grad(c)};--dc:var(--card-${c})"><div class="dnm">${name}</div><div><div class="dv">${lakh(v)}</div><div class="ds">${sub}</div></div><div class="pbar"><i style="width:${share * 100}%"></i></div></label>`;
  const doors = `<div class="doors3">${door("all", "Everything", D.TOTAL, "EPF and 7 deposits", "indigo", 1)}${door("epf", "EPF", D.EPF.total, `${D.pct(D.SHARE_EPF, 0)} of it · 8.25% a year`, "emerald", D.SHARE_EPF)}${door("fd", "Fixed deposits", D.FD_VALUE, `${plural(D.FDS.length, "deposit")} · 7.75%`, "teal", 1 - D.SHARE_EPF)}</div>`;
  const all = `<div class="vw-p vw-p-all s-grid"><div><div class="s-eb"><span>EPF and deposits together</span></div><h2 class="s-name">Your fixed income</h2><div class="s-big">${big(D.TOTAL)}</div><div class="s-sub">${D.pct(D.SHARE_EPF, 0)} of it is EPF · ≈ ${lakh(D.EPF.pending)} more interest is on its way</div><div class="s-chips">${chip("Earning", `${inr(D.PER_DAY)} a day`)}${chip("Next in", "about 17 Nov")}</div><div class="s-tiles">${tile("Earned so far", inr(D.EARNED_SO_FAR), "EPF interest credited and the deposits' interest")}${tile("Put in", lakh(D.EPF.total - D.epfBalance().interest + D.FD_PUT), "your and NetApp's contributions, and the deposits")}${tile("Earning a month", inr(D.PER_DAY * 30.44), "at today's pace")}${tile("First deposit matures", dmy(D.NEXT_FD.maturityDate).split(" ").slice(0, 3).join(" "), daysLeft(D.NEXT_FD.maturityDate))}</div></div>${P_worth()}</div>`;
  const epf = `<div class="vw-p vw-p-epf s-grid">${epfInfo()}${epfChart()}</div>`;
  const fd = `<div class="vw-p vw-p-fd s-grid"><div><div class="s-eb"><span>Fixed deposits · bank not set</span></div><h2 class="s-name">Seven deposits</h2><div class="s-big">${big(D.FD_VALUE)}</div><div class="s-sub">worth today, from ${lakh(D.FD_PUT)} placed</div><div class="s-chips">${chip("Rate", "7.75% on all seven")}${chip("Next", dmy(D.NEXT_FD.maturityDate).split(" ").slice(0, 3).join(" "))}</div><div class="s-tiles">${tile("Interest so far", inr(D.FD_ACCRUED), "as your app shows it")}${tile("Still to come", inr(sum(D.FDS.map((x) => x.maturityAmount)) - D.FD_VALUE), "an estimate, to maturity")}${tile("Earning a day", rupees2(D.FD_PER_DAY), `${inr(D.FD_PER_DAY * 30.44)} a month`)}${tile("Added lately", "about one a month", "since March")}</div><div class="s-acts"><span class="s-act solid">${I.plus(13)} Add a deposit</span></div></div>${fdGantt()}</div>`;
  return `<div style="display:flex;flex-direction:column;gap:18px">${radios("p", P_KEYS, "all")}${doors}<section class="stg2">${all}${epf}${fd}</section></div>`;
}
const P_worth = () => worthChart();

// ======================== H2 Ladder pick ========================
export function h2() {
  const months = D.monthEnds("2026-11", "2028-12").map((d) => d.slice(0, 7)), n = months.length;
  const at = months.map((m) => D.FDS.find((x) => x.maturityDate.slice(0, 7) === m));
  const maxV = Math.max(...D.FDS.map((x) => x.maturityAmount));
  const lab = (m, i) => mon[+m.slice(5, 7) - 1][0] + (m.endsWith("-01") || i === 0 ? `<br>${m.slice(2, 4)}` : "");
  const rungs = months.map((m, i) => at[i] ? `<label class="pkl rung" for="l-${at[i].id}"><span class="rb"><b>${kfmt(at[i].maturityAmount)}</b><i style="height:${Math.max(18, (at[i].maturityAmount / maxV) * 78)}px"></i></span><span class="rl">${lab(m, i)}</span></label>` : `<span class="rung-e"><span class="rb"><i></i></span><span class="rl">${lab(m, i)}</span></span>`).join("");
  const btns = `<label class="pkl allb" for="l-all"><span>Deposits</span><small>${plural(D.FDS.length, "deposit")}</small></label><label class="pkl allb" for="l-epf"><span>EPF</span><small>${lakh(D.EPF.total)}</small></label>`;
  const all = `<div class="vw-l vw-l-all s-grid"><div><div class="s-eb"><span>Fixed deposits · bank not set</span></div><h2 class="s-name">All seven</h2><div class="s-big">${big(D.FD_VALUE)}</div><div class="s-sub">worth today, from ${lakh(D.FD_PUT)} placed · EPF is the larger holding, pick it on the left</div><div class="s-chips">${chip("Rate", "7.75%")}${chip("Next", dmy(D.NEXT_FD.maturityDate).split(" ").slice(0, 3).join(" "))}</div><div class="s-tiles">${tile("Interest so far", inr(D.FD_ACCRUED), "as your app shows it")}${tile("Back by Dec 2028", lakh(sum(D.FDS.map((x) => x.maturityAmount))), "interest included")}${tile("Earning a day", rupees2(D.FD_PER_DAY), "")}${tile("A rung every", "about a month", "your pattern since March")}</div></div>${fdRunoff()}</div>`;
  const epf = `<div class="vw-l vw-l-epf s-grid">${epfInfo()}${epfChart()}</div>`;
  const per = D.FDS.map((x) => `<div class="vw-l vw-l-${x.id} s-grid">${fdInfo(x)}${fdStairs(x)}</div>`).join("");
  return `<section class="stg2">${radios("l", L_KEYS, "all")}${all}${epf}${per}<div><div class="s-ct" style="margin-bottom:2px">The ladder<small>pick a rung to follow that deposit, or EPF; the stage takes its colour</small></div><div class="ladder">${btns}${rungs}</div></div></section>`;
}

// ======================== H3 Interest stage ========================
export function h3() {
  const sinceApr = (x) => (x.startDate >= D.FY_START ? x.shown : x.shown - (D.grow(x.principalAmount, x.interestRate, D.daysBetween(x.startDate, D.FY_START)) - x.principalAmount));
  const rows = (list) => { const mx = Math.max(...list.map((r) => r.v)); return `<div>${list.map((r) => `<div class="hb2" style="grid-template-columns:200px 1fr 100px"><span>${r.n}</span><span class="tr"><i style="width:${Math.max(1.5, (r.v / mx) * 100)}%;${r.faded ? "opacity:0.5" : ""}"></i></span><b>${r.dec ? rupees2(r.v) : inr(r.v)}</b></div>`).join("")}</div>`; };
  const fdRows = (fn, dec) => D.FDS.map((x) => ({ n: x.name, v: fn(x), dec }));
  const panel = (k, eb, cap, total, list, tiles) => `<div class="vw-t vw-t-${k} s-grid" style="grid-template-columns:5fr 7fr"><div><div class="s-eb"><span>${eb}</span></div><div class="s-big" style="font-size:84px">${big(total)}</div><div class="s-sub">${cap}</div><div class="s-tiles">${tiles}</div></div><div class="s-chart"><div class="s-ct">Where it comes from<small>EPF against each deposit</small></div>${rows(list)}</div></div>`;
  const epfDay = D.EPF.perDay, fdDay = D.FD_PER_DAY;
  const stage = [
    panel("day", "Earned every day, right now", "EPF and the seven deposits, at today's pace", D.PER_DAY, [{ n: "EPF (8.25%)", v: epfDay, dec: true }, ...fdRows(D.fdPerDay, true)], tile("EPF", rupees2(epfDay), `${D.pct(epfDay / D.PER_DAY, 0)} of it`) + tile("The seven deposits", rupees2(fdDay), "together") + tile("A month", inr(D.PER_DAY * 30.44), "at this pace") + tile("A year", inr(D.PER_DAY * 365), "if nothing changes")),
    panel("month", "A month of interest", "30 days at today's pace", D.PER_DAY * 30.44, [{ n: "EPF (8.25%)", v: epfDay * 30.44 }, ...fdRows((x) => D.fdPerDay(x) * 30.44)], tile("EPF", inr(epfDay * 30.44), "credited once a year, in March") + tile("Deposits", inr(fdDay * 30.44), "added to each deposit") + tile("A day", inr(D.PER_DAY), "") + tile("Since April", inr(D.EPF.pending + sum(D.FDS.map(sinceApr))), "EPF's is not credited yet")),
    panel("fy", "Interest since 1 April", "this financial year, so far", D.EPF.pending + sum(D.FDS.map(sinceApr)), [{ n: "EPF (not credited yet)", v: D.EPF.pending, faded: true }, ...fdRows(sinceApr)], tile("EPF, built up", inr(D.EPF.pending), "an estimate at 8.25%") + tile("Deposits", inr(sum(D.FDS.map(sinceApr))), "as your app shows") + tile("EPF by 31 March", `≈ ${lakh(D.EPF.yearEnd)}`, "with the same contribution each month") + tile("Credited last March", inr(2 * D.EPF_INTEREST[2].each), "FY 25-26")),
    panel("ever", "Interest earned so far, in all", "credited and built up, on EPF and the deposits", D.EARNED_SO_FAR + D.EPF.pending, [{ n: "EPF, credited (3 years)", v: D.EPF.creditedTotal }, { n: "EPF, this year (not credited)", v: D.EPF.pending, faded: true }, ...fdRows((x) => x.shown)], tile("EPF credited", inr(D.EPF.creditedTotal), "FY 23-24 to FY 25-26") + tile("EPF built up", inr(D.EPF.pending), "not credited yet") + tile("Deposits", inr(D.FD_ACCRUED), "since March") + tile("Put in", lakh(D.EPF.total - D.epfBalance().interest + D.FD_PUT), "by you, NetApp and the deposits")),
  ].join("\n");
  const chips = [["day", "A day"], ["month", "A month"], ["fy", "This year"], ["ever", "All time"]].map(([k, t]) => `<label class="pkl chip-b" for="t-${k}">${t}</label>`).join("");
  return `<section class="stg2">${radios("t", T_KEYS, "day")}<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">The interest stage<small>what EPF and the deposits earn, over the period you pick</small></div><div style="display:flex;gap:8px">${chips}</div></div>${stage}</section>`;
}

// ======================== H4 Drawer ========================
export function h4() {
  const cert = (x) => { const f = Math.min(1, D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate)); return `<div class="cert" style="--c1:var(--card-${x.color});--c2:var(--card-${x.color}-to)"><div class="bk"><span>FD</span><span>${x.tenure.replace(" months", " mo").replace(" day", " d")} · 7.75%</span></div><div class="am">${inr(D.fdWorth(x))}<small>worth today · ${inr(x.maturityAmount)} at the end</small></div><div class="ln" style="align-items:center"><span>${inr(x.principalAmount)} placed</span><span class="stamp ok">Active</span></div><div class="rib"><i style="width:${f * 100}%"></i></div><div class="ln"><span>${dmy(x.startDate)}</span><span>${dmy(x.maturityDate)}</span></div></div>`; };
  const book = `<div class="book"><div class="bk"><span>Employees' Provident Fund</span><span>NetApp India</span></div><div class="am">${inr(D.EPF.total)}</div><div class="ln"><span>Employee ${inr(D.EPF.each)}</span><span>Employer ${inr(D.EPF.each)}</span></div><div class="ln"><span>Interest credited each March · 8.25%</span><span>≈ ${inr(D.EPF.pending)} built up</span></div><div class="ln"><span>${inr(D.EPF.lastMonthly)} a month now</span><span>${D.EPF.creditsThisYear} credits this year</span></div></div>`;
  const drawer = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px">${book}${D.FDS.map(cert).join("")}<div class="addcert">${I.plus(22)}Add a deposit</div></div>`;
  return card(`${cardHead("The drawer", "your EPF passbook and a certificate for each deposit, in the order they mature", "")}${drawer}<div class="card-note">The EPF passbook is the big one: ${D.pct(D.SHARE_EPF, 0)} of everything. The ribbon on each certificate is how far through its term the deposit is.</div>`, { cls: "heroc" });
}

// ======================== H5 Real return ========================
export function h5() {
  const S = D.SETTINGS, fdStated = 0.0775, fdEff = D.effectiveYield(7.75), fdAfter = fdEff * (1 - S.slab), epfStated = D.rateFor(D.FY_START);
  const waterfall = (steps) => {
    const W = 560, H = 300, l = 10, t = 34, b = 58, bw = 80, gap = (W - l * 2 - bw * steps.length) / (steps.length - 1), lo = -0.005, hi = 0.09, y = (v) => t + (H - t - b) * (1 - (v - lo) / (hi - lo));
    const g = steps.map((s, i) => { const x0 = l + i * (bw + gap), a = s.from, c = s.from + s.v, top = Math.max(a, c), bot = Math.min(a, c); return `<g class="hv"><rect class="bar" x="${x0}" y="${y(top)}" width="${bw}" height="${Math.max(3, y(bot) - y(top))}" rx="8" fill="${col(s.c)}"/><text x="${x0 + bw / 2}" y="${y(top) - 9}" text-anchor="middle" font-size="14" font-weight="800" fill="var(--fg)">${s.delta ? (s.v >= 0 ? "+" : "−") : ""}${Math.abs(s.v * 100).toFixed(2)}%</text><text x="${x0 + bw / 2}" y="${H - 34}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${s.k.split("|")[0]}</text><text x="${x0 + bw / 2}" y="${H - 20}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${s.k.split("|")[1] ?? ""}</text></g>`; }).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}"><line x1="${l}" x2="${W - l}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink)" stroke-width="1.5"/>${g}</svg>`;
  };
  const fdSteps = [{ k: "Quoted|7.75%", v: fdStated, from: 0, c: "sapphire" }, { k: "Compounding|quarterly", v: fdEff - fdStated, from: fdStated, c: "teal", delta: true }, { k: "Tax at|your slab", v: -(fdEff - fdAfter), from: fdEff, c: "ruby", delta: true }, { k: "Inflation|", v: -S.inflation, from: fdAfter, c: "ruby", delta: true }, { k: "Really|left", v: fdAfter - S.inflation, from: 0, c: fdAfter - S.inflation >= 0.01 ? "emerald" : "gold" }];
  const epfSteps = [{ k: "Declared|8.25%", v: epfStated, from: 0, c: "sapphire" }, { k: "Compounding|yearly, none", v: 0, from: epfStated, c: "teal", delta: true }, { k: "Tax|none assumed", v: 0, from: epfStated, c: "ruby", delta: true }, { k: "Inflation|", v: -S.inflation, from: epfStated, c: "ruby", delta: true }, { k: "Really|left", v: epfStated - S.inflation, from: 0, c: "emerald" }];
  const fdEnd = 100000 * (1 + fdEff), epfEnd = 100000 * (1 + epfStated);
  const side = (title, sub, svg, cells) => `<div style="display:flex;flex-direction:column;gap:12px"><div class="card-t" style="font-size:14px">${title}<small>${sub}</small></div>${svg}<div class="statrow">${cells}</div></div>`;
  const cell = (k, v, s) => `<div class="kv"><span class="k">${k}</span><span class="v" style="font-size:20px">${v}</span><span class="s">${s}</span></div>`;
  const left = side("Your deposits", "7.75% a year, interest taxed at your slab", waterfall(fdSteps), cell("₹1,00,000 grows to", inr(fdEnd), "in a year, before tax") + cell("After tax", inr(100000 * (1 + fdAfter)), `${(S.slab * 100)}% slab`) + cell("In today's buying power", inr((100000 * (1 + fdAfter)) / (1 + S.inflation)), `${((fdAfter - S.inflation) * 100).toFixed(1)}% more than a year ago`));
  const right = `<div class="vsep">${side("Your EPF", "8.25% a year, assumed tax-free", waterfall(epfSteps), cell("₹1,00,000 grows to", inr(epfEnd), "in a year, credited each March") + cell("After tax", inr(epfEnd), "none assumed") + cell("In today's buying power", inr(epfEnd / (1 + S.inflation)), `${((epfStated - S.inflation) * 100).toFixed(1)}% more than a year ago`))}</div>`;
  return card(`${cardHead("Real return", "what each one really earns once tax and inflation have had their share", `<span style="display:inline-flex;gap:8px"><span class="chip-set">Tax slab <b>${S.slab * 100}%</b></span><span class="chip-set">Inflation <b>${S.inflation * 100}%</b></span><span class="chip-set">EPF rate <b>${(epfStated * 100)}%</b></span></span>`)}<div class="two">${left}${right}</div><div class="card-note">Two numbers you set (slab, inflation) and one the EPFO declares (8.25% for FY 25-26, used here for this year too). EPF interest is assumed tax-free, which holds while your own contributions stay under the yearly limit; check that before relying on it. A comparison, never advice.</div>`, { cls: "heroc" });
}

export const BOARDS3 = { h1, h2, h3, h4, h5 };
export const render3 = (k) => () => body(BOARDS3[k]());
