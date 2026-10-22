// The account object: what stands for a bank account, the way a card tile stands for a card on the Cards page and
// a cover for a subscription on the Subscriptions page (Prathik, 2026-10-21). Six options, each drawn from one
// account (or All, or a new account in the Add account form) in its colour, with its name, bank, type and last 4.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inrS, I, rings, grad, esc } = L;

let UID = 0;
/** Made-up last 4 digits of each account number. A new optional `last4` column, like the card's (decision 12). */
export const LAST4 = { hdfc: "4821", kotak: "0937", icici: "6610", sbi: "2245", axis: "7308", yes: "5512" };
export function acctOf(id) {
  if (id === "all") return { id, all: true, title: "All accounts", sub: `${L.ACTIVE.length} accounts`, kind: "Every account", num: inrS(L.TOTAL), init: "₹", color: "emerald", on: true, since: "", bal: L.TOTAL, date: L.ACTIVE.map((a) => L.latest(a.id).date).sort().at(-1), last4: "" };
  const f = P.FACTS[id];
  return { id, title: f.name, sub: f.bank, kind: `${f.type} account`, num: `A/c •• ${LAST4[id]}`, init: f.bank[0], color: f.color, on: f.on, since: f.opened.slice(0, 4), last4: LAST4[id], bal: f.on ? f.balance : 0, date: f.on ? f.asOf : f.closedOn, purpose: f.purpose, stale: f.stale, days: f.on && f.asOf ? L.daysBetween(f.asOf, L.TODAY) : 0 };
}
/** The account being added in the form. */
export const NEW_ACCT = { id: "new", title: "IDFC Travel", sub: "IDFC FIRST Bank", kind: "Savings account", num: "A/c •• 3390", init: "I", color: "sapphire", on: true, since: "2024", last4: "3390", bal: 38200, date: L.TODAY, purpose: "Spending" };

const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const FOIL = "background:linear-gradient(100deg, oklch(0.76 0.1 78), oklch(0.94 0.07 92) 45%, oklch(0.74 0.11 74));-webkit-background-clip:text;background-clip:text;color:transparent";
const GOLD_LINE = "oklch(0.86 0.09 85 / 0.6)";
const up = (s) => esc(String(s).toUpperCase());
const initial = (a, s) => (a.all ? I.accounts(s) : esc(a.init));

// ---------- 1 · Passbook ----------
function passbook(a) {
  return `<div style="position:relative;width:176px;height:236px;border-radius:5px 14px 14px 5px;background:radial-gradient(circle at 75% -5%, oklch(1 0 0 / 0.16), transparent 52%), ${grad(a.color, 160)};box-shadow:inset 11px 0 0 oklch(0 0 0 / 0.24), inset 13px 0 0 oklch(1 0 0 / 0.07), 0 18px 34px oklch(0 0 0 / 0.38);color:var(--on-card);overflow:hidden;isolation:isolate">${rings(176, 236, { stroke: "var(--rings-light)", opacity: 0.06, count: 8 })}
    <span style="position:absolute;inset:10px 10px 10px 21px;border:1.5px dashed ${GOLD_LINE};border-radius:4px 9px 9px 3px"></span>
    <div style="position:absolute;inset:0 0 0 13px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:24px 14px 20px;text-align:center">
      <span style="font-size:9px;font-weight:800;letter-spacing:0.24em;${FOIL}">PASSBOOK</span>
      <span style="width:58px;height:58px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);box-shadow:inset 0 0 0 4px oklch(0 0 0 / 0.14), inset 0 0 0 5px oklch(0.86 0.09 85 / 0.35);display:flex;align-items:center;justify-content:center;color:oklch(0.9 0.08 88)"><b style="font-size:26px;font-weight:800;${a.all ? "" : FOIL}">${initial(a, 24)}</b></span>
      <span><b style="display:block;font-size:13.5px;line-height:1.25">${esc(a.title)}</b><span style="display:block;font-size:11px;font-weight:600;color:var(--on-card-muted);margin-top:2px">${esc(a.sub)}</span></span>
      <span><span style="display:block;font-size:8px;font-weight:800;letter-spacing:0.16em;${FOIL}">${up(a.kind)}</span><b style="display:block;margin-top:4px;${MONO};font-size:12px;letter-spacing:0.06em">${esc(a.num)}</b></span>
    </div></div>`;
}

