"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import type { PickView } from "@/app/subscriptions/views";
import { ALL, colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { CycleBar } from "./CycleBar";
import { FormTrigger, useSubscriptionForms } from "./forms/SubscriptionForms";
import { CheckIcon, ChevronIcon, EditIcon, MoreIcon, PlayIcon, PlusIcon, RenewIcon } from "./icons";

/**
 * The Subscriptions page's hero (#126, docs/design/subscriptions.md "The carousel"):
 * a cover flow with All at the centre, then a caption for the pick. Everything in it
 * takes the pick's colour: the card's gradient crossfades, and the bar, the primary
 * button and the ring round the picked cover use its colour mixed with white.
 *
 * Turning: click a cover or an arrow; a wheel or trackpad movement of 40px steps once
 * (at most every 90ms); a drag or swipe steps once per 56px, and the click that ends
 * a drag doesn't pick; arrow keys step while it has focus. It wraps round.
 *
 * Its interactions (#148, sections 2 and 4 of design/subscriptions-interactions/):
 * the numbers roll to the next pick's (2A), the cycle bar can be read (2B, CycleBar),
 * hovering a cover that isn't in front slides it out to face you with its next renewal
 * (2C), a cover renewing within 3 days breathes in its own colour (4A), and Mark paid
 * turns to Paid while the data the payment brings sweeps the bar on (4B).
 */

/** The coloured card's own tokens, as the design's dark stage sets them, so text and fills read on any pick's colour. */
const STAGE_TOKENS = {
  "--fg": "oklch(0.97 0.004 260)",
  "--muted": "oklch(1 0 0 / 0.62)",
  "--divider": "oklch(1 0 0 / 0.14)",
  "--fill": "oklch(1 0 0 / 0.12)",
  "--fill-strong": "oklch(1 0 0 / 0.22)",
  "--surface": "oklch(0.22 0.012 260)",
  "--surface-line": "oklch(1 0 0 / 0.1)",
} as CSSProperties;

const stageLayer = (color: ColorKey) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.2), transparent 55%), ${colorGradient(color, 165)}`;
const coverBackground = (pick: PickView) =>
  pick.id === ALL ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), ${colorGradient("emerald", 150)}` : colorGradient(pick.color);

