// Round 8 objects (2026-10-21). Prathik liked the cheque book (O2) but not its blank lines, liked the passbook (O1),
// and liked the card except that its gold chip made it look like another credit card. So: cheque variants with
// every field filled in, passbook variants, cards without a chip, and five inline, symmetrical ways to show All.
import * as L from "./lib.mjs";
import * as U from "./uniq.mjs";
import * as O from "./objects.mjs";
const { inr, inrS, I, rings, grad, esc, monName } = L;

const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const INK = "oklch(0.36 0.13 262)";
const HAND = `font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:600;color:${INK}`;
const FOIL = "background:linear-gradient(100deg, oklch(0.76 0.1 78), oklch(0.94 0.07 92) 45%, oklch(0.74 0.11 74));-webkit-background-clip:text;background-clip:text;color:transparent";
const GOLD = "oklch(0.86 0.09 85)";
const PAPER = "oklch(0.985 0.006 90)";
const DIM = "oklch(0.45 0.02 260)";
const money = (n) => Math.round(n).toLocaleString("en-IN");
const words = (n) => U.inWords(n);
const up = (s) => esc(String(s).toUpperCase());
const initial = (a, s) => (a.all ? I.accounts(s) : esc(a.init));
const paper = (a, p) => `color-mix(in srgb, var(--card-${a.color}) ${p}%, ${PAPER})`;
const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const longDate = (iso) => `${Number(iso.slice(8, 10))} ${monName(iso.slice(0, 7))} ${iso.slice(0, 4)}`;
const chequeNo = (a) => String(124 + (a.last4 ? Number(a.last4) % 50 : 0)).padStart(6, "0");
const micr = (a) => `⑈${chequeNo(a)}⑈ 400${a.last4 ? `0${a.last4.slice(0, 2)}` : "000"}⑆ ${a.last4 ? `00${a.last4}` : "ALL"}⑈ 10`;
const dateBoxes = (iso) => `<span style="display:flex;gap:2px">${[...`${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`].map((c, i) => `<span style="width:11px;height:15px;border:1px solid oklch(0.45 0.02 260 / 0.4);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:10px;${HAND};margin-left:${i === 2 || i === 4 ? 3 : 0}px">${c}</span>`).join("")}</span>`;
const filled = (label, value, { size = 11.5, grow = true } = {}) => `<div style="display:flex;align-items:flex-end;gap:7px;min-width:0;${grow ? "flex:1" : ""}"><span style="font-size:9.5px;font-weight:700;color:${DIM};flex-shrink:0">${label}</span><span style="flex:1;min-width:0;border-bottom:1px solid oklch(0.45 0.02 260 / 0.35);padding:0 2px 1px;font-size:${size}px;line-height:1.25;${HAND};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</span></div>`;
const stubField = (label, value) => `<div style="display:flex;flex-direction:column;gap:1px;border-bottom:1px solid oklch(0.45 0.02 260 / 0.3);padding-bottom:2px"><span style="font-size:8px;font-weight:800;letter-spacing:0.06em;color:${DIM}">${label}</span><span style="font-size:11px;line-height:1.2;${HAND}">${value}</span></div>`;
const wordsLine = (a, { size = 10.5 } = {}) => `<div style="display:flex;align-items:flex-start;gap:7px;flex:1;min-width:0"><span style="font-size:9.5px;font-weight:700;color:${DIM};flex-shrink:0;padding-top:2px">Rupees</span><span style="flex:1;min-width:0;border-bottom:1px solid oklch(0.45 0.02 260 / 0.35);padding:0 2px 1px;font-size:${size}px;line-height:1.3;${HAND}">${a.bal == null ? "Add its first balance" : words(a.bal).replace(/^Rupees /, "")}</span></div>`;
const amountBox = (a, { size = 13 } = {}) => `<span style="flex-shrink:0;border:1.3px solid oklch(0.3 0.02 260 / 0.6);border-radius:5px;padding:3px 8px;background:oklch(1 0 0 / 0.6);${MONO};font-size:${size}px;font-weight:800;color:oklch(0.25 0.02 260)">${a.bal == null ? "₹ —" : `₹ ${money(a.bal)}/-`}</span>`;
const sign = (a, { align = "right" } = {}) => `<span style="text-align:${align}"><span style="display:block;font-size:17px;line-height:1;${HAND}">Prathik</span><span style="display:block;border-top:1px solid oklch(0.45 0.02 260 / 0.4);margin-top:2px;padding-top:2px;font-size:8.5px;font-weight:700;color:${DIM};white-space:nowrap">${a.all ? "Every account" : `${esc(a.title)} · ${esc(a.num)}`}</span></span>`;
const badge = (a, s = 22) => `<span style="width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.28)}px;background:${grad(a.color)};color:white;display:flex;align-items:center;justify-content:center;font-size:${Math.round(s * 0.5)}px;font-weight:800;flex-shrink:0">${initial(a, Math.round(s * 0.55))}</span>`;
const bookUnder = (a, w, h, top = 14) => `<div style="position:absolute;left:0;right:0;top:${top}px;bottom:0;border-radius:12px;background:${grad(a.color, 160)};box-shadow:0 16px 28px oklch(0 0 0 / 0.36)"></div><div style="position:absolute;left:3px;right:3px;top:8px;height:${h - 22}px;border-radius:10px;background:${paper(a, 24)}"></div><div style="position:absolute;left:1px;right:1px;top:4px;height:${h - 22}px;border-radius:10px;background:${paper(a, 18)}"></div>`;
const leafBg = (a) => `linear-gradient(110deg, ${paper(a, 16)}, ${paper(a, 5)} 60%, ${paper(a, 13)})`;
const guilloche = (a, w, h) => rings(w, h, { stroke: `var(--card-${a.color})`, opacity: 0.15, first: 12, step: 7, dx: -w / 2, dy: -h / 2 });

// ================= Cheque book, filled in =================
// C1 · Filled leaf: the O2 leaf with every field written in: date, Pay Self, the amount in words and figures, signed.
function c1(a) {
  const W = 360, H = 206, LH = 184;
  return `<div style="position:relative;width:${W}px;height:${H}px">${bookUnder(a, W, H)}
    <div style="position:absolute;left:0;right:0;top:0;height:${LH}px;border-radius:10px;background:${leafBg(a)};overflow:hidden;isolation:isolate;color:oklch(0.25 0.02 260);display:grid;grid-template-columns:80px 1fr">${guilloche(a, W, LH)}
      <div style="padding:12px 9px;border-right:2px dotted oklch(0.45 0.02 260 / 0.35);display:flex;flex-direction:column;gap:7px;min-width:0"><span style="${MONO};font-size:9px;font-weight:700">No. ${chequeNo(a)}</span>${stubField("DATE", a.date ? dmy(a.date) : "—")}${stubField("TO", "Self")}${stubField("₹", a.bal == null ? "—" : money(a.bal))}</div>
      <div style="padding:11px 13px 9px;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">${badge(a)}<span style="min-width:0"><b style="display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b><span style="display:block;font-size:9.5px;font-weight:700;color:${DIM}">${esc(a.kind)}</span></span><span style="margin-left:auto">${a.date ? dateBoxes(a.date) : ""}</span></div>
        <div style="display:flex;gap:8px;align-items:flex-end">${filled("Pay", "Self", { size: 13 })}${amountBox(a)}</div>
        <div style="display:flex">${wordsLine(a)}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><span style="${MONO};font-size:9.5px;letter-spacing:0.06em;color:oklch(0.3 0.02 260 / 0.8);white-space:nowrap">${micr(a)}</span>${sign(a)}</div>
      </div></div></div>`;
}
/** C1 crossed through and written CANCELLED, the way a cheque leaf is cancelled: for Close account. */
export const cancelled = (a) => `<div style="position:relative;width:360px;height:206px">${c1(a)}<svg width="360" height="184" viewBox="0 0 360 184" style="position:absolute;left:0;top:0;pointer-events:none" aria-hidden="true"><line x1="20" y1="168" x2="340" y2="18" stroke="oklch(0.5 0.17 25)" stroke-width="2.2"></line><line x1="34" y1="174" x2="352" y2="26" stroke="oklch(0.5 0.17 25)" stroke-width="2.2"></line></svg><span style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-25deg);padding:2px 12px;background:${PAPER};font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:700;font-size:22px;letter-spacing:0.12em;color:oklch(0.5 0.17 25)">CANCELLED</span></div>`;
// C2 · Clean leaf: no stub, everything centred: the bank, the figure, the words, then the MICR line.
function c2(a) {
  const W = 340, H = 186, LH = 164;
  return `<div style="position:relative;width:${W}px;height:${H}px">${bookUnder(a, W, H)}
    <div style="position:absolute;left:0;right:0;top:0;height:${LH}px;border-radius:10px;background:${leafBg(a)};overflow:hidden;isolation:isolate;color:oklch(0.25 0.02 260);padding:12px 16px 10px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center">${guilloche(a, W, LH)}
      <div style="display:flex;align-items:center;gap:8px">${badge(a, 20)}<b style="font-size:12px">${esc(a.sub)}</b><span style="font-size:9.5px;font-weight:700;color:${DIM}">· ${esc(a.kind)} · ${longDate(a.date)}</span></div>
      <span style="${MONO};font-size:24px;font-weight:800;letter-spacing:0.02em">₹ ${money(a.bal)}</span>
      <span style="font-size:12px;line-height:1.35;${HAND};max-width:290px">${words(a.bal)}</span>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;width:100%"><span style="${MONO};font-size:9.5px;letter-spacing:0.06em;color:oklch(0.3 0.02 260 / 0.8)">${micr(a)}</span>${sign(a)}</div>
    </div></div>`;
}
// C3 · Crossed: A/C PAYEE between two lines across the corner, as an Indian cheque is crossed; filled in.
function c3(a) {
  const W = 360, H = 200, LH = 178;
  return `<div style="position:relative;width:${W}px;height:${H}px">${bookUnder(a, W, H)}
    <div style="position:absolute;left:0;right:0;top:0;height:${LH}px;border-radius:10px;background:${leafBg(a)};overflow:hidden;isolation:isolate;color:oklch(0.25 0.02 260);padding:12px 15px 10px 15px;display:flex;flex-direction:column;justify-content:space-between">${guilloche(a, W, LH)}
      <span style="position:absolute;left:-18px;top:20px;transform:rotate(-35deg);border-top:1.5px solid ${INK};border-bottom:1.5px solid ${INK};padding:1px 18px;font-size:8.5px;font-weight:800;letter-spacing:0.12em;color:${INK}">A/C PAYEE</span>
      <div style="display:flex;align-items:center;gap:8px;padding-left:58px">${badge(a)}<span style="min-width:0"><b style="display:block;font-size:12px">${esc(a.sub)}</b><span style="display:block;font-size:9.5px;font-weight:700;color:${DIM}">${esc(a.kind)}</span></span><span style="margin-left:auto">${dateBoxes(a.date)}</span></div>
      <div style="padding-left:58px;display:flex;gap:8px;align-items:flex-end">${filled("Pay", esc(a.title), { size: 13 })}${amountBox(a)}</div>
      <div style="display:flex">${wordsLine(a)}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end"><span style="${MONO};font-size:9.5px;letter-spacing:0.06em;color:oklch(0.3 0.02 260 / 0.8)">${micr(a)}</span>${sign(a)}</div>
    </div></div>`;
}
// C4 · Counterfoil: a wide stub that records the last change, torn along a perforation from the leaf.
function c4(a) {
  const W = 370, H = 186, LH = 164;
  const f = a.all ? null : L.lastInterval(a.id);
  const d = a.all ? L.monthFlows(L.monthKey(L.TODAY)).delta : f ? f.delta : 0;
  const since = a.all ? "Sep 30" : f ? L.fmt(f.from.date) : "";
  const zig = Array.from({ length: 14 }, (_, i) => `${i % 2 ? 0 : 6}px ${((i / 13) * 100).toFixed(1)}%`).join(",");
  return `<div style="position:relative;width:${W}px;height:${H}px">${bookUnder(a, W, H)}
    <div style="position:absolute;left:0;top:0;width:112px;height:${LH}px;border-radius:10px 0 0 10px;background:${paper(a, 22)};color:oklch(0.25 0.02 260);padding:12px 12px;display:flex;flex-direction:column;justify-content:space-between;clip-path:polygon(0 0, calc(100% - 6px) 0, 100% 4%, calc(100% - 6px) 8%, 100% 12%, calc(100% - 6px) 16%, 100% 20%, calc(100% - 6px) 24%, 100% 28%, calc(100% - 6px) 32%, 100% 36%, calc(100% - 6px) 40%, 100% 44%, calc(100% - 6px) 48%, 100% 52%, calc(100% - 6px) 56%, 100% 60%, calc(100% - 6px) 64%, 100% 68%, calc(100% - 6px) 72%, 100% 76%, calc(100% - 6px) 80%, 100% 84%, calc(100% - 6px) 88%, 100% 92%, calc(100% - 6px) 96%, 100% 100%, 0 100%)"><span style="font-size:8.5px;font-weight:800;letter-spacing:0.12em;color:${DIM}">COUNTERFOIL</span><span><span style="display:block;font-size:9px;font-weight:700;color:${DIM}">Last change</span><b style="display:block;${MONO};font-size:15px;color:${d >= 0 ? "oklch(0.42 0.14 145)" : "oklch(0.5 0.17 25)"}">${d >= 0 ? "+" : "−"}${money(Math.abs(d))}</b><span style="display:block;font-size:9px;font-weight:700;color:${DIM}">since ${since}</span></span><span><span style="display:block;font-size:9px;font-weight:700;color:${DIM}">No. ${chequeNo(a)}</span><span style="font-size:11px;${HAND}">${dmy(a.date)}</span></span></div>
    <div style="position:absolute;left:116px;right:0;top:0;height:${LH}px;border-radius:0 10px 10px 0;background:${leafBg(a)};overflow:hidden;isolation:isolate;color:oklch(0.25 0.02 260);padding:11px 13px 9px;display:flex;flex-direction:column;justify-content:space-between">${guilloche(a, 254, LH)}
      <div style="display:flex;align-items:center;gap:8px">${badge(a)}<b style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b></div>
      ${filled("Pay", "Self", { size: 13 })}
      <div style="display:flex;gap:8px;align-items:flex-end">${filled("Rs", money(a.bal), { size: 12 })}</div>
      <span style="font-size:10.5px;line-height:1.3;${HAND}">${words(a.bal)}</span>
      <div style="display:flex;justify-content:space-between;align-items:flex-end"><span style="${MONO};font-size:9px;color:oklch(0.3 0.02 260 / 0.8)">⑈${chequeNo(a)}⑈ ${a.last4 ? `00${a.last4}` : "ALL"}⑈</span>${sign(a)}</div>
    </div></div>`;
}
// C5 · Cheque book cover: the closed book in the account's colour, its leaves' edges showing at the top.
function c5(a) {
  const W = 330, H = 176;
  const edges = Array.from({ length: 5 }, (_, i) => `<div style="position:absolute;left:${6 + i}px;right:${6 + i}px;top:${i * 3}px;height:20px;border-radius:8px 8px 0 0;background:${paper(a, 8 + i * 4)};box-shadow:0 -1px 0 oklch(0 0 0 / 0.06)"></div>`).join("");
  return `<div style="position:relative;width:${W}px;height:${H}px">${edges}
    <div style="position:absolute;left:0;right:0;top:16px;bottom:0;border-radius:12px;background:radial-gradient(circle at 80% 0%, oklch(1 0 0 / 0.16), transparent 50%), ${grad(a.color, 160)};box-shadow:0 18px 30px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.15);color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center">${rings(W, H - 16, { stroke: "var(--rings-light)", opacity: 0.06, count: 8 })}
      <span style="position:absolute;inset:9px;border:1.5px dashed oklch(0.86 0.09 85 / 0.45);border-radius:7px"></span>
      <span style="font-size:9px;font-weight:800;letter-spacing:0.24em;${FOIL}">CHEQUE BOOK</span>
      <b style="font-size:19px;line-height:1.1">${esc(a.title)}</b>
      <span style="font-size:11px;font-weight:600;color:var(--on-card-muted)">${esc(a.sub)} · ${esc(a.kind)}</span>
      <span style="margin-top:4px;padding:4px 14px;border-radius:999px;background:oklch(0 0 0 / 0.22);border:1px solid oklch(0.86 0.09 85 / 0.4);${MONO};font-size:12.5px;font-weight:800;letter-spacing:0.04em">${a.all ? `₹ ${money(a.bal)}` : `${esc(a.num)} · ₹${money(a.bal)}`}</span>
    </div></div>`;
}

// ================= Passbook =================
// P1 · Cover: O1 as it was, for comparison.
const p1 = (a) => O.OBJECTS[0].render(a);
// P2 · Open: the two-page spread: who it belongs to on the left, the last entries on the right.
function p2(a) {
  const W = 344, H = 212;
  const entries = a.all ? L.ACTIVE.slice().sort((x, y) => L.latest(y.id).balance - L.latest(x.id).balance).slice(0, 4).map((x) => [x.name, money(L.latest(x.id).balance)]) : a.id === "new" ? [["Opening balance", money(a.bal)]] : L.snapsOf(a.id).slice(-4).map((s) => [dmy(s.date), money(s.balance)]);
  const head = (t) => `<div style="height:22px;margin:-10px -10px 8px;padding:0 10px;display:flex;align-items:center;gap:6px;background:${grad(a.color, 90)};color:white;font-size:9.5px;font-weight:800;letter-spacing:0.04em;border-radius:${t}">${esc(a.sub.toUpperCase())}</div>`;
  const row = (k, v, b = false) => `<div style="display:flex;justify-content:space-between;gap:6px;padding:4px 0;border-bottom:1px solid oklch(0.6 0.05 170 / 0.18);font-size:9.5px"><span style="color:${DIM};font-weight:700;white-space:nowrap">${k}</span><span style="${b ? MONO : HAND};font-size:${b ? 10 : 11}px;font-weight:${b ? 800 : 600};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</span></div>`;
  const left = `${head("6px 0 0 0")}${row("Name", "Prathik")}${row("Account", esc(a.title))}${row("A/c no.", a.all ? `${L.ACTIVE.length} accounts` : esc(a.num.replace("A/c ", "")))}${row("Type", esc(a.kind))}${row("Since", a.since || "—")}`;
  const right = `${head("0 6px 0 0")}<div style="display:flex;justify-content:space-between;font-size:8px;font-weight:800;letter-spacing:0.06em;color:${DIM};padding-bottom:2px"><span>${a.all ? "ACCOUNT" : "DATE"}</span><span>BALANCE ₹</span></div>${entries.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid oklch(0.6 0.05 170 / 0.18);font-size:9.5px"><span style="${a.all ? "font-weight:700" : MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k}</span><span style="${MONO};font-weight:600">${v}</span></div>`).join("")}<div style="display:flex;justify-content:space-between;padding:6px 0 0;font-size:10.5px;font-weight:800"><span>Balance</span><span style="${MONO};border-bottom:3px double currentColor">${money(a.bal)}</span></div>`;
  return `<div style="position:relative;width:${W}px;height:${H}px;filter:drop-shadow(0 18px 28px oklch(0 0 0 / 0.36))"><div style="position:absolute;inset:-5px -6px;border-radius:12px;background:${grad(a.color, 160)}"></div><div style="position:relative;display:grid;grid-template-columns:1fr 1fr;height:100%;color:oklch(0.25 0.02 260)"><div style="padding:10px;background:${PAPER};border-radius:6px 2px 2px 6px;box-shadow:inset -14px 0 18px -16px oklch(0 0 0 / 0.35);overflow:hidden">${left}</div><div style="padding:10px;background:${PAPER};border-radius:2px 6px 6px 2px;box-shadow:inset 14px 0 18px -16px oklch(0 0 0 / 0.35);overflow:hidden">${right}</div></div></div>`;
}
// P3 · Cover with a band and a ribbon: the balance stamped on a band across the cover, a ribbon below.
function p3(a) {
  return `<div style="position:relative;width:176px;height:254px">
    <span style="position:absolute;left:50%;bottom:0;width:18px;height:40px;margin-left:-9px;background:linear-gradient(90deg, oklch(0.7 0.11 78), oklch(0.88 0.08 88), oklch(0.7 0.11 78));clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)"></span>
    <div style="position:absolute;left:0;top:0;width:176px;height:236px;border-radius:12px;background:radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.16), transparent 55%), ${grad(a.color, 160)};box-shadow:0 18px 34px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.16);color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 14px 18px;text-align:center">${rings(176, 236, { stroke: "var(--rings-light)", opacity: 0.06, count: 8 })}
      <span style="position:absolute;inset:9px;border:1.5px dashed oklch(0.86 0.09 85 / 0.45);border-radius:7px"></span>
      <span style="font-size:9px;font-weight:800;letter-spacing:0.24em;${FOIL}">PASSBOOK</span>
      <span style="width:48px;height:48px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);display:flex;align-items:center;justify-content:center;color:oklch(0.9 0.08 88)"><b style="font-size:22px;${a.all ? "" : FOIL}">${initial(a, 20)}</b></span>
      <span><b style="display:block;font-size:13.5px">${esc(a.title)}</b><span style="display:block;font-size:10.5px;font-weight:600;color:var(--on-card-muted);margin-top:2px">${esc(a.sub)}</span></span>
      <span style="align-self:stretch;margin:0 -14px;padding:7px 0;background:oklch(0 0 0 / 0.26);border-top:1px solid oklch(0.86 0.09 85 / 0.45);border-bottom:1px solid oklch(0.86 0.09 85 / 0.45)"><b style="display:block;${MONO};font-size:15px;letter-spacing:0.02em;color:oklch(0.95 0.04 90)">₹ ${money(a.bal)}</b><span style="display:block;font-size:8.5px;font-weight:800;letter-spacing:0.14em;${FOIL}">${a.all ? "EVERY ACCOUNT" : `${up(a.num)} · ${dmy(a.date)}`}</span></span>
    </div></div>`;
}
// P4 · First page: the passbook's opening page, printed with the account's details and its balance.
function p4(a) {
  const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid oklch(0.6 0.05 170 / 0.2);font-size:10px"><span style="color:${DIM};font-weight:700">${k}</span><b style="font-weight:700;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</b></div>`;
  return `<div style="position:relative;width:188px;height:244px;border-radius:10px;background:${PAPER};background-image:repeating-linear-gradient(180deg, transparent 0 21px, oklch(0.6 0.05 170 / 0.08) 21px 22px);box-shadow:0 18px 32px oklch(0 0 0 / 0.36);overflow:hidden;color:oklch(0.25 0.02 260);display:flex;flex-direction:column">
    <div style="padding:12px 12px 10px;background:${grad(a.color, 150)};color:white;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;position:relative;isolation:isolate">${rings(188, 70, { stroke: "var(--rings-light)", opacity: 0.08, count: 6 })}<span style="width:30px;height:30px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${GOLD}">${initial(a, 15)}</span><b style="font-size:11.5px">${esc(a.sub)}</b></div>
    <div style="padding:6px 12px 0;flex:1;display:flex;flex-direction:column">${row("Name", "Prathik")}${row("Account", esc(a.title))}${row("A/c no.", a.all ? `${L.ACTIVE.length} accounts` : esc(a.num.replace("A/c ", "")))}${row("Type", esc(a.kind))}
      <div style="margin-top:auto;padding:8px 0 12px;text-align:center"><span style="display:block;font-size:8.5px;font-weight:800;letter-spacing:0.12em;color:${DIM}">BALANCE · ${up(longDate(a.date))}</span><b style="display:block;${MONO};font-size:17px;margin-top:2px">₹ ${money(a.bal)}</b></div></div></div>`;
}
// P5 · Window: a die-cut window in the cover shows the name slip inside, written in by hand.
function p5(a) {
  return `<div style="position:relative;width:176px;height:236px;border-radius:12px;background:radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.16), transparent 55%), ${grad(a.color, 160)};box-shadow:0 18px 34px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.16);color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:20px 14px 18px;text-align:center">${rings(176, 236, { stroke: "var(--rings-light)", opacity: 0.06, count: 8 })}
    <span style="font-size:9px;font-weight:800;letter-spacing:0.24em;${FOIL}">PASSBOOK</span>
    <span style="width:44px;height:44px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);display:flex;align-items:center;justify-content:center;color:oklch(0.9 0.08 88)"><b style="font-size:20px;${a.all ? "" : FOIL}">${initial(a, 18)}</b></span>
    <span style="align-self:stretch;border-radius:8px;padding:9px 10px;background:${PAPER};box-shadow:inset 0 2px 5px oklch(0 0 0 / 0.35), 0 0 0 2px oklch(0 0 0 / 0.18);color:oklch(0.25 0.02 260);text-align:left"><span style="display:flex;justify-content:space-between;font-size:8px;font-weight:800;letter-spacing:0.08em;color:${DIM}"><span>NAME</span><span>A/C NO.</span></span><span style="display:flex;justify-content:space-between;align-items:baseline;gap:6px"><span style="font-size:15px;${HAND};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title)}</span><span style="font-size:12px;${HAND};white-space:nowrap">${a.all ? L.ACTIVE.length : `••${esc(a.last4)}`}</span></span><span style="display:block;border-top:1px dashed oklch(0.45 0.02 260 / 0.35);margin-top:4px;padding-top:3px;${MONO};font-size:11px;font-weight:800">₹ ${money(a.bal)}</span></span>
    <span style="font-size:10.5px;font-weight:700;color:var(--on-card-muted)">${esc(a.sub)} · ${esc(a.kind)}</span></div>`;
}

