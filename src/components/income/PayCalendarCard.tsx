"use client";

import { useState } from "react";
import type { CalendarPayment, payCalendar } from "@/app/income/lowerView";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const chip = (p: CalendarPayment) =>
  p.state === "received"
    ? { className: "text-on-card", style: { background: `var(--card-${p.colorKey})` } }
    : p.state === "pending"
      ? { className: "border border-dashed border-warning bg-warning-tint text-warning-text", style: {} }
      : { className: "border border-dashed border-muted/60 text-muted", style: {} };

/**
 * The Pay calendar (IncomeZ1): a month of days with each payment on the day it landed (in its source's colour), what's
 * owed in dashed amber on the day it was due, and what's still to come dashed. It opens on this month (December for a
 * past year) and steps a month at a time through the year.
 */
export function PayCalendarCard({ calendar }: { calendar: ReturnType<typeof payCalendar> }) {
  const [index, setIndex] = useState(calendar.start);
  const month = calendar.months[Math.min(index, calendar.months.length - 1)];
  return (
    <section aria-label="Pay calendar" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Pay calendar <small className="ml-2 text-xs font-semibold text-muted">
            {month.title} · {month.note}
          </small>
        </h2>
        <span className="flex gap-1.5">
          <button type="button" aria-label="Month before" disabled={index === 0} onClick={() => setIndex(index - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full bg-fill font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40 md:size-8">
            ‹
          </button>
          <button type="button" aria-label="Month after" disabled={index === calendar.months.length - 1} onClick={() => setIndex(index + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full bg-fill font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40 md:size-8">
            ›
          </button>
        </span>
      </div>
      <div role="grid" aria-label={month.title} className="flex flex-1 flex-col gap-1.5">
        <div role="row" className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => (
            <span role="columnheader" key={d} className="text-center text-[10.5px] font-extrabold text-muted uppercase">
              {d}
            </span>
          ))}
        </div>
        {month.weeks.map((week, i) => (
          <div role="row" key={i} className="grid flex-1 grid-cols-7 gap-1.5">
            {week.map((day, j) =>
              day ? (
                <div
                  role="gridcell"
                  key={j}
                  aria-label={`${day.day}${day.payments.length ? `: ${day.payments.map((p) => `${p.name} ${p.amount} ${p.state}`).join(", ")}` : ""}`}
                  className={`flex min-h-[52px] flex-col gap-1 rounded-[10px] p-1.5 ${day.payments.length ? "bg-surface ring-1 ring-divider" : "bg-fill"} ${day.today ? "ring-2 ring-fg" : ""}`}
                >
                  <span className="text-[11px] font-bold text-muted">{day.day}</span>
                  {day.payments.map((p) => {
                    const c = chip(p);
                    return (
                      <span key={p.key} title={`${p.name} · ${p.amount}`} className={`truncate rounded-full px-1.5 py-px text-[10px] font-extrabold tabular-nums ${c.className}`} style={c.style}>
                        {p.state === "received" ? "✓ " : ""}
                        {p.short}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div key={j} aria-hidden="true" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        <span>Received in its colour</span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-dashed border-warning bg-warning-tint" />
          Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-dashed border-muted" />
          Expected
        </span>
      </div>
    </section>
  );
}
