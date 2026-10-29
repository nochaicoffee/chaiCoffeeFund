"use client";

import { useState, type ReactNode } from "react";
import type { MixBlock } from "@/app/accounts/views";
import { formatInr } from "@/lib/format/money";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { CostMapHover } from "../subscriptions/CostMapHover";
import { CheckIcon } from "../subscriptions/icons";
import { mapCategories, mapLayout, type Box, type MapCategory } from "../subscriptions/costMap";
import { Mono, Segmented } from "../subscriptions/parts";
import { useSize } from "../subscriptions/useSize";

/**
 * "Where it sits" (docs/design/accounts.md, the mix): the Subscriptions cost map, for balances.
 * It is built the same way, so it looks and behaves the same: a treemap of the open accounts
 * sized by what they hold, each block in its account's colour with its name, what it holds and
 * a pill when it needs a look; hovering or focusing a block or a purpose's tile lifts it,
 * steps the rest back and shows a light card; the open account carries a ring and a tick.
 * By purpose glides the same blocks into a tile per purpose, in its colour. Clicking a block
 * opens that account. The map fills the height its card has, which sits beside Balance
 * history, and that card keeps one height whatever's picked, so the blocks stay where they are.
 * The layout is the cost map's own (costMap.ts); the shared card shell is CostMapHover.
 */

