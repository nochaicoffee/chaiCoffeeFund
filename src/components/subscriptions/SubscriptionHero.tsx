"use client";

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { PickView } from "@/app/subscriptions/views";
import { ALL, colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { RingTexture } from "../RingTexture";
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

/** Where a cover sits `d` steps from the front, from --near, --step and --rot (smaller on a phone). */
function placement(d: number): CSSProperties {
  if (d === 0) return { transform: "translateX(-50%) translateZ(70px)", zIndex: 50, opacity: 1 };
  const a = Math.abs(d);
  const sign = Math.sign(d);
  return {
    transform: `translateX(calc(-50% + ${sign} * (var(--near) + ${a - 1} * var(--step)))) rotateY(calc(${-sign} * var(--rot))) scale(0.84)`,
    zIndex: 50 - a,
    opacity: a >= 6 ? 0 : 1,
    pointerEvents: a >= 6 ? "none" : undefined,
  };
}

const COVER_CLASS =
  "absolute top-3.5 left-1/2 h-[106px] w-[150px] rounded-[14px] text-left transition-[transform,opacity,filter] duration-[520ms,380ms,380ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] [-webkit-user-drag:none] focus-visible:outline-none motion-reduce:transition-none md:top-6 md:h-[156px] md:w-[220px] md:rounded-[18px]";

function Cover({ pick, picked, style, onClick }: { pick: PickView; picked: boolean; style: CSSProperties; onClick: () => void }) {
  return (
    <button id={`cover-${pick.id}`} type="button" role="radio" aria-checked={picked} aria-label={`${pick.name}, ${pick.cover.price}`} tabIndex={-1} onClick={onClick} className={COVER_CLASS} style={style}>
      <span
        className="relative isolate flex size-full flex-col justify-between rounded-[inherit] px-3 py-2.5 text-on-card md:px-4 md:py-3.5"
        style={{
          background: coverBackground(pick),
          boxShadow: picked ? "0 0 0 3px var(--surface), 0 0 0 5.5px var(--pick-soft), 0 24px 40px oklch(0 0 0 / 0.35)" : "0 18px 30px oklch(0 0 0 / 0.28)",
          WebkitBoxReflect: "below 6px linear-gradient(transparent 62%, oklch(1 0 0 / 0.22))",
          filter: pick.muted ? "grayscale(0.8)" : undefined,
          transition: "box-shadow 500ms",
        }}
      >
        <RingTexture width={220} height={156} dx={10} dy={20} first={40} step={26} count={8} stroke="var(--rings-light)" opacity={0.07} />
        <span className="flex items-center justify-between">
          <span className="flex size-6 items-center justify-center rounded-[9px] bg-on-card-fill text-[11px] font-extrabold md:size-[30px] md:text-[13px]">{pick.initial || <RenewIcon size={13} />}</span>
          <span className="text-[10px] font-bold text-on-card-faint">{pick.cover.corner}</span>
        </span>
        <span className="min-w-0">
          <b className="block truncate text-[13.5px] font-bold md:text-lg">{pick.alias}</b>
          <span className="text-[11px] font-semibold text-on-card-muted md:text-xs">{pick.cover.price}</span>
        </span>
      </span>
    </button>
  );
}

/** A form's button. The forms come with #128, so until then it shows disabled, saying so. */
function SoonButton({ kind, label, icon }: { kind: "primary" | "soft" | "icon"; label: string; icon: ReactNode }) {
  const look =
    kind === "primary"
      ? "bg-[var(--pick-soft)] px-3 text-[var(--pick-ink)] transition-[background-color,color] duration-500"
      : kind === "soft"
        ? "bg-[oklch(1_0_0/0.14)] px-3 text-fg"
        : "w-[30px] justify-center bg-[oklch(1_0_0/0.14)] text-fg";
  return (
    <button type="button" aria-disabled="true" title="Coming soon" aria-label={kind === "icon" ? `${label} (coming soon)` : undefined} className={`inline-flex min-h-[30px] cursor-not-allowed items-center gap-1.5 rounded-full text-xs font-bold whitespace-nowrap opacity-70 ${look}`}>
      {icon}
      {kind !== "icon" && label}
      {kind !== "icon" && <span className="sr-only"> (coming soon)</span>}
    </button>
  );
}

function Actions({ pick }: { pick: PickView }) {
  if (pick.status === "All")
    return (
      <>
        <SoonButton kind="primary" label="Record payment" icon={<CheckIcon />} />
        <SoonButton kind="soft" label="Add subscription" icon={<PlusIcon />} />
      </>
    );
  if (pick.status === "Active")
    return (
      <>
        <SoonButton kind="primary" label="Mark paid" icon={<CheckIcon />} />
        <SoonButton kind="soft" label="Edit" icon={<EditIcon />} />
        <SoonButton kind="icon" label="Pause or cancel" icon={<MoreIcon />} />
      </>
    );
  return (
    <>
      <SoonButton kind="primary" label={pick.status === "Paused" ? "Resume" : "Restart"} icon={<PlayIcon />} />
      <SoonButton kind="soft" label="Edit" icon={<EditIcon />} />
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
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fill">
          <span
            className="block h-full rounded-[inherit] bg-[var(--pick-soft)] transition-[width,background-color] duration-500 motion-reduce:transition-none"
            style={{ width: `${(bar.fraction ?? 0) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-3.5 text-left md:w-auto md:grid-cols-[repeat(4,minmax(0,170px))] md:justify-center md:gap-0">
        {pick.stats.map((s, i) => (
          <div key={s.label + i} className={`flex min-w-0 flex-col gap-[3px] md:px-5 ${i ? "md:border-l md:border-divider" : ""}`}>
            <span className="text-[11px] font-extrabold tracking-[0.04em] text-muted uppercase">{s.label}</span>
            <b className="truncate text-[17px] font-extrabold whitespace-nowrap text-fg">{s.value}</b>
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

function EmptyCaption() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div>
        <span className="text-xs font-bold tracking-[0.04em] text-muted uppercase">Nothing yet</span>
        <h2 className="mt-1 text-2xl leading-[1.15] font-extrabold text-fg md:text-[28px]">Add your first subscription</h2>
      </div>
      <p className="max-w-[440px] text-[13px] leading-relaxed font-medium text-muted">Each one becomes a card here. Turn to it to see what it costs, when it renews and what you&apos;ve paid.</p>
      <SoonButton kind="primary" label="Add subscription" icon={<PlusIcon />} />
    </div>
  );
}

export function SubscriptionHero({ picks, index, onIndex }: { picks: PickView[]; index: number; onIndex: (index: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const n = picks.length;
  const pick = picks[index];
  const empty = n === 1;
  const step = (dir: number) => onIndex((index + dir + n) % n);
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
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => {
          // Leaving before it turned ends the drag; once it's turning, the pointer is captured and doesn't leave.
          if (!drag.current?.moved) drag.current = null;
        }}
        onKeyDown={key}
        className={`relative -mx-4 h-[196px] touch-pan-y overflow-hidden rounded-[18px] outline-none select-none [perspective:900px] [--near:110px] [--rot:58deg] [--step:46px] focus-visible:shadow-[inset_0_0_0_2px_var(--pick-soft)] md:-mx-[22px] md:h-[270px] md:[perspective:1300px] md:[--near:160px] md:[--rot:55deg] md:[--step:80px] ${empty ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        {picks.map((p, i) => (
          <Cover key={p.id} pick={p} picked={i === index} style={empty ? { transform: "translateX(calc(-100% - 8px))" } : placement(offset(i, index, n))} onClick={() => onIndex(i)} />
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
