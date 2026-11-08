// Round 1: four ideas for the hero of the Expenses page. Each sits on the same page (parts.mjs) and picks a month the same way
// (radios named "m"; the month chips, the table rows and the hero's own marks are labels for them), so the whole page follows the pick.
// E1 Split: what came in, split into invested, kept and spent, and spent opened into its parts.
// E2 Bridge: the calculation itself, from the bank at the start of the month to the bank at its end.
// E3 Year: twelve months of spending as stacked columns, the big spends pinned on them.
// E4 Receipt: the month printed as a receipt, the months as a stack of tabs beside it.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr } = L;
const { col, lakh, signed, mon, monthY, monthName, lastDay, perMonth, radios, big } = P;

const usualPill = (m) => {
  const d = m.spent - D.AVG_SPENT;
  return `<span class="dpill ${d > 0 ? "dn" : "up"}">${d > 0 ? I.up() : I.down()} ${lakh(Math.abs(d))} <small>${d > 0 ? "more" : "less"} than your usual ${lakh(D.AVG_SPENT)}</small></span>`;
};
const bigPill = (m) => { const b = D.bigIn(m.key); const s = b.reduce((t, x) => t + x.amt, 0); return b.length ? `<span class="dpill">${I.star(11)} ${lakh(s)} <small>of it ${b.length === 1 ? b[0].what.toLowerCase() : `${b.length} big spends`}</small></span>` : `<span class="dpill"><small>no big spends</small></span>`; };
const headOf = (m, label = "Spent in") => `<div class="eyebrow-s">${label} ${monthY(m.key).toUpperCase()}</div><div class="nwc">${big(m.spent)}</div><div class="hp">${usualPill(m)}${bigPill(m)}</div>`;

// ---------- E1 Split ----------
function e1() {
  const view = (m) => {
    const out = m.inv + m.lent + m.spent + Math.max(0, m.kept); // the width of everything that left or stayed
    const total = Math.max(m.inc, out);
    const w = (v) => `${(v / total) * 100}%`;
    const fromSavings = m.kept < 0 ? -m.kept : 0;
    const top = `<div class="sp-in" style="width:${w(m.inc)}"><span>Came in</span><b>${inr(m.inc)}</b></div>${fromSavings ? `<div class="sp-sav" style="width:${w(fromSavings)}"><span>from savings</span><b>${inr(fromSavings)}</b></div>` : ""}`;
    const seg = (k, v, name, cls) => (v > 0 ? `<div class="sp-s ${cls}${v / total < 0.07 ? " tiny" : ""}" style="width:${w(v)}"><span>${name}</span><b>${lakh(v)}</b></div>` : "");
    const mid = `${seg("spent", m.spent, "Spent", "sp-spent")}${seg("inv", m.inv, "Invested", "sp-inv")}${seg("lent", m.lent, "Lent out", "sp-lent")}${seg("kept", Math.max(0, m.kept), "Kept", "sp-kept")}`;
    const parts = D.PARTS.filter((p) => m[p.k] > 0).map((p) => `<div class="sp-p${p.worked ? " hat" : ""}" style="flex:${m[p.k]};--pc:${col(p.color)}"><span>${p.short}</span><b>${lakh(m[p.k])}</b></div>`).join("");
    const spentW = (m.spent / total) * 100;
    return `<div class="e1">${headOf(m)}<div class="sp"><div class="sp-row">${top}</div><div class="sp-row">${mid}</div><svg class="sp-fan" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 0 L${spentW} 0 L100 10 L0 10 Z"></path></svg><div class="sp-parts">${parts}</div></div></div>`;
  };
  return `<section class="stg2 ex-h" data-b="e1">${perMonth(view)}${P.monthChips()}</section>`;
}

