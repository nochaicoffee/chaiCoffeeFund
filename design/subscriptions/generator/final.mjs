// States for the final design (2026-10-21): the coloured cover-flow hero in its key states, and the chart switch's empty state.
import * as L from "./lib.mjs";
import * as SC from "./selcore.mjs";
import * as S1 from "./sel1.mjs";
import * as CR from "./carousels.mjs";
import * as FL from "./flow.mjs";
import { section, frame, board } from "./states.mjs";
const { inr, fmt, I, btn, rings } = L;
const { facts, subOf, IDS } = SC;

const toast = (text) => `<div style="display:flex;align-items:center;gap:12px;background:var(--ink);color:var(--on-ink);border-radius:14px;padding:9px 9px 9px 14px;font-size:12.5px;font-weight:600;box-shadow:var(--pop-shadow);position:relative;overflow:hidden;width:max-content">${I.check(12)}<span>${text}</span><span style="padding:6px 11px;border-radius:9px;background:oklch(1 0 0 / 0.14);font-weight:800">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:62%;background:var(--accent)"></span></div>`;
const STATE_CSS = `<style>
  .fstate .stage-deep { --sel-ring: var(--pick-soft); }
  .fstate .stage-deep .track > span { background: var(--pick-soft) !important; }
  .fstate .stage-deep .btn-primary { background: var(--pick-soft); color: var(--pick-ink); }
</style>`;

/** The coloured stage, drawn for one pick without radios: covers placed as the carousel would place them. */
function staticFlow(id, { hero = null, under = "" } = {}) {
  const f = facts(subOf(id));
  const k = IDS.indexOf(id);
  const place = CR.s1Place({ near: 110, step: 46, rot: 58 });
  const covers = IDS.map((jid, i) => { const p = place(CR.wrap(i, k)); const g = facts(subOf(jid)); return `<div style="position:absolute;left:50%;top:14px;transform:${p.t};z-index:${p.z};opacity:${p.o};border-radius:14px;${jid === id ? "box-shadow:0 0 0 3px var(--surface),0 0 0 5.5px var(--pick-soft),0 24px 40px oklch(0 0 0 / 0.35);" : ""}">${CR.tile(g, 150, 106, { reflect: true, small: true })}</div>`; }).join("");
  return `<section class="card glass textured stage-dark stage-deep" style="${FL.pickVars(id)}gap:6px;padding:4px 16px 18px;overflow:hidden;background:${FL.STAGES.deep.layer(f)}">${rings(700, 600, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}
    <div style="position:relative;height:190px;perspective:900px;overflow:hidden;margin:0 -16px">${covers}</div>${hero ?? S1.sHero(f, { ph: true })}${under}</section>`;
}

function emptyHero() {
  const f = { ...facts(null), monthly: 0 };
  const allTile = CR.tile({ ...facts(null), monthly: 0, all: true, alias: "All" }, 150, 106, { small: true }).replace("₹5,559 / month", "₹0 / month").replace(`${L.ACTIVE.length} active`, "0 active");
  return `<section class="card glass textured stage-dark stage-deep" style="${FL.pickVars("all")}gap:10px;padding:18px 16px 22px;overflow:hidden;background:${FL.STAGES.deep.layer(facts(null))}">${rings(700, 500, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}
    <div class="row" style="gap:14px;justify-content:center;padding:16px 0 10px"><div style="box-shadow:0 0 0 3px var(--surface),0 0 0 5.5px var(--pick-soft);border-radius:14px">${allTile}</div><span style="width:150px;height:106px;border-radius:14px;border:1.5px dashed oklch(1 0 0 / 0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted)">${I.plus(16)}Add subscription</span></div>
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="eyebrow">Nothing yet</span><b style="font-size:22px">Add your first subscription</b><p style="font-size:13px;line-height:1.55;color:var(--muted);max-width:420px">Each one becomes a card here. Turn to it to see what it costs, when it renews and what you've paid.</p>${btn("Add subscription", { kind: "primary", cls: "btn-sm", icon: I.plus(11) })}</div></section>`;
}

