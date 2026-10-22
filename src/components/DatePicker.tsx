"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { addMonths } from "@/lib/aggregate/cardSpend";
import { MONTH_NAMES, WEEKDAY_NAMES, formatDate, formatMonthShort, formatMonthYear, formatShortDate, formatSpokenDate } from "@/lib/format/date";
import { WEEK_START, clampDate, isIsoDate, monthWeeks, moveDate, parseTypedDate, sameDayIn } from "@/lib/forms/dates";
import { POPOVER_MARGIN, popoverPlacement } from "./listbox";

/** A one-tap date above the calendar, picked for its field: "Today", "Latest", "Due date". */
export interface DateShortcut {
  label: string;
  date: string;
}

/** What the field shows for a value: the date as the Statements page writes it, or what was typed when it isn't one. */
const shown = (value: string) => (isIsoDate(value) ? formatDate(value) : value);

/**
 * The app's date field (option B with C from design/cards-datepicker): a text
 * field you can type a date into ("5 aug", "18/10", "yesterday": see
 * parseTypedDate), which opens a calendar under it when clicked, like the
 * dropdowns open their menu. The calendar follows what's typed. It's drawn like
 * Select's menu, in the top layer, so it sits above the form dialogs.
 *
 * - The field is a combobox whose popup is a dialog, as in the WAI-ARIA date
 *   picker combobox. ↓ opens the calendar and moves focus into its days; there
 *   the arrows, Home/End and Page Up/Down (with Shift, a year) move, Enter or
 *   Space picks, and Esc closes it with focus back in the field. A press on the
 *   calendar never takes focus, so clicking a day picks it with focus left in
 *   the field.
 * - `value` is an ISO date, or the typed text when it can't be read as one (so
 *   the form's reader says "Enter a date"), or "". `name` submits it with the form.
 * - Days outside `min`–`max` are faded and can't be picked. `shortcuts` outside
 *   them aren't offered.
 * - The month name opens a year of months to jump to.
 */
