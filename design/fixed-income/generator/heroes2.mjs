// Round 2: coloured, interactive stages. G1 Ladder pick, G2 Bank doors, G3 Bubbles, G4 Interest stage.
// Each stage takes the colour of whatever you pick (hidden radios, labels and :has(), so it works with no script).
import * as L from "./lib.mjs";
import * as D from "./data-sample.mjs";
import * as P from "./parts.mjs";
import { A_KEYS, B_KEYS, C_KEYS, E_KEYS } from "./css-fi2.mjs";
const { I, inr, fmtY, plural } = L;
const { sum } = D;
const { col, grad, lakh, lakhS, bankTile, daysLeft } = P;

const body = (hero) => P.page(`${P.greeting()}${P.attention()}${hero}${P.widgets()}${P.sampleNote()}`);
const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const radios = (p, keys, def = keys[0]) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");
const nice = (max) => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const big = (n) => (Math.abs(n) >= 100000 ? `<small>₹</small>${(n / 100000).toFixed(2)}<small>L</small>` : `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`);
const pretty = (iso) => fmtY(iso).replace(",", "");
const tile = (k, v, s = "") => `<div class="s-tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
const termText = (x) => { const m = Math.round(D.daysBetween(x.startDate, x.maturityDate) / 30.4); return m % 12 === 0 ? `${m / 12} ${m === 12 ? "year" : "years"}` : `${m} months`; };

// ---------- What one deposit has earned and will ----------
export function figures(x) {
  if (x.compoundingType === "Non-Cumulative") {
    const ps = D.payouts(x), paid = sum(ps.filter((p) => p.date <= D.TODAY).map((p) => p.amount)), left = sum(ps.filter((p) => p.date > D.TODAY).map((p) => p.amount));
    return { worth: x.principalAmount, earned: paid, toCome: left, earnedLabel: "Paid out so far", comeLabel: "Still to be paid" };
  }
  if (x.kind === "RD") return { worth: D.RD.value, earned: D.RD.accrued, toCome: D.RD.maturityAmount - D.RD.principalAmount - D.RD.accrued, earnedLabel: "Interest so far", comeLabel: "Still to come" };
  const w = D.valueOf(x);
  return { worth: w, earned: w - x.principalAmount, toCome: x.maturityAmount - w, earnedLabel: x.status === "Matured" ? "Interest earned" : "Interest so far", comeLabel: x.status === "Matured" ? "Waiting to be received" : "Still to come" };
}

/** The left half of a deposit's panel: who, how much, the chips and four figures. */
export function info(x) {
  const b = D.BANKS[x.bank], f = figures(x);
  const chips = [`<span class="s-chip">Rate <b>${D.rate(x.interestRate)}</b></span>`, `<span class="s-chip">Term <b>${termText(x)}</b></span>`, `<span class="s-chip">${x.status === "Matured" ? "Matured" : "Matures"} <b>${fmtY(x.maturityDate).replace(",", "")}</b></span>`, x.compoundingType === "Non-Cumulative" ? `<span class="s-chip"><b>${x.payoutFrequency}</b> payout</span>` : ""].join("");
  const tiles = tile(f.earnedLabel, inr(f.earned), x.kind === "RD" ? `${D.RD.paid} of ${D.RD.months} instalments paid` : "") + tile(f.comeLabel, inr(f.toCome), x.status === "Matured" ? "closing it moves it off the page" : `by ${L.monYear(x.maturityDate.slice(0, 7))}`) + tile("Earning a day", x.status === "Active" ? inr(D.perDay(x)) : "—", x.status === "Active" ? `${inr(D.perDay(x) * 30.4)} a month` : "") + tile("Real yearly yield", `${(D.effectiveYield(x) * 100).toFixed(2)}%`, `${D.rate(x.interestRate)} quoted`);
  const acts = `<span class="s-act solid">${I.pencil(13)} Edit</span><span class="s-act">${x.status === "Matured" ? "Mark closed" : x.kind === "RD" ? "Record instalment" : "Close early"}</span>${x.status === "Matured" ? "" : `<span class="s-act">Renew</span>`}`;
  return `<div><div class="s-eb">${bankTile(x.bank, 30)}<span>${b.name} · ${x.kind === "FD" ? "Fixed deposit" : x.kind === "RD" ? "Recurring deposit" : "Savings certificate"}</span></div><h2 class="s-name">${x.name}</h2><div class="s-big">${big(f.worth)}</div><div class="s-sub">${x.compoundingType === "Non-Cumulative" ? "placed; the interest is paid out to you" : x.kind === "RD" ? `worth today from ${inr(D.RD.deposited)} paid in` : `worth today, from ${inr(x.principalAmount)} placed`}</div><div class="s-chips">${chips}</div><div class="s-tiles">${tiles}</div><div class="s-acts">${acts}</div></div>`;
}
export function pinfo(p) {
  const chips = `<span class="s-chip">${p.rate ? `Rate <b>${p.rate}%</b>` : "<b>Market-linked</b>"}</span><span class="s-chip">Since <b>${p.since}</b></span>${p.matures ? `<span class="s-chip">Matures <b>${fmtY(p.matures).replace(",", "")}</b></span>` : ""}`;
  const tiles = tile("Passbook said", inr(p.balance), `on ${pretty(p.balanceDate)}`) + tile("Added since", inr(p.added), p.monthly ? `${inr(p.monthly)} a month` : "this year's deposit") + tile("Interest", p.rate ? "Declared yearly" : "None", p.note.split(":")[0].slice(0, 36)) + tile("Where", p.where, p.kind);
  return `<div><div class="s-eb"><span>${p.where} · Passbook holding</span></div><h2 class="s-name">${p.name}</h2><div class="s-big">${big(p.value)}</div><div class="s-sub">an estimate: the balance your passbook said, plus what you added since</div><div class="s-chips">${chips}</div><div class="s-tiles">${tiles}</div><div class="s-acts"><span class="s-act solid">${I.plus(13)} Add a balance</span><span class="s-act">Add a contribution</span></div></div>`;
}

// ---------- Charts (white on the colour) ----------
const colsFor = (x) => {
  const out = [];
  if (x.compoundingType === "Non-Cumulative") return D.payouts(x).map((p) => ({ date: p.date, base: 0, top: p.amount, past: p.date <= D.TODAY }));
  if (x.kind === "RD") return D.RD.dates.map((d, i) => ({ date: d, base: (i + 1) * D.RD.monthly, top: D.estValue(D.RD, d) - (i + 1) * D.RD.monthly, past: d <= D.TODAY }));
  const step = x.kind === "NSC" ? 12 : 3, r = x.interestRate / 100;
  for (let i = 1, d = L.addMonthsUTC(x.startDate, step); ; i++, d = L.addMonthsUTC(x.startDate, step * i)) {
    const last = d >= x.maturityDate, date = last ? x.maturityDate : d;
    const v = last ? x.maturityAmount : x.kind === "NSC" ? x.principalAmount * (1 + r) ** i : x.principalAmount * (1 + r / 4) ** i;
    out.push({ date, base: x.principalAmount, top: Math.max(0, v - x.principalAmount), past: date <= D.TODAY || (x.status === "Matured") });
    if (last) break;
  }
  return out;
};
export function stairs(x) {
  const cols = colsFor(x), W = 700, H = 300, l = 52, r = 10, t = 22, b = 34;
  const payout = x.compoundingType === "Non-Cumulative";
  const maxV = nice(Math.max(...cols.map((c) => c.base + c.top)) * 1.08), bw = (W - l - r) / cols.length;
  const y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = cols.map((c, i) => {
    const x0 = l + i * bw + Math.min(5, bw * 0.16), w = bw - Math.min(10, bw * 0.32);
    const base = c.base ? `<rect x="${x0}" y="${y(c.base)}" width="${w}" height="${y(0) - y(c.base)}" rx="3" fill="#fff" fill-opacity="${c.past ? 0.3 : 0.14}"/>` : "";
    const top = c.top ? `<rect x="${x0}" y="${y(c.base + c.top)}" width="${w}" height="${Math.max(2, y(c.base) - y(c.base + c.top))}" rx="3" fill="#fff" fill-opacity="${c.past ? 0.95 : 0.4}"/>` : "";
    return `<g>${base}${top}</g>`;
  }).join("");
  const grid = [0.5, 1].map((f) => `<line x1="${l}" x2="${W - r}" y1="${y(maxV * f)}" y2="${y(maxV * f)}" stroke="#fff" stroke-opacity="0.16"/><text x="${l - 8}" y="${y(maxV * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.75">${lakhS(maxV * f)}</text>`).join("");
  const pastN = cols.filter((c) => c.past).length, todayX = l + pastN * bw;
  const showToday = pastN > 0 && pastN < cols.length;
  const first = cols[0], last = cols.at(-1);
  const lab = (c, i, anchor) => `<text x="${l + i * bw + (anchor === "end" ? bw : 0)}" y="${H - 12}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+c.date.slice(5, 7) - 1]} ${c.date.slice(0, 4)}</text>`;
  const endLbl = payout ? "" : `<text x="${W - r}" y="${y(last.base + last.top) - 8}" text-anchor="end" font-size="13" font-weight="800" fill="#fff">${lakhS(x.maturityAmount)} at the end</text>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${grid}<line x1="${l}" x2="${W - r}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${showToday ? `<line x1="${todayX}" x2="${todayX}" y1="${t - 8}" y2="${y(0)}" stroke="#fff" stroke-dasharray="3 4"/><text x="${todayX}" y="${t - 12}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">Today</text>` : ""}${lab(first, 0, "start")}${lab(last, cols.length - 1, "end")}${endLbl}</svg>`;
  const title = payout ? `Interest paid to you each ${x.payoutFrequency === "Quarterly" ? "quarter" : x.payoutFrequency === "Monthly" ? "month" : "year"}` : x.kind === "RD" ? "What you've paid in, and the interest on it" : "What it was placed at, and the interest that has built up";
  const sub = payout ? "solid is paid, faded is still to come" : "bright is interest";
  return `<div class="s-chart"><div class="s-ct">${title}<small>${sub}</small></div>${svg}<div class="s-note">The steps are illustrative: the app keeps what was placed and the maturity amount the bank quoted, and spreads the rest.</div></div>`;
}
/** Everything held, month by month, with each deposit dropping out as it matures. */
export function runoff() {
  const months = D.LADDER_MONTHS, W = 700, H = 300, l = 52, r = 10, t = 22, b = 34, bw = (W - l - r) / months.length;
  const items = D.ACTIVE;
  const colsM = months.map((k) => { const date = L.addDays(L.addMonthsUTC(`${k}-01`, 1), -1); return { k, segs: items.filter((x) => x.maturityDate > date).map((x) => ({ x, v: D.estValue(x, date) })) }; });
  const maxV = Math.ceil(Math.max(...colsM.map((c) => sum(c.segs.map((s) => s.v)))) / 500000) * 500000, y = (v) => t + (H - t - b) * (1 - v / maxV);
  const bars = colsM.map((c, i) => { let acc = 0; return c.segs.map((s) => { const y1 = y(acc + s.v), y0 = y(acc); acc += s.v; return `<rect x="${l + i * bw + 2}" y="${y1}" width="${bw - 4}" height="${Math.max(0, y0 - y1 - 1)}" fill="color-mix(in oklch, ${col(D.BANKS[s.x.bank].color)} 40%, white)" fill-opacity="0.95"/>`; }).join(""); }).join("");
  const grid = [0.5, 1].map((f) => `<line x1="${l}" x2="${W - r}" y1="${y(maxV * f)}" y2="${y(maxV * f)}" stroke="#fff" stroke-opacity="0.16"/><text x="${l - 8}" y="${y(maxV * f) + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#fff" fill-opacity="0.75">${lakhS(maxV * f)}</text>`).join("");
  const xl = months.map((k, i) => (i % 3 === 0 ? `<text x="${l + i * bw + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" fill-opacity="0.78">${mon[+k.slice(5, 7) - 1]}${k.endsWith("-01") ? ` ${k.slice(2, 4)}` : ""}</text>` : "")).join("");
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${grid}<line x1="${l}" x2="${W - r}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity="0.4"/>${bars}${xl}</svg>`;
  return `<div class="s-chart"><div class="s-ct">What you'd hold, month by month<small>if nothing is renewed</small></div>${svg}<div class="s-note">Each step down is a deposit maturing and leaving. Colours are the banks. Pick a rung below to follow one deposit.</div></div>`;
}