// ================= Account card, without the credit-card chip =================
const WAVES = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 7.5a6 6 0 0 1 0 9"></path><path d="M12 5a9.5 9.5 0 0 1 0 14"></path><path d="M15.5 2.8a13 13 0 0 1 0 18.4"></path></svg>`;
// D1 · Account card: matte and centred, the bank's initial as a ring at the top, no chip at all.
function d1(a) {
  return `<div style="position:relative;width:150px;height:236px;border-radius:18px;background:radial-gradient(circle at 50% 0%, oklch(1 0 0 / 0.14), transparent 50%), ${grad(a.color, 170)};box-shadow:0 18px 32px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.18);color:var(--on-card);overflow:hidden;isolation:isolate;padding:20px 14px 16px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center">${rings(150, 236, { stroke: "var(--rings-light)", opacity: 0.06, count: 9 })}
    <span style="position:absolute;right:-26px;bottom:-30px;font-size:150px;font-weight:800;line-height:1;color:oklch(1 0 0 / 0.06)">${a.all ? "₹" : esc(a.init)}</span>
    <span style="width:44px;height:44px;border-radius:50%;border:1.5px solid oklch(1 0 0 / 0.5);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800">${initial(a, 18)}</span>
    <span><b style="display:block;font-size:14px;line-height:1.2">${esc(a.title)}</b><span style="display:block;font-size:10.5px;font-weight:600;color:var(--on-card-muted);margin-top:3px">${esc(a.sub)}</span></span>
    <span style="width:44px;height:1.5px;background:linear-gradient(90deg, transparent, oklch(1 0 0 / 0.6), transparent)"></span>
    <span><b style="display:block;${MONO};font-size:13px;letter-spacing:0.1em">${a.all ? money(a.bal) : `•••• ${esc(a.last4)}`}</b><span style="display:block;font-size:8.5px;font-weight:800;letter-spacing:0.16em;color:var(--on-card-faint);margin-top:4px">${up(a.kind)}</span></span></div>`;
}
// D2 · UPI card: a scan-to-pay code for the account, the way UPI apps show one; nothing like a credit card.
function qr(seed, n = 21, s = 3.4) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const finder = (x, y) => (x >= 0 && x < 7 && y >= 0 && y < 7 ? !(x > 0 && x < 6 && y > 0 && y < 6) || (x > 1 && x < 5 && y > 1 && y < 5) : null);
  let out = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = finder(x, y) ?? finder(x - (n - 7), y) ?? finder(x, y - (n - 7));
    const inFinderZone = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    const on = f !== null ? f : inFinderZone ? false : rnd() > 0.52;
    if (on) out += `<rect x="${(x * s).toFixed(1)}" y="${(y * s).toFixed(1)}" width="${s}" height="${s}"></rect>`;
  }
  return `<svg width="${n * s}" height="${n * s}" viewBox="0 0 ${n * s} ${n * s}" fill="oklch(0.2 0.02 260)" aria-hidden="true">${out}</svg>`;
}
function d2(a) {
  return `<div style="position:relative;width:150px;height:236px;border-radius:18px;background:${grad(a.color, 170)};box-shadow:0 18px 32px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.18);color:var(--on-card);overflow:hidden;isolation:isolate;padding:14px 13px 14px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center">${rings(150, 236, { stroke: "var(--rings-light)", opacity: 0.06, count: 9 })}
    <div class="between" style="align-self:stretch"><b style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b><span style="font-size:8.5px;font-weight:800;letter-spacing:0.14em;padding:2px 6px;border-radius:999px;background:oklch(1 0 0 / 0.16)">UPI</span></div>
    <span style="padding:7px;border-radius:12px;background:white;box-shadow:0 4px 12px oklch(0 0 0 / 0.25);position:relative">${qr(a.id + a.title)}<span style="position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:6px;background:${grad(a.color)};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:white">${initial(a, 10)}</span></span>
    <span><b style="display:block;font-size:13px;line-height:1.2">${esc(a.title)}</b><span style="display:block;${MONO};font-size:10.5px;color:var(--on-card-muted);margin-top:3px">${a.all ? `₹${money(a.bal)}` : `prathik@•• ${esc(a.last4)}`}</span></span></div>`;
}
// D3 · Badge: an ID badge on a clip, the account's colour across the top and its details printed below.
function d3(a) {
  return `<div style="position:relative;width:150px;height:252px">
    <span style="position:absolute;left:50%;top:0;width:30px;height:20px;margin-left:-15px;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg, oklch(0.88 0.005 260), oklch(0.6 0.01 260));box-shadow:0 2px 4px oklch(0 0 0 / 0.3)"></span>
    <div style="position:absolute;left:0;right:0;top:14px;bottom:0;border-radius:16px;background:${PAPER};box-shadow:0 18px 32px oklch(0 0 0 / 0.36);overflow:hidden;color:oklch(0.25 0.02 260);display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="align-self:stretch;height:82px;background:${grad(a.color, 160)};position:relative;isolation:isolate">${rings(150, 82, { stroke: "var(--rings-light)", opacity: 0.08, count: 6 })}<span style="position:absolute;left:50%;top:10px;width:36px;height:7px;margin-left:-18px;border-radius:999px;background:oklch(0 0 0 / 0.3)"></span><b style="position:absolute;left:0;right:0;top:26px;font-size:10px;letter-spacing:0.12em;color:oklch(1 0 0 / 0.8)">${up(a.sub)}</b></div>
      <span style="margin-top:-26px;width:52px;height:52px;border-radius:50%;background:${grad(a.color)};border:3px solid ${PAPER};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white">${initial(a, 20)}</span>
      <b style="font-size:13.5px;margin-top:8px;padding:0 10px">${esc(a.title)}</b>
      <span style="font-size:9.5px;font-weight:800;letter-spacing:0.12em;color:${DIM};margin-top:3px">${up(a.kind)}</span>
      <span style="margin-top:auto;margin-bottom:12px;padding:4px 12px;border-radius:999px;background:${paper(a, 14)};${MONO};font-size:11px;font-weight:800">${a.all ? `₹${money(a.bal)}` : esc(a.num)}</span></div></div>`;
}
// D4 · Frosted glass: a sheet of glass lit from behind by the account's colour; just the number and a tap mark.
function d4(a) {
  return `<div style="position:relative;width:150px;height:236px;border-radius:18px;overflow:hidden;isolation:isolate;background:linear-gradient(160deg, color-mix(in srgb, var(--card-${a.color}-to) 72%, transparent), color-mix(in srgb, var(--card-${a.color}-from) 50%, transparent));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid oklch(1 0 0 / 0.35);box-shadow:0 18px 32px oklch(0 0 0 / 0.32), inset 0 1px 0 oklch(1 0 0 / 0.4);color:white;padding:16px 14px;display:flex;flex-direction:column;justify-content:space-between">
    <span style="position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, var(--card-${a.color}) 90%, white), transparent 70%);opacity:0.75;z-index:-1"></span>
    <span style="position:absolute;left:-30px;bottom:-50px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle, oklch(1 0 0 / 0.25), transparent 70%);z-index:-1"></span>
    <div class="between"><b style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b><span style="opacity:0.8;display:flex">${WAVES}</span></div>
    <span style="font-size:52px;font-weight:800;line-height:1;opacity:0.9">${a.all ? "₹" : esc(a.init)}</span>
    <span><b style="display:block;font-size:13px;line-height:1.2">${esc(a.title)}</b><b style="display:block;${MONO};font-size:14px;letter-spacing:0.08em;margin-top:6px">${a.all ? money(a.bal) : `•• ${esc(a.last4)}`}</b><span style="display:block;font-size:8.5px;font-weight:800;letter-spacing:0.16em;opacity:0.65;margin-top:3px">${up(a.kind)}</span></span></div>`;
}

