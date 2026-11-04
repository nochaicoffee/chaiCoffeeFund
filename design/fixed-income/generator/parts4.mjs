// Round 4 widgets (his real numbers): Money in each month, Credits on time, Growth path.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts3.mjs";
const { I, inr } = L;
const { sum } = D;
const { card, cardHead, link, grid, fillc, hc, tip, lakh, lakhS } = P;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const crore = (n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : lakh(n));
const kk = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${Math.round(n / 1000)}k`);

// ---------- Money in each month ----------
export function moneyIn() {
  const years = [2024, 2025, 2026];
  const cell = (y, m) => {
    const k = `${y}-${String(m).padStart(2, "0")}`, v = D.MONEY_IN[k], future = k > D.TODAY.slice(0, 7), now = k === D.TODAY.slice(0, 7);
    const expectedEpf = now ? D.EPF.lastMonthly : 0; // Nov: the credit is still to come
    const epf = v?.epf ?? 0, fd = v?.fd ?? 0, tot = epf + fd;
    if (!tot && !now) return `<span class="mcell${k > D.TODAY.slice(0, 7) ? " future" : ""}">${k < "2024-02" ? "" : "–"}</span>`;
    const lvl = tot < 20000 ? 1 : tot < 30000 ? 2 : tot < 40000 ? 3 : tot < 55000 ? 4 : 5;
    const card2 = hc({ h: `${MON[m - 1]} ${y}`, t: inr(tot + expectedEpf), d: now ? "so far this month" : "put away", rows: [["EPF credit", epf ? inr(epf) : expectedEpf ? `${inr(expectedEpf)} due about 17th` : "—", "var(--card-emerald)"], ["Deposits placed", fd ? inr(fd) : "—", "var(--card-teal)"]], w: 230 });
    return `<span class="hov mcell on h${lvl}${now ? " now" : ""}" style="position:relative;background:var(--heat-${lvl})" tabindex="0">${fd ? `<i class="fdd"></i>` : ""}${kk(tot)}${tip(card2, { w: 230, x: "c", y: "up" })}</span>`;
  };
  const rows = years.map((y) => `<span class="yl">${y}</span>${Array.from({ length: 12 }, (_, i) => cell(y, i + 1)).join("")}`).join("");
  const head = `<span></span>${MON.map((m) => `<span class="ml">${m}</span>`).join("")}`;
  const keys = Object.keys(D.MONEY_IN).filter((k) => k >= "2026-01" && k <= "2026-10");
  const avg2026 = sum(keys.map((k) => D.MONEY_IN[k].epf + D.MONEY_IN[k].fd)) / keys.length;
  const fdMonths = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"].filter((k) => D.MONEY_IN[k]?.fd).length;
  const best = Object.entries(D.MONEY_IN).sort((a, b) => b[1].epf + b[1].fd - (a[1].epf + a[1].fd))[0];
  const legend = `<span class="legend" style="margin-top:2px"><span><i style="background:var(--heat-1)"></i>under ₹20k</span><span><i style="background:var(--heat-3)"></i>₹30–40k</span><span><i style="background:var(--heat-5)"></i>₹55k+</span><span><i style="background:oklch(0.78 0.16 75);border-radius:50%"></i>a deposit was placed</span></span>`;
  const kv = (k, v, s) => `<div class="kv"><span class="k">${k}</span><span class="v" style="font-size:22px">${v}</span><span class="s">${s}</span></div>`;
  const right = `<div class="vsep" style="display:flex;flex-direction:column;gap:18px;justify-content:center">${kv("A month, this year", inr(avg2026), "EPF plus deposits, Jan to Oct 2026")}${kv("A deposit in", `${fdMonths} of 9 months`, "since March; none in Sep so far")}${kv("Biggest month", inr(best[1].epf + best[1].fd), `${MON[+best[0].slice(5, 7) - 1]} ${best[0].slice(0, 4)}: the credit and the ₹30,000 deposit`)}</div>`;
  return card(`${cardHead("Money in each month", "what went into EPF and the deposits, month by month", link("Add a deposit"))}<div style="display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px;align-items:stretch"><div style="display:flex;flex-direction:column;gap:10px"><div class="moneygrid">${head}${rows}</div>${legend}</div>${right}</div>`);
}

// ---------- Credits on time ----------
export function creditsOnTime() {
  const groups = [["FY 23-24", "2024-02-01", "2024-03-31"], ["FY 24-25", "2024-04-01", "2025-03-31"], ["FY 25-26", "2025-04-01", "2026-03-31"], ["FY 26-27", "2026-04-01", "2027-03-31"]].map(([fy, a, b]) => ({ fy, list: D.CREDIT_LAG.filter((c) => c.date >= a && c.date <= b) }));
  const dot = (c) => { const cls = c.lag <= 2 ? "ok" : c.lag <= 20 ? "mid" : "late"; const card2 = hc({ h: `${MON[+c.wage.slice(5, 7) - 1]} ${c.wage.slice(0, 4)} wages`, t: inr(2 * c.each), d: `credited ${+c.date.slice(8, 10)} ${MON[+c.date.slice(5, 7) - 1]} ${c.date.slice(0, 4)}`, rows: [["Days after the wage month", String(c.lag)]], w: 220 }); return `<span class="hov cdot ${cls}" style="position:relative" tabindex="0">${c.lag}${tip(card2, { w: 220, x: "c", y: "up" })}</span>`; };
  const row = (g) => { const due = g.fy === "FY 26-27"; const dots = g.list.map(dot).join("") + (due ? `<span class="cdot due" title="Oct wages, due about 17 Nov">?</span>` : ""); const pad = 12 - g.list.length - (due ? 1 : 0); return `<div class="dotrow"><span class="yl">${g.fy}</span>${dots}${Array.from({ length: Math.max(0, pad) }, () => `<span class="cdot none" style="opacity:0.35"></span>`).join("")}</div>`; };
  const legend = `<span class="legend"><span><i style="background:oklch(0.58 0.14 150);border-radius:50%"></i>1 to 2 days</span><span><i style="background:oklch(0.72 0.14 75);border-radius:50%"></i>3 to 20 days</span><span><i style="background:oklch(0.55 0.17 25);border-radius:50%"></i>over 20 days</span><span><i style="border:2px dashed var(--fill-strong);border-radius:50%;background:transparent"></i>due</span></span>`;
  const checks = D.PASSBOOK_CHECKS.map((c) => `<div class="chk"><span>${c.fy}</span><span style="color:var(--muted)">${inr(c.open)} + ${inr(c.put)} + ${inr(c.int)} = ${inr(c.closing)}</span><span class="tk">${c.ok ? "✓ adds up" : "✗ check"}</span></div>`).join("");
  return card(`${cardHead("Credits on time", "days from the end of the wage month to the day EPFO credited it")}<div style="display:grid;gap:9px">${groups.map(row).join("")}</div>${legend}<div class="card-note"><b>From June's wages the credit comes about the 17th, not the 1st</b>: 17 to 26 days after the month, against 1 day before. Worth knowing when a month looks missing.</div><div><div class="s-ct" style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:2px;display:flex;justify-content:space-between"><span>Passbook check</span><span style="font-weight:600;text-transform:none;letter-spacing:0">opening + credits + interest = closing</span></div>${checks}</div>`);
}