// ======================== G1 Ladder pick ========================
export function g1() {
  const months = D.LADDER_MONTHS, over = 1, cols = months.length + over + 1;
  const idxOf = (iso) => { const k = iso.slice(0, 7), i = months.indexOf(k); return i >= 0 ? i + over : iso < D.monthStart(D.TODAY) ? 0 : cols - 1; };
  const at = Array.from({ length: cols }, () => []);
  for (const x of D.HELD) at[x.status === "Matured" ? 0 : idxOf(x.maturityDate)].push(x);
  const maxV = Math.max(...D.HELD.map((x) => x.maturityAmount));
  const lab = (i) => (i === 0 ? "Due" : i === cols - 1 ? "Later" : mon[+months[i - over].slice(5, 7) - 1][0] + (months[i - over].endsWith("-01") || i === over ? `<br>${months[i - over].slice(2, 4)}` : ""));
  const rungs = at.map((r, i) => r.length ? `<label class="pkl rung" for="a-${r[0].id}"><span class="rb"><b>${lakhS(r[0].maturityAmount)}</b><i style="height:${Math.max(14, (r[0].maturityAmount / maxV) * 80)}px"></i></span><span class="rl">${lab(i)}</span></label>` : `<span class="rung-e"><span class="rb"><i></i></span><span class="rl">${lab(i)}</span></span>`).join("");
  const allb = `<label class="pkl allb" for="a-all"><span>Everything</span><small>${plural(D.HELD.length, "deposit")}</small></label>`;
  const all = `<div class="vw-a vw-a-all s-grid"><div><div class="s-eb"><span>All deposits · ${D.rate(D.AVG_RATE)} on average</span></div><h2 class="s-name">Everything you hold</h2><div class="s-big">${big(D.DEP_VALUE)}</div><div class="s-sub">worth today, from ${lakh(D.DEP_PUT)} placed</div><div class="s-chips"><span class="s-chip">Earning <b>${inr(D.PER_DAY)} a day</b></span><span class="s-chip">Next <b>${D.NEXT.x.name}</b> ${daysLeft(D.NEXT.date)}</span></div><div class="s-tiles">${tile("Back within a year", lakh(sum(D.UPCOMING.filter((u) => u.days <= 365).map((u) => u.amount))), "interest included")}${tile("Earned so far", lakh(D.DEP_ACCRUED), "across all of them")}${tile("Since April", lakh(D.FY_SO), "this tax year")}${tile("Waiting to be received", lakh(sum(D.MATURED_WAITING.map((x) => x.maturityAmount))), "matured, not closed")}</div></div>${runoff()}</div>`;
  const per = D.HELD.map((x) => `<div class="vw-a vw-a-${x.id} s-grid">${info(x)}${stairs(x)}</div>`).join("");
  return `<section class="stg2">${radios("a", A_KEYS, "all")}${all}${per}<div><div class="s-ct" style="margin-bottom:2px">The ladder<small>pick a rung to follow that deposit; the whole stage takes its bank's colour</small></div><div class="ladder">${allb}${rungs}</div></div></section>`;
}