/** The rings ripple outward on the active block, as on the Cards page's heatmap (#104). */
const RIPPLE = "origin-bottom-right motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-data-active:scale-[1.18]";
/** While one is hovered or focused, the rest step back: greyer and a little faded, not washed out to the page. */
const DIM = "group-data-hovering/map:not-data-active:opacity-75 group-data-hovering/map:not-data-active:saturate-[.55]";
/** Blocks glide to their new places once the map has been measured, so the first layout doesn't fly in from a guess. */
const GLIDE =
  "motion-safe:[transition:left_500ms_cubic-bezier(0.2,0.8,0.2,1),top_500ms_cubic-bezier(0.2,0.8,0.2,1),width_500ms_cubic-bezier(0.2,0.8,0.2,1),height_500ms_cubic-bezier(0.2,0.8,0.2,1),opacity_250ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const STILL = "motion-safe:[transition:opacity_200ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const PICKED_RING = "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)";
const NONE: ReadonlySet<string> = new Set();

const at = (box: Box) => ({ left: box.x, top: box.y, width: box.w, height: box.h });
const percent = (share: number) => `${Math.round(share * 100)}%`;

function Block({ box, block, picked, grouped, glide, onPick }: { box: Box; block: MixBlock; picked: boolean; grouped: boolean; glide: boolean; onPick: () => void }) {
  const { w, h } = box;
  const big = w > 150 && h > 110;
  const mid = w > 82 && h > 62;
  const tiny = w < 64 || h < 52;
  // A big block on a phone is narrower than on a desktop, so its figure steps down a size there.
  const wide = w > 230;
  return (
    <div
      data-map-key={grouped ? undefined : block.id}
      data-map-owner={grouped ? block.category : undefined}
      aria-hidden={grouped || undefined}
      className={`group absolute data-active:-translate-y-[3px] ${DIM} ${glide ? GLIDE : STILL} ${grouped ? "pointer-events-none" : ""}`}
      style={at(box)}
    >
      <button
        type="button"
        tabIndex={grouped ? -1 : undefined}
        aria-pressed={picked}
        aria-label={`${block.alias}, ${block.balanceText}, ${percent(block.share)} of what you hold`}
        onClick={onPick}
        className={`relative isolate flex size-full flex-col justify-between overflow-hidden border border-on-card-line border-t-on-card-line-top text-left text-on-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          grouped ? "rounded-lg p-2" : big ? "rounded-[18px] p-4" : tiny ? "items-center justify-center rounded-xl p-1.5" : "rounded-xl p-2.5"
        }`}
        style={{ background: colorGradient(block.color), boxShadow: picked && !grouped ? PICKED_RING : "none" }}
      >
        {/* By purpose it takes its purpose's colour, fading in over its own. Under the rings, so they still show. */}
        <span aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 motion-safe:transition-opacity motion-safe:duration-500 ${grouped ? "opacity-100" : "opacity-0"}`} style={{ background: colorGradient(block.categoryColor) }} />
        <RingTexture width={Math.max(1, Math.round(w))} height={Math.max(1, Math.round(h))} dx={10} dy={19} first={40} step={24} count={9} stroke="var(--rings-light)" opacity={0.05} ringsClassName={RIPPLE} />
        {grouped ? (
          // Its purpose's name and total sit at the tile's top, so its own name goes to the bottom.
          w > 44 && h > 26 && <span className="mt-auto truncate text-[10.5px] font-bold text-on-card-muted">{block.alias}</span>
        ) : tiny ? (
          <span className="text-center leading-[1.15]">
            <b className="text-[13px]">{block.initial}</b>
            {h > 40 && w > 40 && (
              <span className="block text-[10px] font-extrabold tabular-nums">
                <RollingNumber value={block.monthly} format="inr" />
              </span>
            )}
          </span>
        ) : (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className={`block truncate font-extrabold ${big ? "text-[17px]" : "text-xs"}`}>{block.alias}</span>
                {mid && <span className={`mt-[3px] block truncate font-semibold text-on-card-muted ${big ? "text-xs" : "text-[10.5px]"}`}>{big ? block.detail : block.card.purpose}</span>}
              </span>
              {big && <span className="text-[10px] font-semibold text-on-card-faint">{percent(block.share)}</span>}
            </span>
            <span>
              <span className={`block leading-[1.1] font-extrabold whitespace-nowrap tabular-nums ${big ? (wide ? "text-[26px]" : "text-xl") : "text-[13px]"}`}>
                <RollingNumber value={block.monthly} format="inr" />
              </span>
              {big && (
                <span className="mt-2 flex items-center justify-between gap-2">
                  {block.pill ? <span /> : <span className="truncate text-[10px] font-semibold text-on-card-faint">{block.footnote}</span>}
                  {block.pill && <Pill text={block.pill} />}
                </span>
              )}
              {!big && mid && block.pill && (
                <span className="mt-[5px] block">
                  <Pill text={block.pill} />
                </span>
              )}
              {!big && mid && !block.pill && <span className="mt-[3px] block text-[10.5px] font-semibold text-on-card-muted">{percent(block.share)}</span>}
            </span>
          </>
        )}
      </button>
      {picked && !grouped && (
        <span aria-hidden="true" className="absolute -top-[7px] -right-[7px] z-[3] flex size-[21px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_2px_6px_oklch(0_0_0/0.4)]">
          <CheckIcon />
        </span>
      )}
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return <span className="inline-block rounded-full bg-[oklch(0.8_0.13_80/0.35)] px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap">{text}</span>;
}

/** By purpose: a purpose's name and total over its blocks, and what's hovered and focused for its card. A purpose isn't something to pick. */
function PurposeTile({ box, category }: { box: Box; category: MapCategory<MixBlock> }) {
  const roomy = box.w > 110 && box.h > 70;
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${category.label}, ${formatInr(category.monthly)}`}
      data-map-key={category.key}
      className={`group absolute rounded-xl p-2.5 text-on-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-active:-translate-y-[3px] ${DIM} ${GLIDE}`}
      style={at(box)}
    >
      {/* A tile too narrow to read a name in (a small purpose beside a big one) stays plain, as its hover card still says what it is. */}
      <span className={`flex flex-col [text-shadow:0_1px_8px_oklch(0_0_0/0.45)] motion-safe:animate-tile-in ${box.w > 56 ? "" : "hidden"}`}>
        <span className={`truncate font-extrabold ${roomy ? "text-[15px]" : "text-xs"}`}>{category.label}</span>
        {box.h > 46 && (
          <span className={`font-extrabold tabular-nums ${roomy ? "text-xl" : "text-[13px]"}`}>
            <RollingNumber value={category.monthly} format="inr" />
          </span>
        )}
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold whitespace-nowrap text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-bold">{children}</span>
    </div>
  );
}

/** The hover card for an account's block: what it holds against the total, who and when, and what changed. */
function BlockCard({ block, picked }: { block: MixBlock; picked: boolean }) {
  const mark = { alias: block.alias, initial: block.initial, color: block.color, muted: false };
  return (
    <>
      <div className="flex items-center gap-2.5">
        <Mono mark={mark} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-extrabold">{block.alias}</div>
          <div className="truncate text-[11px] font-semibold text-muted">{block.card.last4 ? `${block.card.bank} · •••• ${block.card.last4}` : block.card.bank}</div>
        </div>
      </div>
      <div className="mt-2.5 text-2xl leading-tight font-extrabold tabular-nums">{block.balanceText}</div>
      <div className="text-[11px] font-semibold text-muted">What it holds today</div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden="true">
        <span className="block h-full rounded-[inherit]" style={{ width: `${Math.max(2, block.share * 100)}%`, background: `var(--card-${block.color})` }} />
      </div>
      <div className="mt-1.5 text-[11px] font-semibold text-muted">{percent(block.share)} of what you hold</div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Row label="Purpose">{block.card.purpose}</Row>
        <Row label="Updated">{block.pill ? <span className="text-[var(--card-copper)]">{block.card.updated}</span> : block.card.updated}</Row>
        <Row label="Last change">
          <span className={block.card.changeTone === "up" ? "text-positive" : block.card.changeTone === "down" ? "text-negative" : "text-muted"}>{block.card.change}</span>
        </Row>
      </div>
      <div className="mt-3 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{picked ? "Its card is open" : "Click to open its card"}</div>
    </>
  );
}

