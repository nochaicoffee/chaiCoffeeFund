"use client";

import type { CSSProperties } from "react";
import { ALL, type CoverTile, type CoverView, type PolicyBox } from "@/app/insurance/views";
import { Tip, TipBody } from "../shell/Tip";
import { RingTexture } from "../RingTexture";
import { FormTrigger, SMALL_SOFT, useInsuranceForms } from "./forms/InsuranceForms";
import { TileMark, WARN_BAR } from "./parts";

/**
 * The Insurance page's hero, the cover map (docs/design/insurance.md, InsFinal; Prathik's pick I2): a light card whose top says how
 * many policies are in force and the cover of each kind, then a tile for each thing that is protected (you, the car, the bike)
 * holding that thing's policies. A policy is the pick: it's ringed in its colour and the rest dim, and the pick is kept in the
 * address as `?policy=` by the dashboard. Each term bar has its own hover card. A financed thing with no policy gets a dashed tile.
 */


const BADGE: Record<NonNullable<PolicyBox["badge"]>, { text: string; className: string }> = {
  lapsed: { text: "lapsed", className: "bg-negative-tint text-negative" },
  soon: { text: "soon", className: "bg-warning-tint text-warning-text" },
  cancelled: { text: "cancelled", className: "bg-fill text-muted" },
};

/**
 * Wide screens lay the tiles out in one row while that leaves each room for its policies (a tile with two policies takes two
 * columns, the "Something else?" tile one, up to five); more than that wraps in four, so the last row isn't one narrow tile.
 */
const columnsFor = (tiles: CoverTile[]) => {
  const spans = tiles.reduce((total, tile) => total + (tile.boxes.length > 1 ? 2 : 1), 1);
  return spans <= 5 ? spans : 4;
};

