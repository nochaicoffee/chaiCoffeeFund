"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CategoryBlock, MapBlock } from "@/app/subscriptions/views";
import { formatInr } from "@/lib/format/money";
import { ArrowIcon } from "./icons";
import { ChargedTo, Mono } from "./parts";

const TIP_ID = "cost-map-card";

/**
 * The map's hover card: hovering or focusing a block shows a light card, like the Cards
 * page's month card (#104), with what it costs against the total, when it renews, where
 * it's charged and what's been paid; a category's tile lists its subscriptions. The card
 * follows the pointer and glides as it goes, or sits over a focused block. Blocks opt in
 * with `data-map-key`; the active one gets `data-active` (it lifts and its rings ripple),
 * and the map gets `data-hovering`, which dims the rest. Not on touch, where a tap picks.
 */
export function CostMapHover({
  blocks,
  categories,
  per,
  picked,
  children,
}: {
  blocks: Map<string, MapBlock>;
  categories: Map<string, CategoryBlock>;
  per: "month" | "year";
  picked: string;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement | null>(null);
  // Where the pointer is in the map, or null when a block has keyboard focus.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [key, setKey] = useState<string | null>(null);
  // What the card shows: the last block hovered, kept while it fades out so it doesn't empty first.
  const [shown, setShown] = useState<string | null>(null);

  function show(target: EventTarget | null) {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-map-key]");
    // Over a gap between blocks the card stays as it is, rather than blinking off and on.
    if (!el || !wrap.current?.contains(el)) return place();
    if (active.current !== el) {
      active.current?.removeAttribute("data-active");
      active.current?.removeAttribute("aria-describedby");
      el.setAttribute("data-active", "");
      el.setAttribute("aria-describedby", TIP_ID);
      active.current = el;
    }
    wrap.current.dataset.hovering = "";
    setKey(el.dataset.mapKey!);
    setShown(el.dataset.mapKey!);
    place();
  }

  function hide() {
    active.current?.removeAttribute("data-active");
    active.current?.removeAttribute("aria-describedby");
    active.current = null;
    if (wrap.current) delete wrap.current.dataset.hovering;
    setKey(null);
  }

  // Beside the pointer, on whichever side has room; for a focused block, above it or else below it, or over its top edge when neither fits.
  function place() {
    const box = wrap.current, card = tip.current, el = active.current;
    if (!box || !card || !el || card.dataset.key === undefined) return;
    const outer = box.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    let x: number, y: number;
    if (pointer.current) {
      const { x: px, y: py } = pointer.current;
      x = px + 18 + width > outer.width ? px - 18 - width : px + 18;
      y = outer.top + py + 18 + height > window.innerHeight - 8 ? py - 18 - height : py + 18;
    } else {
      const target = el.getBoundingClientRect();
      x = target.left - outer.left + target.width / 2 - width / 2;
      if (target.top - height - 10 >= 8) y = target.top - outer.top - height - 10;
      else if (target.bottom + 10 + height <= window.innerHeight - 8) y = target.bottom - outer.top + 10;
      else y = target.top - outer.top + 10;
    }
    x = Math.min(Math.max(x, 0), Math.max(0, outer.width - width));
    // It glides once open; when it opens, it appears where it is.
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  }

  // Placed again once its content has rendered, since its size depends on it.
  useLayoutEffect(() => {
    const card = tip.current;
    if (!card) return;
    if (!key) {
      delete card.dataset.open;
      delete card.dataset.key;
      return;
    }
    card.dataset.key = key;
    place();
  }, [key, per]);

  // Switching Each and By category (from the keyboard, with the pointer resting on the map), or a
  // refresh, can take away the block the card describes: then it closes. Not keyed by the grouping
  // instead, since remounting the map's box would leave useSize watching the old, detached one.
  useEffect(() => {
    if (active.current && !active.current.isConnected) hide();
  });

  const block = shown ? blocks.get(shown) : undefined;
  const category = shown ? categories.get(shown) : undefined;

  return (
    <div
      ref={wrap}
      className="group/map relative flex flex-1 flex-col"
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const outer = wrap.current!.getBoundingClientRect();
        pointer.current = { x: e.clientX - outer.left, y: e.clientY - outer.top };
        show(e.target);
      }}
      onPointerLeave={(e) => e.pointerType !== "touch" && hide()}
      onFocus={(e) => {
        // Only a keyboard focus places it over the block; a click's focus keeps the pointer's place.
        if (!e.target.matches(":focus-visible")) return;
        pointer.current = null;
        show(e.target);
      }}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node | null) && hide()}
      onKeyDown={(e) => e.key === "Escape" && hide()}
    >
      {children}
      <div
        ref={tip}
        id={TIP_ID}
        role="tooltip"
        aria-hidden={!key}
        className="pointer-events-none absolute top-0 left-0 z-20 w-[264px] rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translate(var(--x,0px),var(--y,0px))_scale(0.96)] data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
      >
        {block && <BlockCardBody block={block} per={per} picked={picked === block.id} />}
        {category && <CategoryCardBody category={category} per={per} />}
      </div>
    </div>
  );
}

