"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { ChartView, DayCardView, GridDayView, GridMonthView, GridView } from "@/app/subscriptions/chartView";
import type { PickView } from "@/app/subscriptions/views";
import { rangeTotals } from "@/lib/aggregate/subscriptionChart";
import { formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { ALL } from "@/lib/format/subscriptionLabels";
import { RingTexture } from "../RingTexture";
import { PHONE, besideLeft, dayAtPoint, nextDay, stepDay } from "./chartGeometry";
import { useSubscriptionForms } from "./forms/SubscriptionForms";
import { Mono } from "./parts";
import { useSize } from "./useSize";

/**
 * Day by day (#127), with what it does when you touch it (#149, sections 5A–5C of
 * design/subscriptions-interactions/SubscriptionsInteractions.html):
 * - A day: hovering or focusing it lifts it, ripples its rings and shows a light card,
 *   like the Cards heatmap's (#104), which glides from day to day. Clicking a day that
 *   wasn't recorded opens Record a payment for that renewal; on a phone the first tap
 *   shows its card and the next records it.
 * - A month's total: keeps that month's days lit and fades the rest, with its own card.
 * - A range: press on a day and drag to another (or Shift and the arrow keys), and a
 *   line under the grid adds the days between up.
 * The arrow keys move between days (up and down a day, left and right a week); the
 * grid is one tab stop. Esc closes the card, and then clears the range (or drops a drag).
 */

const CARD_ID = "day-by-day-card";
const HINT_ID = "day-by-day-hint";
const CARD_WIDTH = 272;
const TODAY_RING = "0 0 0 2px var(--surface), 0 0 0 4px var(--accent)";
/** A day in a dragged range that it doesn't add anything up for. */
const RANGE_FILL = "color-mix(in oklch, var(--ink) 13%, transparent)";
/** What clicking a day not recorded does, as its card says it. */
const RECORD_HINT = { pointer: "click the day to record it", touch: "tap it again to record it" };

type Hover = { kind: "day"; date: string } | { kind: "month"; month: string };
type Range = { a: string; b: string };

const PILL: Record<DayCardView["pill"], string> = {
  Paid: "bg-accent-tint text-accent-text",
  Expected: "bg-fill text-muted",
  "Not recorded": "bg-warning-tint text-warning-text",
  Pending: "bg-fill text-muted",
  "Didn't charge": "bg-fill text-muted",
};

// Longhand borders only, so the pick can recolour one without React mixing shorthand and longhand.
const edge = (style: "solid" | "dashed", color: string): CSSProperties => ({ borderWidth: 1.5, borderStyle: style, borderColor: color });

/** How a day with renewals is drawn, and what its rings are drawn in. */
function dayLook(day: GridDayView): { style: CSSProperties; rings: string } {
  if (day.kind === "missing") return { style: { background: "var(--warning-tint)", ...edge("solid", "var(--warning)") }, rings: "var(--warning)" };
  if (day.kind === "expected" || day.kind === "pending")
    return { style: { background: "color-mix(in oklch, var(--heat-1) 50%, transparent)", ...edge("dashed", `var(--heat-${day.level})`) }, rings: "var(--rings-ink)" };
  if (day.kind === "skipped") return { style: { background: "var(--fill-strong)" }, rings: "var(--rings-ink)" };
  return { style: { background: `var(--heat-${day.level})` }, rings: day.level >= 4 ? "var(--rings-light)" : "var(--rings-ink)" };
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

function DayCard({ day, hint }: { day: GridDayView; hint: string }) {
  const { card } = day;
  const footer = card.footer && (day.record ? `${card.footer} · ${hint}` : card.footer);
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span>{card.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${PILL[card.pill]}`}>{card.pill}</span>
      </div>
      <div className="mt-0.5 text-[22px] leading-tight font-extrabold tabular-nums">{card.total}</div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {card.rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
            <Mono mark={r.mark} size={18} />
            <span className="min-w-0 flex-1 truncate text-muted">
              {r.label}
              {r.note && <span className="text-[10.5px]"> · {r.note}</span>}
            </span>
            <b className="font-extrabold tabular-nums">{r.amount}</b>
          </li>
        ))}
      </ul>
      {footer && <div className={`mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold ${day.kind === "missing" ? "text-warning-text" : "text-muted"}`}>{footer}</div>}
    </>
  );
}

function MonthCard({ month, pickId }: { month: GridMonthView; pickId: string }) {
  const { card } = month;
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span>{card.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${card.pill === "Expected" ? "bg-fill text-muted" : "bg-accent-tint text-accent-text"}`}>{card.pill}</span>
      </div>
      <div className="mt-0.5 text-[22px] leading-tight font-extrabold tabular-nums">{card.total}</div>
      {card.diff && <div className={`text-[11.5px] font-bold ${card.diff.up ? "text-negative" : "text-positive"}`}>{card.diff.text}</div>}
      {card.bar.length > 1 && (
        <div aria-hidden="true" className="mt-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {card.bar.map((p) => (
            <span key={p.id} className="h-full" style={{ flexGrow: p.amount, background: `var(--card-${p.color})`, opacity: pickId !== ALL && p.id !== pickId ? 0.35 : 1 }} />
          ))}
        </div>
      )}
      {card.rows.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {card.rows.map((r) => (
            <li key={r.key} className={`flex items-center gap-2 text-xs font-semibold ${pickId !== ALL && r.key !== pickId ? "opacity-60" : ""}`}>
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">{r.label}</span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{card.footer}</div>
    </>
  );
}

/** What a range adds up to, and its name: "Netflix · Jun 1 – Sep 30". With a pick, only its renewals count. */
function rangeOf(grid: GridView, range: Range, pick: PickView) {
  const picked = pick.id !== ALL;
  const t = rangeTotals(grid.days, range.a, range.b, picked ? pick.id : undefined);
  const span = t.from === t.to ? formatShortDate(t.from) : `${formatShortDate(t.from)} – ${formatShortDate(t.to)}`;
  return { t, name: `${picked ? `${pick.alias} · ` : ""}${span}` };
}

/** The range in one sentence, for a screen reader once it's settled. */
function rangeSentence(grid: GridView, range: Range, pick: PickView): string {
  const { t, name } = rangeOf(grid, range, pick);
  const parts = [t.paid > 0 && `${formatInr(t.paid)} paid`, t.toCome > 0 && `${formatInr(t.toCome)} still to come`, t.notRecorded > 0 && `${t.notRecorded} not recorded`].filter(Boolean);
  return `${name}: ${plural(t.renewals, "renewal")}, ${formatInr(t.total)}${parts.length ? `. ${parts.join(", ")}` : ""}.`;
}

/** The line under the grid that adds a dragged range up (5C). */
function RangeLine({ grid, range, pick, onClear }: { grid: GridView; range: Range; pick: PickView; onClear: () => void }) {
  const { t, name } = rangeOf(grid, range, pick);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[14px] bg-fill px-3 py-2 text-xs font-semibold text-muted">
      <span>
        <b className="font-extrabold text-fg">{name}</b>{" "}
        · {plural(t.renewals, "renewal")} · <b className="font-extrabold text-fg tabular-nums">{formatInr(t.total)}</b>
      </span>
      {t.paid > 0 && <span className="tabular-nums">{formatInr(t.paid)} paid</span>}
      {t.toCome > 0 && <span className="tabular-nums">{formatInr(t.toCome)} still to come</span>}
      {t.notRecorded > 0 && <span className="text-warning-text">{t.notRecorded} not recorded</span>}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold text-fg shadow-soft hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
      >
        Clear
      </button>
    </div>
  );
}

export function DayByDay({ chart, pick, empty }: { chart: ChartView; pick: PickView; empty: boolean }) {
  const [box, size] = useSize<HTMLDivElement>({ w: 1300, h: 0 });
  const phone = size.w < PHONE;
  const grid: GridView = phone ? chart.phoneGrid : chart.desktopGrid;
  const label = phone ? 0 : 34;
  const gap = phone ? 3 : 4;
  const col = Math.min(phone ? 30 : 25, (size.w - label) / grid.weeks);
  const cell = Math.max(6, Math.floor(col - gap));
  const step = cell + gap;
  const radius = phone ? 3 : 6;
  const byDate = useMemo(() => new Map(grid.days.map((d) => [d.date, d])), [grid]);
  const { open: openForm, disabledReason } = useSubscriptionForms();

  const cells = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  // The lifted day or the lit month total: marked in the DOM, so hovering doesn't redraw every day.
  const active = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  // What the card shows: the last thing hovered, so it keeps its content while it fades out.
  const [shown, setShown] = useState<Hover | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [tabDate, setTabDate] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // While a drag is under way the range isn't read out, only once it settles.
  const [dragging, setDragging] = useState(false);
  // A press on a day until it's let go: where it started, the range before it (put back if the
  // browser takes the gesture for a scroll), whether it's become a drag, and whether its day's card was already open.
  const press = useRef<{ id: number; date: string; before: Range | null; dragging: boolean; wasOpen: boolean; touch: boolean } | null>(null);
  const tap = useRef<{ touch: boolean; wasOpen: boolean } | null>(null);
  const dragged = useRef(false);

  // The phone's five months and the desktop's year are different grids: switching starts again.
  const [shownPhone, setShownPhone] = useState(phone);
  if (shownPhone !== phone) {
    setShownPhone(phone);
    setRange(null);
    setHover(null);
    setTabDate(null);
    setDragging(false);
  }

  const spot = hover?.kind === "month" ? hover.month : null;
  const [from, to] = range ? (range.a <= range.b ? [range.a, range.b] : [range.b, range.a]) : ["", ""];
  const inGrid = (date: string) => date >= grid.first && date <= grid.last;
  // The grid's one tab stop: the day last focused, else today, else its first renewal.
  const tab = tabDate && inGrid(tabDate) ? tabDate : inGrid(chart.today) ? chart.today : (grid.days[0]?.date ?? grid.first);

  const picked = pick.id !== ALL;
  const pickColor = `var(--card-${pick.color})`;
  const drawn = useMemo(() => {
    const out = [];
    for (let date = grid.start; date <= grid.last; date = nextDay(date)) {
      if (date < grid.first) {
        out.push(<span key={date} aria-hidden="true" />);
        continue;
      }
      const day = byDate.get(date);
      const selected = range !== null && date >= from && date <= to;
      // In a range, a day whose renewals it adds up is outlined and any other day takes a light
      // fill, so the range reads without a wall of outlines. With a pick, only the pick's count.
      const counted = selected && day !== undefined && (!picked || day.ids.includes(pick.id));
      let style: CSSProperties;
      let rings = "";
      let opacity = 1;
      if (!day) {
        style = { background: selected ? RANGE_FILL : "var(--heat-no-data)" };
      } else {
        const look = dayLook(day);
        style = look.style;
        rings = look.rings;
        if (picked && day.ids.includes(pick.id)) {
          style = { ...style, background: pickColor, ...(style.borderStyle ? { borderColor: pickColor } : {}) };
          rings = "var(--rings-light)";
          if (day.kind === "expected" || day.kind === "pending") opacity = 0.6;
        } else if (picked) {
          opacity = 0.18;
          if (selected) style = { ...style, background: RANGE_FILL };
        }
      }
      if (spot && date.slice(0, 7) !== spot) opacity = Math.min(opacity, 0.16);
      // Focus is ink, not the accent: today's ring is the accent.
      out.push(
        <button
          key={date}
          type="button"
          data-date={date}
          data-selected={counted ? "" : undefined}
          tabIndex={date === tab ? 0 : -1}
          aria-label={day ? day.label : `${formatShortDate(date)}: nothing renews`}
          className={`group/day relative isolate overflow-hidden ${day?.record && !disabledReason ? "cursor-pointer" : "cursor-default"} [box-shadow:var(--ring,0_0_#0000)] focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-fg! data-active:z-[2] data-active:[box-shadow:var(--ring,0_0_#0000),var(--pop-shadow)] data-selected:z-[1] data-selected:outline-2 data-selected:outline-offset-1 data-selected:outline-ink focus-visible:z-[2] focus-visible:-translate-y-0.5 focus-visible:scale-[1.15] data-active:-translate-y-0.5 data-active:scale-[1.15] motion-safe:transition-[opacity,background-color,translate,scale,box-shadow] motion-safe:duration-200 motion-safe:ease-out`}
          style={{ ...style, opacity, borderRadius: radius, "--ring": date === chart.today ? TODAY_RING : undefined } as CSSProperties}
        >
          {day && (
            <RingTexture
              width={20}
              height={20}
              dx={4}
              dy={6}
              first={7}
              step={5}
              stroke={rings}
              opacity={0.35}
              ringsClassName="origin-bottom-right opacity-0 group-data-active/day:opacity-100 motion-safe:transition-[scale,opacity] motion-safe:duration-700 motion-safe:ease-out motion-safe:group-data-active/day:scale-[1.18]"
            />
          )}
        </button>,
      );
    }
    return out;
  }, [grid, byDate, range, from, to, spot, tab, picked, pick.id, pickColor, radius, chart.today, disabledReason]);

  const dayEl = (date: string) => cells.current?.querySelector<HTMLElement>(`[data-date="${date}"]`) ?? null;
  const monthEl = (month: string) => box.current?.querySelector<HTMLElement>(`[data-month="${month}"]`) ?? null;

  function mark(el: HTMLElement | null) {
    if (active.current === el) return;
    active.current?.removeAttribute("data-active");
    active.current?.removeAttribute("aria-describedby");
    el?.setAttribute("data-active", "");
    el?.setAttribute("aria-describedby", CARD_ID);
    active.current = el;
  }
  function show(next: Hover) {
    mark(next.kind === "day" ? dayEl(next.date) : monthEl(next.month));
    setHover(next);
    setShown(next);
  }
  function hide() {
    mark(null);
    setHover(null);
  }
  /** Shows a day's card, if it has renewals. */
  function showDay(target: EventTarget | null): boolean {
    const date = (target as HTMLElement | null)?.closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!date || !byDate.has(date)) return false;
    show({ kind: "day", date });
    return true;
  }

  // Placed after its content renders, so its own size is known. A day's card goes above
  // the day (below it near the top of the window); a month's beside its weeks, so the
  // days it lights stay in sight.
  useLayoutEffect(() => {
    const outer = box.current, card = tip.current;
    if (!outer || !card) return;
    const target = hover ? (hover.kind === "day" ? dayEl(hover.date) : monthEl(hover.month)) : null;
    if (!hover || !target) {
      delete card.dataset.open;
      return;
    }
    const o = outer.getBoundingClientRect(), t = target.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    let x: number, y: number;
    const month = hover.kind === "month" ? grid.months.find((m) => m.month === hover.month) : undefined;
    if (month && !phone) {
      x = besideLeft(label + month.week * step, month.weeks * step - gap, width, o.width);
      y = t.bottom - o.top - height;
    } else if (month) {
      // A phone has no room beside a month: the card goes above the grid, or under the totals near the top of the window.
      x = Math.max(0, (o.width - width) / 2);
      y = o.top - height - 8 < 8 ? t.bottom - o.top + 12 : -height - 8;
    } else {
      const centre = t.left - o.left + t.width / 2;
      x = Math.min(Math.max(centre - width / 2, 0), Math.max(0, o.width - width));
      y = t.top - height - 12 < 8 ? t.bottom - o.top + 12 : t.top - o.top - height - 12;
    }
    // It glides between days once open; when it opens, it appears where it is.
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  });

  // Switching grids leaves no day lifted and no press under way.
  useEffect(() => {
    active.current?.removeAttribute("data-active");
    active.current?.removeAttribute("aria-describedby");
    active.current = null;
    press.current = null;
  }, [phone]);

  // A tap anywhere else closes the card: a phone has no pointer to move away.
  useEffect(() => {
    if (!hover) return;
    const away = (e: globalThis.PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) {
        active.current?.removeAttribute("data-active");
        active.current?.removeAttribute("aria-describedby");
        active.current = null;
        setHover(null);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [hover, box]);

  const pointDate = (e: PointerEvent) => {
    const r = cells.current!.getBoundingClientRect();
    return dayAtPoint(e.clientX - r.left, e.clientY - r.top, step, grid);
  };

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragged.current = false;
    if (e.button !== 0) return;
    const date = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!date) return;
    const touch = e.pointerType === "touch";
    setTouched(touch);
    press.current = { id: e.pointerId, date, before: range, dragging: false, wasOpen: hover?.kind === "day" && hover.date === date, touch };
    if (touch) showDay(e.target);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    // Let go outside the grid before it became a drag, so the grid never heard it: that press is over.
    if (!p.touch && e.buttons === 0) {
      press.current = null;
      return;
    }
    const date = pointDate(e);
    if (!p.dragging) {
      if (date === p.date) return;
      // It's a drag once it reaches another day: the card would only cover the range.
      p.dragging = true;
      setDragging(true);
      hide();
      if (e.pointerType !== "touch") e.currentTarget.setPointerCapture(e.pointerId);
    }
    setRange((r) => (r && r.a === p.date && r.b === date ? r : { a: p.date, b: date }));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (p.dragging) {
      dragged.current = true;
      setDragging(false);
    } else tap.current = { touch: p.touch, wasOpen: p.wasOpen };
  }
  function onPointerCancel(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    // The browser took the gesture (a scroll on a phone): put the range back as it was.
    if (p.dragging) {
      setRange(p.before);
      setDragging(false);
    }
  }
  function onClick(e: MouseEvent<HTMLDivElement>) {
    const t = tap.current;
    tap.current = null;
    // The click that ends a drag doesn't record anything.
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    const date = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    const record = date ? byDate.get(date)?.record : null;
    if (!record) return;
    // On a phone the first tap shows the day's card; the next records it.
    if (t?.touch && !t.wasOpen) return;
    openForm({ kind: "record", id: record.subscriptionId, renewalDate: record.renewalDate });
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // A key isn't the click that ends a drag, nor a tap.
    tap.current = null;
    dragged.current = false;
    const date = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    const next = date ? stepDay(date, e.key, grid) : null;
    if (!date || !next) return;
    e.preventDefault();
    if (e.shiftKey) {
      // Shift and an arrow move the focused end of the range it's on, or start one from this day.
      const anchor = range && range.b === date ? range.a : range && range.a === date ? range.b : date;
      setRange({ a: anchor, b: next });
    }
    setTabDate(next);
    dayEl(next)?.focus();
  }

  const hint = disabledReason ?? (touched ? RECORD_HINT.touch : RECORD_HINT.pointer);
  const shownDay = shown?.kind === "day" ? byDate.get(shown.date) : undefined;
  const shownMonth = shown?.kind === "month" ? grid.months.find((m) => m.month === shown.month) : undefined;

  return (
    <div
      ref={box}
      className="relative"
      onPointerLeave={(e) => e.pointerType !== "touch" && !press.current?.dragging && hide()}
      onBlur={(e) => !box.current?.contains(e.relatedTarget as Node | null) && hide()}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Mid-drag, Esc drops the drag and its range; the click that ends it is ignored.
        if (press.current?.dragging) {
          press.current = null;
          dragged.current = true;
          setDragging(false);
          setRange(null);
        } else if (hover) hide();
        else if (range) setRange(null);
      }}
      onScrollCapture={hide}
    >
      <div className="relative" style={{ height: 20 + 7 * step }}>
        {grid.months.map((m) => (
          <span key={m.month} className={`absolute top-0 text-[11px] font-extrabold ${m.current ? "text-accent-text" : "text-muted"}`} style={{ left: label + m.week * step }}>
            {m.name}
          </span>
        ))}
        {!phone &&
          ["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) =>
            d ? (
              <span key={d} aria-hidden="true" className="absolute left-0 text-[10px] font-bold text-muted" style={{ top: 20 + i * step + 3 }}>
                {d}
              </span>
            ) : null,
          )}
        <span id={HINT_ID} className="sr-only">
          The arrow keys move between days: up and down a day, left and right a week. Shift with an arrow key adds up a range of days.
        </span>
        <div
          ref={cells}
          role="group"
          aria-label={`Renewals by day, ${grid.months[0]?.name ?? ""} to ${grid.months.at(-1)?.name ?? ""} ${chart.year}`}
          aria-describedby={HINT_ID}
          className="absolute top-5 grid touch-pan-y touch-pinch-zoom select-none"
          style={{ left: label, gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap }}
          onPointerOver={(e) => e.pointerType !== "touch" && !press.current?.dragging && showDay(e.target)}
          onPointerLeave={(e) => e.pointerType !== "touch" && !press.current?.dragging && hover?.kind === "day" && hide()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            const date = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
            if (!date) return;
            setTabDate(date);
            // An empty day has no card; the dragged range's day keeps the card hidden.
            if (press.current?.dragging || !showDay(e.target)) hide();
          }}
        >
          {drawn}
        </div>
        {empty && (
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-line bg-surface px-3 py-1.5 text-xs font-bold text-muted shadow-[var(--pop-shadow)]">
            Renewals land on their day here
          </span>
        )}
      </div>
      <div className="relative mt-2" style={{ height: phone ? 22 : 26 }} onPointerLeave={(e) => e.pointerType !== "touch" && hover?.kind === "month" && hide()}>
        {grid.months.map((m) => (
          <button
            key={m.month}
            type="button"
            data-month={m.month}
            aria-label={m.label}
            onPointerEnter={(e) => e.pointerType !== "touch" && show({ kind: "month", month: m.month })}
            onPointerDown={(e) => e.pointerType === "touch" && show({ kind: "month", month: m.month })}
            onFocus={() => show({ kind: "month", month: m.month })}
            className={`absolute top-0 flex h-full cursor-default items-center justify-center rounded-lg font-extrabold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-safe:transition-colors motion-safe:duration-150 ${phone ? "text-[9.5px]" : "text-[11.5px]"} ${
              spot === m.month ? "bg-ink text-on-ink" : m.future ? "border-[1.5px] border-dashed border-fill-strong text-muted" : "bg-fill text-fg"
            }`}
            style={{ left: label + m.week * step, width: Math.max(0, m.weeks * step - gap) }}
          >
            {m.total}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {range && !dragging ? rangeSentence(grid, range, pick) : ""}
      </p>
      <div>
        {range && (
          <RangeLine
            grid={grid}
            range={range}
            pick={pick}
            onClear={() => {
              setRange(null);
              // Clear goes with the line, so focus goes back to the grid rather than to the page.
              dayEl(tab)?.focus();
            }}
          />
        )}
      </div>
      <div
        ref={tip}
        id={CARD_ID}
        role="tooltip"
        aria-hidden={hover ? undefined : true}
        className="pointer-events-none absolute top-0 left-0 z-20 rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translate(var(--x,0px),var(--y,0px))_scale(0.96)] data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
        style={{ width: CARD_WIDTH }}
      >
        {shownDay ? <DayCard day={shownDay} hint={hint} /> : shownMonth ? <MonthCard month={shownMonth} pickId={pick.id} /> : null}
      </div>
    </div>
  );
}
