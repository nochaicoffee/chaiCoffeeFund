// The chart widget board: all six options at full width, driven by one row of picks so each can be tried with any account.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import { board } from "./board.mjs";
const { I, mono, allMono, inrS } = L;

const OPTIONS = [
  { k: "river", n: "C1", why: "Shows the total and what it's made of in one picture. The carried-forward stretch of a stale balance is hatched, so you see what the total is guessing. Small accounts are thin bands." },
  { k: "glow", n: "C2", why: "The closest to the Cards trend: one line with its high and low, and each month's change as bars under it. With a pick it redraws on that account's own scale." },
  { k: "bridge", n: "C3", why: "From Jan 1 to today in steps: income in, then card bills, subscriptions, EMIs and investments out, and whatever's left as Everything else. Worked out from the rest of the app." },
  { k: "flow", n: "C4", why: "One month's money through every account, in on the left and out on the right. The most striking, and the most honest about what isn't recorded: transfers between your own accounts show on both sides." },
  { k: "multiples", n: "C5", why: "Every account on its own scale, so ₹18,900 moves as visibly as ₹6,58,000. Good for spotting a forgotten account." },
  { k: "calendar", n: "C6", why: "A cell per month per account: when you recorded a balance, how it moved, and where the gaps are. The stale balance shows as amber." },
];
export function chartsBoard() {
  const prefix = "ch";
  const pk = P.picker(prefix, (dsel, id) => `${dsel} .chp-${id} { background: var(--ink); color: var(--on-ink); }`);
  const chips = `<div class="row" style="gap:8px;flex-wrap:wrap;position:sticky;top:0"><span class="card-note" style="margin-right:4px">Try it with</span>${P.IDS.map((id) => { const f = P.FACTS[id]; return `<label for="${prefix}-sel-${id}" class="chip chp-${id}" style="cursor:pointer;padding:7px 13px 7px 7px;gap:8px;background:var(--surface);border:1px solid var(--surface-line)">${f.all ? allMono(20) : mono(f.a, 20)}${f.short}${f.stale ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--warning)"></span>` : ""}${f.on ? "" : "<em>closed</em>"}</label>`; }).join("")}</div>`;
  const cards = OPTIONS.map((o) => `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:12px;align-items:flex-start"><span class="pill pill-ink" style="font-size:12px;padding:5px 11px">${o.n} · ${C.CHARTS[o.k].name}</span><p class="card-note" style="font-size:13px;max-width:1100px;margin-top:3px">${o.why}</p></div>${C.chartCard(o.k, prefix, { w: 1456, h: o.k === "flow" ? 440 : 360 })}</div>`).join("");
  return board({ w: 1600, title: "The chart widget: six options", sub: "You asked for a striking chart on this page. Each option below is the full-width card at the end of the page (or the hero, in C and D). Pick one or two; a pair becomes a switch like the Subscriptions chart. <b>Try each with an account</b> using the row below: everything follows the pick.", body: `${C.DEFS()}${pk.css}${pk.open}${chips}${cards}${pk.close}` });
}
