"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { SentencePart } from "@/app/cards/summarySentence";

const TIP_ID = "greeting-card";

/**
 * The sentence under the greeting, whose figures point (Prathik's pick 7A on Subscriptions,
 * #126, and A on Cards): hovering or focusing one opens a light card under it with what it
 * means. The card sits under the figure it came from (two figures can share a card), glides
 * between figures and stays open while the pointer is on it. Esc closes it from anywhere. A
 * tap, or Enter or Space, opens it and another closes it.
 *
 * The page supplies what the cards say: `has` says whether a figure's `point` has a card
 * (one without stays plain bold), and `card` draws it. Both pages share everything else.
 */
export function PointingSentence({ parts, has, card: cardFor }: { parts: SentencePart[]; has: (point: string) => boolean; card: (point: string) => ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  // The figure the card is open under (its place in the sentence and its element), and its card; null when closed.
  const [open, setOpen] = useState<Open | null>(null);
  // Kept while the card fades out, so it doesn't empty first.
  const [shown, setShown] = useState<string | null>(null);
  // How the last press on a figure came, and whether its card was open then: a tap's click toggles
  // from that (iPhone Safari reports a tap's click as a mouse's, so the press is what's trusted).
  const press = useRef<{ type: string; wasOpen: boolean } | null>(null);

  function show(point: string, index: number, anchor: HTMLElement) {
    setOpen({ point, index, anchor });
    setShown(point);
  }
  const hide = () => setOpen(null);

  // Under the figure, kept inside the sentence's width; placed after its content renders, so its
  // size is known, and again if the page resizes (a phone turning) while it's open.
  useLayoutEffect(() => {
    const card = tip.current, box = wrap.current;
    if (!card || !box) return;
    if (!open) {
      delete card.dataset.open;
      return;
    }
    const place = () => {
      const b = box.getBoundingClientRect(), t = open.anchor.getBoundingClientRect();
      card.style.setProperty("--x", `${Math.min(Math.max(t.left - b.left + t.width / 2 - card.offsetWidth / 2, 0), Math.max(0, b.width - card.offsetWidth))}px`);
      card.style.setProperty("--y", `${t.bottom - b.top + 8}px`);
    };
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    place();
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  }, [open]);

  // Esc closes it wherever focus is: a card opened by hovering leaves focus outside the sentence.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={wrap} className="relative" onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
      <p className="max-w-[960px] text-base leading-[1.7] font-medium text-muted">
        {parts.map((part, i) => {
          const key = part.point;
          if (!part.strong) return <span key={i}>{part.text}</span>;
          if (!key || !has(key)) {
            return (
              <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">
                {part.text}
              </span>
            );
          }
          return <Figure key={i} index={i} text={part.text} point={key} on={open?.index === i} pressRef={press} show={show} hide={hide} withinRef={wrap} />;
        })}
      </p>
      <div
        ref={tip}
        id={TIP_ID}
        role="tooltip"
        aria-hidden={!open}
        className="pointer-events-none absolute top-0 left-0 z-30 w-[300px] max-w-full rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translate(var(--x,0px),var(--y,0px))_scale(0.97)] data-open:pointer-events-auto data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
      >
        {shown && cardFor(shown)}
      </div>
    </div>
  );
}

type Open = { point: string; index: number; anchor: HTMLElement };

/** One figure in the sentence: a button that opens its card. */
function Figure({
  index,
  text,
  point,
  on,
  pressRef,
  show,
  hide,
  withinRef,
}: {
  index: number;
  text: string;
  point: string;
  /** The card is open under this figure. */
  on: boolean;
  pressRef: RefObject<{ type: string; wasOpen: boolean } | null>;
  show: (point: string, index: number, anchor: HTMLElement) => void;
  hide: () => void;
  withinRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <button
      type="button"
      aria-describedby={on ? TIP_ID : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && show(point, index, e.currentTarget)}
      onPointerDown={(e) => (pressRef.current = { type: e.pointerType, wasOpen: on })}
      onClick={(e) => {
        const tapped = pressRef.current !== null && pressRef.current.type !== "mouse";
        const keyed = e.detail === 0;
        if (tapped || keyed) {
          const wasOpen = tapped ? pressRef.current!.wasOpen : on;
          if (wasOpen) hide();
          else show(point, index, e.currentTarget);
        }
        pressRef.current = null;
      }}
      // Only a keyboard's focus opens it; a tap's focus would open it just before its click closed it.
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && show(point, index, e.currentTarget)}
      onBlur={(e) => !withinRef.current?.contains(e.relatedTarget as Node | null) && hide()}
      className={`-mx-0.5 rounded-md px-0.5 font-bold whitespace-nowrap tabular-nums underline decoration-dotted decoration-[1.5px] underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-colors motion-safe:duration-150 ${
        on ? "bg-accent-tint text-accent-text decoration-transparent" : "text-fg decoration-muted/60 hover:bg-accent-tint hover:text-accent-text"
      }`}
    >
      {text}
    </button>
  );
}


/** The top of a pointing card: what it's about, and its figure. */
export function CardHead({ title, total }: { title: string; total: string }) {
  return (
    <>
      <div className="text-xs font-bold text-muted">{title}</div>
      <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{total}</div>
    </>
  );
}
