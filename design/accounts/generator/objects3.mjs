// Round 9 objects (2026-10-22): the cheque was too much, so seven simpler ones. Each is symmetrical and carries
// little text: the bank's initial, the account's name and the last 4, sometimes the bank.
import * as L from "./lib.mjs";
const { I, rings, grad, esc } = L;

const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const FOIL = "background:linear-gradient(100deg, oklch(0.76 0.1 78), oklch(0.94 0.07 92) 45%, oklch(0.74 0.11 74));-webkit-background-clip:text;background-clip:text;color:transparent";
const PAPER = "oklch(0.985 0.006 90)";
const rim = (a) => (a.all ? "outline:1.5px solid oklch(1 0 0 / 0.32);outline-offset:-1.5px;" : "");
const initial = (a, s) => (a.all ? I.accounts(s) : esc(a.init));
const last = (a) => (a.all ? `${a.sub}` : `•• ${esc(a.last4)}`);
const paper = (a, p) => `color-mix(in srgb, var(--card-${a.color}) ${p}%, ${PAPER})`;
let UID = 0;

// B1 · Monogram tile: a rounded square like an app icon, the initial embossed in a ring.
function b1(a) {
  return `<div style="position:relative;width:176px;height:196px;border-radius:44px;${rim(a)}background:radial-gradient(circle at 50% 0%, oklch(1 0 0 / 0.22), transparent 55%), ${grad(a.color, 165)};box-shadow:0 18px 34px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.22), inset 0 -2px 0 oklch(0 0 0 / 0.15);color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center">${rings(176, 196, { stroke: "var(--rings-light)", opacity: 0.06, count: 8 })}
    <span style="width:92px;height:92px;border-radius:50%;border:1.5px solid oklch(1 0 0 / 0.3);box-shadow:inset 0 0 0 6px oklch(0 0 0 / 0.08);display:flex;align-items:center;justify-content:center"><b style="font-size:48px;font-weight:800;line-height:1;text-shadow:0 2px 0 oklch(0 0 0 / 0.25)">${initial(a, 40)}</b></span>
    <span><b style="display:block;font-size:13.5px">${esc(a.title)}</b><span style="display:block;${MONO};font-size:10.5px;color:var(--on-card-faint);margin-top:2px">${last(a)}</span></span></div>`;
}
// B2 · Passbook, quiet: the cover with only the gold emblem, the name and the last 4.
function b2(a) {
  return `<div style="position:relative;width:160px;height:216px;border-radius:5px 14px 14px 5px;${rim(a)}background:radial-gradient(circle at 70% -5%, oklch(1 0 0 / 0.14), transparent 52%), ${grad(a.color, 160)};box-shadow:inset 10px 0 0 oklch(0 0 0 / 0.22), inset 12px 0 0 oklch(1 0 0 / 0.06), 0 18px 32px oklch(0 0 0 / 0.38);color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding-left:12px;text-align:center">${rings(160, 216, { stroke: "var(--rings-light)", opacity: 0.05, count: 8 })}
    <span style="position:absolute;inset:11px 11px 11px 22px;border:1px solid oklch(0.86 0.09 85 / 0.45);border-radius:4px 8px 8px 3px"></span>
    <span style="width:62px;height:62px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);display:flex;align-items:center;justify-content:center;color:oklch(0.9 0.08 88)"><b style="font-size:27px;font-weight:800;${a.all ? "" : FOIL}">${initial(a, 24)}</b></span>
    <b style="font-size:13.5px;line-height:1.25;padding:0 14px">${esc(a.title)}</b>
    <span style="${MONO};font-size:11px;letter-spacing:0.08em;${FOIL}">${last(a)}</span></div>`;
}
// B3 · Envelope: the bank's envelope with the flap in the account's colour, a seal, and the name in the window.
function b3(a) {
  return `<div style="position:relative;width:300px;height:196px;filter:drop-shadow(0 16px 26px oklch(0 0 0 / 0.34))">
    <div style="position:absolute;inset:0;border-radius:12px;background:linear-gradient(160deg, ${paper(a, 10)}, ${paper(a, 4)});overflow:hidden">
      <div style="position:absolute;inset:0;background:linear-gradient(to top right, transparent calc(50% - 0.5px), oklch(0 0 0 / 0.07) 50%, transparent calc(50% + 0.5px)), linear-gradient(to top left, transparent calc(50% - 0.5px), oklch(0 0 0 / 0.07) 50%, transparent calc(50% + 0.5px))"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:50%;clip-path:polygon(0 0,100% 0,50% 100%);background:radial-gradient(circle at 50% 0%, oklch(1 0 0 / ${a.all ? 0.3 : 0.16}), transparent 60%), ${grad(a.color, 170)}"></div>
      <div style="position:absolute;left:50%;bottom:14px;width:210px;margin-left:-105px;padding:8px 12px;border-radius:8px;background:white;box-shadow:inset 0 1px 3px oklch(0 0 0 / 0.18);text-align:center;color:oklch(0.25 0.02 260)"><b style="display:block;font-size:13px">${esc(a.title)}</b><span style="display:block;${MONO};font-size:10px;color:oklch(0.45 0.02 260);margin-top:1px;white-space:nowrap">${a.all ? esc(a.sub) : `${esc(a.sub.split(" ")[0])} · ${last(a)}`}</span></div>
    </div>
    <span style="position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-26px 0 0 -21px;border-radius:50%;background:radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--card-${a.color}) 70%, white), var(--card-${a.color}-to));box-shadow:0 3px 8px oklch(0 0 0 / 0.35), inset 0 0 0 3px oklch(0 0 0 / 0.12);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:oklch(0.92 0.06 88)">${initial(a, 17)}</span></div>`;
}
// B4 · Note bundle: a bundle of notes held by a paper strap in the account's colour, as banks band cash.
function b4(a) {
  const note = (i) => `<div style="position:absolute;left:${i * 2}px;right:${(3 - i) * 2}px;top:${i * 4}px;height:132px;border-radius:8px;background:linear-gradient(160deg, oklch(0.93 0.035 150), oklch(0.88 0.04 155));box-shadow:0 1px 0 oklch(0 0 0 / 0.12)"></div>`;
  return `<div style="position:relative;width:300px;height:150px;filter:drop-shadow(0 16px 26px oklch(0 0 0 / 0.34))">${[0, 1, 2].map(note).join("")}
    <div style="position:absolute;left:6px;right:0;top:12px;height:132px;border-radius:8px;background:linear-gradient(160deg, oklch(0.95 0.03 150), oklch(0.9 0.04 155));overflow:hidden;isolation:isolate">${rings(294, 132, { stroke: "oklch(0.45 0.08 155)", opacity: 0.14, first: 10, step: 6, dx: -147, dy: -66 })}
      <span style="position:absolute;left:22px;top:50%;width:46px;height:46px;margin-top:-23px;border-radius:50%;border:1.5px solid oklch(0.45 0.08 155 / 0.35)"></span><span style="position:absolute;right:22px;top:50%;width:46px;height:46px;margin-top:-23px;border-radius:50%;border:1.5px solid oklch(0.45 0.08 155 / 0.35)"></span>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:104px;margin-left:-52px;background:${grad(a.color, 180)};box-shadow:0 0 0 1px oklch(0 0 0 / 0.1), 0 0 12px oklch(0 0 0 / 0.2);color:var(--on-card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center;padding:0 8px"><span style="width:30px;height:30px;border-radius:50%;background:oklch(1 0 0 / 0.16);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">${initial(a, 14)}</span><b style="font-size:11.5px;line-height:1.2">${esc(a.title)}</b><span style="${MONO};font-size:9.5px;color:var(--on-card-faint)">${last(a)}</span></div>
    </div></div>`;
}
// B5 · Nameplate: a brass plate with the account's colour inset and its name engraved.
function b5(a) {
  const screw = (pos) => `<span style="position:absolute;${pos};width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 30%, oklch(0.95 0.04 90), oklch(0.6 0.08 75));box-shadow:inset 0 0 0 1px oklch(0.4 0.05 70 / 0.5)"></span>`;
  return `<div style="position:relative;width:320px;height:124px;border-radius:16px;padding:12px;background:linear-gradient(135deg, oklch(0.88 0.09 88), oklch(0.72 0.11 76) 45%, oklch(0.9 0.07 90) 60%, oklch(0.68 0.1 72));box-shadow:0 16px 28px oklch(0 0 0 / 0.36), inset 0 1px 0 oklch(1 0 0 / 0.5)">${screw("left:7px;top:7px")}${screw("right:7px;top:7px")}${screw("left:7px;bottom:7px")}${screw("right:7px;bottom:7px")}
    <div style="height:100%;border-radius:9px;${rim(a)}background:radial-gradient(circle at 50% 0%, oklch(1 0 0 / 0.14), transparent 60%), ${grad(a.color, 165)};box-shadow:inset 0 2px 6px oklch(0 0 0 / 0.4);color:var(--on-card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center;overflow:hidden;isolation:isolate">${rings(296, 100, { stroke: "var(--rings-light)", opacity: 0.05, count: 6 })}<b style="font-size:17px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;text-shadow:0 1px 0 oklch(0 0 0 / 0.4), 0 -1px 0 oklch(1 0 0 / 0.15)">${esc(a.title)}</b><span style="font-size:10px;font-weight:800;letter-spacing:0.16em;${FOIL}">${esc(a.sub).toUpperCase()}${a.all ? "" : ` · •• ${esc(a.last4)}`}</span></div></div>`;
}
// B6 · Key card: a light card with a punched slot, the account's colour as a band at its foot. Nothing like a credit card.
function b6(a) {
  return `<div style="position:relative;width:140px;height:210px;border-radius:16px;background:linear-gradient(170deg, white, ${paper(a, 8)});box-shadow:0 18px 32px oklch(0 0 0 / 0.34), inset 0 0 0 1px oklch(0 0 0 / 0.05);overflow:hidden;color:oklch(0.25 0.02 260);display:flex;flex-direction:column;align-items:center;text-align:center">
    <span style="margin-top:14px;width:30px;height:9px;border-radius:999px;background:oklch(0.2 0.02 260 / 0.75);box-shadow:inset 0 2px 3px oklch(0 0 0 / 0.6)"></span>
    <span style="margin-top:22px;width:58px;height:58px;border-radius:18px;background:${grad(a.color, 165)};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:white;box-shadow:0 6px 14px oklch(0 0 0 / 0.2)">${initial(a, 24)}</span>
    <b style="font-size:13px;margin-top:12px;padding:0 10px;line-height:1.2">${esc(a.title)}</b>
    <span style="${MONO};font-size:10.5px;color:oklch(0.45 0.02 260);margin-top:3px">${last(a)}</span>
    <div style="margin-top:auto;align-self:stretch;height:30px;background:${grad(a.color, 90)};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;letter-spacing:0.14em;color:oklch(1 0 0 / 0.85)">${esc(a.sub).toUpperCase()}</div></div>`;
}
// B7 · Stamp: a postage stamp with perforated edges, the account in its colour.
function stampPath(w, h, r = 4.5, step = 13) {
  const nx = Math.floor(w / step), ny = Math.floor(h / step), sx = w / nx, sy = h / ny;
  let d = "M0,0";
  for (let i = 0; i < nx; i++) d += ` L${(i * sx + sx / 2 - r).toFixed(1)},0 A${r},${r} 0 0 0 ${(i * sx + sx / 2 + r).toFixed(1)},0`;
  d += ` L${w},0`;
  for (let i = 0; i < ny; i++) d += ` L${w},${(i * sy + sy / 2 - r).toFixed(1)} A${r},${r} 0 0 0 ${w},${(i * sy + sy / 2 + r).toFixed(1)}`;
  d += ` L${w},${h}`;
  for (let i = nx - 1; i >= 0; i--) d += ` L${(i * sx + sx / 2 + r).toFixed(1)},${h} A${r},${r} 0 0 0 ${(i * sx + sx / 2 - r).toFixed(1)},${h}`;
  d += ` L0,${h}`;
  for (let i = ny - 1; i >= 0; i--) d += ` L0,${(i * sy + sy / 2 + r).toFixed(1)} A${r},${r} 0 0 0 0,${(i * sy + sy / 2 - r).toFixed(1)}`;
  return `${d} Z`;
}
function b7(a) {
  const W = 172, H = 206, id = `stamp${++UID}`;
  return `<div style="position:relative;width:${W}px;height:${H}px;filter:drop-shadow(0 16px 24px oklch(0 0 0 / 0.34))"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0" aria-hidden="true"><path d="${stampPath(W, H)}" fill="${PAPER}"></path></svg>
    <div style="position:absolute;inset:12px;border-radius:4px;${rim(a)}background:radial-gradient(circle at 50% 0%, oklch(1 0 0 / 0.16), transparent 55%), ${grad(a.color, 165)};color:var(--on-card);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:12px 10px 10px;text-align:center">${rings(148, 182, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
      <div style="align-self:stretch;display:flex;justify-content:space-between;font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--on-card-faint)"><span>${a.all ? "ALL" : esc(a.sub.split(" ")[0]).toUpperCase()}</span><span style="${MONO}">${a.all ? "" : esc(a.last4)}</span></div>
      <b style="font-size:54px;font-weight:800;line-height:1;text-shadow:0 2px 0 oklch(0 0 0 / 0.25)">${initial(a, 44)}</b>
      <b style="font-size:12.5px;line-height:1.2">${esc(a.title)}</b></div></div>`;
}