export function DatePicker({
  id: givenId,
  label,
  value,
  onChange,
  onBlur,
  today,
  min,
  max,
  shortcuts = [],
  name,
  placeholder = "e.g. 5 Aug 2026",
  className,
  ...aria
}: {
  id?: string;
  /** The field's label, for the calendar's own: "Statement date" opens "Choose statement date". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** When focus leaves the field and its calendar, as a form field's validation needs. */
  onBlur?: () => void;
  today: string;
  min?: string;
  max?: string;
  shortcuts?: readonly DateShortcut[];
  name?: string;
  placeholder?: string;
  /** The field's look, which belongs to the caller (the forms' inputClass). */
  className: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "data-autofocus"?: boolean;
}) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const dialogId = `${id}-calendar`;
  const titleId = `${id}-calendar-title`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Set when a key or a pick should move focus inside the calendar; the effect below does it once the calendar has rendered.
  const wantFocus = useRef<"day" | "month" | null>(null);
  // What a date typed without its year is nearest to: the field's date when typing started.
  const near = useRef(today);

  const [text, setText] = useState(() => shown(value));
  // The value the text was last written for. A new value from outside (picking a card fills in its dates) rewrites the text.
  const [textFor, setTextFor] = useState(value);
  if (value !== textFor) {
    setTextFor(value);
    setText(shown(value));
  }

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [focusDate, setFocusDate] = useState(today);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [focusMonth, setFocusMonth] = useState(today.slice(0, 7));
  // Which way the days slide in when the month changes; none when the calendar opens.
  const [slide, setSlide] = useState<"next" | "prev" | null>(null);

  const allowed = (date: string) => (!min || date >= min) && (!max || date <= max);
  const monthAllowed = (m: string) => (!min || m >= min.slice(0, 7)) && (!max || m <= max.slice(0, 7));
  const offered = shortcuts.filter((s) => isIsoDate(s.date) && allowed(s.date));

  function emit(next: string) {
    setTextFor(next);
    if (next !== value) onChange(next);
  }

  function showMonth(next: string, from: string) {
    if (next === month) return;
    setSlide(next > from ? "next" : "prev");
    setMonth(next);
  }

  function openCalendar(focusDays: boolean) {
    if (!open) {
      const start = clampDate(isIsoDate(value) ? value : today, min, max);
      setFocusDate(start);
      setMonth(start.slice(0, 7));
      setView("days");
      setSlide(null);
      setOpen(true);
    }
    if (!focusDays) return;
    // Already open: its days are on the page, so focus one now. Otherwise once it renders.
    const day = open && view === "days" ? popRef.current?.querySelector<HTMLElement>('[data-date][tabindex="0"]') : null;
    if (day) day.focus();
    else wantFocus.current = view === "months" && open ? "month" : "day";
  }

  function close(focusField: boolean) {
    setOpen(false);
    if (focusField) inputRef.current?.focus();
  }

  function choose(date: string) {
    if (!allowed(date)) return;
    near.current = date;
    setText(formatDate(date));
    emit(date);
    close(true);
  }

  function type(typed: string) {
    setText(typed);
    const parsed = parseTypedDate(typed, { today, near: near.current, max });
    emit(parsed ?? (typed.trim() === "" ? "" : typed));
    if (open && parsed) {
      setView("days");
      showMonth(parsed.slice(0, 7), month);
      setFocusDate(parsed);
    }
  }

  function onFieldKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        openCalendar(true);
        break;
      case "Escape":
        if (!open) return;
        // Only the calendar closes: inside a form dialog, the dialog stays open.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Enter":
        if (!open) return;
        e.preventDefault();
        setOpen(false);
        if (isIsoDate(value)) setText(formatDate(value));
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  function goTo(date: string) {
    const target = clampDate(date, min, max);
    showMonth(target.slice(0, 7), month);
    setFocusDate(target);
    wantFocus.current = "day";
  }

  function onDaysKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(focusDate);
      return;
    }
    const next = moveDate(focusDate, e.key, { shift: e.shiftKey });
    if (!next) return;
    e.preventDefault();
    goTo(next);
  }

  function stepMonth(step: number) {
    const next = addMonths(month, step);
    showMonth(next, month);
    // Keep the same day of the month, as far as the field allows.
    setFocusDate(clampDate(sameDayIn(next, focusDate), min, max));
  }

  function showMonths() {
    setView("months");
    setYear(Number(month.slice(0, 4)));
    setFocusMonth(month);
    setSlide(null);
    wantFocus.current = "month";
  }

  function pickMonth(m: string) {
    const target = clampDate(sameDayIn(m, focusDate), min, max);
    setSlide(null);
    setMonth(target.slice(0, 7));
    setFocusDate(target);
    setView("days");
    wantFocus.current = "day";
  }

  function stepYear(step: number) {
    setSlide(step > 0 ? "next" : "prev");
    setYear((y) => y + step);
  }

  function onMonthsKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = addMonths(focusMonth, step);
    if (!monthAllowed(next)) return;
    if (Number(next.slice(0, 4)) !== year) {
      setSlide(step > 0 ? "next" : "prev");
      setYear(Number(next.slice(0, 4)));
    }
    setFocusMonth(next);
    wantFocus.current = "month";
  }

  function onCalendarKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (view === "months") {
      setView("days");
      wantFocus.current = "day";
    } else close(true);
  }

  // Show the calendar in the top layer and place it under the field, following it on scroll and resize.
  useLayoutEffect(() => {
    const pop = popRef.current;
    const field = inputRef.current;
    const wrap = wrapRef.current;
    if (!open || !pop || !field || !wrap) return;
    // Strict Mode runs this twice, and Safari 17.0–17.3 throws on showing an open popover.
    if (typeof pop.showPopover === "function" && !pop.matches(":popover-open")) pop.showPopover();
    const place = () => {
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      const size = { width: pop.offsetWidth, height: pop.offsetHeight };
      const at = popoverPlacement(field.getBoundingClientRect(), size, viewport, "start");
      // Unlike a menu, a calendar can't scroll. When it fits on neither side, it stays inside the window, over part of the field.
      pop.style.top = `${Math.max(POPOVER_MARGIN, Math.min(at.top, viewport.height - POPOVER_MARGIN - size.height))}px`;
      pop.style.left = `${at.left}px`;
      pop.dataset.side = at.side;
    };
    place();
    let frame = 0;
    const follow = (e: Event) => {
      if (e.target instanceof Node && pop.contains(e.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    // The field's own <label> counts as inside: clicking it reaches the field, which keeps the calendar open.
    const inside = (node: Node) => wrap.contains(node) || [...(field.labels ?? [])].some((l) => l.contains(node));
    const pressOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && !inside(e.target)) setOpen(false);
    };
    // A close request on the form dialog around it (Esc, or a phone's back gesture) closes only the calendar.
    const keepDialog = (e: Event) => {
      if (!(e.target instanceof Node) || !e.target.contains(field)) return;
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    document.addEventListener("pointerdown", pressOutside);
    document.addEventListener("cancel", keepDialog, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      document.removeEventListener("pointerdown", pressOutside);
      document.removeEventListener("cancel", keepDialog, true);
    };
  }, [open, view]);

  // Move focus where a key or a pick asked, once the calendar shows it.
  useLayoutEffect(() => {
    const target = wantFocus.current;
    const pop = popRef.current;
    if (!target || !pop) return;
    wantFocus.current = null;
    pop.querySelector<HTMLElement>(target === "day" ? `[data-date="${focusDate}"]` : `[data-month="${focusMonth}"]`)?.focus();
  });

  const iconButton =
    "grid size-8 place-items-center rounded-[10px] text-muted enabled:hover:bg-fill enabled:hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-35 max-md:size-10 pointer-coarse:size-10";
  const slideClass = slide === "next" ? "motion-safe:animate-days-next" : slide === "prev" ? "motion-safe:animate-days-prev" : "";
  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAY_NAMES[(i + WEEK_START) % 7]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={(e) => {
        if (e.relatedTarget instanceof Node && wrapRef.current?.contains(e.relatedTarget)) return;
        setOpen(false);
        if (isIsoDate(value)) setText(formatDate(value));
        onBlur?.();
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        {...aria}
        onFocus={() => {
          near.current = isIsoDate(value) ? value : today;
        }}
        onChange={(e) => type(e.target.value)}
        onClick={() => openCalendar(false)}
        onKeyDown={onFieldKeyDown}
        className={className}
      />
      <svg
        className={`pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 ${open ? "text-accent-text" : "text-muted"}`}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
      {name !== undefined && <input type="hidden" name={name} value={value} />}
      {open && (
        <div
          ref={popRef}
          id={dialogId}
          popover="manual"
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          data-side="bottom"
          // Pressing on the calendar keeps focus where it is, in the field or on a day.
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={onCalendarKeyDown}
          className="fixed inset-auto m-0 flex w-[300px] max-w-[calc(100vw-32px)] origin-top-left flex-col gap-1.5 overflow-visible rounded-[16px] border border-surface-line bg-surface p-3 text-fg shadow-pop data-[side=top]:origin-bottom-left data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in max-md:w-[320px] max-md:p-2.5 pointer-coarse:w-[320px] pointer-coarse:p-2.5"
        >
          {offered.length > 0 && (
            <div role="group" aria-label="Shortcuts" className="mb-0.5 flex flex-wrap gap-1.5 border-b border-divider pb-2.5">
              {offered.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={s.date === value}
                  aria-label={`${s.label}, ${formatSpokenDate(s.date)}`}
                  onClick={() => choose(s.date)}
                  className="group inline-flex h-[30px] items-center gap-1.5 rounded-full bg-fill px-[11px] text-xs font-extrabold whitespace-nowrap hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-accent-tint aria-pressed:text-accent-text max-md:h-9 pointer-coarse:h-9"
                >
                  {s.label}
                  <span className="font-semibold text-muted tabular-nums group-aria-pressed:text-accent-text">{formatShortDate(s.date)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {view === "days" ? (
              <button
                type="button"
                aria-expanded={false}
                aria-label={`${formatMonthYear(month)}, choose a month`}
                onClick={showMonths}
                className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-extrabold tabular-nums hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent max-md:h-10 pointer-coarse:h-10"
              >
                <span id={titleId} aria-live="polite">
                  {formatMonthYear(month)}
                </span>
                <Chevron />
              </button>
            ) : (
              <button
                type="button"
                aria-expanded={true}
                aria-label={`${year}, back to the days`}
                onClick={() => {
                  setView("days");
                  wantFocus.current = "day";
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-extrabold tabular-nums hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent max-md:h-10 pointer-coarse:h-10"
              >
                <span aria-live="polite">{year}</span>
                <Chevron up />
              </button>
            )}
            <div className="flex gap-0.5">
              {view === "days" ? (
                <>
                  <button type="button" aria-label="Previous month" disabled={!monthAllowed(addMonths(month, -1))} onClick={() => stepMonth(-1)} className={iconButton}>
                    <Arrow points="15 6 9 12 15 18" />
                  </button>
                  <button type="button" aria-label="Next month" disabled={!monthAllowed(addMonths(month, 1))} onClick={() => stepMonth(1)} className={iconButton}>
                    <Arrow points="9 6 15 12 9 18" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" aria-label="Previous year" disabled={!monthAllowed(`${year - 1}-12`)} onClick={() => stepYear(-1)} className={iconButton}>
                    <Arrow points="15 6 9 12 15 18" />
                  </button>
                  <button type="button" aria-label="Next year" disabled={!monthAllowed(`${year + 1}-01`)} onClick={() => stepYear(1)} className={iconButton}>
                    <Arrow points="9 6 15 12 9 18" />
                  </button>
                </>
              )}
            </div>
          </div>

          {view === "days" ? (
            <table role="grid" aria-labelledby={titleId} onKeyDown={onDaysKeyDown} className="-m-0.5 w-[calc(100%+4px)] table-fixed border-separate border-spacing-0.5">
              <thead>
                <tr>
                  {weekdays.map((d) => (
                    <th key={d} scope="col" abbr={d} className="h-6 text-[10px] font-extrabold tracking-[0.03em] text-muted">
                      {d[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody key={month} className={slideClass}>
                {monthWeeks(month).map((week, w) => (
                  <tr key={w}>
                    {week.map((date, d) =>
                      date === null ? (
                        <td key={d} aria-hidden="true" />
                      ) : (
                        <td
                          key={date}
                          data-date={date}
                          tabIndex={date === focusDate ? 0 : -1}
                          aria-label={formatSpokenDate(date)}
                          aria-selected={date === value}
                          aria-current={date === today ? "date" : undefined}
                          aria-disabled={allowed(date) ? undefined : true}
                          onClick={() => choose(date)}
                          onFocus={() => setFocusDate(date)}
                          className={`h-9 cursor-pointer rounded-[10px] p-0 text-center text-[13px] font-bold tabular-nums select-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-disabled:cursor-default aria-disabled:bg-transparent aria-disabled:text-muted aria-disabled:opacity-40 aria-selected:bg-accent aria-selected:text-on-accent aria-selected:focus-visible:outline-ink max-md:h-11 pointer-coarse:h-11 ${
                            date === today && date !== value ? "inset-ring-[1.5px] inset-ring-accent/45" : ""
                          }`}
                        >
                          {Number(date.slice(8, 10))}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div key={year} role="group" aria-label={`Months of ${year}`} onKeyDown={onMonthsKeyDown} className={`grid grid-cols-3 gap-1 pt-0.5 ${slideClass}`}>
              {MONTH_NAMES.map((_, i) => {
                const m = `${year}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <button
                    key={m}
                    type="button"
                    data-month={m}
                    tabIndex={m === focusMonth ? 0 : -1}
                    disabled={!monthAllowed(m)}
                    aria-pressed={m === month}
                    aria-label={formatMonthYear(m)}
                    onClick={() => pickMonth(m)}
                    onFocus={() => setFocusMonth(m)}
                    className={`h-11 rounded-[10px] text-[13px] font-bold enabled:hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-default disabled:text-muted disabled:opacity-40 aria-pressed:bg-accent-tint aria-pressed:text-accent-text ${
                      m === today.slice(0, 7) && m !== month ? "inset-ring-[1.5px] inset-ring-accent/45" : ""
                    }`}
                  >
                    {formatMonthShort(m)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg className={`text-muted ${up ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Arrow({ points }: { points: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}