// ---------- E2 Bridge ----------
function e2() {
  const W = 1330, H = 392, top = 30, bot = 300;
  const view = (m) => {
    const start = D.bankBefore(m.key), end = D.BANK_END[m.key];
    const steps = [
      { name: "In the bank", sub: `on ${lastDay(D.MKEYS[Math.max(0, D.MKEYS.indexOf(m.key) - 1)])}`, kind: "total", v: start },
      { name: "Came in", sub: "salary and other income", kind: "in", v: m.inc },
      ...(m.back ? [{ name: "Came back", kind: "in", v: m.back }] : []),
      { name: "Invested", sub: "shares, funds, FDs", kind: "save", v: -m.inv },
      ...(m.lent ? [{ name: "Lent out", sub: "to a friend", kind: "save", v: -m.lent }] : []),
      ...D.PARTS.filter((p) => m[p.k] > 0).map((p) => ({ name: p.name, sub: p.worked ? "worked out" : p.note, kind: p.worked ? "worked" : "out", color: p.color, v: -m[p.k] })),
      { name: "In the bank", sub: `on ${lastDay(m.key)}`, kind: "total", v: end },
    ];
    let run = 0; const pts = [];
    for (const s of steps) { if (s.kind === "total") { pts.push([0, s.v]); run = s.v; } else { pts.push([run, run + s.v]); run += s.v; } }
    const hi = Math.max(...pts.flat()) * 1.06;
    const y = (v) => bot - (v / hi) * (bot - top);
    const n = steps.length, gap = W / n, bw = gap * 0.62;
    const bars = steps.map((s, i) => {
      const [a, b] = pts[i]; const y1 = y(Math.max(a, b)), y2 = y(Math.min(a, b)), x = i * gap + (gap - bw) / 2;
      const fill = s.kind === "total" ? "#fff" : s.kind === "in" ? "oklch(0.8 0.15 150)" : s.kind === "save" ? "oklch(0.8 0.1 250)" : col(s.color);
      const lbl = s.kind === "total" ? inr(s.v) : `${s.v > 0 ? "+" : "−"}${lakh(Math.abs(s.v))}`;
      const link = i < n - 1 ? `<line class="br-k" x1="${x + bw}" x2="${x + gap}" y1="${y(pts[i][s.kind === "total" ? 1 : 1])}" y2="${y(pts[i][1])}"></line>` : "";
      return `<g class="br-g br-${s.kind}"><rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(3, y2 - y1)}" rx="7" style="fill:${fill}" ${s.kind === "worked" ? 'class="br-w"' : ""}></rect>${s.kind === "worked" ? `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(3, y2 - y1)}" rx="7" fill="url(#hatch)"></rect>` : ""}<text class="br-v${s.kind === "total" ? " t" : ""}" x="${x + bw / 2}" y="${y1 - 9}">${lbl}</text><text class="br-n" x="${x + bw / 2}" y="${bot + 22}">${s.name}</text><text class="br-s" x="${x + bw / 2}" y="${bot + 39}">${s.sub ?? ""}</text>${link}</g>`;
    }).join("");
    const spentL = steps.findIndex((s) => s.kind === "out" || s.kind === "worked");
    const x0 = spentL * gap + 6, x1 = (n - 1) * gap - 6;
    const brace = `<path class="br-br" d="M${x0} ${H - 8} L${x0} ${H - 14} L${x1} ${H - 14} L${x1} ${H - 8}"></path><text class="br-bt" x="${(x0 + x1) / 2}" y="${H - 20}">spent ${inr(m.spent)}</text>`;
    const svg = `<svg class="br" viewBox="0 0 ${W} ${H + 4}"><defs><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="9" fill="oklch(1 0 0 / 0.35)"></rect></pattern></defs><line class="br-0" x1="0" x2="${W}" y1="${bot}" y2="${bot}"></line>${bars}${brace}</svg>`;
    return `<div class="e2-top"><div>${headOf(m)}</div><div class="e2-eq"><b>How it's worked out</b><span>${inr(start)} in the bank</span><span>+ ${inr(m.inc)} came in</span><span>− ${inr(m.inv + m.lent)} invested${m.lent ? " or lent" : ""}</span><span>− ${inr(end)} still in the bank</span><span class="eq">= ${inr(m.spent)} spent</span></div></div>${svg}`;
  };
  return `<section class="stg2 ex-h" data-b="e2">${perMonth(view)}${P.monthChips()}</section>`;
}

