"use client";

import type { StripView } from "@/app/daily/views";
import { useDaily } from "./context";

/**
 * The budget strip (docs/design/daily.md, round 3), the top of the hero: what's left of the monthly limit, a bar with the pace marked, and what's left today.
 * With no limit set it asks for one instead.
 */
export function BudgetStrip({ view }: { view: StripView }) {
  const daily = useDaily();
  if (!view.hasLimit) {
    return (
      <div className="bs-set">
        <div>
          <b>Set a monthly limit</b>
          <p>Then this page shows what&apos;s left of it, today&apos;s allowance and where the month is heading.</p>
        </div>
        <button type="button" className="btn-s go" onClick={daily.openLimit}>
          Set a limit
        </button>
      </div>
    );
  }
  return (
    <section className="bstrip" aria-label="Budget">
      <div className="bs-lv">
        <small>
          {view.label}
          <button type="button" className="bs-edit" onClick={daily.openLimit}>
            Edit limit
          </button>
        </small>
        <b className={view.tone === "neg" ? "neg" : ""}>{view.value}</b>
        <em>{view.ofLimit}</em>
      </div>
      <span className={`bs-pill pill ${view.pill.tone}`}>{view.pill.text}</span>
      <div className="bs-mid">
        <span className={`bs-bar ${view.tone}`} role="progressbar" aria-label="Spent so far against the limit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.fraction * 100)}>
          <i style={{ width: `${view.fraction * 100}%` }} />
          <u style={{ left: `${view.paceFraction * 100}%` }} title="Where you'd be on a straight line to the limit" />
        </span>
        <div className="bs-foot">
          <span>
            {view.todayLabel} <b className={view.todayNegative ? "neg" : ""}>{view.todayValue}</b>
          </span>
          <span>{view.daysLeft}</span>
        </div>
      </div>
    </section>
  );
}
