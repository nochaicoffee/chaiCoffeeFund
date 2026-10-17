import Link from "next/link";
import type { ReactNode } from "react";
import type { CardColor } from "@/lib/sheets/types";
import { RingTexture } from "../RingTexture";

/** The tile background for a card colour, from the --card-* tokens (globals.css). Cards without one use onyx. */
export function cardGradient(color: CardColor | undefined): string {
  const key = (color ?? "Onyx").toLowerCase();
  return `linear-gradient(155deg, var(--card-${key}-from), var(--card-${key}-to))`;
}

/** The solid swatch for a card colour, for chart marks and legend dots. */
export function cardSwatch(color: CardColor | undefined): string {
  return `var(--card-${(color ?? "Onyx").toLowerCase()})`;
}

const ALL_CARDS_BACKGROUND =
  "radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), linear-gradient(150deg, var(--card-emerald-from), var(--card-emerald-to))";

/** The gold chip on a single card's tile. */
function ChipIcon() {
  return (
    <svg width="22" height="17" viewBox="0 0 24 18" aria-hidden="true">
      <rect x="1" y="1" width="22" height="16" rx="3" fill="var(--card-chip)" />
      <path d="M1 6h7M1 12h7M16 6h7M16 12h7M8 1v16M16 1v16" stroke="var(--card-chip-deep)" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Three stacked gold cards, for the All Cards tile. */
function StackIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 26 22" aria-hidden="true">
      <rect x="1" y="8" width="18" height="13" rx="2.5" fill="var(--card-chip-deep)" />
      <rect x="4" y="4.5" width="18" height="13" rx="2.5" fill="var(--card-chip-mid)" />
      <rect x="7" y="1" width="18" height="13" rx="2.5" fill="var(--card-chip)" />
    </svg>
  );
}

function SelectedBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2 -right-2 flex size-[21px] items-center justify-center rounded-full bg-accent shadow-card"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export interface CardTileProps {
  /** Where the tile leads. Without one it's a plain picture of the card, as in the Add card preview. */
  href?: string;
  selected: boolean;
  variant: "all" | "card";
  title: string;
  /** Top-right label: the issuer, or "3 cards" on All Cards. */
  corner: string;
  color?: CardColor;
  last4?: string;
  /** "₹38,500 / ₹1,20,000" */
  balance: string;
  /** "32.1%", or null when the card has no limit. */
  utilizationLabel: string | null;
  /** 0–1, for the bar. */
  utilization: number;
  /** A pill on the left of the footer, such as "Due Aug 25 · 7d", or nothing. */
  pill?: string;
  footnote: ReactNode;
  /** A closed card's tile: faded until it's selected. */
  dimmed?: boolean;
}

/**
 * One card in the tile row, as in the design: dark gradient tile, chip, name,
 * masked number, balance against limit with a bar, and what's due.
 */
export function CardTile(props: CardTileProps) {
  const isAll = props.variant === "all";
  const className = `relative isolate flex h-[196px] w-[300px] max-w-full shrink-0 snap-start flex-col justify-between rounded-card p-[18px] text-on-card ${
    props.selected ? "border-[1.5px] border-accent shadow-tile-selected" : "border border-on-card-line shadow-tile"
  } ${props.dimmed && !props.selected ? "opacity-55 saturate-50 hover:opacity-80" : ""}`;
  const style = { background: isAll ? ALL_CARDS_BACKGROUND : cardGradient(props.color) };
  const face = <TileFace {...props} isAll={isAll} />;
  if (!props.href) {
    return (
      <div className={className} style={style} aria-hidden="true">
        {face}
      </div>
    );
  }
  return (
    <Link
      href={props.href}
      scroll={false}
      aria-current={props.selected ? "true" : undefined}
      aria-label={`${props.title}: ${props.balance}${props.utilizationLabel ? `, ${props.utilizationLabel} used` : ""}`}
      className={`${className} transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent`}
      style={style}
    >
      {face}
    </Link>
  );
}