/** The hover card for a purpose's tile: what it holds, and its accounts. */
function PurposeCard({ category, total }: { category: MapCategory<MixBlock>; total: number }) {
  const count = category.members.length;
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={{ background: `var(--card-${category.color})` }} />
          {category.label}
        </span>
        <span>
          {count} account{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-1 text-2xl leading-tight font-extrabold tabular-nums">{formatInr(category.monthly)}</div>
      <div className="text-[11px] font-semibold text-muted">{total > 0 ? `${percent(category.monthly / total)} of what you hold` : ""}</div>
      {count > 1 && (
        <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {category.members.map((m) => (
            <span key={m.id} className="h-full" style={{ flexGrow: m.monthly, background: `var(--card-${m.color})` }} />
          ))}
        </div>
      )}
      <ul className="mt-2.5 flex flex-col gap-1">
        {category.members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-xs font-semibold">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: `var(--card-${m.color})` }} />
            <span className="min-w-0 flex-1 truncate text-muted">{m.alias}</span>
            <span className="font-extrabold tabular-nums">{m.balanceText}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function MixCard({ blocks, picked, onPick }: { blocks: MixBlock[]; picked: string; onPick: (id: string) => void }) {
  const [by, setBy] = useState<"each" | "category">("each");
  // The map is laid out at its real size, so a block knows whether there's room for its details.
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 704, h: 520 });
  const total = blocks.reduce((sum, b) => sum + b.monthly, 0);
  const layout = mapLayout(blocks, { by, without: NONE, ghost: null, width: size.w, height: size.h });
  const categories = mapCategories(blocks);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const byKey = new Map(categories.map((c) => [c.key, c]));
  const grouped = by === "category";
  // Blocks are drawn biggest first, as the layout puts them, so Tab moves through the map in order.
  const ordered = [...blocks].sort((a, b) => b.monthly - a.monthly);
  return (
    <section aria-labelledby="mix-title" className="relative flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mix-title" className="text-[15px] font-extrabold text-fg">
          Where it sits<small className="ml-2 text-xs font-semibold text-muted max-md:hidden">{formatInr(total)} · sized by what each holds · pick one to open it</small>
        </h2>
        <Segmented label="Group" value={by} onChange={setBy} options={[{ value: "each", label: "By account" }, { value: "category", label: "By purpose" }]} />
      </div>

      <CostMapHover
        renderBlock={(key) => (byId.has(key) ? <BlockCard block={byId.get(key)!} picked={picked === key} /> : null)}
        renderCategory={(key) => (byKey.has(key) ? <PurposeCard category={byKey.get(key)!} total={total} /> : null)}
      >
        <div ref={box} className="relative min-h-[360px] flex-1 md:min-h-[440px]">
          {blocks.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center rounded-[18px] border-[1.5px] border-dashed border-divider px-6 text-center text-[13px] font-medium text-muted">Each open account with a balance becomes a block here, sized by what it holds.</p>
          ) : (
            <>
              {ordered.map((b) => {
                const rect = layout.boxes.get(b.id);
                // A ₹0 balance has no room in the map, so it isn't drawn.
                return rect && <Block key={b.id} box={rect} block={b} picked={picked === b.id} grouped={grouped} glide={measured} onPick={() => onPick(b.id)} />;
              })}
              {grouped && categories.map((c) => layout.tiles.get(c.key) && <PurposeTile key={c.key} box={layout.tiles.get(c.key)!} category={c} />)}
            </>
          )}
        </div>
      </CostMapHover>

      {/* The purpose legend belongs to By purpose: by account, every block is in its own account's colour. */}
      {grouped && categories.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
          {categories.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={{ background: `var(--card-${c.color})` }} />
              {c.label}{" "}
              <b className="font-bold text-fg tabular-nums">
                <RollingNumber value={c.monthly} format="inr" />
              </b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
