import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { BudgetStrip } from "@/components/daily/BudgetStrip";
import { DailyShell } from "@/components/daily/DailyShell";
import { GreetingSentence } from "@/components/daily/GreetingSentence";
import { Hero } from "@/components/daily/Hero";
import { PeriodPicker } from "@/components/daily/PeriodPicker";
import { MonthsCard, Widgets, WhereCard } from "@/components/daily/Widgets";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { getCachedDailyBudgetsTab, getCachedDailyCategoriesTab, getCachedDailySpendsTab } from "@/lib/sheets/cached";
import { dailyModel, greetingView, heroView, monthsView, nowWidgets, periodOptions, periodWidgets, stripView, summarySentence, whereView } from "./views";
import { cardColorKey } from "@/lib/format/colors";

export const metadata: Metadata = { title: "Daily" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * The Daily page (docs/design/daily.md, round 3): a diary of everyday spending he writes down by hand, split into UPI and credit card. A strip that stays at
 * the top says what's left of the monthly limit; the hero is the calendar with quick add beside it; Right now are the widgets about this month; the rest follow the
 * period (a year by default). `?month=YYYY-MM` is the calendar's month and `?period=` is a year, or "month".
 */
export default async function DailyPage({ searchParams }: PageProps<"/daily">) {
  const params = await searchParams;
  const today = todayIso();
  const [spends, categoryRows, budgets] = await Promise.all([getCachedDailySpendsTab(), getCachedDailyCategoriesTab(), getCachedDailyBudgetsTab()]);
  const periodParam = one(params.period);
  const model = dailyModel({ spends: spends.records, budgets: budgets.records, categoryRows: categoryRows.records, today, month: one(params.month), period: periodParam });
  const hero = heroView(model, periodParam);
  const picker = periodOptions(model);
  const now = nowWidgets(model);
  const skipped = [spends.skipped, categoryRows.skipped, budgets.skipped].filter((s) => s.rows.length > 0);
  const monthSpends = model.picked.days.flatMap((d) => d.spends);

  return (
    <DailyShell
      key={`${model.picked.month}`}
      today={today}
      categories={model.categories.map((c) => ({ id: c.id, name: c.name, colorKey: cardColorKey(c.color), hidden: c.hidden, builtIn: c.builtIn }))}
      spends={monthSpends.map((s) => ({ id: s.id, date: s.date, amount: s.amount, method: s.method, category: s.category, note: s.note }))}
      currentMonth={model.current.month}
      limit={model.limit}
      defaultSelected={hero.defaultSelected}
    >
      <PageHeader section="Daily" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<RefreshButton iconOnly />}>
        <GreetingSentence parts={summarySentence(model)} cards={greetingView(model)} />
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <Hero view={hero} strip={<BudgetStrip view={stripView(model)} />} />
      {now && (
        <>
          <div className="sec">
            <div className="sec-t">
              <h2>Right now</h2>
              <small>this month, and it stays put when you change the period</small>
            </div>
          </div>
          <Widgets widgets={now} />
        </>
      )}
      <div className="sec">
        <div className="sec-t">
          <h2>In {model.periodLabel}</h2>
          <small>{model.period.kind === "year" ? "January to today" : "so far"}</small>
        </div>
        <PeriodPicker options={picker.options} value={picker.value} defaultValue={today.slice(0, 4)} />
      </div>
      <Widgets widgets={periodWidgets(model)} />
      <div className="row2">
        <div className="c4">
          <WhereCard view={whereView(model)} />
        </div>
        <div className="c8">
          <MonthsCard view={monthsView(model, periodParam)} />
        </div>
      </div>
    </DailyShell>
  );
}