// ---------- Growth path ----------
export function growthPath() {
  const ps = [5, 10, 20].map((y) => D.projectEpf(y)), now = D.EPF.total, maxT = ps[2].total;
  const bar = (p) => `<div class="gp-bar"><i style="width:${(now / maxT) * 100}%;background:${fillc("sapphire")}" title="Today"></i><i style="width:${(p.contributed / maxT) * 100}%;background:${fillc("teal")}"></i><i style="width:${(p.interest / maxT) * 100}%;background:${fillc("gold")}"></i></div>`;
  const more = (p) => D.projectEpf(p.years, p.perCredit + 5000).total - p.total;
  const panel = (p) => `<div class="vw-g vw-g-${p.years}"><div class="kv" style="margin-bottom:12px"><span class="k">In ${p.years} years (${2026 + p.years})</span><span class="v" style="font-size:38px">${crore(p.total)}</span><span class="s">EPF alone, in today's rupees only if nothing else changes (no raises, no inflation)</span></div>${bar(p)}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px"><div class="kv"><span class="k"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--card-sapphire);margin-right:6px"></i>Today</span><span class="v" style="font-size:18px">${lakh(now)}</span></div><div class="kv"><span class="k"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--card-teal);margin-right:6px"></i>Put in</span><span class="v" style="font-size:18px">${crore(p.contributed)}</span><span class="s">${inr(p.perCredit)} a month</span></div><div class="kv"><span class="k"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--card-gold);margin-right:6px"></i>Interest</span><span class="v" style="font-size:18px">${crore(p.interest)}</span><span class="s">${Math.round((p.interest / (p.total - now)) * 100)}% of the growth</span></div></div><div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--fill);font-size:12.5px;font-weight:600"><b>If each month's credit were ₹5,000 higher,</b> EPF would be ${crore(more(p))} more in ${p.years} years. A raise that lifts contributions does this; nothing here assumes one.</div></div>`;
  const chips = `<span class="gp-chips"><label class="pkl" for="g-5">5 years</label><label class="pkl" for="g-10">10 years</label><label class="pkl" for="g-20">20 years</label></span>`;
  return card(`<input class="pk-in" type="radio" name="g" id="g-5"><input class="pk-in" type="radio" name="g" id="g-10" checked><input class="pk-in" type="radio" name="g" id="g-20">${cardHead("Growth path", "where EPF gets to if nothing changes", chips)}${ps.map(panel).join("")}<div class="card-note">Arithmetic with two numbers you can change: the monthly credit stays ${inr(D.EPF.lastMonthly)} and the rate stays 8.25%. Not a forecast: raises, rate changes and withdrawals are left out. The same rule reproduces your credited interest to the rupee.</div>`);
}

/** Money in, then credits beside growth, then the deposits table, then coming up beside the EPF card. */
export const widgets4 = () => `${moneyIn()}${grid([[6, creditsOnTime()], [6, growthPath()]])}${P.depositsTable()}${grid([[6, P.comingUp()], [6, P.epfCard()]])}`;