// ---------- 2 · Cheque book ----------
function cheque(a) {
  const paper = (p) => `color-mix(in srgb, var(--card-${a.color}) ${p}%, oklch(0.99 0.005 90))`;
  const lineRow = (label, w = "100%") => `<div style="display:flex;align-items:flex-end;gap:6px;font-size:9.5px;font-weight:700;color:oklch(0.45 0.02 260)"><span>${label}</span><span style="flex:1;max-width:${w};border-bottom:1px solid oklch(0.45 0.02 260 / 0.45);height:10px"></span></div>`;
  const no = String(124 + (a.last4 ? Number(a.last4) % 50 : 0)).padStart(6, "0");
  return `<div style="position:relative;width:330px;height:172px">
    <div style="position:absolute;left:0;right:0;top:14px;bottom:0;border-radius:12px;background:${grad(a.color, 160)};box-shadow:0 16px 28px oklch(0 0 0 / 0.36)"></div>
    <div style="position:absolute;left:3px;right:3px;top:8px;height:150px;border-radius:10px;background:${paper(26)}"></div>
    <div style="position:absolute;left:1px;right:1px;top:4px;height:150px;border-radius:10px;background:${paper(20)}"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:150px;border-radius:10px;background:linear-gradient(110deg, ${paper(16)}, ${paper(5)} 60%, ${paper(14)});box-shadow:0 1px 0 oklch(0 0 0 / 0.08);overflow:hidden;isolation:isolate;color:oklch(0.25 0.02 260);display:grid;grid-template-columns:70px 1fr">${rings(330, 150, { stroke: `var(--card-${a.color})`, opacity: 0.16, first: 12, step: 7, dx: -170, dy: -80 })}
      <div style="padding:12px 9px;border-right:2px dotted oklch(0.45 0.02 260 / 0.35);display:flex;flex-direction:column;gap:9px"><span style="${MONO};font-size:9px;font-weight:700">No. ${no}</span>${lineRow("Date")}${lineRow("To")}${lineRow("₹")}</div>
      <div style="padding:11px 13px 9px;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="width:22px;height:22px;border-radius:6px;background:${grad(a.color)};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${initial(a, 12)}</span><span style="min-width:0"><b style="display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b><span style="display:block;font-size:9.5px;font-weight:700;color:oklch(0.45 0.02 260)">${esc(a.kind)}</span></span><span style="margin-left:auto;display:flex;gap:2px">${Array.from({ length: 6 }, () => `<span style="width:9px;height:12px;border:1px solid oklch(0.45 0.02 260 / 0.4);border-radius:2px"></span>`).join("")}</span></div>
        ${lineRow("Pay")}
        <div style="display:flex;gap:8px;align-items:flex-end">${lineRow("Rupees")}<span style="border:1.2px solid oklch(0.45 0.02 260 / 0.5);border-radius:4px;padding:2px 6px;font-size:10px;font-weight:800;flex-shrink:0">₹</span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end"><span style="${MONO};font-size:10px;letter-spacing:0.08em;color:oklch(0.3 0.02 260 / 0.8)">⑈${no}⑈ 400${a.last4 ?? "000"}⑆</span><span style="text-align:right"><b style="display:block;font-size:10.5px">${esc(a.title)}</b><span style="${MONO};font-size:9.5px;color:oklch(0.45 0.02 260)">${esc(a.num)}</span></span></div>
      </div></div></div>`;
}

