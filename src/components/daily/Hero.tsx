"use client";

import Link from "next/link";
import { useState } from "react";
import type { HeroView } from "@/app/daily/views";
import { PlusIcon } from "../cards/forms/icons";
import { CategoryTile } from "./CategoryPicker";
import { useDaily } from "./context";
import { OftenRow } from "./OftenRow";
import { SpendForm } from "./SpendForm";

const Chevron = ({ left }: { left?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points={left ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} />
  </svg>
);

/**
 * The hero (docs/design/daily.md, rounds 3 and 4): this month's spending as the headline with its sentence, today and the date as pills, the month's
 * arrows; the calendar, one day a click; beside it quick add (on a desktop; a phone has the pinned bar) and the selected day's spends. A day to come can be looked at but not added to.
 */
export function Hero({ view }: { view: HeroView }) {
  const daily = useDaily();
  // Quick add starts empty again after each add: a new key remounts it.
  const [added, setAdded] = useState(0);
  const detail =
    view.details[daily.selected] ?? view.details[view.defaultSelected];
  return (
    <section className="hero" aria-label="Calendar">
      <div className="hero-main">
        <div className="hero-l">
          <div className="hero-hd">
            <div className="hh4">
              <div className="h4-main">
                <small>{view.kicker}</small>
                <b>{view.spentMonth}</b>
                <p>{view.story}</p>
              </div>
              <div className="h4-side">
                {view.spentToday !== null && (
                  <span className="h4-pill">
                    <small>Today</small>
                    <b>{view.spentToday}</b>
                  </span>
                )}
                <span className="h4-pill soft">
                  <small>{view.isCurrent ? view.dateShort : view.monthLabel}</small>
                  <b>{view.isCurrent ? view.dayOf : "Month over"}</b>
                </span>
              </div>
            </div>
            <nav className="mnav" aria-label="Month">
              <Link
                href={view.prevHref}
                className="mn-b"
                aria-label="The month before"
                scroll={false}
              >
                <Chevron left />
              </Link>
              <b>{view.monthLabel}</b>
              {view.nextHref ? (
                <Link
                  href={view.nextHref}
                  className="mn-b"
                  aria-label="The month after"
                  scroll={false}
                >
                  <Chevron />
                </Link>
              ) : (
                <span className="mn-b off" aria-hidden="true">
                  <Chevron />
                </span>
              )}
              {view.backHref && (
                <Link href={view.backHref} className="mn-link" scroll={false}>
                  This month
                </Link>
              )}
            </nav>
          </div>
          <div className="cal" role="grid" aria-label={view.monthLabel}>
            <div className="cal-hd" role="row">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} role="columnheader">
                  {d}
                </span>
              ))}
            </div>
            {view.weeks.map((week, i) => (
              <div key={i} className="cal-r" role="row">
                {week.map((c, j) =>
                  !c ? (
                    <div key={j} className="cd blank" role="gridcell" />
                  ) : (
                    <button
                      key={c.date}
                      type="button"
                      role="gridcell"
                      aria-selected={c.date === daily.selected}
                      aria-label={`${c.date}${c.total ? `, ${c.total}, ${c.count} spends` : c.future ? ", a day to come" : ", nothing written"}`}
                      onClick={() => daily.setSelected(c.date)}
                      className={`cd lv${c.level}${c.today ? " today" : ""}${c.date === daily.selected ? " sel" : ""}${c.future ? " future" : ""}${c.quiet ? " quiet" : ""}`}
                    >
                      <span className="cd-n">{c.day}</span>
                      {(c.upi || c.card || c.cash) && (
                        <span className="cd-dots">
                          {c.upi && <i className="md md-u" />}
                          {c.card && <i className="md md-c" />}
                          {c.cash && <i className="md md-k" />}
                        </span>
                      )}
                      <span>
                        <span className="cd-t">
                          {c.total ||
                            (c.today ? (
                              <span className="cd-add">
                                <PlusIcon />
                              </span>
                            ) : (
                              ""
                            ))}
                        </span>
                        <span className="cd-t c">{c.compact}</span>
                        {c.count > 1 && (
                          <span className="cd-c">{c.count} spends</span>
                        )}
                      </span>
                      {c.today && <span className="cd-tag">Today</span>}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="lgd">
            <span>
              <i className="md md-u" />
              UPI
            </span>
            <span>
              <i className="md md-c" />
              Credit card
            </span>
            <span>
              <i className="md md-k" />
              Cash
            </span>
            <span className="n">The shade is the day&apos;s total</span>
          </div>
        </div>
        <div className="hero-r">
          <aside className="dp quick-card" aria-label="Quick add">
            <div className="dp-h">
              <div>
                <div className="eyebrow">Quick add</div>
                <h3>
                  {detail.isToday
                    ? "Add to today"
                    : detail.canAdd
                      ? `Add to ${detail.label}`
                      : "Pick a day up to today"}
                </h3>
              </div>
            </div>
            {detail.canAdd && <OftenRow variant="card" date={detail.date} />}
            {detail.canAdd || !view.isCurrent ? (
              <SpendForm
                key={`${detail.date}-${added}`}
                variant="card"
                draft={{
                  date: detail.date,
                  amount: "",
                  method: "UPI",
                  category: "",
                  note: "",
                }}
                onAdded={() => setAdded((n) => n + 1)}
              />
            ) : (
              <p className="dp-empty">
                A day to come can&apos;t have a spend. Pick today or an earlier
                day.
              </p>
            )}
          </aside>
          <aside
            className="dp"
            aria-label={`Spends on ${detail.label}`}
            aria-live="polite"
          >
            <div className="dp-h">
              <div>
                <div className="eyebrow">{detail.rel}</div>
                <h3>{detail.label}</h3>
              </div>
              <div className="dp-tot">
                <b>{detail.total}</b>
                {detail.rows.length > 0 && (
                  <small>
                    <i className="md md-u" />
                    {detail.upi} <i className="md md-c" />
                    {detail.card}
                    {detail.cash && (
                      <>
                        {" "}
                        <i className="md md-k" />
                        {detail.cash}
                      </>
                    )}
                  </small>
                )}
              </div>
            </div>
            <div className="dp-l">
              {detail.rows.length === 0 ? (
                <div className="dp-empty">
                  <b>Nothing written for {detail.label}</b>
                  <small>
                    {detail.canAdd
                      ? "A quiet day, or one you haven't written down yet."
                      : "A day to come."}
                  </small>
                </div>
              ) : (
                detail.rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`dp-r${r.saving ? " saving" : ""}`}
                    disabled={r.saving}
                    onClick={() => daily.openEdit(r.id)}
                    aria-label={r.saving ? `${r.title}, ${r.amount}, saving` : `Edit ${r.title}, ${r.amount}`}
                  >
                    <CategoryTile
                      category={{ name: r.tile, colorKey: r.colorKey }}
                    />
                    <span className="dp-n">
                      <b>{r.title}</b>
                      <small>
                        <i
                          className={`md ${r.method === "UPI" ? "md-u" : r.method === "Cash" ? "md-k" : "md-c"}`}
                        />{" "}
                        {r.sub}
                        {r.saving && <em className="sv">saving…</em>}
                      </small>
                    </span>
                    <span className="dp-a">{r.amount}</span>
                  </button>
                ))
              )}
            </div>
            {detail.canAdd && (
              <button
                type="button"
                className="btn-w"
                onClick={() => daily.openAdd({ date: detail.date })}
              >
                <PlusIcon /> Add a spend on {detail.label}
              </button>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