function emptyChart() {
  const cells = Array.from({ length: 7 * 22 }, () => `<span style="width:11px;height:11px;border-radius:3px;background:var(--heat-no-data)"></span>`).join("");
  return `<section class="card glass" style="gap:12px"><span class="seg"><span class="seg-i on">Day by day</span><span class="seg-i">Payment trend</span><span class="seg-i">Lifetime cost</span></span>
    <div style="position:relative"><div style="display:grid;grid-template-rows:repeat(7,11px);grid-auto-flow:column;grid-auto-columns:11px;gap:3px;opacity:0.8">${cells}</div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span class="pill pill-off" style="font-size:12px;padding:6px 12px;background:var(--surface);box-shadow:var(--soft-shadow)">Renewals land on their day here</span></div></div></section>`;
}

export function finalStates() {
  const due = staticFlow("netflix");
  const paidHero = S1.sHero(facts(L.sub("netflix")), { ph: true }).replace("Renews Fri, Oct 23 · in 3 days", "Paid Oct 23 · next Mon, Nov 23").replace(/width:9\d(\.\d+)?%;background:var\(--card-ruby\)/, "width:4%;background:var(--card-ruby)").replace(/Fri, Oct 23<\/b>/g, "Mon, Nov 23</b>").replace(/in 3 days/g, "in 34 days").replace(/<span class="btn btn-primary[^"]*"[^>]*>[\s\S]*?Mark paid<\/span>/, `<span class="pill" style="background:var(--pick-soft);color:var(--pick-ink);padding:7px 14px;font-size:12.5px">${I.check(11)} Paid Oct 23</span>`);
  const paid = staticFlow("netflix", { hero: paidHero, under: `<div style="display:flex;justify-content:center;margin-top:12px">${toast("Netflix: ₹649 paid on Oct 23")}</div>` });
  const g = (cols, ...x) => `<div style="display:grid;grid-template-columns:${cols};gap:22px;align-items:start">${x.join("")}</div>`;
  return `${FL.STYLES}${STATE_CSS}<div class="fstate">${board({ title: "Final design: states", intro: "The coloured cover-flow hero you picked, in its key states. The card's colour, the bar, the button and the ring on the picked card all follow the pick; All is emerald. The chart below switches between Day by day, Payment trend and Lifetime cost.", body: [
    section(1, "No subscriptions yet", "Only the All card, at ₹0, beside an add card. The chart keeps its shape, with a note on what will appear.", g("1fr 1fr", frame("Hero", emptyHero()), frame("Chart", emptyChart()))),
    section(2, "A renewal due soon, and after Mark paid", "Netflix renews in 3 days: the stage turns ruby, and Mark paid is one click. After it, the bar starts the next cycle and Undo stays for 6 seconds.", g("1fr 1fr", frame("Due in 3 days", due), frame("After Mark paid", paid))),
    section(3, "Paused and cancelled", "They stay in the circle, greyed on their cover. Resume or Restart takes the button's place.", g("1fr 1fr", frame("Paused: Headspace", staticFlow("headspace")), frame("Cancelled: SonyLIV", staticFlow("sonyliv")))),
    section(4, "Every colour, at a glance", "What each pick's stage looks like.", `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${IDS.slice(0, 8).map((id) => { const f = facts(subOf(id)); return `<div class="textured stage-dark stage-deep" style="${FL.pickVars(id)}border-radius:18px;padding:16px;background:${FL.STAGES.deep.layer(f)};display:flex;flex-direction:column;gap:8px;color:var(--fg)"><b style="font-size:14px">${f.alias}</b><div class="track" style="height:6px"><span style="width:62%"></span></div><span class="btn btn-primary btn-xs" style="align-self:flex-start">${f.all ? "Record payment" : "Mark paid"}</span></div>`; }).join("")}</div>`),
  ].join("") })}</div>`;
}
