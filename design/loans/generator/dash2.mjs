// Round 2: four hands-on directions with few visuals, each driven by chips you can pick (CSS only, radios + :has()).
//   M1 Time machine   pick a date, past or future: a wall of ₹1L bricks, one colour per loan, and the figures for that day
//   M2 What if        pick a loan, an effect and a prepayment amount: the new EMI or end date, interest saved and the charge beside it
//   M3 EMI anatomy    pick a loan and an EMI: how much of it is interest, on a curve of the whole loan
//   M4 Load gauge     a needle for the share of your salary that goes to EMIs, today and after each loan ends
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrL, inrS, fmt, fmtY, col, mono, plural } = L;
const { hc, tip, card, row, page, PRINCIPAL, INTEREST } = P;

// ---------- The kit: groups of chips, and one block of markup per combination of picks ----------
const cart = (lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
function kit(prefix, groups, extraCss = () => "") {
  const id = (g, k) => `${prefix}-${g.name}-${k}`;
  const radios = groups.map((g) => g.opts.map(([k]) => `<input type="radio" class="pk-in" name="${prefix}-${g.name}" id="${id(g, k)}"${k === (g.def ?? g.opts[0][0]) ? " checked" : ""} aria-label="${g.name} ${k}">`).join("")).join("");
  const combos = cart(groups.map((g) => g.opts.map((o) => o[0])));
  const has = (c) => c.map((k, i) => `:has(#${id(groups[i], k)}:checked)`).join("");
  const css = `<style>.${prefix}dir .cmb { display: none; animation: cmb-in 380ms var(--ease-out); }
${combos.map((c) => `.${prefix}dir${has(c)} .cm-${c.join("-")} { display: block; }`).join("\n")}
${groups.map((g) => g.opts.map(([k]) => `.${prefix}dir:has(#${id(g, k)}:checked) label[for="${id(g, k)}"] { background: var(--ink); color: var(--on-ink); box-shadow: var(--soft-shadow); }`).join("\n")).join("\n")}
${extraCss({ combos, has, id })}</style>`;
  const label = (gi, k, inner, cls = "") => `<label for="${id(groups[gi], k)}" class="kl ${cls}">${inner}</label>`;
  const show = (render) => combos.map((c) => `<div class="cmb cm-${c.join("-")}">${render(...c)}</div>`).join("");
  return { radios, css, label, show, combos, id };
}
const heroBox = (cls, inner) => `<section class="hero ${cls}" style="padding:28px 28px 26px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:22px">${rings(1416, 600, { first: 60, step: 30, opacity: 0.09 })}${inner}</section>`;
const bigFigure = (v, unit = "₹") => `<div class="hbig"><small>${unit}</small>${typeof v === "number" ? Math.round(v).toLocaleString("en-IN") : v}</div>`;
const figs = (list) => `<div class="row" style="gap:40px;align-items:flex-start;flex-wrap:nowrap">${list.map(([k, v, s, cls]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${cls ?? ""}">${v}</span><span class="s">${s}</span></div>`).join("")}</div>`;
const mon = (ym) => `${L.monName(ym)} ${ym.slice(0, 4)}`;
const sub = (a, n) => L.addMonthsUTC(`${a}-01`, n).slice(0, 7);
const lowerRow = () => row("1.65fr 1fr", [P.loansTable(), P.comingUp({ n: 4 })]);
const sum = (xs) => xs.reduce((t, x) => t + x, 0);

// =========================================================== M1 · Time machine
const TM = [
  ["pk", "2025-04", "Apr 2025", "the most you've owed"],
  ["now", "2026-10", "Today", "Oct 2026"],
  ["a", "2027-12", "Dec 2027", "Personal loan done in Feb"],
  ["b", "2029-04", "Apr 2029", "Car loan done"],
  ["c", "2033-12", "Dec 2033", ""],
  ["d", "2038-12", "Dec 2038", ""],
  ["e", "2043-07", "Jul 2043", "Home loan done"],
];
function timeMachine() {
  const state = ([k, ym, label]) => {
    const cut = k === "now" ? L.TODAY : `${ym}-31`;
    const bal = L.LOANS.map((l) => ({ l, b: L.balanceAt(l, ym, cut) })).filter((x) => x.b > 0), total = sum(bal.map((x) => x.b));
    const nextYm = sub(ym, 1), emi = L.emiMonth(nextYm), left = sum(L.INST.filter((i) => i.dueDate > cut).map((i) => i.interestDue));
    const ends = bal.map((x) => L.lastEmiOf(x.l).dueDate).sort().at(-1), past = ym < L.TODAY.slice(0, 7), now = k === "now";
    const cells = bal.flatMap(({ l, b }) => { const n = Math.ceil(b / 100000 - 1e-9); return Array.from({ length: n }, (_, i) => ({ l, f: i === n - 1 ? (b - i * 100000) / 100000 : 1 })); });
    const wall = cells.length ? cells.map((c) => `<span class="brick rt" style="--c:${col(c.l)};--f:${(c.f * 100).toFixed(0)}%"></span>`).join("") : `<div class="wallempty">${I.check(28)}<b>Nothing owed</b><span>every loan is paid off</span></div>`;
    const list = bal.map(({ l, b }) => `<div class="bl"><span class="row" style="gap:10px">${mono(l, 28)}<b>${l.name}</b></span><b>${inr(b)}</b></div>`).join("") || `<div class="bl"><span>No loans left</span><b>₹0</b></div>`;
    const tag = now ? "Today" : past ? "What you owed then" : "If every EMI is paid on time";
    return `<div class="between" style="align-items:flex-start;gap:32px"><div style="display:flex;flex-direction:column;gap:10px"><div class="hk">Still owed · ${label === "Today" ? "Oct 25, 2026" : mon(ym)}</div>${bigFigure(total)}<div class="row" style="gap:10px"><span class="delta">${tag}</span><span class="hsub">${plural(bal.length, "loan")} running</span></div></div>${figs([["Monthly EMIs after", inr(emi), now ? "what goes out each month" : "from the month after"], ["Interest still to come", inr(left), "from that date on"], ["Debt-free", total ? mon(ends.slice(0, 7)) : "Done", total ? `${plural(bal.length, "loan")} to clear` : "nothing left to pay", ""]])}</div><div class="wallbox"><div class="wall">${wall}</div><div class="bls">${list}<div class="bl tot"><span>Each brick is ₹1,00,000</span><b>${bal.length ? plural(cells.length, "brick") : "0 bricks"}</b></div></div></div>`;
  };
  const k = kit("m1", [{ name: "t", opts: TM.map((t) => [t[0]]), def: "now" }]);
  const scrub = `<div class="scrub">${TM.map((t, i) => k.label(0, t[0], `<i></i><b>${t[2]}</b><small>${t[3] || "&nbsp;"}</small>`, "sdot")).join("")}</div>`;
  const hero = heroBox("m1dir", `${k.radios}${k.css}<div class="between"><div class="hk">Drag through time · pick a date</div><span class="hsub">the past is what you owed then; the future assumes every EMI is paid on time</span></div>${scrub}${k.show((t) => state(TM.find((x) => x[0] === t)))}`);
  return hero;
}
export function m1() { return page(`${P.greeting()}${P.attention()}${timeMachine()}${lowerRow()}`); }

// =========================================================== M2 · What if (a prepayment)
// Follows the prepayment design in docs/system-design.md: a prepayment either shortens the loan or lowers the EMI (or closes it),
// carries the bank's charge as a separate debit, and is checked against the loan's own limits as warnings. Every figure is an estimate.
const EFF = { tenure: "Reduce-Tenure", emi: "Reduce-Emi", close: "Close" };
const AMTS = { home: [100000, 300000, 600000], car: [25000, 50000, 100000], pers: [25000, 50000, 100000] };
const effTxt = { "Reduce-Tenure": "Reduce tenure", "Reduce-Emi": "Reduce EMI", Close: "Close the loan" };
function whatIfHero() {
  const loans = ["home", "car", "pers"];
  const k = kit("m2", [{ name: "l", opts: loans.map((id) => [id]), def: "pers" }, { name: "x", opts: [["tenure"], ["emi"], ["close"]], def: "emi" }, { name: "a", opts: [["a1"], ["a2"], ["a3"]], def: "a2" }], () => `.m2dir:has(#m2-x-close:checked) .amtrow { opacity: 0.35; pointer-events: none; }
${loans.map((id) => `.m2dir .amt-${id} { display: none; } .m2dir:has(#m2-l-${id}:checked) .amt-${id} { display: inline; }`).join("\n")}`);
  const body = (lid, x, a) => {
    const l = L.loan(lid), s = L.sum_(lid), eff = EFF[x], amount = AMTS[lid][Number(a.slice(1)) - 1], p = L.prepay(l, amount, eff);
    const pend = s.ins.filter((i) => i.status === "Pending"), base = [s.outstanding, ...pend.map((i) => i.openingBalance - i.principalDue)];
    const W = 1000, H = 230, N = base.length - 1, X = (m) => (m / N) * W, Y = (b) => H - (b / s.outstanding) * (H - 14);
    const path = (ser) => `M${ser.map((b, m) => `${X(m).toFixed(1)} ${Y(b).toFixed(1)}`).join("L")}L${X(ser.length - 1).toFixed(1)} ${H}L0 ${H}Z`;
    const line = (ser) => `M${ser.map((b, m) => `${X(m).toFixed(1)} ${Y(b).toFixed(1)}`).join("L")}`;
    const mDate = (m) => (m === 0 ? "Today" : mon(L.addMonthsUTC(s.next.dueDate, m - 1).slice(0, 7)));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => `<span style="left:${f * 100}%">${mDate(Math.round(N * f))}</span>`).join("");
    const nowN = p.series.length - 1, newX = (nowN / N) * 100, ends = mon(p.end.slice(0, 7));
    const flags = `<div class="wiflag r" style="left:100%;top:0"><span class="fl-chip"><b>${eff === "Reduce-Emi" ? `Still ends ${mon(s.end.slice(0, 7))}` : `Was ${mon(s.end.slice(0, 7))}`}</b></span></div>${eff === "Reduce-Tenure" ? `<div class="wiflag" style="left:${newX}%;top:34px"><span class="fl-chip" style="border-color:${col(l)}"><i style="background:${col(l)}"></i><b>Now ${ends}</b></span><span class="fl-line" style="height:${H - 70}px"></span><span class="fl-dot" style="background:${col(l)}"></span></div>` : eff === "Close" ? `<div class="wiflag l" style="left:0;top:34px"><span class="fl-chip" style="border-color:${col(l)}"><i style="background:${col(l)}"></i><b>Closed today</b></span></div>` : ""}`;
    const chart = `<div class="wi"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${path(base)}" fill="oklch(0 0 0 / 0.07)"></path><path d="${line(base)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"></path>${eff === "Close" ? "" : `<path d="${path(p.series)}" fill="${col(l)}" fill-opacity="0.85"></path>`}</svg>${flags}<div class="wiax">${ticks}</div></div>`;
    const rate = L.chargeRate(l, s.paidN), cr = l.prepayCharge;
    const box = (kk, big, s2, cls = "") => `<div class="wibox ${cls}"><span class="k">${kk}</span><b>${big}</b><small>${s2}</small></div>`;
    const effectBox = eff === "Reduce-Tenure" ? box("Same EMI, fewer of them", `${plural(s.left - p.months, "EMI")} fewer`, `EMI stays ${inr(s.emi)} · ends ${ends} instead of ${mon(s.end.slice(0, 7))}`)
      : eff === "Reduce-Emi" ? box("Same end date, lower EMI", `${inr(p.emi)} a month`, `${inr(s.emi - p.emi)} less than ${inr(s.emi)} · still ends ${ends}`)
      : box("Closes the loan", inr(p.payoff), `${inr(p.amount)} principal + ${inr(p.dayInterest)} interest for ${plural(p.days, "day")} since the last EMI`);
    const checks = L.limitChecks(l, s, p.amount);
    const limits = checks.length ? `<div class="wibox"><span class="k">${l.lenderName}'s limits · warnings, not blocks</span>${checks.map((c) => `<div class="lim ${c.ok ? "ok" : "bad"}"><span>${c.ok ? I.check(11) : I.alert(12)}</span><span>${c.text}${c.detail && !c.ok ? `<small>${c.detail}</small>` : ""}</span></div>`).join("")}${checks.some((c) => !c.ok) ? `<small>It still saves. The app records what happened.</small>` : ""}</div>` : `<div class="wibox"><span class="k">Limits</span><small>No limits recorded for this loan. The rules belong to the loan, so they're set when it's added.</small></div>`;
    const chargeTxt = cr ? `${(rate / (1 + cr.gst / 100)).toFixed(0)}% + GST of ${inr(p.amount)}${cr.tiers.length ? ` · ${cr.tiers.map(([n, t]) => `${t}% after ${n} EMIs`).join(", ")}` : ""}` : "none recorded for this loan";
    const pay = `<div class="paytoday"><span class="k">You'd pay today (${fmt(L.TODAY)})</span><div class="row" style="gap:10px;flex-wrap:wrap"><b>${inr(p.amount)}</b><span class="muted">principal</span><span style="font-weight:800">+</span><b>${inr(p.charge)}</b><span class="muted">charge, a separate debit</span><span style="font-weight:800">=</span><b>${inr(p.amount + p.charge)}</b><span class="muted">leaves ${L.ACCOUNTS[l.accountId].name}</span></div></div>`;
    return `<div class="wigrid"><div style="display:flex;flex-direction:column;gap:12px"><div class="between"><b style="font-size:14px;font-weight:800">${l.name} balance, month by month</b><span class="row" style="gap:14px"><span class="lg"><i class="dash"></i>As scheduled</span>${eff === "Close" ? "" : `<span class="lg"><i style="background:${col(l)}"></i>After ${inr(p.amount)}</span>`}</span></div>${chart}${pay}</div><div class="wires"><div class="wi2">${box("Interest saved", inr(p.interestSaved), `estimate · ${inr(s.interestLeft)} → ${inr(p.interest)}`, "hot")}${box("Charge", inr(p.charge), chargeTxt)}</div>${p.charge ? `<div class="ratio">${I.info(12)} ${(p.interestSaved / p.charge).toFixed(1)}× the charge comes back as interest saved. Shown beside it, never netted off.</div>` : `<div class="ratio">${I.info(12)} No charge on this loan, so the whole saving is yours.</div>`}${effectBox}${limits}</div></div>`;
  };
  const toward = loans.map((id) => { const l = L.loan(id); return k.label(0, id, `${mono(l, 26)}<span><b>${l.name}</b><small>${l.annualInterestRate}% · usually ${effTxt[l.prepaymentEffect].toLowerCase()}</small></span>`, "lbig"); }).join("");
  const effects = [["tenure", "Reduce tenure"], ["emi", "Reduce EMI"], ["close", "Close the loan"]].map(([kk, t]) => k.label(1, kk, t)).join("");
  const amts = ["a1", "a2", "a3"].map((kk, i) => k.label(2, kk, loans.map((id) => `<span class="amt-${id}">${inrS(AMTS[id][i])}</span>`).join(""))).join("");
  const inner = `${k.radios}${k.css}<div class="between" style="align-items:flex-start;gap:24px"><div style="display:flex;flex-direction:column;gap:6px"><div class="hk">What if</div><div style="font-size:32px;font-weight:800;letter-spacing:-0.02em">You prepaid part of a loan today?</div></div><span class="hsub" style="max-width:460px;text-align:right">A what-if only: nothing is saved. Figures are estimates. The interest in the month of a prepayment follows a proposed rule (a normal month on the new balance, plus interest on the prepaid amount for the days it was still owed), to check against a bank letter.</span></div><div class="row" style="gap:26px;flex-wrap:wrap;align-items:center"><div class="row" style="gap:10px"><span class="hk">Loan</span><div class="row" style="gap:8px">${toward}</div></div><div class="row" style="gap:10px"><span class="hk">Effect</span><div class="row" style="gap:8px">${effects}</div></div><div class="row amtrow" style="gap:10px"><span class="hk">Amount</span><div class="row" style="gap:8px">${amts}</div></div></div>${k.show(body)}`;
  return heroBox("m2dir", inner);
}
export function m2() { return page(`${P.greeting()}${P.attention()}${whatIfHero()}${lowerRow()}`); }

// =========================================================== M3 · EMI anatomy
function anatomy() {
  const loans = L.AS.map((s) => s.loan);
  const pts = (s) => { const n = s.n, nx = s.paidN + 1, set = [["first", 1, "First EMI"], ["y1", 12, "EMI 12"], ["now", nx, "Next EMI"], ["mid", Math.round(n / 2), "Halfway"], ["late", Math.round(n * 0.85), "EMI " + Math.round(n * 0.85)], ["last", n, "Last EMI"]]; const seen = new Set(); return set.filter(([, v]) => !seen.has(v) && seen.add(v)); };
  const k = kit("m3", [{ name: "l", opts: loans.map((l) => [l.id]), def: "home" }, { name: "p", opts: [["first"], ["y1"], ["now"], ["mid"], ["late"], ["last"]], def: "now" }]);
  const body = (lid, pk) => {
    const l = L.loan(lid), s = L.sum_(lid), pt = pts(s).find((x) => x[0] === pk) ?? pts(s).find((x) => x[0] === "now"), n = s.n, i = s.ins[pt[1] - 1];
    const ip = i.interestDue / i.totalDue, pp = 1 - ip, W = 1000, H = 220, X = (m) => (m / (n - 1)) * W, Y = (f) => H - f * H;
    const ipath = s.ins.map((x, m) => `${X(m).toFixed(1)} ${Y(1).toFixed(1)}`), ppath = s.ins.map((x, m) => `${X(m).toFixed(1)} ${Y(x.principalDue / x.totalDue).toFixed(1)}`);
    const area = (top, bot) => `M${top.join("L")}L${bot.slice().reverse().join("L")}Z`;
    const xi = X(i.installmentNumber - 1), nowX = X(s.paidN) , first = s.ins[0], last = s.ins.at(-1);
    const chart = `<div class="wi" style="height:${H}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><clipPath id="m3p-${lid}-${pk}"><rect x="0" y="-5" width="${nowX.toFixed(1)}" height="${H + 10}"></rect></clipPath><clipPath id="m3f-${lid}-${pk}"><rect x="${nowX.toFixed(1)}" y="-5" width="${W}" height="${H + 10}"></rect></clipPath><path id="m3i-${lid}-${pk}" d="${area(ipath, ppath)}"></path><path id="m3pp-${lid}-${pk}" d="${area(ppath, s.ins.map((x, m) => `${X(m).toFixed(1)} ${H}`))}"></path></defs><use href="#m3i-${lid}-${pk}" clip-path="url(#m3p-${lid}-${pk})" fill="${INTEREST}"></use><use href="#m3i-${lid}-${pk}" clip-path="url(#m3f-${lid}-${pk})" style="fill:color-mix(in oklch,${INTEREST} 45%,white)"></use><use href="#m3pp-${lid}-${pk}" clip-path="url(#m3p-${lid}-${pk})" fill="${PRINCIPAL}"></use><use href="#m3pp-${lid}-${pk}" clip-path="url(#m3f-${lid}-${pk})" style="fill:color-mix(in oklch,${PRINCIPAL} 45%,white)"></use><line x1="${nowX.toFixed(1)}" x2="${nowX.toFixed(1)}" y1="0" y2="${H}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" opacity="0.5"></line></svg><div class="m3mark" style="left:${(xi / W) * 100}%"><span class="m3line"></span><span class="m3dot" style="top:${Y(pp)}px"></span><span class="m3tag">EMI ${i.installmentNumber}</span></div><span class="m3end" style="left:0">${(first.interestDue / first.totalDue * 100).toFixed(0)}% interest</span><span class="m3end" style="right:0;text-align:right;color:var(--positive)">${(last.interestDue / last.totalDue * 100).toFixed(0)}% interest</span></div>`;
    const bar = `<div class="split"><span class="rt" style="width:${pp * 100}%;background:${PRINCIPAL}"></span><span class="rt" style="width:${ip * 100}%;background:${INTEREST}"></span></div>`;
    const status = i.status === "Paid" ? "paid" : i.installmentNumber === s.paidN + 1 ? "next one" : "still to come";
    return `<div class="m3grid"><div class="m3card"><div class="hk">${l.name} · EMI ${i.installmentNumber} of ${n} · ${status}</div><div class="row" style="gap:12px;align-items:baseline"><span style="font-size:52px;font-weight:800;letter-spacing:-0.03em;line-height:1">${inr(i.totalDue)}</span><span class="hsub">due ${fmtY(i.dueDate)}</span></div>${bar}<div class="between"><span class="lg"><i style="background:${PRINCIPAL}"></i>Principal <b style="color:var(--fg)">${inr(i.principalDue)}</b></span><span class="lg"><i style="background:${INTEREST}"></i>Interest <b style="color:var(--fg)">${inr(i.interestDue)}</b></span></div><div class="m3say"><b>₹${Math.round(ip * 100)}</b> of every ₹100 in this EMI is interest. After it you still owe <b>${inr(i.openingBalance - i.principalDue)}</b>.</div></div><div style="display:flex;flex-direction:column;gap:10px"><div class="between"><b style="font-size:14px;font-weight:800">What each EMI is made of, from the first to the last</b><span class="hsub">solid is paid · the dashed line is today</span></div>${chart}<div class="row" style="gap:8px;flex-wrap:wrap">${pts(s).map(([kk, , label]) => k.label(1, kk, label)).join("")}</div></div></div>`;
  };
  const loanChips = loans.map((l) => k.label(0, l.id, `${mono(l, 26)}<span><b>${l.name}</b><small>${inr(L.sum_(l.id).emi)} · ${l.annualInterestRate}%</small></span>`, "lbig")).join("");
  // the EMI chips differ a little per loan (personal has no "halfway" twin), so every loan shows the chips it has; unused picks fall back to Next EMI
  const inner = `${k.radios}${k.css}<div class="between" style="align-items:flex-start;gap:24px"><div style="display:flex;flex-direction:column;gap:6px"><div class="hk">Inside an EMI</div><div style="font-size:32px;font-weight:800;letter-spacing:-0.02em">Where does each EMI actually go?</div></div><div class="row" style="gap:8px">${loanChips}</div></div>${k.show(body)}`;
  return heroBox("m3dir", inner);
}
export function m3() { return page(`${P.greeting()}${P.attention()}${anatomy()}${lowerRow()}`); }

// =========================================================== M4 · Load gauge
function gauge() {
  const whens = [["now", "Today", L.EMI_TOTAL, "all three loans"], ["a", "After Feb 2028", L.EMI_TOTAL - L.sum_("pers").emi, "Personal loan done"], ["b", "After Mar 2029", L.sum_("home").emi, "Car loan done"], ["c", "After Jun 2043", 0, "Home loan done"]];
  const sal = [["s0", "Today's salary", L.SALARY], ["s1", "10% raise", L.SALARY * 1.1], ["s2", "25% raise", L.SALARY * 1.25]];
  const MAXP = 0.6, pctOf = (e, s) => e / s;
  const k = kit("m4", [{ name: "w", opts: whens.map((w) => [w[0]]), def: "now" }, { name: "s", opts: sal.map((s) => [s[0]]), def: "s0" }], ({ combos, has }) => combos.map((c) => { const e = whens.find((w) => w[0] === c[0])[2], s = sal.find((x) => x[0] === c[1])[2]; return `.m4dir${has(c)} { --p: ${Math.min(pctOf(e, s) / MAXP, 1).toFixed(4)}; }`; }).join("\n"));
  // the arc: 0 to 60% of salary laid over a half circle, three zones
  const cx = 230, cy = 230, R = 180, ang = (p) => Math.PI * (1 - p / (MAXP * 100)), pt = (p, r = R) => `${(cx + r * Math.cos(ang(p))).toFixed(1)} ${(cy - r * Math.sin(ang(p))).toFixed(1)}`;
  const arc = (a, b, c) => `<path d="M${pt(a)}A${R} ${R} 0 0 1 ${pt(b)}" fill="none" stroke="${c}" stroke-width="34" stroke-linecap="butt"></path>`;
  const tickL = [0, 30, 40, 60].map((p) => `<span class="gt" style="left:${cx + (R + 34) * Math.cos(ang(p))}px;top:${cy - (R + 30) * Math.sin(ang(p))}px">${p}%</span>`).join("");
  const dial = `<div class="gauge"><svg width="460" height="262" viewBox="0 0 460 262">${arc(0, 30, "var(--card-emerald)")}${arc(30, 40, "oklch(0.78 0.14 80)")}${arc(40, 60, "var(--card-ruby)")}</svg>${tickL}<div class="needle" style="left:${cx}px;top:${cy}px"><span></span></div><div class="hub" style="left:${cx - 14}px;top:${cy - 14}px"></div></div>`;
  const body = (w, s) => {
    const wv = whens.find((x) => x[0] === w), sv = sal.find((x) => x[0] === s), e = wv[2], p = e / sv[2], zone = p < 0.3 ? ["Comfortable", "pill-on"] : p < 0.4 ? ["Stretched", "pill-late"] : ["Heavy", "pill-due"];
    return `<div style="display:flex;flex-direction:column;gap:12px"><div class="hk">${wv[1]} · ${sv[1].toLowerCase()} ${inr(sv[2])}</div><div class="row" style="gap:14px;align-items:baseline"><span style="font-size:76px;font-weight:800;letter-spacing:-0.04em;line-height:1">${(p * 100).toFixed(0)}<small style="font-size:32px;opacity:.7">%</small></span><span class="pill ${zone[1]}" style="font-size:12px;padding:5px 12px">${zone[0]}</span></div><div class="hsub" style="font-size:14px">of the salary goes to EMIs: <b style="color:var(--fg)">${inr(e)}</b> a month${wv[0] === "now" ? "" : `, once the ${wv[3]}`}.</div><div class="gleft"><span>Left over every month</span><b>${inr(sv[2] - e)}</b></div></div>`;
  };
  const whenChips = whens.map((w) => k.label(0, w[0], `<b>${w[1]}</b><small>${w[3]}</small>`, "lstack")).join("");
  const salChips = sal.map((s) => k.label(1, s[0], s[1])).join("");
  const inner = `${k.radios}${k.css}<div class="between" style="align-items:flex-start;gap:24px"><div style="display:flex;flex-direction:column;gap:6px"><div class="hk">EMI load</div><div style="font-size:32px;font-weight:800;letter-spacing:-0.02em">How heavy are the EMIs?</div></div><span class="hsub" style="max-width:420px;text-align:right">The zones (under 30%, 30 to 40%, over 40%) are placeholders to decide on. The salary is Income's sample.</span></div><div class="row" style="gap:10px;flex-wrap:wrap;align-items:stretch">${whenChips}</div><div class="m4grid">${dial}<div>${k.show(body)}</div></div><div class="row" style="gap:10px"><span class="hk">If your salary were</span>${salChips}</div>`;
  return heroBox("m4dir", inner);
}
export function m4() { return page(`${P.greeting()}${P.attention()}${gauge()}${lowerRow()}`); }