export const CHEQUES = [
  { k: "c1", n: "C1", name: "Filled leaf", w: 360, h: 206, render: c1, blurb: "O2's leaf with every field written in: the date of the last balance, Pay Self, the balance in words and in the box, and signed. The stub repeats it." },
  { k: "c2", n: "C2", name: "Clean leaf", w: 340, h: 186, render: c2, blurb: "No stub and no empty lines. Everything centred: the bank and date, the balance in big figures, the words under it, then the MICR line and the signature." },
  { k: "c3", n: "C3", name: "Crossed", w: 360, h: 200, render: c3, blurb: "Crossed A/C PAYEE in the corner, as Indian cheques are, and paid to the account itself; every field filled." },
  { k: "c4", n: "C4", name: "Counterfoil", w: 370, h: 186, render: c4, blurb: "A wide counterfoil torn along a perforation, recording the last change; the leaf holds the balance in figures and words." },
  { k: "c5", n: "C5", name: "Cheque book cover", w: 330, h: 176, render: c5, blurb: "The closed cheque book in the account's colour, the leaves' edges showing at the top, and the last 4 and balance on a foil band. Nothing left blank." },
];
export const PASSBOOKS = [
  { k: "p1", n: "P1", name: "Cover, as before", w: 176, h: 236, render: p1, blurb: "O1 as you saw it, to compare against." },
  { k: "p2", n: "P2", name: "Open", w: 344, h: 212, render: p2, blurb: "Open at the two-page spread: who it belongs to on the left; on the right its last four balances and the balance now, double-underlined. All lists the biggest accounts instead." },
  { k: "p3", n: "P3", name: "Band and ribbon", w: 176, h: 254, render: p3, blurb: "The cover, symmetrical, with the balance stamped on a dark band across it (its last 4 and date in gold), and a gold ribbon hanging below." },
  { k: "p4", n: "P4", name: "First page", w: 188, h: 244, render: p4, blurb: "The passbook's first page: the bank's header in the account's colour, the name, account, number and type, and the balance with its date at the foot." },
  { k: "p5", n: "P5", name: "Window", w: 176, h: 236, render: p5, blurb: "A die-cut window in the cover shows the name slip inside, written in by hand, with the last 4 and the balance." },
];
export const CARDS = [
  { k: "d1", n: "D1", name: "Account card", w: 150, h: 236, render: d1, blurb: "Matte and centred, the bank's initial in a ring at the top and as a big watermark; no chip, no card number, just the last 4." },
  { k: "d2", n: "D2", name: "UPI card", w: 150, h: 236, render: d2, blurb: "The account's scan-to-pay code, as UPI apps show it, with the bank's initial in the middle and a UPI handle ending in the last 4. Unmistakably a bank account, not a credit card." },
  { k: "d3", n: "D3", name: "Badge", w: 150, h: 252, render: d3, blurb: "An ID badge on a clip: the account's colour across the top, the bank's initial in a circle, the name, type and number printed below." },
  { k: "d4", n: "D4", name: "Frosted glass", w: 150, h: 236, render: d4, blurb: "A sheet of frosted glass lit from behind by the account's colour, with a big initial, the last 4 and a tap mark. No chip, no gold." },
];

