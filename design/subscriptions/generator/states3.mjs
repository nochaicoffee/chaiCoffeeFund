// Key states for I, J, K and the two newer Renewals layouts.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as Id from "./i.mjs";
import * as R2 from "./renewals2.mjs";
import { section, frame, board } from "./states.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, rings } = L;

const card = (inner, extra = "") => `<section class="card glass" style="${extra}">${inner}</section>`;
const empty = (title, body, cta = true) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:12px 0"><span style="width:44px;height:44px;border-radius:14px;background:var(--accent-tint);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${I.subs(20)}</span><b style="font-size:15px">${title}</b><p class="card-note" style="max-width:380px">${body}</p>${cta ? btn("Add subscription", { kind: "primary", cls: "btn-sm", icon: I.plus(12) }) : ""}</div>`;
const grid = (cols, ...items) => `<div style="display:grid;grid-template-columns:${cols};gap:22px;align-items:start">${items.join("")}</div>`;
const toast = (text) => `<div style="display:flex;align-items:center;gap:12px;background:var(--ink);color:var(--on-ink);border-radius:14px;padding:9px 9px 9px 14px;font-size:12.5px;font-weight:600;box-shadow:var(--pop-shadow);position:relative;overflow:hidden;width:max-content">${I.check(12)}<span>${text}</span><span style="padding:6px 11px;border-radius:9px;background:oklch(1 0 0 / 0.14);font-weight:800">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:62%;background:var(--accent)"></span></div>`;
const bare = (html) => html.replace(/ for="i-sel-/g, ' data-for="i-sel-');

function iRow() {
  const emptyI = card(`<div style="display:grid;grid-template-columns:200px 1fr;gap:16px"><div style="background:var(--fill);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px">${[1, 2, 3].map(() => `<div style="height:40px;border-radius:12px;border:1.5px dashed var(--fill-strong)"></div>`).join("")}</div><div style="border-radius:16px;border:1.5px dashed var(--fill-strong);display:flex;align-items:center;justify-content:center;padding:16px">${empty("Nothing to show yet", "Add a subscription and it appears on the left. Pick it to see its price history and renewals here.")}</div></div>`);
  const due = card(`<div style="display:flex;flex-direction:column;gap:2px;background:var(--fill);border-radius:16px;padding:6px">${bare(Id.listRow(L.sub("netflix"))).replace('class="irow" style="', 'class="irow" style="background:var(--surface);box-shadow:var(--soft-shadow),inset 0 0 0 1.5px var(--accent-edge);')}${bare(Id.listRow(L.sub("icloud")))}</div><div class="row" style="gap:10px">${btn("Mark paid", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}<span class="card-note">The list's pill pulses within 3 days; the pane's Mark paid is one click.</span></div>${toast("Netflix: ₹649 paid on Oct 23")}`);
  const off = card(Id.pane(L.sub("sonyliv"), { ph: true }).replace(/<section class="card glass" style="gap:8px;padding:18px 20px">[\s\S]*?<\/section>/, ""));
  return grid("1fr 1fr 1fr", frame("Empty", emptyI), frame("Due in 3 days", due), frame("A cancelled one, picked", off));
}

function jRow() {
  const emptyJ = card(`<div class="textured" style="border-radius:22px;padding:22px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:6px">${rings(460, 150, { opacity: 0.1 })}<span class="eyebrow" style="color:oklch(0.38 0.08 152)">2026 so far</span><span style="font-size:46px;font-weight:800;line-height:1">₹0</span><span style="font-size:14px;font-weight:600;color:oklch(0.32 0.06 152)">a year, so far</span></div>${empty("Your year starts with the first one", "Each section below fills in as you add subscriptions and record what they cost.")}`);
  const noRise = card(`<span class="eyebrow">What changed</span><h2 style="font-size:22px;font-weight:800;line-height:1.25">No prices went up this year.</h2><p class="card-note" style="font-size:13px">Every payment cost the same as the one before it. The section stays, so a quiet year reads as good news, not as missing data.</p>`);
  const noStop = card(`<span class="eyebrow">What you stopped</span><h2 style="font-size:22px;font-weight:800;line-height:1.25">Nothing paused or cancelled.</h2><p class="card-note" style="font-size:13px">When you pause or cancel one, this shows what it saves a year.</p>`);
  return grid("1fr 1fr 1fr", frame("Empty", emptyJ), frame("A year with no price changes", noRise), frame("Nothing stopped", noStop));
}

function kRow() {
  const ghost = (span = 1) => `<div style="grid-column:span ${span};height:110px;border-radius:18px;border:1.5px dashed var(--fill-strong)"></div>`;
  const emptyK = card(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${ghost(2)}${ghost()}${ghost()}${ghost(2)}</div>${empty("Your widgets fill in here", "Each one answers a question: what you pay, what renews next, what's not recorded, and where it goes.")}`);
  const paid = card(`<div class="between"><span class="card-t" style="font-size:14px">Renews next</span><span class="pill pill-soon">In 4 days</span></div><div class="row" style="gap:12px">${mono(L.sub("icloud"), 40)}<div><b style="font-size:18px;display:block">iCloud+</b><span class="muted" style="font-size:12px;font-weight:600">${fmtDow("2026-10-24")} · Ace</span></div></div><div class="between" style="align-items:flex-end"><span style="font-size:40px;font-weight:800;line-height:1">4<span style="font-size:14px;color:var(--muted)"> days</span></span><b style="font-size:18px">${inr(219)}</b></div><span class="card-note">Netflix was marked paid, so the widget moves on to the next one.</span>${toast("Netflix: ₹649 paid on Oct 23")}`);
  const clear = card(`<div class="between"><span class="card-t" style="font-size:14px">Not recorded</span><span class="pill pill-on">${I.check(10)} 0</span></div><div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0"><span style="width:44px;height:44px;border-radius:50%;background:var(--accent-tint);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${I.check(18)}</span><b>Every renewal is recorded</b></div>`);
  return grid("1.3fr 1fr 1fr", frame("Empty", emptyK), frame("After Mark paid", paid), frame("Nothing to record", clear));
}

function r2Row() {
  const s = L.sub("netflix");
  const rows = L.renewalRows("2026-06-01", "2026-12-31", [s]);
  const one = card(`<div class="row" style="gap:10px"><span class="chip on" style="gap:8px">${mono(s, 16)}Netflix<span style="display:flex;opacity:0.7">${I.x(11)}</span></span><span class="card-note">${inr(L.paidSoFar(s))} paid since Feb 2024 · 32 payments</span></div>${R2.ledger({ rows, maxPast: 3, showUpTo: "2026-12-31" })}`);
  const miss = card(`${seg([{ label: "All", count: 79 }, { label: "Upcoming", count: 16 }, { label: "Paid", count: 61 }, { label: "Not recorded", count: 1, on: true }])}${R2.ledger({ rows: L.renewalRows("2026-01-01", "2026-12-31").filter((r) => r.status === "missing"), maxPast: 1, showUpTo: L.TODAY })}<p class="card-note">Only the months that have one are shown.</p>`);
  return grid("1.2fr 1fr", frame("Filtered to one subscription", one), frame("Not recorded only", miss));
}

function r3Row() {
  return grid("1fr", frame("Not recorded: everything else fades back", card(R2.grid({ dimExcept: "missing", subs: L.SUBS.filter((s) => ["icloud", "netflix", "spotify", "youtube"].includes(s.id)) }))), frame("Price changes: the cells where a payment cost more than the one before", card(R2.grid({ dimExcept: "change", subs: L.SUBS.filter((s) => ["netflix", "spotify", "youtube", "chatgpt"].includes(s.id)) }))));
}

export function newStates() {
  return board({ title: "I–K and Renewals 2–3: states", intro: "The newest directions and Renewals layouts with no data, after the common actions, and with their filters on.", body: [
    section("I", "Two panes", "", iRow()),
    section("J", "Year in review", "Each section keeps its place and says what's true, even when there's nothing to report.", jRow()),
    section("K", "Bento", "", kRow()),
    section("R2", "Renewals 2 · Ledger", "", r2Row()),
    section("R3", "Renewals 3 · Grid", "Filters fade the other cells instead of hiding them, so the grid keeps its shape.", r3Row()),
  ].join("") });
}
