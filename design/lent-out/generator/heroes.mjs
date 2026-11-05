// Round 1: four hero ideas for Lent out. Every board shares the greeting, the attention strip and the widgets; only the hero differs.
// Each hero is a coloured stage that takes the colour of the pick (hidden radios, labels and :has(), so it works with no script).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { L1_KEYS, L2_KEYS, L3_KEYS, L4_KEYS, MONTHS12 } from "./css-lent.mjs";
const { I, inr } = L;
const { dm, dmy, mY, tile, grad, pastel, lakh, rateText, termsText, dot, daysAway, MON } = P;

import { radios, big, stile, chip } from "./ui.mjs";
export { radios, big, stile, chip };
import { clockWidget } from "./clock.mjs";
const pane = (p, k, inner, cls = "") => `<div class="vw-${p} vw-${p}-${k} ${cls}">${inner}</div>`;
const WIN = ["2025-12", "2026-12"]; // L1's window of months: Dec 2025 to Dec 2026

// ---------- L1 Promise ledger ----------
const monthIndex = (iso) => (+iso.slice(0, 4) - 2025) * 12 + +iso.slice(5, 7) - 12; // Dec 2025 = 0 … Dec 2026 = 12
function slots(l) {
  const ps = D.PAYOUTS[l.id] ?? [], up = D.nextDue(l, D.TODAY);
  const out = Array.from({ length: 13 }, () => `<i style="width:18px;height:3px;border-radius:2px;background:oklch(1 0 0 / .25);display:inline-block"></i>`);
  for (const p of ps) out[monthIndex(p.due)] = dot(p.state);
  if (up && monthIndex(up) <= 12) out[monthIndex(up)] = dot("up");
  return out.join("");
}
function rampSvg(w = 480, h = 30) {
  const pts = Array.from({ length: 13 }, (_, i) => { const iso = i === 11 ? D.TODAY : L.addMonthsUTC("2025-12-01", i); return [i, D.accruedOn(iso > D.TODAY ? D.TODAY : iso)]; }).filter((_, i) => i <= 11);
  const max = D.S.a.interestAccrued * 1.02, x = (i) => 9 + (i * (w - 18)) / 12, y = (v) => h - 3 - (v / max) * (h - 8);
  const line = pts.map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="ramp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="${x(0)},${h} ${line} ${x(11)},${h}" fill="oklch(1 0 0 / .22)"></polygon><polyline points="${line}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"></polyline><circle cx="${x(11)}" cy="${y(D.S.a.interestAccrued)}" r="4" fill="#fff"></circle></svg>`;
}
export function pcard(l) {
  const s = D.S[l.id], pay = l.interestMode === "Paid-out";
  const parts = pay ? [["m-p", s.principalOutstanding], ["m-r", D.receivedSoFar(l)], ["m-x", D.notReceived(l)]] : [["m-p", s.principalOutstanding], ["m-r", s.interestPaid], ["m-o", s.interestOwed]];
  const total = D.sum(parts.map((x) => x[1]));
  const meter = `<div class="meter">${parts.filter((x) => x[1] > 0).map(([c, v]) => `<i class="${c}" style="width:${(v / total) * 100}%"></i>`).join("")}</div>`;
  const leg = pay ? `<span><i style="background:#fff"></i>Principal out <b>${inr(s.principalOutstanding)}</b></span><span><i style="background:oklch(1 0 0 / .55)"></i>Interest received <b>${inr(D.receivedSoFar(l))}</b></span>${D.notReceived(l) ? `<span><i style="background:oklch(0.62 0.2 25)"></i>Missing <b>${inr(D.notReceived(l))}</b></span>` : ""}` : `<span><i style="background:#fff"></i>Principal out <b>${inr(s.principalOutstanding)}</b></span><span><i style="background:oklch(0.82 0.15 85)"></i>Interest owed <b>${inr(s.interestOwed)}</b></span>`;
  const tl = `<div class="mtl"><span class="lbl2">${pay ? "Promised vs arrived" : "Interest piled up"}</span>${pay ? slots(l) : ""}</div>${pay ? "" : rampSvg()}`;
  return `<label class="pkl pcard" for="p-${l.id}"><div class="pc-h">${tile(l, 40)}<div class="tl"><b>${l.borrowerName}</b><small>${pay ? `${termsText(l)} · ${rateText(s.rate)} a year` : `${l.interestMode} · ${l.interestRate}% simple`} · lent ${dm(l.startDate)} ${l.startDate.slice(0, 4)}</small></div><div class="am"><b>${inr(s.owedToday)}</b><small>owed today</small></div></div>${meter}<div class="mleg">${leg}</div>${tl}</label>`;
}
const ledgerHead = (a, b, c) => `<div class="lrow h"><span></span><span>${a}</span><span>${b}</span><span class="a">${c}</span><span></span></div>`;
export function ledgerFor(l) {
  if (l.interestMode === "Accruing") {
    const dates = [];
    for (let d = L.addMonthsUTC(l.startDate, 3); d <= D.TODAY; d = L.addMonthsUTC(d, 3)) dates.push(d);
    dates.push(D.TODAY);
    let prev = 0;
    const rows = dates.map((d) => { const v = D.accruedOn(d), inc = v - prev; prev = v; return `<div class="lrow"><i class="pd pd-ok" style="background:oklch(1 0 0 / .3);color:transparent">·</i><span class="d">${d === D.TODAY ? "Today" : dm(d) + " " + d.slice(2, 4)}</span><span class="w">+${inr(inc)} this stretch</span><span class="a">${inr(v)}</span><span class="st">piled up</span></div>`; });
    return `<div class="s-ct">What has piled up<small>simple interest, owed to you</small></div><div class="ledger">${ledgerHead("", "Day", "since the last row · total")}${rows.join("")}</div>`;
  }
  const ps = D.PAYOUTS[l.id], up = D.upcoming(40).filter((u) => u.loan.id === l.id)[0];
  const st = { ok: ["", "on time"], "late-paid": ["lp", "late"], missing: ["ms", "never came"], late: ["wt", "waiting"] };
  const rows = ps.map((p) => `<div class="lrow">${dot(p.state)}<span class="d">${dm(p.due)} ${p.due.slice(2, 4)}</span><span class="w">${p.got ? `arrived ${dm(p.got)}` : p.state === "late" ? `${p.lateBy} days over, not here` : "nothing arrived"}</span><span class="a">${inr(p.amount)}</span><span class="st ${st[p.state][0]}">${st[p.state][1]}</span></div>`);
  rows.push(`<div class="lrow fut">${dot("up")}<span class="d">${dm(up.due)} ${up.due.slice(2, 4)}</span><span class="w">${daysAway(up.due)}</span><span class="a">${inr(up.amount)}</span><span class="st">next</span></div>`);
  return `<div class="s-ct">Every promise so far<small>due vs arrived · sample</small></div><div class="ledger">${ledgerHead("", "Due", "what arrived")}${rows.join("")}</div>`;
}
function ledgerAll() {
  const miss = D.MISSED, last = D.LOG.slice(0, 3), up = D.upcoming(3);
  const r = (p, kind) => `<div class="lrow${kind === "up" ? " fut" : ""}">${dot(kind === "up" ? "up" : p.state)}<span class="d">${dm(kind === "got" ? p.got : p.due)}</span><span class="w">${p.loan.borrowerName}</span><span class="a">${inr(p.amount)}</span><span class="st ${kind === "miss" ? (p.state === "late" ? "wt" : "ms") : ""}">${kind === "miss" ? (p.state === "late" ? "waiting" : "never came") : kind === "got" ? "arrived" : daysAway(p.due)}</span></div>`;
  return `<div class="s-ct">Across all three<small>what needs a look first</small></div><div class="ledger"><div class="lrow h"><span></span><span>Not here yet</span><span></span><span class="a"></span><span></span></div>${miss.map((p) => r(p, "miss")).join("")}<div class="lrow h"><span></span><span>Last arrived</span><span></span><span class="a"></span><span></span></div>${last.map((p) => r(p, "got")).join("")}<div class="lrow h"><span></span><span>Coming</span><span></span><span class="a"></span><span></span></div>${up.map((p) => r(p, "up")).join("")}</div>`;
}
function infoFor(l) {
  const s = D.S[l.id], pay = l.interestMode === "Paid-out", nd = D.nextDue(l, D.TODAY);
  const chips = chip("Rate", `${rateText(s.rate)} a year`) + chip("Lent", dmy(l.startDate)) + chip("Out", `${D.daysBetween(l.startDate, D.TODAY)} days`);
  const tiles = pay
    ? stile("Interest expected", inr(D.expectedSoFar(l)), `${D.PAYOUTS[l.id].length} promised so far`) + stile("Received", inr(D.receivedSoFar(l)), "sample, matched in Income") + stile("Missing", inr(D.notReceived(l)), D.notReceived(l) ? `${D.PAYOUTS[l.id].filter((p) => !D.isReceived(p)).map((p) => dm(p.due)).join(" and ")}` : "nothing") + stile("Next payout", `${inr(l.payoutAmount)}`, `${dm(nd)} ${nd.slice(0, 4)} · ${daysAway(nd)}`)
    : stile("Principal out", inr(s.principalOutstanding), "none returned") + stile("Interest owed", inr(s.interestOwed), `${D.DAYS_A} days at 12%`) + stile("Piles up a day", inr(D.perDay(l)), `${inr(D.perDay(l) * 30.44)} a month`) + stile("Next due", "No date", "paid when he pays");
  return `<div style="display:flex;flex-direction:column"><div class="s-eb">${tile(l, 28)}<span>${l.interestMode === "Accruing" ? "Interest piles up" : "Interest paid out"}</span></div><h2 class="s-name">${l.borrowerName}</h2><div class="s-big" style="font-size:54px">${big(s.owedToday)}</div><div class="s-sub">owed today${pay ? ": the principal, which stays out" : `: ${inr(s.principalOutstanding)} + ${inr(s.interestOwed)} interest`}</div><div class="s-chips">${chips}</div><div class="s-tiles">${tiles}</div><div class="s-acts" style="margin-top:auto;padding-top:16px"><span class="s-act solid">${I.coin(13)} Record a repayment</span><span class="s-act">${I.pencil(13)} Edit</span><span class="s-act">Mark repaid</span></div></div>`;
}
function infoAll() {
  const tiles = stile("Interest earned", inr(D.EARNED), "piled up + promised so far") + stile("Reached you", inr(D.RECEIVED), "sample, matched in Income") + stile("Not here yet", inr(D.NOT_YET), `${inr(D.S.a.interestOwed)} piling up + ${inr(D.MISSED_AMT)} missing`) + stile("Next payout", inr(D.NEXT.amount), `${dowDmP(D.NEXT.due)} · ${daysAway(D.NEXT.due)}`);
  return `<div style="display:flex;flex-direction:column"><div class="s-eb"><span>Three promises</span></div><h2 class="s-name">Everything lent out</h2><div class="s-big" style="font-size:54px">${big(D.TOTAL)}</div><div class="s-sub">owed today: ${inr(D.PRINCIPAL_OUT)} principal + ${inr(D.S.a.interestOwed)} interest</div><div class="s-chips">${chip("Earning", `${inr(D.PER_DAY)} a day`)}${chip("Loans", "3")}${chip("Repaid", "0")}</div><div class="s-tiles">${tiles}</div><div class="s-acts" style="margin-top:auto;padding-top:16px"><span class="s-act solid">${I.plus(13)} Add a loan</span><span class="s-act">${I.coin(13)} Record a repayment</span></div></div>`;
}
const dowDmP = (iso) => `${L.dow(iso)} ${dm(iso)}`;
export function l1() {
  const detail = (k, info, led) => `<div class="vw-p vw-p-${k} vw-grid" style="flex:1;grid-template-columns:5fr 6fr;gap:28px">${info}<div>${led}</div></div>`;
  const right = detail("all", infoAll(), ledgerAll()) + D.LOANS.map((l) => detail(l.id, infoFor(l), ledgerFor(l))).join("");
  return `<section class="stg2">${radios("p", L1_KEYS, "all")}<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">Promise ledger<small>a card for each loan: what's out, what's earned, and what should have arrived against what did. Pick one to open its page</small></div><label class="pkl chip-b" for="p-all">Everything</label></div><div class="s-grid" style="grid-template-columns:5fr 7fr;gap:32px"><div class="pcards">${D.LOANS.map(pcard).join("")}</div><div style="display:flex;flex-direction:column">${right}</div></div></section>`;
}

