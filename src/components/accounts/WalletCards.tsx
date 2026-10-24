"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { PickView } from "@/app/accounts/views";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { HeroButtons } from "./forms/AccountForms";
import { normalise, steppedPath } from "./trendChart";

/**
 * The wallet (docs/design/accounts.md, round 19 and the rich strips): the open account's card
 * on top, every other account under it as a strip that shows its monogram, name, share of
 * the total, its year as a step line, its balance and last change. One element per account
 * that never unmounts, so picking one glides: the old card shrinks into the pile, the new one
 * rises out of it, and the open card's balance rolls from the figure you were just looking at.
 * Positions are set from the pick alone (no measuring): the strips overlap, 62px of each
 * showing, and get narrower as they go down.
 */

const STRIP_HEIGHT = 80;
const STRIP_GAP = 14;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const RISE = "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 group-data-[open=true]/card:translate-y-0 group-data-[open=true]/card:opacity-100 group-data-[open=true]/card:delay-(--d) motion-reduce:transition-none";

/** How much of each strip shows: 62px, less when there are many accounts so the pile stays short. */
export const stripPitch = (count: number) => Math.max(46, Math.min(62, 330 / Math.max(1, count - 2)));

const cardBackground = (pick: PickView) => (pick.kind === "all" ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), ${colorGradient("emerald", 150)}` : colorGradient(pick.colorKey));
const closedStyle = (pick: PickView) => (pick.closed ? "grayscale opacity-80" : "");

export function WalletCards({ picks, pickId, onPick }: { picks: PickView[]; pickId: string; onPick: (id: string) => void }) {
  const others = picks.filter((p) => p.id !== pickId);
  const pitch = stripPitch(picks.length);
  const open = picks.find((p) => p.id === pickId) ?? picks[0];
  const wallet = useRef<HTMLDivElement>(null);
  const openCard = useRef<HTMLDivElement>(null);
  const firstPick = useRef(true);
  // The strip that was pressed turns inert as its card opens, taking keyboard focus with it: focus goes to the open card instead.
  useEffect(() => {
    if (firstPick.current) {
      firstPick.current = false;
      return;
    }
    const at = document.activeElement;
    if (!at || at === document.body || wallet.current?.contains(at)) openCard.current?.focus({ preventScroll: true });
  }, [pickId]);
  return (
    <div
      ref={wallet}
      role="group"
      aria-label="Accounts"
      className="relative [--open-h:300px] motion-safe:transition-[height] motion-safe:duration-[640ms] md:[--open-h:244px]"
      style={{ height: `calc(var(--open-h) + ${others.length > 0 ? STRIP_GAP + (others.length - 1) * pitch + STRIP_HEIGHT : 0}px)`, transitionTimingFunction: EASE }}
    >
      {picks.map((p) => {
        const isOpen = p.id === open.id;
        const k = others.indexOf(p);
        const inset = Math.min(k * 5, 30);
        const style: CSSProperties = isOpen
          ? { top: 0, height: "var(--open-h)", left: 0, right: 0, zIndex: 60, background: cardBackground(p), transitionTimingFunction: EASE }
          : { top: `calc(var(--open-h) + ${STRIP_GAP + k * pitch}px)`, height: STRIP_HEIGHT, left: inset, right: inset, zIndex: 10 + k, background: cardBackground(p), transitionTimingFunction: EASE };
        return (
          <div
            key={p.id}
            ref={isOpen ? openCard : undefined}
            tabIndex={isOpen ? -1 : undefined}
            data-open={isOpen}
            aria-current={isOpen ? "true" : undefined}
            className={`group/card absolute isolate outline-none overflow-hidden rounded-[26px] border text-on-card motion-safe:transition-[top,height,left,right,transform,box-shadow] motion-safe:duration-[640ms] ${closedStyle(p)} ${isOpen ? "border-white/60 shadow-[var(--tile-shadow-soft-selected)]" : "border-on-card-line border-t-on-card-line-top shadow-[var(--tile-shadow-soft)] motion-safe:hover:-translate-y-[5px] motion-safe:hover:shadow-[var(--tile-shadow-soft-selected)]"}`}
            style={style}
          >
            <RingTexture width={480} height={244} dx={10} dy={20} first={45} step={26} stroke="var(--rings-light)" opacity={0.08} />
            {/* The strip: the whole of it picks the account. It fades away as the card opens, and back once the card has folded. */}
            <div inert={isOpen} className={`absolute inset-0 transition-opacity motion-reduce:transition-none ${isOpen ? "pointer-events-none opacity-0 delay-0 duration-100" : "opacity-100 delay-[280ms] duration-200"}`}>
              <button type="button" aria-label={`Open ${p.name}`} onClick={() => onPick(p.id)} className="absolute inset-0 cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white" />
              <StripFace pick={p} />
            </div>
            {/* The open face: laid out at the card's full width, so nothing reflows while it grows, and its parts rise in one after another. */}
            <div inert={!isOpen} className="absolute inset-0">
              <OpenFace pick={p} open={isOpen} rollFrom={open.balanceValue} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A strip's face: monogram, name and share, the year as a step line, the balance and its last change. */
function StripFace({ pick }: { pick: PickView }) {
  const sub = pick.kind === "all" ? pick.updated : `${pick.purpose}${pick.share === null ? "" : ` · ${Math.round(pick.share * 100)}% of total`}`;
  const totals = pick.line.points.map((p) => p.total);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start gap-3 px-4 pt-3">
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/40 text-[13px] font-extrabold">{pick.kind === "all" ? "∑" : pick.initial}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block truncate text-[13px] font-extrabold">{pick.name}</b>
        <span className={`block truncate text-[11px] font-semibold ${pick.stale ? "text-[var(--card-copper)]" : "text-on-card-muted"}`}>{pick.stale ? `Not read · ${pick.daysSince} days` : sub}</span>
      </span>
      {totals.length > 1 && (
        <svg viewBox="0 0 84 26" preserveAspectRatio="none" aria-hidden="true" className="mt-1 hidden h-[26px] w-[84px] shrink-0 sm:block">
          <path d={steppedPath(normalise(totals), 84, 26, 3)} fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <span className="min-w-[70px] text-right leading-tight">
        <b className="block text-sm font-extrabold tabular-nums">{pick.balance}</b>
        <span className={`block text-[11px] font-semibold ${pick.changeTone === "up" ? "text-on-card-lime" : "text-on-card-muted"}`}>{pick.changeShort}</span>
      </span>
      {pick.stale && <i aria-hidden="true" className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[var(--card-copper)]" />}
    </div>
  );
}

function Rise({ n, className = "", children }: { n: number; className?: string; children: ReactNode }) {
  return (
    <div className={`${RISE} ${className}`} style={{ "--d": `${220 + n * 55}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/** The open card: its balance large, who and when under it, its purpose as a chip at the top right. */