// ======================== G2 Bank doors ========================
const coverBar = (c, maxV) => {
  const p = (v) => `${(v / maxV) * 100}%`;
  return `<div class="cbar"><i style="left:0;width:${p(c.dep)};border-radius:10px 0 0 10px;background:#fff"></i><i style="left:${p(c.dep)};width:${p(c.savings)};background:repeating-linear-gradient(135deg,oklch(1 0 0 / 0.6) 0 4px,oklch(1 0 0 / 0.3) 4px 8px)"></i>${c.over ? `<i style="left:${p(D.SETTINGS.cover)};width:${p(c.over)};border-radius:0 10px 10px 0;background:repeating-linear-gradient(135deg,oklch(0.82 0.16 80) 0 4px,oklch(0.7 0.16 70) 4px 8px)"></i>` : ""}<span class="line" style="left:${p(D.SETTINGS.cover)}"></span></div>`;
};
export function g2() {
  const keys = Object.keys(D.BANKS), covers = Object.fromEntries(D.COVER.map((c) => [c.key, c]));
  const doorFor = (k) => {
    const b = D.BANKS[k], items = D.byBank(k), total = sum(items.map(D.valueOf)), c = covers[k];
    return `<label class="pkl door" for="b-${k}" style="background:${grad(b.color)};--dc:var(--card-${b.color})">${c?.over ? `<span class="over">over cover</span>` : ""}<div class="dnm">${b.short}</div><div><div class="dv">${lakh(total)}</div><div class="ds">${plural(items.length, "deposit")}${c ? `, ${lakhS(c.savings)} savings` : ""}</div></div><div class="stack">${items.sort((a, b2) => D.valueOf(a) - D.valueOf(b2)).map((x) => `<i style="width:${Math.max(24, (D.valueOf(x) / 570000) * 100)}%"></i>`).join("")}</div></label>`;
  };
  const allDoor = `<label class="pkl door" for="b-all" style="background:${grad("emerald")};--dc:var(--card-emerald)"><div class="dnm">All banks</div><div><div class="dv">${lakh(D.DEP_VALUE)}</div><div class="ds">${plural(keys.length, "payer")}</div></div><div class="stack">${D.LAYERS.slice(0, 5).map((l) => `<i style="width:${Math.max(24, (l.v / 2100000) * 100)}%"></i>`).join("")}</div></label>`;
  const maxCover = Math.max(...D.COVER.map((c) => c.total), D.SETTINGS.cover) * 1.08;
  const taxRow = (r) => { const lim = r.limit === Infinity ? null : r.limit, mx = Math.max(r.full, lim || 0) * 1.12; return `<div class="s-ct" style="margin-top:6px">Interest this tax year<small>${r.over ? "over the limit: tax is cut at source" : lim ? `under the ${inr(lim)} limit` : "no tax taken at source"}</small></div><div class="cbar" style="height:26px"><i style="left:0;width:${(r.full / mx) * 100}%;border-radius:8px;background:#fff;opacity:0.4;height:26px"></i><i style="left:0;width:${(r.so / mx) * 100}%;border-radius:8px;background:#fff;height:26px"></i>${lim ? `<span class="line" style="left:${(lim / mx) * 100}%"></span>` : ""}</div><div class="s-note" style="margin-top:6px">${inr(r.so)} so far, ${inr(r.full)} by March${r.tds ? ` · tax cut at source ≈ ${inr(r.tds)}` : ""}</div>`; };
  const bankPanel = (k) => {
    const b = D.BANKS[k], items = D.byBank(k).sort((x, y) => x.maturityDate.localeCompare(y.maturityDate)), c = covers[k], fy = D.FYROWS.find((r) => r.key === k);
    const total = c ? c.total : sum(items.map(D.valueOf));
    const left = `<div><div class="s-eb">${bankTile(k, 30)}<span>${b.name}</span></div><h2 class="s-name">${plural(items.length, "deposit")} here</h2><div class="s-big">${big(total)}</div><div class="s-sub">${c ? `${lakhS(c.dep)} in deposits and ${lakhS(c.savings)} in savings` : "in deposits"}</div><div style="margin-top:22px">${c ? `<div class="s-ct">Against the ${lakh(D.SETTINGS.cover)} cover<small>${c.over ? `${lakh(c.over)} above it` : `${lakh(D.SETTINGS.cover - c.total)} of room`}</small></div>${coverBar(c, maxCover)}<div class="s-note">The cover is per depositor per bank, principal and interest together, savings included. A figure to know, not a reason to move money.</div>` : `<div class="s-ct">The bank cover<small>does not apply</small></div><div class="s-chips" style="margin-top:0"><span class="s-chip">${b.company ? "A company FD is outside the bank cover" : "A government scheme: backed by the government"}</span></div>`}</div></div>`;
    const rows = items.map((x) => `<div class="row2"><div><b>${x.name}</b></div><div class="am">${inr(D.valueOf(x))}</div><small>${D.rate(x.interestRate)} · ${x.status === "Matured" ? "matured, not closed" : `matures ${L.monYear(x.maturityDate.slice(0, 7))}`}</small><small style="text-align:right">${x.status === "Matured" ? "" : daysLeft(x.maturityDate)}</small></div>`).join("");
    return `<div class="vw-b vw-b-${k} s-grid">${left}<div style="display:grid;gap:10px;align-content:start">${rows}${fy ? `<div>${taxRow(fy)}</div>` : ""}</div></div>`;
  };
  const allPanel = `<div class="vw-b vw-b-all s-grid"><div><div class="s-eb"><span>All banks and schemes</span></div><h2 class="s-name">Where it all sits</h2><div class="s-big">${big(D.DEP_VALUE)}</div><div class="s-sub">in deposits, across ${keys.length} payers</div><div class="s-tiles">${tile("Over the cover", lakh(D.OVER_TOTAL), `${plural(D.OVER_BANKS.length, "bank")}, after savings`)}${tile("Tax cut at source", `≈ ${inr(D.FY_TDS)}`, "this tax year")}${tile("Company deposits", lakh(D.LAYERS.find((l) => l.key === "co").v), "no cover")}${tile("Government", lakh(D.LAYERS.find((l) => l.key === "gov").v), "EPF, PPF, NSC")}</div></div><div style="display:grid;gap:10px;align-content:start">${D.COVER.map((c) => `<div class="row2"><div><b>${c.bank.name}</b></div><div class="am">${lakh(c.total)}</div><div class="mb" style="grid-column:1/-1;position:relative;height:9px"><i style="width:${(c.covered / maxCover) * 100}%"></i>${c.over ? `<i style="position:absolute;left:${(D.SETTINGS.cover / maxCover) * 100}%;width:${(c.over / maxCover) * 100}%;top:0;background:oklch(0.82 0.16 80)"></i>` : ""}<span style="position:absolute;left:${(D.SETTINGS.cover / maxCover) * 100}%;top:-3px;bottom:-3px;border-left:2px dashed #fff"></span></div><small>${c.over ? `${lakh(c.over)} above the cover` : `${lakh(D.SETTINGS.cover - c.total)} of room`}</small></div>`).join("")}</div></div>`;
  return `<div style="display:flex;flex-direction:column;gap:18px">${radios("b", B_KEYS, "all")}<div class="doors">${allDoor}${keys.map(doorFor).join("")}</div><section class="stg2">${allPanel}${keys.map(bankPanel).join("")}</section></div>`;
}