export function CoverMap({ cover, pickId, onPick }: { cover: CoverView; pickId: string; onPick: (id: string) => void }) {
  const columns = columnsFor(cover.tiles);
  const { open } = useInsuranceForms();
  return (
    <section id="cover-map" aria-label="Your cover" className="relative isolate flex min-w-0 scroll-mt-6 flex-col gap-5 rounded-[26px] border border-feature-tile-line bg-feature-tile p-5 text-fg md:p-7">
      <RingTexture width={1416} height={640} dx={60} dy={60} first={60} step={30} stroke="var(--rings-ink)" opacity={0.09} />
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="text-xs font-extrabold tracking-[0.04em] text-muted uppercase">What&apos;s protected · by what, and for how much</div>
          <div className="text-[44px] leading-none font-extrabold tracking-[-0.03em] tabular-nums md:text-[56px]">
            {cover.count}
            <small className="ml-2 text-[22px] font-bold tracking-normal md:text-[26px]">{cover.count === 1 ? "policy in force" : "policies in force"}</small>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${cover.delta.tone === "ok" ? "bg-positive-tint text-positive" : "bg-negative-tint text-negative"}`}>{cover.delta.text}</span>
            <span className="text-[12.5px] font-semibold text-muted">{cover.sub}</span>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {cover.figures.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-extrabold tracking-[0.04em] text-muted uppercase">{f.label}</dt>
              <dd className="text-[22px] leading-tight font-extrabold tabular-nums">{f.value}</dd>
              <dd className="text-[11.5px] font-semibold text-muted">{f.sub}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={pickId === ALL}
          onClick={() => onPick(ALL)}
          className={`min-h-8 rounded-full px-4 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pickId === ALL ? "bg-ink text-on-ink" : "bg-surface text-fg hover:bg-fill-strong"}`}
        >
          All policies
        </button>
        <span className="text-xs font-semibold text-muted">Pick a policy to ring it on the map</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": columns } as CSSProperties}>
        {cover.tiles.map((tile) => (
          <Tile key={tile.key} tile={tile} pickId={pickId} onPick={onPick} onAdd={() => open({ kind: "add" })} />
        ))}
        <div className="flex min-w-0 flex-col gap-3.5 rounded-[22px] border-[1.5px] border-dashed border-fg/20 p-[18px]">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-fill-strong text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="min-w-0">
              <b className="block text-base leading-tight font-extrabold">Something else?</b>
              <small className="block text-[11.5px] font-semibold text-muted">Not recorded</small>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1.5 rounded-2xl bg-surface/50 p-3.5">
            <b className="text-sm font-extrabold">Nothing else yet</b>
            <p className="text-xs leading-normal font-semibold text-muted">Parents&apos; health, a term plan, the home.</p>
            <FormTrigger className={`${SMALL_SOFT} w-fit`} label="+ Add policy" onClick={() => open({ kind: "add" })} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs font-semibold text-muted">
        <span className="flex flex-wrap gap-x-4 gap-y-1" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-fg/70" />
            Term gone by
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px]" style={{ background: WARN_BAR }} />
            Renews within a month, or lapsed
          </span>
        </span>
        <span>Cover is the sum insured, or the IDV for a vehicle. Each policy covers only the person or vehicle named.</span>
      </div>
    </section>
  );
}

function Tile({ tile, pickId, onPick, onAdd }: { tile: CoverTile; pickId: string; onPick: (id: string) => void; onAdd: () => void }) {
  const wide = tile.boxes.length > 1;
  return (
    <div className={`flex min-w-0 flex-col gap-3.5 rounded-[22px] p-[18px] ${tile.gap ? "border-[1.5px] border-dashed border-fg/20" : "border border-surface-line bg-surface/60 shadow-soft"} ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-3">
        <TileMark icon={tile.icon} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-base leading-tight font-extrabold">{tile.name}</b>
          <small className="block truncate text-[11.5px] font-semibold text-muted">{tile.sub}</small>
        </span>
        {tile.yearly && (
          <span className="text-right text-xs leading-tight font-extrabold tabular-nums">
            {tile.yearly}
            <small className="block text-[10.5px] font-semibold text-muted">a year</small>
          </span>
        )}
      </div>
      {tile.gap ? (
        <div className="flex flex-1 flex-col justify-center gap-1.5 rounded-2xl bg-surface/50 p-3.5">
          <b className="text-sm font-extrabold">{tile.gap.title}</b>
          <p className="text-xs leading-normal font-semibold text-muted">{tile.gap.text}</p>
          <FormTrigger className={`${SMALL_SOFT} w-fit`} label="+ Add a policy" onClick={onAdd} />
        </div>
      ) : (
        <div className={`grid flex-1 grid-cols-1 gap-2.5 ${wide ? "sm:grid-cols-2" : ""}`}>
          {tile.boxes.map((box) => (
            <Box key={box.id} box={box} pickId={pickId} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

function Box({ box, pickId, onPick }: { box: PolicyBox; pickId: string; onPick: (id: string) => void }) {
  const on = pickId === box.id;
  const style = { "--c": `var(--card-${box.colorKey})`, boxShadow: on ? "0 0 0 2px var(--c), var(--card-shadow)" : undefined } as CSSProperties;
  const badge = box.badge ? BADGE[box.badge] : null;
  return (
    <div
      onClick={() => onPick(box.id)}
      style={style}
      className={`flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl border border-surface-line border-l-4 border-l-[var(--c)] bg-surface p-3 shadow-soft motion-safe:transition-[box-shadow,opacity,transform] motion-safe:duration-200 hover:-translate-y-px ${pickId !== ALL && !on ? "opacity-45" : ""}`}
    >
      <button type="button" aria-pressed={on} aria-label={`${box.name}, ${box.insurer}`} className="flex min-w-0 flex-col gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <b className="block truncate text-[13px] leading-tight font-extrabold">{box.name}</b>
            <small className="mt-px block truncate text-[11px] font-semibold text-muted">{box.insurer}</small>
          </span>
          {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badge.className}`}>{badge.text}</span>}
        </span>
        <span className="text-[22px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
          {box.cover}
          <small className="ml-1.5 text-[10.5px] font-extrabold tracking-[0.04em] text-muted uppercase">{box.coverWord}</small>
        </span>
      </button>
      {box.tip.rows.length > 0 ? (
        <Tip className="block rounded-full" label={`${box.name}: ${box.tip.total}`} width={260} card={<TipBody head={box.tip.head} total={box.tip.total} detail={box.tip.detail} rows={box.tip.rows} foot={box.tip.foot} />}>
          <TermBar box={box} />
        </Tip>
      ) : (
        <TermBar box={box} />
      )}
      <span className="flex justify-between gap-2 text-[11px] font-bold text-muted">
        <span className={box.warn ? "text-warning-text" : ""}>{box.footLeft}</span>
        <span className="truncate">{box.footRight}</span>
      </span>
      {(box.costLeft || box.costRight) && (
        <span className="flex justify-between gap-2 text-[11px] font-bold text-muted">
          <span>{box.costLeft}</span>
          <span>{box.costRight}</span>
        </span>
      )}
    </div>
  );
}

function TermBar({ box }: { box: PolicyBox }) {
  return (
    <span className="relative block h-2 overflow-hidden rounded-full bg-fill-strong" aria-hidden="true">
      <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, box.elapsed * 100)}%`, background: box.warn ? WARN_BAR : "var(--c)" }} />
    </span>
  );
}