function OpenFace({ pick, open, rollFrom }: { pick: PickView; open: boolean; rollFrom: number }) {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Rise n={0}>
            <div className="text-xs font-bold text-on-card-muted">{pick.kind === "all" ? "Your balance" : `Your balance · ${pick.bank}`}</div>
          </Rise>
          <Rise n={1}>
            <div className={`mt-1 leading-none font-extrabold tracking-tight tabular-nums whitespace-nowrap ${pick.balance.length > 11 ? "text-[28px] md:text-[40px]" : pick.balance.length > 9 ? "text-[34px] md:text-[48px]" : "text-[42px] md:text-[56px]"}`}>
              {/* A closed card shows the open one's figure, so when it opens its digits roll from there to its own. */}
              <RollingNumber value={open ? pick.balanceValue : rollFrom} format="inr" />
            </div>
          </Rise>
        </div>
        {pick.purpose && (
          <Rise n={2}>
            <span className="shrink-0 rounded-full bg-on-card-fill px-3 py-1 text-[11px] font-bold">{pick.purpose}</span>
          </Rise>
        )}
      </div>
      <div>
        <Rise n={2}>
          <div className="flex items-baseline gap-2 text-base font-extrabold">
            <span className="min-w-0 truncate">{pick.name}</span>
            {pick.last4 && <span className="text-xs font-semibold text-on-card-faint">•••• {pick.last4}</span>}
          </div>
        </Rise>
        <Rise n={3}>
          <div className={`mt-0.5 text-xs font-semibold ${pick.stale ? "text-[var(--card-copper)]" : "text-on-card-muted"}`}>{pick.updated}</div>
          <div className={`text-xs font-semibold ${pick.changeTone === "up" ? "text-on-card-lime" : "text-on-card-muted"}`}>{pick.change}</div>
        </Rise>
        <Rise n={5} className="mt-3">
          <HeroButtons pickId={pick.id} kind={pick.kind} closed={pick.closed} />
        </Rise>
      </div>
      {/* The stamps rise in with the rest, so a folded card doesn't show one through its strip. */}
      {pick.stale && (
        <span className={`${RISE} absolute top-14 right-4 rotate-6 rounded border-2 border-[var(--card-copper)] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[var(--card-copper)] uppercase`} style={{ "--d": "385ms" } as CSSProperties}>
          Not read · {pick.daysSince} days
        </span>
      )}
      {pick.closed && (
        <span className={`${RISE} absolute top-14 right-4 rotate-6 rounded border-2 border-on-card-faint px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-on-card-faint uppercase`} style={{ "--d": "385ms" } as CSSProperties}>
          Closed
        </span>
      )}
    </div>
  );
}
