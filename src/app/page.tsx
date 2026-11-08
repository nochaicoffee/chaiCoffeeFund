import { RefreshButton } from "@/components/RefreshButton";
import { GreetingSentence } from "@/components/overview/GreetingSentence";
import { EightThings } from "@/components/overview/EightThings";
import { FutureYou } from "@/components/overview/FutureYou";
import { Ending } from "@/components/overview/Ending";
import { NetWorthBlock } from "@/components/overview/NetWorthBlock";
import { Tiles } from "@/components/overview/Tiles";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { greetingFor, todayIso } from "@/lib/format/date";
import { endingView } from "./overview/endingView";
import { overviewEvents, WINDOW_DAYS } from "./overview/events";
import { insights } from "./overview/insights";
import { futureView } from "./overview/futureView";
import { loadOverviewData } from "./overview/loadOverviewData";
import { loadWarnings } from "./overview/loadWarnings";
import { overviewModel } from "./overview/model";
import { greetingView, netWorthView, summarySentence, tilesView } from "./overview/views";
import { loadExpenseData } from "./expenses/loadExpenseData";
import { expenseModel, spentTile } from "./expenses/views";

/**
 * The Overview (docs/design/overview.md, F-OV-05): the greeting whose figures point, net worth with its trend, a tile for every page, and
 * every page's warnings in one list. Eight things worth knowing, Future you and the Timeline come on this shell (#375 to #377).
 */
export default async function OverviewPage() {
  const today = todayIso();
  // The Spent tile is the Expenses page's own figure: read beside the rest, and the page still shows if it can't be.
  const spentRead = loadExpenseData().then(
    ({ data }) => spentTile(expenseModel(data, today)),
    (error) => {
      console.error("Overview: the Expenses figures couldn't be read", error);
      return null;
    },
  );
  const model = overviewModel(await loadOverviewData(), today);
  const warnings = await loadWarnings(model, today);
  const worth = netWorthView(model);
  const events = overviewEvents(model.data, today);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="Overview" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<RefreshButton iconOnly />}>
        <GreetingSentence parts={summarySentence(model, warnings)} cards={greetingView(model, warnings)} />
      </PageHeader>
      {worth && <NetWorthBlock view={worth} />}
      <Tiles tiles={tilesView(model, warnings, await spentRead)} />
      <EightThings items={insights(model, events)} />
      <FutureYou view={futureView(model)} />
      <Ending view={endingView(warnings, events, today, addDays(today, WINDOW_DAYS))} />
    </div>
  );
}