// ======================== G3 Bubbles ========================
export function g3() {
  const items = [...D.HELD.map((x) => ({ id: x.id, name: x.name, color: D.BANKS[x.bank].color, short: D.BANKS[x.bank].short, rate: x.interestRate, months: D.daysBetween(D.TODAY, x.maturityDate) / 30.4, value: D.valueOf(x), x })), ...D.PASSBOOKS.filter((p) => p.rate).map((p) => ({ id: p.id, name: p.name, color: p.color, short: p.name, rate: p.rate, months: p.matures ? 36 : 36.5, value: p.value, open: true, p }))];
  const x0 = -3, x1 = 39, y0 = 6, y1 = 8.7;
  const px = (m) => `calc(54px + (100% - 74px) * ${(m - x0) / (x1 - x0)})`, py = (r) => `calc(18px + (100% - 62px) * ${1 - (r - y0) / (y1 - y0)})`;
  const gx = [0, 6, 12, 18, 24, 30].map((m) => `<span class="gx" style="left:${px(m)}"></span><span class="ax" style="left:${px(m)};bottom:16px;transform:translateX(-50%)">${m === 0 ? "Today" : `+${m} mo`}</span>`).join("");
  const gy = [6.5, 7, 7.5, 8, 8.5].map((r) => `<span class="gy" style="top:${py(r)}"></span><span class="ax" style="left:12px;top:${py(r)};transform:translateY(-50%)">${r.toFixed(1)}%</span>`).join("");
  const band = `<span class="openband" style="left:${px(33)};right:20px"></span><span class="ax" style="left:${px(36)};top:22px;transform:translateX(-50%);text-align:center">Open-ended<br>or years off</span>`;
  const sz = (v) => 24 + 64 * Math.sqrt(v / 1200000);
  const bubs = items.map((it) => { const s = sz(it.value); return `<label class="pkl bub" for="c-${it.id}" style="left:${px(Math.min(it.months, it.open ? it.months : 33))};top:${py(it.rate)};width:${s}px;height:${s}px;background:${P.fillc(it.color, 155)}"><span class="nm">${s > 52 ? `${it.short}<br>${it.rate}%` : it.short}</span></label>`; }).join("");
  const plot = `<div class="plot">${gx}${gy}${band}${bubs}<span class="ax" style="left:54px;top:-0px;display:none"></span></div>`;
  const all = `<div class="vw-c vw-c-all"><div class="s-eb"><span>The map</span></div><h2 class="s-name">Rate against time left</h2><div class="s-big">${D.AVG_RATE.toFixed(2)}<small>%</small></div><div class="s-sub">average rate, weighted by worth</div><div class="s-tiles">${tile("Highest", `${Math.max(...D.ACTIVE.map((x) => x.interestRate)).toFixed(2)}%`, "Bajaj company FD")}${tile("Lowest", `${Math.min(...D.ACTIVE.map((x) => x.interestRate)).toFixed(2)}%`, "SBI tax-saver and recurring")}${tile("Biggest bubble", lakh(Math.max(...items.map((i) => i.value))), "PPF")}${tile("Soonest", D.NEXT.x.name, daysLeft(D.NEXT.date))}</div><div class="s-note" style="margin-top:14px">Higher is a better rate, further right is longer to wait, a bigger bubble is more money. Pick a bubble to open it; the stage takes its colour.</div></div>`;
  const per = D.HELD.map((x) => `<div class="vw-c vw-c-${x.id}">${info(x)}</div>`).join("") + D.PASSBOOKS.filter((p) => p.rate).map((p) => `<div class="vw-c vw-c-${p.id}">${pinfo(p)}</div>`).join("");
  return `<section class="stg2">${radios("c", C_KEYS, "all")}<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="s-ct" style="margin:0;font-size:15px">The rate map<small>every deposit and passbook holding, by what it pays and how long is left</small></div><label class="pkl chip-b" for="c-all">Show the map</label></div><div class="s-grid" style="grid-template-columns:7fr 5fr">${plot}<div>${all}${per}</div></div></section>`;
}