function TileFace(props: CardTileProps & { isAll: boolean }) {
  const { isAll } = props;
  return (
    <>
      {/* The design's rings on the All Cards tile stop at 10, short of its far corner. */}
      {isAll && <RingTexture width={300} height={196} dx={10} dy={19} first={45} step={26} count={10} stroke="var(--rings-light)" opacity={0.07} />}
      {props.selected && <SelectedBadge />}
      <div className="flex items-start justify-between">
        {isAll ? <StackIcon /> : <ChipIcon />}
        <span className="text-[10px] font-semibold text-on-card-faint">{props.corner}</span>
      </div>
      <div>
        <div className="truncate text-base font-extrabold">{props.title}</div>
        {props.last4 && (
          <div className="mt-[7px] text-xs tracking-[0.14em] text-on-card-faint tabular-nums">•••• •••• •••• {props.last4}</div>
        )}
        <div className={`flex items-center justify-between ${props.last4 ? "mt-2" : "mt-[7px]"}`}>
          <span className="text-[11px] text-on-card-muted tabular-nums">{props.balance}</span>
          {props.utilizationLabel && <span className="text-[10px] font-bold text-on-card-muted tabular-nums">{props.utilizationLabel}</span>}
        </div>
        <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-on-card-fill" aria-hidden="true">
          <div
            className={`h-full ${isAll ? "bg-on-card-lime" : "bg-on-card"}`}
            style={{ width: `${Math.min(100, Math.max(0, props.utilization * 100))}%` }}
          />
        </div>
        <div className="mt-[9px] flex min-h-[22px] items-center justify-between gap-2">
          {props.pill ? (
            <span className="rounded-full bg-on-card-fill px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap">{props.pill}</span>
          ) : (
            <span />
          )}
          <span className="truncate text-[10px] text-on-card-faint">{props.footnote}</span>
        </div>
      </div>
    </>
  );
}

/** The dashed tiles at the end of the row that aren't cards: the closed-cards fold and Add card. */
const END_TILE_CLASS =
  "flex h-[196px] shrink-0 snap-start items-center justify-center rounded-card border-[1.5px] border-dashed border-divider text-muted transition-colors hover:border-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

/**
 * The fold for closed cards with nothing left to pay, after the live cards: a
 * small faded stack of them in their own colours. Opening it lays them out as
 * faded tiles after it, so "Hide" stays where it was clicked.
 */
export function ClosedCardsTile({ href, colors, open }: { href: string; colors: (CardColor | undefined)[]; open: boolean }) {
  const label = `${colors.length} closed ${colors.length === 1 ? "card" : "cards"}`;
  // Up to three, the first in front and each one after it peeking out behind, up and to the left.
  const stack = colors.slice(0, 3).reverse();
  const step = { x: 7, y: 6 };
  return (
    <Link
      href={href}
      scroll={false}
      aria-expanded={open}
      aria-label={open ? `Hide ${label}` : `Show ${label}`}
      className={`${END_TILE_CLASS} group w-[168px] flex-col gap-3.5`}
    >
      <span
        className={`relative block transition-opacity group-hover:opacity-100 ${open ? "opacity-45" : "opacity-75"}`}
        style={{ width: 66 + step.x * (stack.length - 1), height: 42 + step.y * (stack.length - 1) }}
        aria-hidden="true"
      >
        {stack.map((color, i) => (
          <span
            key={i}
            className="absolute flex h-[42px] w-[66px] rounded-[8px] border border-on-card-line p-[7px] shadow-soft saturate-50"
            style={{ background: cardGradient(color), left: step.x * i, top: step.y * i }}
          >
            {i === stack.length - 1 && <span className="h-[7px] w-[10px] rounded-[2px]" style={{ background: "var(--card-chip)" }} />}
          </span>
        ))}
      </span>
      <span className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold">{label}</span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-accent-text">
          {open ? "Hide" : "Show"}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? "rotate-180" : ""}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

export const ADD_CARD_TILE_CLASS = `${END_TILE_CLASS} w-[230px] disabled:cursor-not-allowed disabled:opacity-60`;

/** The inside of the last tile in the row: a plus and "Add card". */
export function AddCardTileContent() {
  return (
      <span className="flex flex-col items-center gap-2">
        <span className="flex size-[34px] items-center justify-center rounded-full bg-fill" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="text-xs font-semibold">Add card</span>
      </span>
  );
}
