"use client";

import { ALL, type HeroBlock, type HeroPane, type HeroRepaid, type HeroView } from "@/app/lent/heroView";
import type { PayoutVerdict } from "@/lib/aggregate/lentPromises";
import { colorGradient, type ColorKey } from "@/lib/format/colors";
import { usePickInAddress } from "../usePickInAddress";

/**
 * The Lent page's hero (docs/design/lent-out.md, L3 Who owes what): a block per borrower sized by what they owe today (a scrolling list past
 * three), and the pane the pick opens: Everyone, or "if this one didn't pay back". The stage takes the pick's colour. The pick is kept in the
 * address as `?who=`. A measure of how much rides on one borrower, never advice.
 */
export function WhoOwesWhat({ view, initialPick }: { view: HeroView; initialPick: string }) {
  const [pick, choose] = usePickInAddress("who", initialPick, view.keys, (id) => id === ALL);
  const pane = view.panes[pick] ?? view.panes[ALL];
  const picked = view.panes[pick] ? pick : ALL;
  return (
    <section aria-label={view.title} className="flex flex-col gap-5 rounded-[26px] p-5 text-on-card transition-[background] duration-300 md:p-7" style={{ background: colorGradient(pane.colorKey) }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-extrabold">{view.title}</h2>
          <p className="mt-0.5 text-xs font-semibold text-on-card-muted">{view.sub}</p>
        </div>
        <button type="button" aria-pressed={picked === ALL} onClick={() => choose(ALL)} className={`min-h-9 shrink-0 rounded-full px-4 text-[13px] font-extrabold focus-visible:outline-2 focus-visible:outline-on-card ${picked === ALL ? "bg-on-card text-ink" : "bg-on-card-fill"}`}>
          Everyone
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-8">
        {/* The left column fills to the pane's height, so the two end level. */}
        <div className="flex min-w-0 flex-col gap-3">
          {view.asList ? <LoanList view={view} picked={picked} choose={choose} /> : <Blocks blocks={view.blocks} picked={picked} choose={choose} />}
          {view.repaid.map((r) => (
            <RepaidStrip key={r.id} repaid={r} />
          ))}
        </div>
        <PaneBody pane={pane} />
      </div>
    </section>
  );
}

function Initial({ name, colorKey, size = 34 }: { name: string; colorKey: ColorKey; size?: number }) {
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-[10px] bg-on-card-fill font-extrabold" style={{ width: size, height: size, boxShadow: `inset 0 0 0 1.5px var(--card-${colorKey})` }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

const DOT: Record<PayoutVerdict, string> = {
  "On time": "bg-on-card",
  "Paid late": "bg-warning",
  Overdue: "border-2 border-warning",
  Missing: "bg-negative",
  Waiting: "border border-dashed border-on-card-faint",
};

const DOTS_MAX = 24;

/** One dot for each payout promised: filled when it arrived, amber when late, red when it never came, dashed when it is still to come. */
function Dots({ verdicts }: { verdicts: PayoutVerdict[] }) {
  // The last 24 promises are drawn; more than that and the older ones are counted, not drawn.
  const shown = verdicts.slice(-DOTS_MAX);
  const hidden = verdicts.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1" role="img" aria-label={`Promised against arrived: ${verdicts.filter((v) => v === "On time" || v === "Paid late").length} of ${verdicts.length} arrived`}>
      {hidden > 0 && <small className="mr-1 text-[10px] font-bold text-on-card-muted">+{hidden} earlier</small>}
      {shown.map((v, i) => (
        <i key={i} title={v} className={`block size-2.5 rounded-full ${DOT[v]}`} />
      ))}
    </span>
  );
}

/** A loan's interest piling up as a ramp from the day it was lent. */
function Ramp({ points }: { points: number[] }) {
  const w = 100;
  const h = 30;
  const xy = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * w},${h - p * h}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-14 w-full" aria-hidden="true">
      <polygon points={`0,${h} ${xy.join(" ")} ${w},${h}`} fill="currentColor" opacity="0.22" />
      <polyline points={xy.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The principal still out (solid), what came back (dashed) and the interest owed (hatched), as parts of one bar. */
function Meter({ meter }: { meter: NonNullable<HeroBlock["meter"]> }) {
  const part = (fraction: number, style: React.CSSProperties) => (fraction > 0 ? <i className="block h-full" style={{ width: `${fraction * 100}%`, ...style }} /> : null);
  return (
    <span className="flex h-2 overflow-hidden rounded-full bg-on-card-line" aria-hidden="true">
      {part(meter.principal, { background: "var(--on-card)" })}
      {part(meter.back, { background: "repeating-linear-gradient(90deg, var(--on-card-faint) 0 3px, transparent 3px 6px)" })}
      {part(meter.owed, { background: "repeating-linear-gradient(135deg, var(--warning) 0 4px, transparent 4px 8px)" })}
    </span>
  );
}

function Blocks({ blocks, picked, choose }: { blocks: HeroBlock[]; picked: string; choose: (id: string) => void }) {
  const n = blocks.length;
  // On a phone the blocks stack, one to a row; from a tablet up they sit side by side, the biggest tall when there are three.
  const layout = n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-rows-2";
  return (
    <div role="group" aria-label="Borrowers" className={`grid flex-1 auto-rows-fr gap-3 ${layout}`}>
      {blocks.map((b, i) => {
        const on = picked === b.id;
        const big = n >= 3 && i === 0;
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            aria-label={`${b.name}, ${b.owed}, ${b.share}`}
            onClick={() => choose(b.id)}
            className={`flex min-h-[170px] min-w-0 flex-col justify-between gap-3 rounded-[20px] p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-card ${big ? "sm:col-span-2 md:col-span-1 md:row-span-2" : ""} ${on ? "ring-2 ring-on-card" : picked === ALL ? "" : "opacity-75"}`}
            style={{ background: colorGradient(b.colorKey, 135) }}
          >
            <span className="flex items-start gap-2.5">
              <Initial name={b.name} colorKey={b.colorKey} />
              <span className="min-w-0 flex-1">
                <b className="line-clamp-2 text-[14px] leading-tight font-extrabold break-words">{b.name}</b>
                <small className="block text-[11px] font-semibold text-on-card-muted">{b.terms}</small>
              </span>
              <span className="text-[13px] font-extrabold">{b.share}</span>
            </span>
            {b.pile ? (
              <span className="flex flex-col gap-1.5">
                <small className="text-[11px] font-bold text-on-card-muted">{b.pile.text}</small>
                <Ramp points={b.pile.ramp} />
              </span>
            ) : b.promises ? (
              <span className="flex flex-col items-start gap-2">
                <small className="text-[11px] font-bold text-on-card-muted">Promised against arrived</small>
                <Dots verdicts={b.promises.verdicts} />
                {b.promises.notHere && <span className="rounded-full bg-on-card-fill px-2.5 py-0.5 text-[11px] font-extrabold">{b.promises.notHere}</span>}
              </span>
            ) : (
              <span />
            )}
            <span className="flex flex-col gap-1.5">
              <b className="text-[28px] leading-none font-extrabold tabular-nums max-md:text-[24px]">{b.owed}</b>
              <small className="text-[11px] font-semibold text-on-card-muted">{b.composition}</small>
              {b.meter && <Meter meter={b.meter} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Past three borrowers: a scrolling list, longest first, so sixteen people never become sixteen tiny blocks. */
function LoanList({ view, picked, choose }: { view: HeroView; picked: string; choose: (id: string) => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div role="group" aria-label="Borrowers" className="max-h-[360px] min-h-0 flex-1 overflow-y-auto rounded-[16px] bg-on-card-line p-1.5">
        {view.blocks.map((b) => (
          <button key={b.id} type="button" aria-pressed={picked === b.id} onClick={() => choose(b.id)} className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto] rounded-[12px] px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-on-card ${picked === b.id ? "bg-on-card-fill" : "hover:bg-on-card-line"}`}>
            <Initial name={b.name} colorKey={b.colorKey} size={30} />
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-extrabold">{b.name}</b>
              <small className="block truncate text-[11px] font-semibold text-on-card-muted">{b.terms}</small>
            </span>
            <i className="hidden h-1.5 rounded-full bg-on-card-line sm:block" aria-hidden="true">
              <i className="block h-full rounded-full bg-on-card" style={{ width: `${b.barFraction * 100}%` }} />
            </i>
            <b className="text-[13px] font-extrabold tabular-nums">{b.owed}</b>
            <span className="hidden w-12 text-right text-[12px] font-bold text-on-card-muted tabular-nums sm:block">{b.share}</span>
          </button>
        ))}
      </div>
      {view.listNote && <p className="mt-2 text-[11px] font-semibold text-on-card-muted">{view.listNote}</p>}
    </div>
  );
}

function RepaidStrip({ repaid }: { repaid: HeroRepaid }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-dashed border-on-card-faint px-3 py-2">
      <Initial name={repaid.name} colorKey={repaid.colorKey} size={26} />
      <span className="min-w-0 flex-1 text-[12px] font-semibold">
        <b className="font-extrabold">{repaid.name}</b> <small className="text-on-card-muted">{repaid.note}</small>
      </span>
      <span className="rounded-full bg-on-card-fill px-2.5 py-0.5 text-[11px] font-extrabold">Repaid</span>
    </div>
  );
}

function PaneBody({ pane }: { pane: HeroPane }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">{pane.eyebrow}</p>
        <h3 className="mt-1 text-[24px] font-extrabold">{pane.title}</h3>
      </div>
      <p className="flex items-baseline gap-1.5 leading-none" aria-label={`₹${pane.big}`}>
        <span className="text-3xl font-bold text-on-card-muted">₹</span>
        <span className={`font-extrabold tabular-nums ${pane.big.length >= 9 ? "text-[48px] max-md:text-[40px]" : "text-[60px] max-md:text-[48px]"}`}>{pane.big}</span>
      </p>
      <p className="text-[13px] font-semibold text-on-card-muted">{pane.sub}</p>
      {pane.chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pane.chips.map((c) => (
            <li key={c} className="rounded-full bg-on-card-fill px-3 py-1 text-xs font-bold">
              {c}
            </li>
          ))}
        </ul>
      )}
      {pane.rows.length > 0 && (
        <div>
          <p className="text-[13px] font-extrabold">
            Without each, in turn <small className="ml-1.5 text-[11px] font-semibold text-on-card-muted">{pane.rowsNote}</small>
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {pane.rows.map((r) => (
              <li key={r.key} className="flex items-center gap-3 rounded-[14px] bg-on-card-fill px-3 py-2.5">
                <Initial name={r.name.replace(/^Without /, "")} colorKey={r.colorKey} size={30} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                  <small className="block text-[11px] font-semibold text-on-card-muted">{r.note}</small>
                </span>
                <span className="text-right">
                  <b className="block text-[14px] font-extrabold tabular-nums">{r.amount}</b>
                  <small className="block text-[11px] font-semibold text-on-card-muted">still out</small>
                </span>
                <span className="w-11 rounded-full bg-on-card-line px-2 py-0.5 text-center text-[11px] font-extrabold">{r.remaining}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pane.without && (
        <div>
          <p className="flex justify-between text-[11px] font-semibold text-on-card-muted">
            <span>Now</span>
            <b className="text-on-card tabular-nums">{pane.without.now}</b>
          </p>
          <div className="mt-1 flex h-9 overflow-hidden rounded-[10px] text-[11px] font-extrabold" aria-hidden="true">
            <i className="flex items-center bg-on-card px-3 text-ink not-italic" style={{ width: `${pane.without.keepFraction * 100}%` }}>
              {pane.without.keepFraction > 0.25 ? pane.without.stillOut : ""}
            </i>
            <i className="flex flex-1 items-center justify-end bg-on-card-fill px-3 not-italic" style={{ background: "repeating-linear-gradient(135deg, var(--on-card-fill) 0 5px, transparent 5px 10px)" }}>
              {pane.without.gone}
            </i>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-on-card-muted">The hatched part is what {pane.without.goneLabel}: {pane.without.gone}</p>
        </div>
      )}
      {pane.tiles.length > 0 && (
        <dl className="grid grid-cols-2 gap-2.5">
          {pane.tiles.map((t) => (
            <div key={t.label} className="rounded-[14px] bg-on-card-fill p-3.5">
              <dt className="text-[10px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">{t.label}</dt>
              <dd className="mt-1 text-xl font-extrabold tabular-nums max-md:text-lg">{t.value}</dd>
              <dd className="mt-0.5 text-[11px] font-medium text-on-card-muted">{t.note}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-[11px] font-semibold text-on-card-muted">{pane.note}</p>
    </div>
  );
}