// ======================== G4 Interest stage ========================
export function g4() {
  const rows = (fn, cap) => {
    const list = [...D.ALL.map((x) => ({ n: x.name, c: D.BANKS[x.bank].color, v: fn(x) })), { n: "ICICI 1-year (2024), closed", c: "copper", v: cap === "ever" ? D.DEPOSITS.find((d) => d.id === "d8").maturityAmount - D.DEPOSITS.find((d) => d.id === "d8").principalAmount : 0 }].filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
    const mx = list[0].v;
    return `<div>${list.map((r) => `<div class="hb2"><span>${r.n}</span><span class="tr"><i style="width:${(r.v / mx) * 100}%"></i></span><b>${inr(r.v)}</b></div>`).join("")}</div>`;
  };
  const day = (x) => D.perDay(x), month = (x) => D.perDay(x) * 30.4;
  const fy = (x) => D.interestIn(x, L.addDays(D.FY_START, -1), D.TODAY);
  const ever = (x) => (x.compoundingType === "Non-Cumulative" ? sum(D.payouts(x).filter((p) => p.date <= D.TODAY).map((p) => p.amount)) : x.kind === "RD" ? D.RD.accrued : D.valueOf(x) - x.principalAmount);
  const closedInt = (() => { const d = D.DEPOSITS.find((x) => x.id === "d8"); return d.maturityAmount - d.principalAmount; })();
  const tot = { day: D.PER_DAY, month: D.PER_DAY * 30.4, fy: D.FY_SO, ever: sum(D.ALL.filter((x) => x.status !== "Closed").map(ever)) + closedInt };
  const chips = [["day", "A day"], ["month", "A month"], ["fy", "This tax year"], ["ever", "All time"]].map(([k, t]) => `<label class="pkl chip-b" for="e-${k}">${t}</label>`).join("");
  const panel = (k, eyebrow, caption, fn, tiles) => `<div class="vw-e vw-e-${k} s-grid" style="grid-template-columns:5fr 7fr"><div><div class="s-eb"><span>${eyebrow}</span></div><div class="s-big" style="font-size:84px">${big(tot[k])}</div><div class="s-sub">${caption}</div><div class="s-tiles">${tiles}</div></div><div class="s-chart"><div class="s-ct">Where it comes from<small>by deposit, largest first</small></div>${rows(fn, k)}</div></div>`;
  const stage = `${panel("day", "Earned every day, right now", "on the deposits still running, at today's pace", day, tile("A month", inr(tot.month), "at this pace") + tile("A year", inr(tot.month * 12), "if nothing is renewed") + tile("So far today", inr(D.PER_DAY * 0.6), "at 2 pm, by the hour") + tile("Best earner", "Axis payout", `${inr(D.perDay(D.DEPOSITS[3]))} a day`))}
${panel("month", "A month of interest", "30 days at today's pace", month, tile("A day", inr(D.PER_DAY), "") + tile("Paid out to you", inr(sum(D.ACTIVE.filter((x) => x.compoundingType === "Non-Cumulative").map((x) => (x.principalAmount * x.interestRate) / 1200))), "Axis, as quarterly payouts") + tile("Built up in place", inr(tot.month - sum(D.ACTIVE.filter((x) => x.compoundingType === "Non-Cumulative").map((x) => (x.principalAmount * x.interestRate) / 1200))), "cumulative deposits and RD") + tile("Tax year so far", lakh(D.FY_SO), "since April"))}
${panel("fy", "Interest since 1 April", "this tax year, from deposits and the RD", fy, tile("By 31 March", lakh(D.FY_FULL), "at today's pace") + tile("Tax at your slab", `≈ ${lakh(D.FY_TAX)}`, `${D.SETTINGS.slab * 100}%, an estimate`) + tile("Cut at source", `≈ ${inr(D.FY_TDS)}`, "Axis and Bajaj") + tile("Payers over their limit", String(D.FYROWS.filter((r) => r.over).length), "of " + D.FYROWS.length))}
${panel("ever", "Interest earned so far, in all", "on everything you have placed, closed deposits included", ever, tile("On deposits still held", lakh(D.DEP_ACCRUED), "") + tile("On closed ones", lakh(closedInt), "ICICI 2024") + tile("Average rate", `${D.AVG_RATE.toFixed(2)}%`, "weighted by worth") + tile("Placed in all", lakh(D.DEP_PUT), "deposits held"))}`;
  return `<section class="stg2">${radios("e", E_KEYS, "day")}<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">The interest stage<small>what your deposits earn, over the period you pick</small></div><div style="display:flex;gap:8px">${chips}</div></div>${stage}</section>`;
}

export const BOARDS2 = { g1, g2, g3, g4 };
export const render2 = (k) => () => body(BOARDS2[k]());