// ---------- E3 Year ----------
function e3() {
  const W = 920, H = 380, top = 46, bot = 330;
  const max = Math.max(...D.MONTHS.map((m) => m.spent)) * 1.08;
  const y = (v) => bot - (v / max) * (bot - top);
  const gap = W / 12, bw = gap * 0.58;
  const cols = D.MONTHS.map((m, i) => {
    const x = i * gap + (gap - bw) / 2;
    let run = 0;
    const segs = D.PARTS.filter((p) => m[p.k] > 0).map((p) => { const y1 = y(run + m[p.k]), y2 = y(run); run += m[p.k]; return `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(1, y2 - y1 - 1.5)}" rx="3" style="fill:${col(p.color)}"${p.worked ? ' class="yr-w"' : ""}></rect>`; }).join("");
    const pins = D.bigIn(m.key).map((b, j) => `<g transform="translate(${x + bw / 2} ${y(m.spent) - 22 - j * 30})"><circle r="13" style="fill:${col(D.CATS[b.cat].color)}"></circle><g transform="translate(-7 -7)" style="color:#fff">${I[D.CATS[b.cat].icon](14).replace("<svg", '<svg x="0" y="0"')}</g></g>`).join("");
    return `<g class="yr-c yr-${m.key}">${segs}${pins}<text class="yr-m" x="${x + bw / 2}" y="${bot + 22}">${mon(m.key)}</text><text class="yr-v" x="${x + bw / 2}" y="${bot + 40}">${lakh(m.spent)}</text></g>`;
  }).join("");
  const avg = `<line class="yr-a" x1="0" x2="${W}" y1="${y(D.AVG_SPENT)}" y2="${y(D.AVG_SPENT)}"></line><text class="yr-at" x="4" y="${y(D.AVG_SPENT) - 8}">your usual ${lakh(D.AVG_SPENT)} a month</text>`;
  const hits = D.MONTHS.map((m, i) => `<label class="yr-hit pkl" for="m-${m.key}" style="left:${(i / 12) * 100}%;width:${100 / 12}%"></label>`).join("");
  const chart = `<div class="yr"><svg viewBox="0 0 ${W} ${H}">${avg}${cols}</svg>${hits}</div>`;
  const key = `<div class="yr-key">${D.PARTS.map((p) => `<span><i class="${p.worked ? "hat" : ""}" style="background:${col(p.color)}"></i>${p.name}</span>`).join("")}<span>${I.star(10)} a big spend</span></div>`;
  const panel = (m) => `<div class="yr-p">${headOf(m)}<div class="yr-l">${D.PARTS.filter((p) => m[p.k] > 0).map((p) => `<div><i style="background:${col(p.color)}"></i><span>${p.name}</span><b>${inr(m[p.k])}</b></div>`).join("")}</div>${D.bigIn(m.key).length ? `<div class="yr-b">${D.bigIn(m.key).map((b) => `<div>${P.catIcon(b.cat, 13)}<span>${b.what}<small>${b.via}</small></span><b>${inr(b.amt)}</b></div>`).join("")}</div>` : `<div class="yr-none">No big spends. Without them, a usual month is ${lakh(D.MONTHS.reduce((s, x) => s + D.usual(x), 0) / 12)}.</div>`}<div class="yr-s"><span>Invested <b>${inr(m.inv)}</b></span><span>Kept <b>${signed(m.kept)}</b></span></div></div>`;
  return `<section class="stg2 ex-h e3" data-b="e3"><div class="e3-l"><div class="eyebrow-s">Twelve months of spending · ${lakh(D.TOTALS.spent)} in all</div>${chart}${key}</div><div class="e3-r">${perMonth(panel)}</div></section>`;
}

// ---------- E4 Receipt ----------
function e4() {
  const max = Math.max(...D.MONTHS.map((m) => m.spent));
  const tabs = `<div class="rc-tabs">${[...D.MONTHS].reverse().map((m) => `<label class="rc-tab pkl" for="m-${m.key}"><span><b>${monthY(m.key)}</b>${D.bigIn(m.key).length ? I.star(10) : ""}</span><span class="rc-tb"><i style="width:${(m.spent / max) * 100}%"></i></span><small>${inr(m.spent)}</small></label>`).join("")}</div>`;
  const line = (name, v, { sub = "", cls = "" } = {}) => `<div class="rc-l ${cls}"><span>${name}${sub ? `<small>${sub}</small>` : ""}</span><b>${v}</b></div>`;
  const receipt = (m) => {
    const bs = D.bigIn(m.key);
    const lines = D.PARTS.filter((p) => m[p.k] > 0).map((p) => {
      const inside = bs.filter((b) => b.part === p.k).map((b) => line(`★ ${b.what}`, inr(b.amt), { sub: `${b.via} · ${P.dm(b.date)}`, cls: "rc-big" })).join("");
      return line(p.name.toUpperCase(), inr(m[p.k]), { sub: p.worked ? "worked out: what no record explains" : p.note }) + inside;
    }).join("");
    return `<div class="rc"><div class="rc-hd"><b>chaiCoffeeFund</b><span>${monthY(m.key).toUpperCase()}</span><small>1 ${mon(m.key)} to ${lastDay(m.key)} · savings and salary accounts</small></div><div class="rc-cut"></div>${lines}<div class="rc-cut"></div>${line("TOTAL SPENT", inr(m.spent), { cls: "rc-tot" })}<div class="rc-cut"></div><div class="rc-not"><div class="rc-nt">NOT SPENT</div>${line("Invested", inr(m.inv))}${m.lent ? line("Lent out", inr(m.lent)) : ""}${line(m.kept < 0 ? "Taken from savings" : "Kept in the bank", inr(Math.abs(m.kept)))}${line("CAME IN", inr(m.inc), { cls: "rc-in" })}</div><div class="rc-bc"></div><div class="rc-ft">${usualPill(m).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</div></div>`;
  };
  return `<section class="stg2 ex-h e4" data-b="e4"><div class="e4-l"><div class="eyebrow-s">Every month, as a receipt</div>${tabs}</div><div class="e4-r">${perMonth(receipt)}</div></section>`;
}

const HEROES = { e1, e2, e3, e4 };
export const render = (id, o = {}) => () => P.pageWith(`${radios("m", D.MKEYS, D.LAST)}${HEROES[id]()}`, o);