// ---------- 3 · Debit card, standing up ----------
const CHIP = `<span style="width:34px;height:26px;border-radius:6px;background:linear-gradient(135deg, var(--card-chip), var(--card-chip-deep));box-shadow:inset 0 0 0 1px oklch(0 0 0 / 0.15);position:relative;overflow:hidden;display:inline-block"><span style="position:absolute;left:0;right:0;top:50%;height:1px;background:oklch(0 0 0 / 0.25)"></span><span style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:oklch(0 0 0 / 0.25)"></span><span style="position:absolute;inset:7px 10px;border:1px solid oklch(0 0 0 / 0.25);border-radius:3px"></span></span>`;
const WAVES = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 7.5a6 6 0 0 1 0 9"></path><path d="M12 5a9.5 9.5 0 0 1 0 14"></path><path d="M15.5 2.8a13 13 0 0 1 0 18.4"></path></svg>`;
function debit(a) {
  return `<div style="position:relative;width:150px;height:236px;border-radius:16px;background:radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.2), transparent 45%), ${grad(a.color, 170)};box-shadow:0 18px 32px oklch(0 0 0 / 0.38), inset 0 1px 0 oklch(1 0 0 / 0.2);color:var(--on-card);overflow:hidden;isolation:isolate;padding:16px 14px;display:flex;flex-direction:column;justify-content:space-between">${rings(150, 236, { stroke: "var(--rings-light)", opacity: 0.07, count: 9 })}
    <div class="between"><b style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</b><span style="font-size:8.5px;font-weight:800;letter-spacing:0.16em;color:var(--on-card-faint)">DEBIT</span></div>
    <div class="row" style="gap:10px;color:var(--on-card-muted)">${CHIP}${WAVES}</div>
    <div><b style="display:block;${MONO};font-size:12px;letter-spacing:0.08em">${a.all ? esc(a.num) : `•••• •••• ${esc(a.last4)}`}</b><b style="display:block;font-size:13px;margin-top:8px;line-height:1.2">${esc(a.title)}</b><span style="display:block;font-size:9.5px;font-weight:700;letter-spacing:0.08em;color:var(--on-card-faint);margin-top:3px">${up(a.kind)}</span></div>
    <span style="position:absolute;right:12px;bottom:14px;width:24px;height:24px;border-radius:50%;background:conic-gradient(from 30deg, oklch(0.85 0.1 200 / 0.6), oklch(0.85 0.12 320 / 0.6), oklch(0.9 0.1 90 / 0.6), oklch(0.85 0.1 200 / 0.6));opacity:0.75"></span></div>`;
}

