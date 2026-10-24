"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { addMonths, monthRange, type MonthKey } from "@/lib/aggregate/cardSpend";
import { monthSpanName } from "@/lib/aggregate/period";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { popoverPlacement } from "../listbox";
import { Select, type SelectOption } from "../Select";

/** Where the month picker opens: the months the page shows now, and the earliest month it offers (params.ts, rangePickerStart). */
export interface RangeStart {
  from: MonthKey;
  to: MonthKey;
  earliest: MonthKey;
}

/**
 * The "This year ▾" pill from the design, opening the app's own menu (Select):
 * the last 3, 6 and 12 months, the years, all time, each with what was spent in
 * it, and "Custom range…", which opens a month picker under the pill (#113).
 * Choosing updates `?period=` and keeps everything else in the URL, so every
 * number on the page follows it, except a page number: a different period's
 * list starts again at page 1. Each option's value is its `?period=`, blank for
 * this year (params.ts, periodMenu).
 */
/** The pill's look, shared with the Income page's year pill. */
export const PILL_SELECT_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-surface-line bg-surface py-2.5 pr-4 pl-4 text-[13px] font-bold text-fg shadow-soft focus-visible:outline-2 focus-visible:outline-accent aria-expanded:border-accent/45 md:min-h-0";

export function CalendarIcon() {
  return (
    <svg className="shrink-0 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

/**
 * Goes to this page with `?<param>=value` (or without it for ""), keeping the rest of the address and a bare
 * `?demo` bare, and dropping the list's page number, which belongs to the old choice.
 */
export function useSearchParamNavigation(param: string): (value: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (value: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    if (value === "") query.delete(param);
    else query.set(param, value);
    const text = query.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: false });
  };
}

