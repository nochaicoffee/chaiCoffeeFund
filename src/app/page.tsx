import { RefreshButton } from "@/components/RefreshButton";
import { GreetingSentence } from "@/components/overview/GreetingSentence";
import { EightThings } from "@/components/overview/EightThings";
import { FutureYou } from "@/components/overview/FutureYou";
import { Ending } from "@/components/overview/Ending";
import { NetWorthBlock } from "@/components/overview/NetWorthBlock";
import { MonthByMonth } from "@/components/overview/MonthByMonth";
import { Tiles } from "@/components/overview/Tiles";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { monthOf } from "@/lib/aggregate/cardSpend";
import { monthsSoFarIn } from "@/lib/aggregate/monthlyFlows";
import { parsePeriodParam } from "@/lib/aggregate/period";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { greetingFor, todayIso } from "@/lib/format/date";
import { endingView } from "./overview/endingView";
import { overviewEvents, WINDOW_DAYS } from "./overview/events";
import { insights } from "./overview/insights";
import { futureView } from "./overview/futureView";
import { loadOverviewData } from "./overview/loadOverviewData";
import { loadWarnings } from "./overview/loadWarnings";
import { earliestFlowMonth, monthlyView, periodMenu, periodMenuValue, rangePickerStart } from "./overview/monthlyView";
import { overviewModel } from "./overview/model";
import { rangeFigures } from "./overview/rangeView";
import { greetingView, netWorthView, summarySentence, tilesView } from "./overview/views";
import { loadExpenseData } from "./expenses/loadExpenseData";
import { expenseModel, spentTile } from "./expenses/views";

/**
 * The Overview (docs/design/overview.md, F-OV-05): the greeting whose figures point, net worth with its trend, a tile for every page, and
 * every page's warnings in one list. Eight things worth knowing, Future you and the Timeline come on this shell (#375 to #377).
 */
export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const today = todayIso();
  // `?period=` as on Cards and the other dashboards: this year unless asked otherwise.
  const periodParam = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = parsePeriodParam(periodParam, today);
  // The Expenses figures feed the Spent tile and the Month by month widget: read once, beside the rest, and the page still shows if they can't be.
  const expenseRead = loadExpenseData().then(
    (read) => read,
    (error) => {
      console.error("Overview: the Expenses figures couldn't be read", error);
      return null;
    },
  );
  const [overviewData, expense] = await Promise.all([loadOverviewData(), expenseRead]);
  const first = expense ? earliestFlowMonth(expense.data, today) : monthOf(today);
  // The whole page follows the period (docs/design/overview.md, MzB): net worth runs over it, and the greeting and tiles say what it did.
  // Without the Expenses figures there's no period to read, so the page shows as it did.
  const rangeMonths = expense ? monthsSoFarIn(period, today, first) : [];
  const model = overviewModel(overviewData, today, rangeMonths);
  const warnings = await loadWarnings(model, today);
  const worth = netWorthView(model);
  const events = overviewEvents(model.data, today);
  const spent = expense ? spentTile(expenseModel(expense.data, today)) : null;
  const monthly = expense ? monthlyView(expense.data, period, today) : null;
  const range = monthly && model.range ? rangeFigures(model, monthly, period, today) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Overview"
        title={`${greetingFor()}, ${appConfig.ownerName}`}
        actions={
          <>
            {expense && <PeriodSelect options={periodMenu(period, today, first)} value={periodMenuValue(period, today)} start={rangePickerStart(period, today, first)} currentMonth={monthOf(today)} />}
            <RefreshButton iconOnly />
          </>
        }
      >
        <GreetingSentence parts={summarySentence(model, warnings, range)} cards={greetingView(model, warnings, range)} />
      </PageHeader>
      {/* Keyed by the period: its picked month is state, and a shorter period has fewer months to pick from. */}
      {worth && <NetWorthBlock key={periodParam ?? "default"} view={worth} />}
      <Tiles tiles={tilesView(model, warnings, spent, range)} />
      {monthly && <MonthByMonth view={monthly} />}
      <EightThings items={insights(model, events)} />
      <FutureYou view={futureView(model)} />
      <Ending view={endingView(warnings, events, today, addDays(today, WINDOW_DAYS))} />
    </div>
  );
}