// ---------- 4 · Seal ----------
function seal(a) {
  const id = `seal${++UID}`, S = 210, c = S / 2;
  const ridges = Array.from({ length: 90 }, (_, k) => { const ang = (k * 4 * Math.PI) / 180, x0 = c + 99 * Math.cos(ang), y0 = c + 99 * Math.sin(ang), x1 = c + 104 * Math.cos(ang), y1 = c + 104 * Math.sin(ang); return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="oklch(1 0 0 / 0.25)" stroke-width="1.4"></line>`; }).join("");
  const ring = `${up(a.title)} · ${up(a.kind)} · ${up(a.num)} · `;
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;overflow:visible;filter:drop-shadow(0 16px 24px oklch(0 0 0 / 0.35))" aria-label="${esc(a.title)}"><defs><path id="${id}" d="M${c},${c} m-77,0 a77,77 0 1,1 154,0 a77,77 0 1,1 -154,0"></path></defs>
    <circle cx="${c}" cy="${c}" r="104" style="fill:var(--card-${a.color}-to)"></circle>${ridges}
    <circle cx="${c}" cy="${c}" r="96" fill="url(#r-${a.color})"></circle>
    <circle cx="${c}" cy="${c}" r="89" fill="none" stroke="oklch(1 0 0 / 0.35)"></circle><circle cx="${c}" cy="${c}" r="65" fill="none" stroke="oklch(1 0 0 / 0.35)"></circle><circle cx="${c}" cy="${c}" r="61" fill="oklch(0 0 0 / 0.1)"></circle>
    <text font-size="10.5" font-weight="800" letter-spacing="1.6" fill="oklch(1 0 0 / 0.88)" style="font-family:'Manrope',sans-serif"><textPath href="#${id}" textLength="476" lengthAdjust="spacing">${ring}</textPath></text>
    <text x="${c + 1}" y="${c + 15}" text-anchor="middle" font-size="44" font-weight="800" fill="oklch(0 0 0 / 0.3)" style="font-family:'Manrope',sans-serif">${a.all ? "₹" : esc(a.init)}</text><text x="${c}" y="${c + 13}" text-anchor="middle" font-size="44" font-weight="800" fill="oklch(0.97 0.01 90)" style="font-family:'Manrope',sans-serif">${a.all ? "₹" : esc(a.init)}</text>
    <text x="${c}" y="${c + 34}" text-anchor="middle" font-size="9" font-weight="800" letter-spacing="1.5" fill="oklch(1 0 0 / 0.7)" style="font-family:'Manrope',sans-serif">${a.since ? `SINCE ${a.since}` : up(a.sub)}</text></svg>`;
}

// ---------- 5 · Account tag ----------
function tag(a) {
  return `<div style="position:relative;width:300px;height:150px">
    <svg width="70" height="120" viewBox="0 0 70 120" style="position:absolute;left:-40px;top:14px;overflow:visible" aria-hidden="true"><path d="M60,62 C30,58 8,30 2,6 M60,62 C28,70 6,96 10,116" fill="none" stroke="oklch(0.85 0.04 80)" stroke-width="2.2" stroke-linecap="round"></path></svg>
    <div style="position:absolute;inset:0;clip-path:polygon(15% 0,100% 0,100% 100%,15% 100%,0 72%,0 28%);background:radial-gradient(circle at 90% 0%, oklch(1 0 0 / 0.18), transparent 50%), ${grad(a.color, 160)};color:var(--on-card);isolation:isolate;overflow:hidden;filter:drop-shadow(0 14px 22px oklch(0 0 0 / 0.35))">${rings(300, 150, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
      <span style="position:absolute;left:14px;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;background:oklch(0.2 0.03 160 / 0.6);box-shadow:0 0 0 4px oklch(0.9 0.03 85 / 0.85)"></span>
      <span style="position:absolute;right:52px;top:12px;bottom:12px;border-left:1.5px dashed oklch(1 0 0 / 0.3)"></span>
      <span style="position:absolute;right:18px;top:50%;transform:translateY(-50%) rotate(90deg);font-size:9px;font-weight:800;letter-spacing:0.2em;color:var(--on-card-faint);white-space:nowrap">${a.since ? `SINCE ${a.since}` : "ALL"}</span>
      <div style="position:absolute;left:58px;right:66px;top:16px;bottom:14px;display:flex;flex-direction:column;justify-content:space-between;min-width:0"><span style="font-size:8.5px;font-weight:800;letter-spacing:0.16em;color:var(--on-card-faint)">${up(a.kind)}</span><span><b style="display:block;font-size:18px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title)}</b><span style="display:block;font-size:11.5px;font-weight:600;color:var(--on-card-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.sub)}</span></span><b style="${MONO};font-size:12px;letter-spacing:0.06em">${esc(a.num)}</b></div>
    </div></div>`;
}

// ---------- 6 · Vault door ----------
function vault(a) {
  const id = `steel${++UID}`, S = 220, c = S / 2;
  const bolts = Array.from({ length: 12 }, (_, k) => { const ang = ((k * 30 - 90) * Math.PI) / 180; return `<circle cx="${(c + 99 * Math.cos(ang)).toFixed(1)}" cy="${(c + 99 * Math.sin(ang)).toFixed(1)}" r="4.2" fill="oklch(0.86 0.01 260)" stroke="oklch(0.35 0.01 260)" stroke-width="1"></circle>`; }).join("");
  const spokes = [0, 120, 240].map((d) => { const ang = ((d - 90) * Math.PI) / 180, x = c + 40 * Math.cos(ang), y = c - 12 + 40 * Math.sin(ang); return `<line x1="${c}" y1="${c - 12}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="url(#${id})" stroke-width="7" stroke-linecap="round"></line><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="url(#${id})" stroke="oklch(0.3 0.01 260 / 0.6)"></circle>`; }).join("");
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;overflow:visible;filter:drop-shadow(0 16px 24px oklch(0 0 0 / 0.38))" aria-label="${esc(a.title)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:oklch(0.9 0.005 260)"></stop><stop offset="0.5" style="stop-color:oklch(0.62 0.01 260)"></stop><stop offset="1" style="stop-color:oklch(0.42 0.01 260)"></stop></linearGradient></defs>
    <circle cx="${c}" cy="${c}" r="109" fill="url(#${id})"></circle><circle cx="${c}" cy="${c}" r="92" fill="oklch(0.25 0.01 260)"></circle>${bolts}
    <circle cx="${c}" cy="${c}" r="88" fill="url(#r-${a.color})"></circle><circle cx="${c}" cy="${c}" r="74" fill="none" stroke="oklch(1 0 0 / 0.16)"></circle><circle cx="${c}" cy="${c}" r="58" fill="none" stroke="oklch(1 0 0 / 0.12)"></circle>
    ${spokes}<circle cx="${c}" cy="${c - 12}" r="14" fill="url(#${id})" stroke="oklch(0.3 0.01 260 / 0.6)"></circle><circle cx="${c}" cy="${c - 12}" r="5" fill="oklch(0.3 0.01 260)"></circle>
    <rect x="${c - 56}" y="${c + 38}" width="112" height="34" rx="6" fill="oklch(0 0 0 / 0.32)" stroke="oklch(1 0 0 / 0.25)"></rect>
    <text x="${c}" y="${c + 52}" text-anchor="middle" font-size="10.5" font-weight="800" fill="white" style="font-family:'Manrope',sans-serif">${esc(a.title)}</text><text x="${c}" y="${c + 65}" text-anchor="middle" font-size="9.5" font-weight="700" letter-spacing="0.6" fill="oklch(1 0 0 / 0.75)" style="${MONO}">${esc(a.num)}</text></svg>`;
}

export const OBJECTS = [
  { k: "passbook", n: "O1", name: "Passbook", w: 176, h: 236, z: 1.15, render: passbook, blurb: "A closed passbook in the account's colour: gold-foil emblem with the bank's initial, the account's name and bank, its type and the last 4 of the number. The most Indian of the six, and it ties to the kept passbook pages." },
  { k: "cheque", n: "O2", name: "Cheque book", w: 330, h: 172, z: 1.05, render: cheque, blurb: "A cheque book with the account's colour as its cover and the leaves tinted to match: bank, account type, a MICR line ending in the last 4, and the account's name where you'd sign." },
  { k: "debit", n: "O3", name: "Debit card, standing up", w: 150, h: 236, z: 1.15, render: debit, blurb: "The account's debit card, but standing up, so it never reads as one of the credit cards on the Cards page: chip, tap symbol, •••• and the last 4, the account's name." },
  { k: "seal", n: "O4", name: "Seal", w: 210, h: 210, z: 1.1, render: seal, blurb: "An embossed coin in the account's colour, with its name, type and last 4 running round the rim and the bank's initial in the middle. Round, so it never looks like a card or a cover." },
  { k: "tag", n: "O5", name: "Account tag", w: 300, h: 150, z: 1.08, render: tag, blurb: "A tag on a string, like a key tag at a bank's locker: type, name, bank and last 4, with the year it opened along the stub." },
  { k: "vault", n: "O6", name: "Vault door", w: 220, h: 220, z: 1.05, render: vault, blurb: "A round vault door in the account's colour with a steel rim and bolts, a three-spoke handle, and a plate with the account's name and last 4." },
];

const CLOSED = `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-12deg);padding:4px 10px;border:2px solid oklch(1 0 0 / 0.85);border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.18em;color:white;background:oklch(0 0 0 / 0.3);white-space:nowrap">CLOSED</span>`;
/** One account's object, greyed and stamped when closed. */
export function objectOf(o, a) {
  const mark = o.w > 250 ? CLOSED.replace("left:50%;top:50%", "left:78%;top:30%") : CLOSED;
  // A balance not read in 30 days is stamped, the way a cheque goes stale.
  const stale = a.stale ? `<span style="position:absolute;${o.w > 250 ? "left:6px;top:42%" : "left:50%;top:44%;margin-left:-56px"};transform:rotate(-9deg);padding:3px 8px;border:2px solid oklch(0.72 0.14 75);border-radius:6px;background:oklch(0.97 0.04 85 / 0.92);color:oklch(0.5 0.12 68);font-size:9.5px;font-weight:800;letter-spacing:0.1em;white-space:nowrap;box-shadow:0 2px 6px oklch(0 0 0 / 0.2)">NOT READ · ${a.days} DAYS</span>` : "";
  return `<div style="position:relative;width:${o.w}px;height:${o.h}px;flex-shrink:0;${a.on ? "" : "filter:grayscale(0.9);opacity:0.78"}">${o.render(a)}${a.on ? "" : mark}${stale}</div>`;
}
/** All: its own object in emerald on a little pile of the others, so it reads as "every account". */
export function stackOf(o) {
  const round = o.k === "seal" || o.k === "vault";
  const t1 = round ? "translate(-44px, 8px) scale(0.86)" : "translate(-24px, 8px) rotate(-8deg)";
  const t2 = round ? "translate(44px, 4px) scale(0.86)" : "translate(22px, 4px) rotate(7deg)";
  return `<div style="position:relative;width:${o.w}px;height:${o.h}px;flex-shrink:0"><div style="position:absolute;inset:0;transform:${t1};opacity:0.9">${o.render(acctOf("icici"))}</div><div style="position:absolute;inset:0;transform:${t2};opacity:0.95">${o.render(acctOf("sbi"))}</div><div style="position:absolute;inset:0">${o.render(acctOf("all"))}</div></div>`;
}
/** Scale an object to z without changing its layout box. */
export const fit = (html, w, h, z) => `<div style="position:relative;width:${(w * z).toFixed(1)}px;height:${(h * z).toFixed(1)}px;flex-shrink:0"><div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform:scale(${z});transform-origin:0 0">${html}</div></div>`;
export const pick = (o, id) => (id === "all" ? stackOf(o) : objectOf(o, acctOf(id)));