export const SIMPLE = [
  { k: "b1", n: "B1", name: "Monogram tile", w: 176, h: 196, render: b1, blurb: "A rounded square like an app icon: the bank's initial embossed in a ring, the account's name and last 4 under it. The quietest of them." },
  { k: "b2", n: "B2", name: "Passbook, quiet", w: 160, h: 216, render: b2, blurb: "The passbook you liked, with most of its text taken off: the gold emblem, the account's name and the last 4." },
  { k: "b3", n: "B3", name: "Envelope", w: 300, h: 196, render: b3, blurb: "The bank's envelope, its flap in the account's colour and sealed with the initial; the name, bank and last 4 show through the window." },
  { k: "b4", n: "B4", name: "Note bundle", w: 300, h: 150, render: b4, blurb: "A bundle of notes held by a paper strap in the account's colour, the way banks band cash, with the initial, name and last 4 on the strap." },
  { k: "b5", n: "B5", name: "Nameplate", w: 320, h: 124, render: b5, blurb: "A brass plate with the account's colour inset and its name engraved, the bank and last 4 under it. Wide and short, so it sits low in the hero." },
  { k: "b6", n: "B6", name: "Key card", w: 140, h: 210, render: b6, blurb: "A light card with a punched slot at the top, the initial on a coloured square and the account's colour as a band at the foot. Nothing like the dark credit-card tiles." },
  { k: "b7", n: "B7", name: "Stamp", w: 172, h: 206, render: b7, blurb: "A postage stamp with perforated edges, the account in its colour, a big initial, the bank and last 4 in the corners." },
];