// ---------- L4 Year of promises ----------
const monthPromises = (k) => D.ALL_PAYOUTS.filter((p) => p.due.slice(0, 7) === k);
const WORST = { missing: 3, late: 2, "late-paid": 1, ok: 0 };
const verdict = (ps) => ps.reduce((w, p) => (WORST[p.state] > WORST[w] ? p.state : w), "ok");
const VTEXT = { ok: "all in on time", "late-paid": "arrived late", missing: "never arrived", late: "waiting" };
export function l4() {
  const col = (k, i) => {
    const ps = monthPromises(k), v = verdict(ps), now = k === "2026-11";
    const cls = { ok: "ok", "late-paid": "lp", missing: "ms", late: "wt" };
    const chipFor = (p) => `<span class="chipv ${cls[p.state]}">${p.state === "ok" ? "✓ " : p.state === "late-paid" ? "! " : p.state === "missing" ? "× " : ""}${inr(p.amount)}</span>`;
    const b = ps.find((p) => p.loan.id === "b"), c = ps.find((p) => p.loan.id === "c");
    const mm = +k.slice(5, 7);
    return `<label class="pkl ycol${now ? " now" : ""}" for="m-${k}"><div class="mn">${MON[mm - 1]}<small>${k.slice(0, 4)}</small></div>${b ? chipFor(b) : '<span class="chipv none">—</span>'}${c ? chipFor(c) : '<span class="chipv none">—</span>'}<div class="vd">${v === "late" ? `${ps.find((p) => p.state === "late").lateBy} days over` : v === "late-paid" ? `${Math.max(...ps.map((p) => p.lateBy))} days late` : v === "missing" ? "never came" : "on time"}</div></label>`;
  };
  const colW = (1352 - 88) / 12, W = 1352, H = 150, max = 170000, xl = (i) => i * (colW + 8), bh = (v) => (v / max) * (H - 34);
  const endOf = (k, i) => (i === 11 ? D.TODAY : L.addDays(L.addMonthsUTC(`${k}-01`, 1), -1));
  const bars = MONTHS12.map((k, i) => { const v = D.accruedOn(endOf(k, i)), prev = D.accruedOn(L.addDays(`${k}-01`, -1)), x = xl(i); return `<rect x="${x}" y="${H - 6 - bh(v)}" width="${colW}" height="${bh(prev)}" rx="6" fill="#fff" fill-opacity=".28"></rect><rect x="${x}" y="${H - 6 - bh(v)}" width="${colW}" height="${bh(v) - bh(prev) + 6}" rx="6" fill="oklch(0.85 0.14 85)"></rect><text x="${x + colW / 2}" y="${H - 6 - bh(v) - 7}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff">${lakh(v)}</text><text x="${x + colW / 2}" y="${H - 16}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff" fill-opacity=".9">+${Math.round((v - prev) / 100) / 10}k</text>`; }).join("");
  const ramp = `<svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto">${bars}</svg>`;
  const mdetail = (k) => {
    const ps = monthPromises(k), v = verdict(ps), mm = +k.slice(5, 7), accA = D.accruedOn(k === "2026-11" ? D.TODAY : L.addDays(L.addMonthsUTC(`${k}-01`, 1), -1)) - D.accruedOn(L.addDays(`${k}-01`, -1));
    const rows = ps.map((p) => `<div class="lrow">${dot(p.state)}<span class="d">${dm(p.due)}</span><span class="w">${p.loan.borrowerName}: ${p.got ? `arrived ${dm(p.got)}` : p.state === "late" ? `${p.lateBy} days over, not here yet` : "nothing arrived"}</span><span class="a">${inr(p.amount)}</span><span class="st ${{ ok: "", "late-paid": "lp", missing: "ms", late: "wt" }[p.state]}">${{ ok: "on time", "late-paid": `${p.lateBy} days late`, missing: "never came", late: "waiting" }[p.state]}</span></div>`).join("");
    const due = D.sum(ps.map((p) => p.amount)), got = D.sum(ps.filter(D.isReceived).map((p) => p.amount));
    return pane("m", k, `<div class="s-grid" style="grid-template-columns:5fr 7fr;gap:32px"><div><div class="s-eb"><span>${MON[mm - 1]} ${k.slice(0, 4)}</span></div><h2 class="s-name">${v === "ok" ? "Everything arrived" : v === "late-paid" ? "It came, late" : v === "missing" ? "Nothing arrived" : "Still waiting"}</h2><div class="s-big" style="font-size:54px">${big(got)}<span style="font-size:22px;font-weight:700;opacity:.7;margin-left:10px;letter-spacing:0"><span style="margin-right:7px">of</span>${inr(due)}</span></div><div class="s-sub">promised for the month, and what reached you (sample)</div><div class="s-chips">${chip("Friend's interest", `+${inr(accA)} piled up`)}</div></div><div class="ledger" style="align-self:start">${rows}</div></div>`);
  };
  const exp = D.sum(D.ALL_PAYOUTS.map((p) => p.amount)), got = D.RECEIVED - 0;
  const year = pane("m", "all", `<div class="s-grid" style="grid-template-columns:5fr 7fr;gap:32px"><div><div class="s-eb"><span>Dec 2025 to now</span></div><h2 class="s-name">A year of promises</h2><div class="s-big" style="font-size:54px">${big(got)}<span style="font-size:22px;font-weight:700;opacity:.7;margin-left:10px;letter-spacing:0"><span style="margin-right:7px">of</span>${inr(exp)}</span></div><div class="s-sub">promised by the two payout loans, and what arrived (sample)</div><div class="s-chips">${chip("On time", `${D.ALL_PAYOUTS.filter((p) => p.state === "ok").length} of ${D.ALL_PAYOUTS.length}`)}${chip("Late", String(D.LATE_PAID.length))}${chip("Never came", "1")}${chip("Waiting", "1")}</div></div><div class="s-tiles" style="grid-template-columns:1fr 1fr 1fr;margin-top:0">${stile("Arrived", inr(got), `${((got / exp) * 100).toFixed(0)}% of what was promised`) + stile("Arrived late", inr(D.sum(D.LATE_PAID.map((p) => p.amount))), "Mar, 9 days over") + stile("Never came", inr(D.MISSED.filter((p) => p.state === "missing").reduce((t, p) => t + p.amount, 0)), "Feb") + stile("Waiting", inr(D.MISSED.filter((p) => p.state === "late").reduce((t, p) => t + p.amount, 0)), "Nov, 5 days over") + stile("Friend's unpaid interest", inr(D.S.a.interestAccrued), "piled up, not a promise") + stile("Next promise", inr(D.NEXT.amount), `${dowDmP(D.NEXT.due)}`)}</div></div>`);
  return `<section class="stg2">${radios("m", L4_KEYS, "all")}<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">Year of promises<small>a column for each month: what was promised (₹6,000 monthly, ₹18,000 quarterly) against what arrived. Pick a month to open it</small></div><label class="pkl chip-b" for="m-all">Whole year</label></div><div class="yr">${MONTHS12.map(col).join("")}</div><div class="rampbox" style="padding:42px 0 0"><div class="rl">Friend's interest owed, month by month<small>the amber top is what that month added · nothing has been paid</small></div>${ramp}</div>${year}${MONTHS12.map(mdetail).join("")}</section>`;
}

export const l2 = () => clockWidget({ exploration: true });
const HEROES = { l1, l2, l4 };
const body = (hero) => P.page(`${P.greeting()}${P.attention()}${hero}${P.widgets()}${P.sampleNote()}`);
export const render = (k) => () => body(HEROES[k]());
