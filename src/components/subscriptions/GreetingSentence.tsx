"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { GreetingCards, StripMonth } from "@/app/subscriptions/views";
import type { SentencePart } from "@/app/cards/summarySentence";
import { formatInr } from "@/lib/format/money";
import { Mono } from "./parts";

const TIP_ID = "greeting-card";

/**
 * The sentence under the greeting (#126), whose figures point (Prathik's pick 7A): hovering
 * or focusing one opens a light card under it with what it means: the year's months and
 * what was paid in each, the average across them, what made up the biggest month, or the
 * renewals in the next 30 days. The card sits under the figure it came from (two figures
 * can share a card), glides between figures and stays open while the pointer is on it. Esc
 * closes it from anywhere. A tap, or Enter or Space, opens it and another closes it.
 */
export function GreetingSentence({ parts, cards }: { parts: SentencePart[]; cards: GreetingCards }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  // The figure the card is open under (its place in the sentence and its element), and its card; null when closed.
  const [open, setOpen] = useState<Open | null>(null);
  // Kept while the card fades out, so it doesn't empty first.
  const [shown, setShown] = useState<keyof GreetingCards | null>(null);
  // How the last press on a figure came, and whether its card was open then: a tap's click toggles
  // from that (iPhone Safari reports a tap's click as a mouse's, so the press is what's trusted).
  const press = useRef<{ type: string; wasOpen: boolean } | null>(null);

  function show(point: keyof GreetingCards, index: number, anchor: HTMLElement) {
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
          const key = part.point as keyof GreetingCards | undefined;
          if (!part.strong) return <span key={i}>{part.text}</span>;
          if (!key || !cards[key]) {
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
        {shown && <CardBody point={shown} cards={cards} />}
      </div>
    </div>
  );
}

type Open = { point: keyof GreetingCards; index: number; anchor: HTMLElement };

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
  point: keyof GreetingCards;
  /** The card is open under this figure. */
  on: boolean;
  pressRef: RefObject<{ type: string; wasOpen: boolean } | null>;
  show: (point: keyof GreetingCards, index: number, anchor: HTMLElement) => void;
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

function Head({ title, total }: { title: string; total: string }) {
  return (
    <>
      <div className="text-xs font-bold text-muted">{title}</div>
      <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{total}</div>
    </>
  );
}

/** The year's months as small bars: what was paid in each, the lit ones in the accent, months still to come dashed. */
function Strip({ months, average }: { months: StripMonth[]; average?: number }) {
  const top = Math.max(1, average ?? 0, ...months.map((m) => m.paid));
  const H = 56;
  return (
    <div className="relative mt-3" aria-hidden="true">
      <div className="flex items-end gap-1" style={{ height: H }}>
        {months.map((m) => (
          <span
            key={m.key}
            className={`flex-1 rounded-t-[4px] rounded-b-[2px] ${m.future ? "border-[1.5px] border-dashed border-fill-strong" : m.lit ? "bg-heat-4" : "bg-heat-2"}`}
            style={{ height: m.future ? 8 : Math.max(3, (m.paid / top) * H) }}
          />
        ))}
      </div>
      {average !== undefined && (
        <span className="absolute inset-x-0 border-t-2 border-dashed border-accent-text" style={{ bottom: 16 + (average / top) * H }}>
          <span className="absolute -top-[18px] right-0 rounded bg-surface px-1 text-[10px] font-extrabold text-accent-text">{formatInr(average)}</span>
        </span>
      )}
      <div className="mt-1 flex gap-1 text-center text-[9.5px] font-bold text-muted">
        {months.map((m) => (
          <span key={m.key} className="flex-1">
            {m.initial}
          </span>
        ))}
      </div>
    </div>
  );
}

function CardBody({ point, cards }: { point: keyof GreetingCards; cards: GreetingCards }) {
  if (point === "paid" && cards.paid) {
    return (
      <>
        <Head title={cards.paid.title} total={cards.paid.total} />
        <Strip months={cards.paid.months} />
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{cards.paid.note}</div>
      </>
    );
  }
  if (point === "average" && cards.average) {
    return (
      <>
        <Head title={cards.average.title} total={cards.average.total} />
        <Strip months={cards.average.months} average={cards.average.average} />
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{cards.average.note}</div>
      </>
    );
  }
  if (point === "biggest" && cards.biggest) {
    return (
      <>
        <Head title={cards.biggest.title} total={cards.biggest.total} />
        <Strip months={cards.biggest.months} />
        <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-divider pt-2.5">
          {cards.biggest.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">{r.mark.alias}</span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (point === "next" && cards.next) {
    return (
      <>
        <Head title={cards.next.title} total={cards.next.total} />
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {cards.next.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">
                {r.mark.alias} · {r.date} · {r.note}
              </span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}