const amountFor = (monthly: number, per: "month" | "year") => formatInr(per === "year" ? monthly * 12 : monthly);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold whitespace-nowrap text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-bold">{children}</span>
    </div>
  );
}

function BlockCardBody({ block, per, picked }: { block: MapBlock; per: "month" | "year"; picked: boolean }) {
  const { card } = block;
  // The plan's own price, when the toggle shows it some other way: "Yearly plan · ₹3,999 a year".
  const own = (block.cycle === "Monthly" && per === "month") || (block.cycle === "Yearly" && per === "year");
  return (
    <>
      <div className="flex items-center gap-2.5">
        <Mono mark={block} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-extrabold">{block.alias}</div>
          <div className="truncate text-[11px] font-semibold text-muted">{card.name === block.alias ? block.detail : card.name}</div>
        </div>
      </div>
      <div className="mt-2.5 text-2xl leading-tight font-extrabold tabular-nums">
        {amountFor(block.monthly, per)}
        <span className="text-xs font-semibold text-muted"> a {per}</span>
      </div>
      <div className="text-[11px] font-semibold text-muted">{own ? `${block.cycle} plan` : `${block.cycle} plan · ${card.price}`}</div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden="true">
        <span className="block h-full rounded-[inherit]" style={{ width: `${Math.max(2, block.share * 100)}%`, background: `var(--card-${block.color})` }} />
      </div>
      <div className="mt-1.5 text-[11px] font-semibold text-muted">{card.share}</div>
      <div className="mt-3 flex flex-col gap-1.5">
        {card.renews && <Row label="Renews">{card.renews}</Row>}
        <Row label="Charged to">{card.chargedTo.kind === "none" ? <span className="text-muted">Not set</span> : <ChargedTo chip={card.chargedTo} />}</Row>
        <Row label="Paid so far">{card.paid}</Row>
        {card.change && (
          <Row label="Price">
            <span className={`inline-flex items-center gap-[3px] ${card.change.up ? "text-negative" : "text-positive"}`}>
              <ArrowIcon up={card.change.up} />
              {card.change.text}
            </span>
          </Row>
        )}
      </div>
      <div className="mt-3 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{picked ? "Its payments are showing" : "Click to see its payments"}</div>
    </>
  );
}

function CategoryCardBody({ category, per }: { category: CategoryBlock; per: "month" | "year" }) {
  const count = category.members.length;
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={{ background: `var(--card-${category.color})` }} />
          {category.label}
        </span>
        <span>{category.card.count}</span>
      </div>
      <div className="mt-1 text-2xl leading-tight font-extrabold tabular-nums">
        {amountFor(category.monthly, per)}
        <span className="text-xs font-semibold text-muted"> a {per}</span>
      </div>
      <div className="text-[11px] font-semibold text-muted">{category.card.share}</div>
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
            <span className="font-extrabold tabular-nums">{amountFor(m.monthly, per)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