export function PeriodSelect({ options, value, start, currentMonth }: { options: SelectOption[]; value: string; start: RangeStart; currentMonth: MonthKey }) {
  const choose = useSearchParamNavigation("period");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [picking, setPicking] = useState(false);

  function closePicker(returnFocus: boolean) {
    setPicking(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  return (
    <>
      <Select
        ref={triggerRef}
        variant="pill"
        aria-label="Period"
        options={options}
        value={value}
        onChange={choose}
        onAction={() => setPicking(true)}
        icon={<CalendarIcon />}
        className={PILL_SELECT_CLASS}
      />
      {picking && (
        <MonthRangePicker
          anchor={triggerRef}
          start={start}
          currentMonth={currentMonth}
          onClose={closePicker}
          onApply={(from, to) => {
            closePicker(true);
            choose(`${from}..${to}`);
          }}
        />
      )}
    </>
  );
}

/**
 * Option A from design/cards-dropdowns: a year of months in a small dialog under
 * the pill. The first month picked starts the range and the second ends it,
 * whichever is earlier (the months between preview as the pointer or focus
 * moves). Arrow keys move between months and on into the next or previous year.
 * Months after this one can't be picked. Esc or Cancel closes it with focus
 * back on the pill; a press outside closes it too.
 */
function MonthRangePicker({
  anchor,
  start,
  currentMonth,
  onClose,
  onApply,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  start: RangeStart;
  currentMonth: MonthKey;
  onClose: (returnFocus: boolean) => void;
  onApply: (from: MonthKey, to: MonthKey) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ from: start.from, to: start.to });
  // The first month of a range being picked, until its last is picked.
  const [first, setFirst] = useState<MonthKey | null>(null);
  const [hover, setHover] = useState<MonthKey | null>(null);
  const [focused, setFocused] = useState<MonthKey>(start.to);
  const [year, setYear] = useState(Number(start.to.slice(0, 4)));
  const earliestYear = Number(start.earliest.slice(0, 4));
  const currentYear = Number(currentMonth.slice(0, 4));
  const pickable = (m: MonthKey) => m >= start.earliest && m <= currentMonth;

  // Shown in the top layer under the pill, with focus on the range's last month.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = anchor.current;
    if (!panel || !trigger) return;
    if (typeof panel.showPopover === "function" && !panel.matches(":popover-open")) panel.showPopover();
    const place = () => {
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      const at = popoverPlacement(trigger.getBoundingClientRect(), { width: panel.offsetWidth, height: panel.offsetHeight }, viewport, "end");
      panel.style.top = `${at.top}px`;
      panel.style.left = `${at.left}px`;
      panel.dataset.side = at.side;
    };
    place();
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
    const pressOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && !panel.contains(e.target)) onClose(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", pressOutside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", pressOutside);
    };
    // Placed once when it opens; onClose is a fresh function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // Keep focus on the focused month as the grid re-renders, and follow it into another year.
  useLayoutEffect(() => {
    if (panelRef.current?.contains(document.activeElement)) gridRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focused}"]`)?.focus();
  }, [focused, year]);

  function pick(month: MonthKey) {
    setFocused(month);
    if (first === null) {
      setFirst(month);
      setRange({ from: month, to: month });
    } else {
      setRange(first <= month ? { from: first, to: month } : { from: month, to: first });
      setFirst(null);
    }
    setHover(null);
  }

  function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = addMonths(focused, step);
    // Pickable months run unbroken from the earliest to this month, so a step past either end goes nowhere.
    if (!pickable(next)) return;
    setFocused(next);
    setYear(Number(next.slice(0, 4)));
    if (first !== null) setHover(next);
  }

  // While picking, the range so far runs from the first month to the one under the pointer or focus.
  const shown = first !== null && hover !== null ? (first <= hover ? { from: first, to: hover } : { from: hover, to: first }) : range;
  const months = monthRange(`${year}-01`, `${year}-12`);
  const count = monthRange(range.from, range.to).length;
  const tabStop = months.includes(focused) ? focused : (months.find(pickable) ?? null);

  return (
    <div
      ref={panelRef}
      popover="manual"
      role="dialog"
      aria-label="Custom range"
      data-side="bottom"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onClose(true);
      }}
      onBlur={(e) => {
        if (e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) onClose(false);
      }}
      className="fixed inset-auto m-0 flex w-[316px] max-w-[calc(100vw-32px)] origin-top-right flex-col gap-3 rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg shadow-pop data-[side=top]:origin-bottom-right data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-extrabold">Custom range</span>
        <div className="flex items-center gap-1">
          <YearButton label="Previous year" disabled={year <= earliestYear} onClick={() => setYear((y) => y - 1)} points="15 6 9 12 15 18" />
          <span className="min-w-[72px] text-center text-[13px] font-extrabold tabular-nums" aria-live="polite">
            {year}
          </span>
          <YearButton label="Next year" disabled={year >= currentYear} onClick={() => setYear((y) => y + 1)} points="9 6 15 12 9 18" />
        </div>
      </div>
      <div ref={gridRef} role="group" aria-label={`Months of ${year}`} className="grid grid-cols-3 gap-1" onKeyDown={moveFocus} onPointerLeave={() => setHover(null)}>
        {months.map((m) => {
          const inShown = m >= shown.from && m <= shown.to;
          const isStart = first === null ? m === range.from : m === shown.from;
          const isEnd = first === null ? m === range.to : m === shown.to;
          const end = isStart || isEnd;
          return (
            <button
              key={m}
              type="button"
              data-month={m}
              disabled={!pickable(m)}
              tabIndex={m === tabStop ? 0 : -1}
              aria-pressed={first === null && inShown}
              aria-label={formatMonthYear(m)}
              onClick={() => pick(m)}
              onPointerEnter={() => first !== null && pickable(m) && setHover(m)}
              onFocus={() => {
                setFocused(m);
                if (first !== null) setHover(m);
              }}
              className={`h-10 text-[13px] font-bold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:text-muted disabled:opacity-40 pointer-coarse:h-11 ${
                end
                  ? `bg-accent text-on-accent ${isStart && isEnd ? "rounded-[10px]" : isStart ? "rounded-l-[10px]" : "rounded-r-[10px]"}`
                  : inShown
                    ? first === null
                      ? "bg-accent-tint text-accent-text"
                      : "bg-fill"
                    : `rounded-[10px] enabled:hover:bg-fill ${m === currentMonth ? "inset-ring-[1.5px] inset-ring-accent/45" : ""}`
              }`}
            >
              {formatMonthShort(m)}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
        <span className="text-xs font-semibold text-muted tabular-nums" aria-live="polite">
          {first !== null ? (
            <>
              From <b className="font-extrabold text-fg">{monthSpanName(first, first)}</b>. Now the last month.
            </>
          ) : (
            <>
              <b className="font-extrabold text-fg">{monthSpanName(range.from, range.to)}</b> · {count} {count === 1 ? "month" : "months"}
            </>
          )}
        </span>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={() => onClose(true)} className="h-[34px] rounded-full bg-fill px-3.5 text-xs font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:h-10">
            Cancel
          </button>
          <button
            type="button"
            disabled={first !== null}
            onClick={() => onApply(range.from, range.to)}
            className="h-[34px] rounded-full bg-ink px-3.5 text-xs font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 pointer-coarse:h-10"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function YearButton({ label, disabled, onClick, points }: { label: string; disabled: boolean; onClick: () => void; points: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[10px] text-muted enabled:hover:bg-fill enabled:hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-35 pointer-coarse:size-10"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points={points} />
      </svg>
    </button>
  );
}
