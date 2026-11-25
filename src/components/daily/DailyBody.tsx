"use client";

import { useMemo } from "react";
import { heroView, limitsView, monthsView, nowWidgets, periodOptions, periodWidgets, stripView, whereView } from "@/app/daily/views";
import { BudgetStrip } from "./BudgetStrip";
import { CategoryLimitsCard, NeedsLook } from "./CategoryLimits";
import { useDaily } from "./context";
import { FailedAdds } from "./FailedAdds";
import { Hero } from "./Hero";
import { PeriodPicker } from "./PeriodPicker";
import { MonthsCard, Widgets, WhereCard } from "./Widgets";

/**
 * The page under the greeting (docs/design/daily.md, round 3): any add that couldn't be saved, the hero (the month as the headline, the calendar with quick add), the budget strip under it, Right
 * now, then a period of widgets, Where it went and Month by month. Every figure comes from the shell's model, so an add is in all of them the moment it's
 * made; they're worked out once per model, not on every click.
 */
export function DailyBody() {
  const { model, periodParam, today } = useDaily();
  const v = useMemo(
    () => ({ hero: heroView(model, periodParam), strip: stripView(model), picker: periodOptions(model), now: nowWidgets(model), period: periodWidgets(model), where: whereView(model), limits: limitsView(model), months: monthsView(model, periodParam) }),
    [model, periodParam],
  );
  return (
    <>
      <FailedAdds />
      <Hero view={v.hero} />
      <BudgetStrip view={v.strip} />
      {v.now && (
        <>
          <div className="sec">
            <div className="sec-t">
              <h2>Right now</h2>
              <small>this month, and it stays put when you change the period</small>
            </div>
          </div>
          <Widgets widgets={v.now} />
        </>
      )}
      <NeedsLook view={v.limits} />
      <CategoryLimitsCard view={v.limits} />
      <div className="sec">
        <div className="sec-t">
          <h2>In {model.periodLabel}</h2>
          <small>{model.period.kind === "year" ? "January to today" : "so far"}</small>
        </div>
        <PeriodPicker options={v.picker.options} value={v.picker.value} defaultValue={today.slice(0, 4)} />
      </div>
      <Widgets widgets={v.period} />
      <div className="row2">
        <div className="c4">
          <WhereCard view={v.where} />
        </div>
        <div className="c8">
          <MonthsCard view={v.months} />
        </div>
      </div>
    </>
  );
}