// ================= All, inline and symmetrical =================
/** The active accounts, biggest first, and how many don't fit. */
const actives = (max) => { const list = L.ACTIVE.slice().sort((x, y) => L.latest(y.id).balance - L.latest(x.id).balance).map((x) => O.acctOf(x.id)); return { shown: list.slice(0, list.length > max ? max - 1 : max), more: list.length > max ? list.length - (max - 1) : 0 }; };
const moreTile = (n, w, h) => `<div style="width:${w}px;height:${h}px;border-radius:12px;border:1.5px dashed oklch(1 0 0 / 0.4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:oklch(1 0 0 / 0.8)">+${n}</div>`;
const centred = (cells, perRow, gap) => { const rows = []; for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow)); return `<div style="display:flex;flex-direction:column;gap:${gap}px;align-items:center">${rows.map((r) => `<div style="display:flex;gap:${gap}px;justify-content:center">${r.join("")}</div>`).join("")}</div>`; };
export function allRow(o, bw = 440, bh = 260) {
  const { shown, more } = actives(6); const n = shown.length + (more ? 1 : 0), gap = 10;
  const wide = o.w > o.h * 1.3, rows = wide ? 2 : 1, perRow = Math.ceil(n / rows);
  const z = Math.min(wide ? 0.7 : 0.62, (bh - gap * (rows - 1)) / (rows * o.h), (bw - gap * (perRow - 1)) / (perRow * o.w));
  const cells = [...shown.map((a) => O.fit(O.objectOf(o, a), o.w, o.h, z)), ...(more ? [moreTile(more, o.w * z, o.h * z)] : [])];
  return centred(cells, perRow, gap);
}
export function allShelf(o, bw = 440, bh = 260) {
  const { shown, more } = actives(10); const sw = 40, sh = Math.min(220, bh - 24);
  const spine = (a) => { const share = a.bal / L.TOTAL, h = Math.round(sh * (0.72 + 0.28 * Math.min(1, share * 3))); return `<div style="width:${sw}px;height:${h}px;border-radius:5px 5px 3px 3px;background:${grad(a.color, 90)};box-shadow:inset 3px 0 0 oklch(1 0 0 / 0.12), inset -3px 0 0 oklch(0 0 0 / 0.2), 0 8px 16px oklch(0 0 0 / 0.3);color:var(--on-card);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:8px 0;overflow:hidden"><span style="width:${sw - 12}px;height:3px;background:${GOLD};opacity:0.7;border-radius:2px"></span><b style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:${h - 70}px">${esc(a.title)}</b><span style="${MONO};font-size:9px;font-weight:800;opacity:0.85">${inrS(a.bal).replace("₹", "")}</span><span style="width:${sw - 12}px;height:3px;background:${GOLD};opacity:0.7;border-radius:2px"></span></div>`; };
  return `<div style="display:flex;flex-direction:column;align-items:center"><div style="display:flex;gap:6px;align-items:flex-end;justify-content:center">${shown.map(spine).join("")}${more ? `<div style="width:${sw}px;height:${sh * 0.6}px;border-radius:5px;border:1.5px dashed oklch(1 0 0 / 0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:oklch(1 0 0 / 0.8)">+${more}</div>` : ""}</div><div style="width:${Math.min(bw, shown.length * 46 + 40)}px;height:8px;border-radius:3px;background:oklch(0 0 0 / 0.28);margin-top:2px"></div></div>`;
}
export const allSingle = (o, bw = 440, bh = 260) => { const z = Math.min(1.1, bh / o.h, bw / o.w); return O.fit(o.render(O.acctOf("all")), o.w, o.h, z); };
export function allBand(o, bw = 440, bh = 260) {
  const z = Math.min(1, (bh - 50) / o.h, bw / o.w), w = o.w * z, list = L.ACTIVE.slice().sort((x, y) => L.latest(y.id).balance - L.latest(x.id).balance);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:12px">${O.fit(o.render(O.acctOf("all")), o.w, o.h, z)}<div style="width:${Math.max(w, 320)}px"><div style="display:flex;gap:3px;height:10px;border-radius:999px;overflow:hidden">${list.map((x) => `<span style="flex:${L.latest(x.id).balance};background:var(--card-${x.color})"></span>`).join("")}</div><div style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:10.5px;font-weight:700;color:oklch(1 0 0 / 0.75)">${list.slice(0, 4).map((x) => `<span style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap"><i style="width:7px;height:7px;border-radius:2px;background:var(--card-${x.color})"></i>${x.bank.split(" ")[0]} ${L.pct(L.latest(x.id).balance, L.TOTAL)}</span>`).join("")}${list.length > 4 ? `<span>+${list.length - 4}</span>` : ""}</div></div></div>`;
}
export function allGrid(o, bw = 440, bh = 260) {
  const { shown, more } = actives(6); const n = shown.length + (more ? 1 : 0), cols = n <= 3 ? n : 3, rows = Math.ceil(n / cols), gap = 10;
  const z = Math.min(0.55, (bw - gap * (cols - 1)) / (cols * o.w), (bh - gap * (rows - 1)) / (rows * o.h));
  const cells = [...shown.map((a) => O.fit(O.objectOf(o, a), o.w, o.h, z)), ...(more ? [moreTile(more, o.w * z, o.h * z)] : [])];
  return centred(cells, cols, gap);
}
export const ALLS = [
  { k: "a1", n: "A1", name: "A row", render: allRow, blurb: "Every account's object side by side, the same size, evenly spaced and centred, biggest first. Past six, the last place says +N." },
  { k: "a2", n: "A2", name: "A shelf", render: allShelf, blurb: "Each account as a spine on a shelf, taller for a bigger balance, with its name running up it. Thin, so a dozen still fit in a line." },
  { k: "a3", name: "Just All", n: "A3", render: allSingle, blurb: "One object for All in green, centred, nothing behind it. The simplest, and it never changes size." },
  { k: "a4", n: "A4", name: "All with a colour band", render: allBand, blurb: "The All object, centred, with a band under it in every account's colour, as wide as its share. Holds any number." },
  { k: "a5", n: "A5", name: "A grid", render: allGrid, blurb: "The accounts in a neat centred grid, three across, biggest first; +N in the last place past six." },
];