/** Steps from the pick to cover `i`, the short way round. */
function offset(i: number, pick: number, n: number): number {
  let d = i - pick;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/**
 * Where a cover sits `d` steps from the front, from --near, --step and --rot (smaller on a
 * phone). `peek` is the steps from the front of the cover being peeked at (2C), if any: the
 * covers beyond it on its side part outwards by --part to make room for it, and it rises above
 * its neighbours, though never above the front cover.
 */
function placement(d: number, peek: number | null): CSSProperties {
  // The front cover is always on top; a peeked one comes next, above both its neighbours (the
  // covers either side of the front share 49, so a peek at 49 would lose to one of them).
  if (d === 0) return { transform: "translateX(-50%) translateZ(70px)", zIndex: 51, opacity: 1 };
  const a = Math.abs(d);
  const sign = Math.sign(d);
  const parted = peek !== null && Math.sign(peek) === sign && a > Math.abs(peek);
  return {
    transform: `translateX(calc(-50% + ${sign} * (var(--near) + ${a - 1} * var(--step)${parted ? " + var(--part)" : ""}))) rotateY(calc(${-sign} * var(--rot))) scale(0.84)`,
    // Which side it's on, for its peek to turn towards you and ease outwards far enough to clear
    // the front cover: on the right, the name and price start on the side nearest it; on the
    // left, a long renewal line ("Renews Jan 10, 2027 · in 3 months") runs up to it.
    "--side": sign,
    "--shift": sign > 0 ? 2 : 1.8,
    zIndex: d === peek ? 50 : 50 - a,
    opacity: a >= 6 ? 0 : 1,
    pointerEvents: a >= 6 ? "none" : undefined,
  } as CSSProperties;
}

// preserve-3d, so a peeking cover's face turns in the cover flow's space rather than flat against the cover.
const COVER_CLASS =
  "absolute top-3.5 left-1/2 h-[106px] w-[150px] rounded-[14px] text-left [transform-style:preserve-3d] transition-[transform,opacity,filter] duration-[520ms,380ms,380ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] [-webkit-user-drag:none] focus-visible:outline-none motion-reduce:transition-none md:top-6 md:h-[156px] md:w-[220px] md:rounded-[18px]";

/**
 * 2C · Peek: hovering a cover that isn't in front turns its face about halfway towards you,
 * lifts it a little and eases it outwards, while the covers beyond it part to make room. It
 * stays in the cover flow: above its neighbours but under the front cover, so the pick's own
 * name is never covered. Its name and price lift and its next renewal fades in, all inside
 * the cover. The carousel doesn't turn. Only the face moves: the cover stays put under the
 * pointer, and the face is part of it wherever it slides, so the hover can't flicker off.
 * Covers don't peek while the carousel turns, by a drag, the wheel or the keys.
 */
const PEEK = {
  face: "[transform:translateX(calc(var(--side)*var(--part)*var(--shift)))_translateY(-8px)_translateZ(24px)_rotateY(calc(var(--side)*var(--rot)*0.5))]",
  // The name and price lift to make room for the next renewal under them.
  text: "-translate-y-[15px] md:-translate-y-[18px]",
};

/** 4A · Due: a cover renewing within 3 days breathes in its own colour, faster the day before; on the day the ring holds. */
function DueRing({ days, picked }: { days: number; picked: boolean }) {
  const look = days === 0 ? "shadow-[0_0_0_3px_var(--cover-soft)]" : `${days === 1 ? "motion-safe:animate-breathe-fast" : "motion-safe:animate-breathe"} motion-reduce:shadow-[0_0_0_3px_color-mix(in_oklch,var(--cover-soft)_45%,transparent)]`;
  // The picked cover's own ring is 5.5px wide, so this one starts outside it.
  return <span aria-hidden="true" className={`pointer-events-none absolute -z-20 ${picked ? "-inset-[5.5px] rounded-[19.5px] md:rounded-[23.5px]" : "inset-0 rounded-[inherit]"} ${look}`} />;
}

function Cover({
  pick,
  picked,
  peekable,
  peeking,
  onPeek,
  style,
  onClick,
}: {
  pick: PickView;
  picked: boolean;
  /** It can be peeked at: not the front cover, and the carousel isn't being dragged. */
  peekable: boolean;
  peeking: boolean;
  onPeek: (on: boolean) => void;
  style: CSSProperties;
  onClick: () => void;
}) {
  const due = pick.dueIn;
  const colors = { "--cover-soft": `color-mix(in oklch, var(--card-${pick.color}) 46%, white)`, "--cover-ink": `var(--card-${pick.color}-to)` } as CSSProperties;
  return (
    <button
      id={`cover-${pick.id}`}
      type="button"
      role="radio"
      aria-checked={picked}
      aria-label={`${pick.name}, ${pick.cover.price}, ${pick.cover.next}`}
      tabIndex={-1}
      onClick={onClick}
      // A mouse or a pen peeks; a touch screen has no hover, and a tap picks.
      onPointerEnter={(e) => peekable && e.pointerType !== "touch" && onPeek(true)}
      onPointerLeave={() => onPeek(false)}
      className={COVER_CLASS}
      style={{ ...style, ...colors }}
    >
      <span
        className={`relative isolate flex size-full flex-col justify-between rounded-[inherit] px-3 py-2.5 text-on-card transition-[box-shadow,transform] duration-[500ms,520ms] ease-[ease,cubic-bezier(0.22,0.8,0.2,1)] motion-reduce:transition-none md:px-4 md:py-3.5 ${peeking ? PEEK.face : ""}`}
        style={{
          background: coverBackground(pick),
          boxShadow: picked ? "0 0 0 3px var(--surface), 0 0 0 5.5px var(--pick-soft), 0 24px 40px oklch(0 0 0 / 0.35)" : peeking ? "0 26px 44px oklch(0 0 0 / 0.42)" : "0 18px 30px oklch(0 0 0 / 0.28)",
          WebkitBoxReflect: "below 6px linear-gradient(transparent 62%, oklch(1 0 0 / 0.22))",
          filter: pick.muted ? "grayscale(0.8)" : undefined,
        }}
      >
        {due !== null && <DueRing days={due} picked={picked} />}
        <RingTexture width={220} height={156} dx={10} dy={20} first={40} step={26} count={8} stroke="var(--rings-light)" opacity={0.07} />
        <span className="flex items-center justify-between gap-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[9px] bg-on-card-fill text-[11px] font-extrabold md:size-[30px] md:text-[13px]">{pick.initial || <RenewIcon size={13} />}</span>
          {due === 0 || due === 1 ? (
            <span className="truncate rounded-full bg-[var(--cover-soft)] px-2 py-px text-[10px] font-extrabold text-[var(--cover-ink)] md:text-[11px]">{due === 0 ? "Due today" : "Tomorrow"}</span>
          ) : (
            <span className="truncate text-[10px] font-bold text-on-card-faint">{pick.cover.corner}</span>
          )}
        </span>
        <span className={`relative min-w-0 ease-[cubic-bezier(0.22,0.8,0.2,1)] motion-safe:transition-transform motion-safe:duration-[420ms] ${peeking ? PEEK.text : ""}`}>
          <b className="block truncate text-[13.5px] font-bold md:text-lg">{pick.alias}</b>
          <span className={`block truncate text-[11px] font-semibold md:text-xs motion-safe:transition-colors motion-safe:duration-300 ${peeking ? "text-on-card" : "text-on-card-muted"}`}>{pick.cover.price}</span>
          {!picked && (
            // Fades in a beat after the cover starts turning, so it arrives as the name makes room.
            <span aria-hidden="true" className={`absolute inset-x-0 top-full truncate text-[10.5px] font-bold text-on-card motion-safe:transition-opacity md:text-[11.5px] ${peeking ? "opacity-100 motion-safe:delay-150 motion-safe:duration-300" : "opacity-0 motion-safe:duration-150"}`}>
              {pick.cover.next}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

const LOOK = {
  primary: "bg-[var(--pick-soft)] px-3 text-[var(--pick-ink)] transition-[background-color,color] duration-500 hover:brightness-105",
  // 4B: Mark paid turns green, the way the pick's colour is mixed with white, and springs a little larger.
  paid: "scale-[1.04] cursor-default bg-[color-mix(in_oklch,var(--accent)_46%,white)] px-3 text-[oklch(0.32_0.1_145)] motion-safe:transition-[background-color,color,scale] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  soft: "bg-[oklch(1_0_0/0.14)] px-3 text-fg hover:bg-[oklch(1_0_0/0.22)]",
  icon: "w-[30px] justify-center bg-[oklch(1_0_0/0.14)] text-fg hover:bg-[oklch(1_0_0/0.22)]",
};
const BUTTON = "inline-flex min-h-[30px] items-center gap-1.5 rounded-full text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pick-soft)] max-md:min-h-11";

/** ⋯ on an active subscription: Pause or Cancel, each asking first. */
function MoreMenu({ id }: { id: string }) {
  const { open, disabledReason } = useSubscriptionForms();
  const [shown, setShown] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!shown) return;
    // Focus moves into the menu, as a menu button's should.
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const away = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) setShown(false);
    };
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShown(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [shown]);
  const item = "flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold text-fg hover:bg-fill focus-visible:bg-fill focus-visible:outline-none";
  return (
    <div ref={menu} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={shown}
        aria-label="Pause or cancel"
        aria-disabled={disabledReason ? true : undefined}
        title={disabledReason}
        onClick={() => !disabledReason && setShown((v) => !v)}
        className={`${BUTTON} ${LOOK.icon} ${disabledReason ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <MoreIcon />
      </button>
      {shown && (
        <div
          role="menu"
          onKeyDown={(e) => {
            // ↑ ↓ move between the two items.
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
            const at = items.indexOf(document.activeElement as HTMLElement);
            items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }}
          className="absolute bottom-[calc(100%+6px)] left-1/2 z-[90] w-40 -translate-x-1/2 rounded-[14px] border border-[var(--surface-line)] bg-[oklch(0.995_0_0)] p-1.5 text-left shadow-[var(--pop-shadow)] [--fg:oklch(0.19_0.008_260)] [--fill:oklch(0_0_0/0.055)]">
          {(["pause", "cancel"] as const).map((change) => (
            <button
              key={change}
              type="button"
              role="menuitem"
              className={`${item} ${change === "cancel" ? "text-negative" : ""}`}
              onClick={() => {
                setShown(false);
                // Focus back on ⋯ first, so it's what the dialog returns focus to.
                trigger.current?.focus();
                open({ kind: "status", id, change });
              }}
            >
              {change === "pause" ? "Pause" : "Cancel subscription"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 4B's Undo beside Paid. When it goes (used, or its 6 seconds are up) while it has focus, focus goes back to the button beside it. */
function UndoButton({ back, onClick }: { back: RefObject<HTMLButtonElement | null>; onClick: () => void }) {
  const self = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    // The button beside it is the same element whatever it says, so it's taken now.
    const button = self.current;
    const to = back.current;
    return () => {
      if (button && button === document.activeElement) to?.focus();
    };
  }, [back]);
  return (
    <button ref={self} type="button" onClick={onClick} className={`${BUTTON} ${LOOK.soft} motion-safe:animate-pop-in`}>
      Undo
    </button>
  );
}

function Actions({ pick }: { pick: PickView }) {
  const { forms, open, markPaid, saving, justPaid, undoing, undo } = useSubscriptionForms();
  const primary = useRef<HTMLButtonElement>(null);
  if (pick.status === "All")
    return (
      <>
        <FormTrigger className={`${BUTTON} ${LOOK.primary}`} icon={<CheckIcon />} label="Record payment" onClick={() => open({ kind: "record" })} />
        <FormTrigger className={`${BUTTON} ${LOOK.soft}`} icon={<PlusIcon />} label="Add subscription" onClick={() => open({ kind: "add" })} />
      </>
    );
  const edit = <FormTrigger className={`${BUTTON} ${LOOK.soft}`} icon={<EditIcon />} label="Edit" onClick={() => open({ kind: "edit", id: pick.id })} />;
  if (pick.status === "Active") {
    // Mark paid is one click from 3 days before a renewal; otherwise Record payment opens the form.
    const due = forms.context[pick.id]?.markPaid;
    // Just paid with Mark paid (4B): Paid, with Undo beside it while the toast offers it, and
    // Saving… while it's undone. One button throughout, so focus stays on it as it changes.
    const paid = justPaid === pick.id || undoing === pick.id;
    return (
      <>
        {paid ? (
          <FormTrigger ref={primary} className={`${BUTTON} ${LOOK.paid}`} icon={<CheckIcon />} label="Paid" done busy={undoing === pick.id} onClick={() => {}} />
        ) : due ? (
          <FormTrigger ref={primary} className={`${BUTTON} ${LOOK.primary}`} icon={<CheckIcon />} label="Mark paid" busy={saving === pick.id} onClick={() => markPaid(pick.id)} />
        ) : (
          <FormTrigger ref={primary} className={`${BUTTON} ${LOOK.primary}`} icon={<CheckIcon />} label="Record payment" onClick={() => open({ kind: "record", id: pick.id })} />
        )}
        {justPaid === pick.id && <UndoButton back={primary} onClick={undo} />}
        {edit}
        <MoreMenu id={pick.id} />
      </>
    );
  }
  return (
    <>
      <FormTrigger
        className={`${BUTTON} ${LOOK.primary}`}
        icon={<PlayIcon />}
        label={pick.status === "Paused" ? "Resume" : "Restart"}
        onClick={() => open({ kind: "status", id: pick.id, change: pick.status === "Paused" ? "resume" : "restart" })}
      />
      {edit}
    </>
  );
}

function Caption({ pick }: { pick: PickView }) {
  const { bar } = pick;
  return (
    <div className="flex flex-col items-center gap-3 text-center md:gap-4">
      <div>
        <span className="text-xs font-bold tracking-[0.04em] text-muted uppercase">{pick.eyebrow}</span>
        <h2 className="mt-1 text-2xl leading-[1.15] font-extrabold text-fg md:text-[32px]">{pick.name}</h2>
      </div>
      <div className="w-full max-w-[560px]">
        <div className="flex items-center justify-between gap-3 text-[11.5px] font-bold text-muted">
          <span className="min-w-12 text-left">{bar.start}</span>
          {pick.dueSoon ? (
            <span className="rounded-full bg-[var(--pick-soft)] px-2.5 py-0.5 text-[var(--pick-ink)] motion-safe:animate-due-pulse">{bar.middle}</span>
          ) : (
            <span className="text-fg">{bar.middle}</span>
          )}
          <span className="min-w-12 text-right">{bar.end}</span>
        </div>
        <CycleBar pickId={pick.id} fraction={bar.fraction} cycle={pick.cycle} />
      </div>
      <div className="grid w-full grid-cols-2 gap-3.5 text-left md:w-auto md:grid-cols-[repeat(4,minmax(0,170px))] md:justify-center md:gap-0">
        {pick.stats.map((s, i) => (
          // Kept by place, so a money figure rolls to the next pick's in the same place (2A), and Paid so far rolls up when a payment lands (4B).
          <div key={i} className={`flex min-w-0 flex-col gap-[3px] md:px-5 ${i ? "md:border-l md:border-divider" : ""}`}>
            <span className="text-[11px] font-extrabold tracking-[0.04em] text-muted uppercase">{s.label}</span>
            <b className="truncate text-[17px] font-extrabold whitespace-nowrap text-fg">
              {s.money ? (
                // Tabular, as every RollingNumber is: each digit's slot is a 0 wide.
                <span className="tabular-nums">
                  {s.money.prefix}
                  <RollingNumber value={s.money.amount} format="inr" />
                </span>
              ) : (
                s.value
              )}
            </b>
            {s.sub && <span className="truncate text-xs font-semibold whitespace-nowrap text-muted">{s.sub}</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Actions pick={pick} />
      </div>
    </div>
  );
}

function AddFirst() {
  const { open } = useSubscriptionForms();
  return <FormTrigger className={`${BUTTON} ${LOOK.primary}`} icon={<PlusIcon />} label="Add subscription" onClick={() => open({ kind: "add" })} />;
}

function EmptyCaption() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div>
        <span className="text-xs font-bold tracking-[0.04em] text-muted uppercase">Nothing yet</span>
        <h2 className="mt-1 text-2xl leading-[1.15] font-extrabold text-fg md:text-[28px]">Add your first subscription</h2>
      </div>
      <p className="max-w-[440px] text-[13px] leading-relaxed font-medium text-muted">Each one becomes a card here. Turn to it to see what it costs, when it renews and what you&apos;ve paid.</p>
      <AddFirst />
    </div>
  );
}

export function SubscriptionHero({ picks, index, onIndex }: { picks: PickView[]; index: number; onIndex: (index: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const n = picks.length;
  const pick = picks[index];
  const empty = n === 1;
  // A step by the wheel or the keys glides for about 520ms; covers passing under a resting
  // pointer meanwhile don't peek (a drag holds `turning` itself).
  const [settling, setSettling] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(settle.current ?? undefined), []);
  const step = (dir: number) => {
    onIndex((index + dir + n) % n);
    setSettling(true);
    clearTimeout(settle.current ?? undefined);
    settle.current = setTimeout(() => setSettling(false), 560);
  };
  // The wheel listener is added once, so it reads the latest step through a ref.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  // A wheel or trackpad turns it instead of scrolling the page. React's onWheel is passive, so this is added by hand.
  useEffect(() => {
    const el = stage.current;
    if (!el || empty) return;
    let total = 0;
    let last = 0;
    function wheel(e: WheelEvent) {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const now = performance.now();
      total += delta;
      if (Math.abs(total) >= 40 && now - last > 90) {
        stepRef.current(total > 0 ? 1 : -1);
        total = 0;
        last = now;
      } else total = Math.max(-80, Math.min(80, total));
    }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [empty]);

  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  // While a drag turns the carousel, covers don't peek (2C) as they pass under the pointer.
  const [turning, setTurning] = useState(false);
  // 2C: the cover being peeked at, by its subscription, so a turn or a refresh can't leave it on the wrong one.
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekAt = picks.findIndex((p) => p.id === peekId);
  const peek = !turning && !settling && peekAt >= 0 && peekAt !== index ? offset(peekAt, index, n) : null;
  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button > 0 || empty) return;
    drag.current = { x: e.clientX, moved: false };
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    // Released somewhere the stage didn't hear it (before the drag captured the pointer): it's over.
    if (e.pointerType === "mouse" && e.buttons === 0) {
      drag.current = null;
      setTurning(false);
      return;
    }
    const dx = e.clientX - d.x;
    if (Math.abs(dx) >= 56) {
      // Captured only once it turns, so a plain click still lands on its cover.
      if (!d.moved && e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // A pointer that's already gone can't be captured; the drag still turns.
        }
      }
      step(dx < 0 ? 1 : -1);
      d.x = e.clientX;
      d.moved = true;
      setTurning(true);
    }
  }
  function up() {
    // The click that ends a drag doesn't pick the cover under it.
    if (drag.current?.moved) {
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      document.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", stop, { capture: true }), 350);
    }
    drag.current = null;
    setTurning(false);
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (empty) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1);
    else if (e.key === "Home") onIndex(0);
    else return;
    e.preventDefault();
  }

  const colors = [...new Set(picks.map((p) => p.color))];
  const prev = picks[(index - 1 + n) % n];
  const next = picks[(index + 1) % n];

  return (
    <section
      aria-label="Subscriptions"
      className="relative isolate flex flex-col gap-1.5 overflow-hidden rounded-[22px] bg-ink px-4 pt-1 pb-[18px] text-fg shadow-[var(--card-shadow)] md:px-[22px] md:pt-2 md:pb-[26px]"
      style={{ ...STAGE_TOKENS, "--pick-soft": `color-mix(in oklch, var(--card-${pick.color}) 46%, white)`, "--pick-ink": `var(--card-${pick.color}-to)` } as CSSProperties}
    >
      {/* One layer per colour: the pick's fades in over 650ms as the last one fades out. */}
      {colors.map((c) => (
        <span
          key={c}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 rounded-[inherit] transition-opacity duration-[650ms] motion-reduce:transition-none"
          style={{ background: stageLayer(c), opacity: c === pick.color ? 1 : 0 }}
        />
      ))}
      <RingTexture width={1400} height={540} dx={10} dy={20} first={60} step={34} stroke="var(--rings-light)" opacity={0.05} />

      <div
        ref={stage}
        tabIndex={empty ? -1 : 0}
        role="radiogroup"
        aria-roledescription="carousel"
        aria-activedescendant={empty ? undefined : `cover-${pick.id}`}
        aria-label="Subscriptions. Scroll, drag or use the arrow keys to turn it."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          drag.current = null;
          setTurning(false);
        }}
        onPointerLeave={() => {
          // Leaving before it turned ends the drag; once it's turning, the pointer is captured and doesn't leave.
          if (!drag.current?.moved) drag.current = null;
        }}
        onKeyDown={key}
        className={`relative -mx-4 h-[196px] touch-pan-y overflow-hidden rounded-[18px] outline-none select-none [perspective:900px] [--near:110px] [--part:28px] [--rot:58deg] [--step:46px] focus-visible:shadow-[inset_0_0_0_2px_var(--pick-soft)] md:-mx-[22px] md:h-[270px] md:[perspective:1300px] md:[--near:160px] md:[--part:56px] md:[--rot:55deg] md:[--step:80px] ${empty ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        {picks.map((p, i) => (
          <Cover
            key={p.id}
            pick={p}
            picked={i === index}
            peekable={!empty && i !== index && !turning && !settling}
            peeking={peek !== null && i === peekAt}
            onPeek={(on) => setPeekId((cur) => (on ? p.id : cur === p.id ? null : cur))}
            style={empty ? { transform: "translateX(calc(-100% - 8px))" } : placement(offset(i, index, n), peek)}
            onClick={() => {
              setPeekId(null);
              onIndex(i);
            }}
          />
        ))}
        {empty && (
          <span
            aria-hidden="true"
            className="absolute top-3.5 left-1/2 flex h-[106px] w-[150px] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[oklch(1_0_0/0.3)] text-xs font-bold text-muted md:top-6 md:h-[156px] md:w-[220px] md:rounded-[18px]"
            style={{ transform: "translateX(8px)" }}
          >
            <PlusIcon size={14} />
            Add subscription
          </span>
        )}
        {!empty && (
          <div className="pointer-events-none absolute inset-x-7 top-1/2 z-[80] hidden -translate-y-1/2 justify-between md:flex">
            {[
              { dir: -1, to: prev, label: "Previous" },
              { dir: 1, to: next, label: "Next" },
            ].map(({ dir, to, label }) => (
              <button
                key={label}
                type="button"
                tabIndex={-1}
                aria-label={`${label}: ${to.alias}`}
                onClick={() => step(dir)}
                className="pointer-events-auto flex size-[42px] items-center justify-center rounded-full bg-[oklch(1_0_0/0.14)] text-fg shadow-[var(--pop-shadow)] hover:bg-[oklch(1_0_0/0.22)]"
              >
                <ChevronIcon direction={dir < 0 ? "left" : "right"} />
              </button>
            ))}
          </div>
        )}
        {!empty && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-[70] inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-[oklch(1_0_0/0.12)] bg-[oklch(0_0_0/0.35)] px-3 py-[5px] text-[11px] font-bold whitespace-nowrap text-muted backdrop-blur-[8px]">
            <span className="md:hidden">Swipe to turn</span>
            <span className="hidden items-center gap-2 md:inline-flex">
              Scroll or drag to turn
              {["←", "→"].map((k) => (
                <kbd key={k} className="rounded-[5px] bg-[var(--pick-soft)] px-[5px] font-[inherit] font-extrabold text-[var(--pick-ink)]">
                  {k}
                </kbd>
              ))}
            </span>
          </span>
        )}
      </div>

      {empty ? <EmptyCaption /> : <Caption pick={pick} />}
    </section>
  );
}
