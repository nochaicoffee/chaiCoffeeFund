import type { ReactNode } from "react";
import type { MapBlock } from "@/app/subscriptions/views";
import { formatInr } from "@/lib/format/money";
import type { MapCategory } from "./costMap";
import { ArrowIcon } from "./icons";
import { ChargedTo, Mono } from "./parts";

/** A category as its hover card shows it: its subscriptions and what its card says. */
export type HoverCategory = MapCategory<MapBlock> & { card: { count: string; share: string } };

/** What the cost map's hover card says about a subscription's block, and about a category's tile. */
const amountFor = (monthly: number, per: "month" | "year") => formatInr(per === "year" ? monthly * 12 : monthly);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold whitespace-nowrap text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-bold">{children}</span>
    </div>
  );
}

export function BlockCardBody({ block, per, picked }: { block: MapBlock; per: "month" | "year"; picked: boolean }) {
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

export function CategoryCardBody({ category, per }: { category: HoverCategory; per: "month" | "year" }) {
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
