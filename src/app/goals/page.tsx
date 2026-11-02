import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { GoalsDashboard } from "@/components/goals/GoalsDashboard";
import { GoalsFormsProvider, HeaderFormButtons } from "@/components/goals/forms/GoalsForms";
import { GreetingSentence } from "@/components/goals/GreetingSentence";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { goalsFormsData } from "./formsView";
import { loadGoalsData } from "./loadGoalsData";
import { attentionItems } from "@/lib/goals/attention";
import { orphanGoals } from "@/lib/aggregate/goals";
import { ALL, deriveGoals, goalSides, greetingView, pickIds, sideView, skyView, summarySentence } from "./views";
import { goalsWidgets } from "./widgetsView";

export const metadata: Metadata = { title: "Goals" };

/**
 * The Goals page (docs/design/goals.md, GoalsFinal): the greeting, whose figures point, the attention strip while a Fixed date is at risk, a date has
 * passed or an account can't cover its earmarks, then the Orbit card. `?goal=` picks a goal, and `?demo` shows sample data in development (the other
 * `?demo=` states are listed in goalsDemo.ts).
 */
export default async function GoalsPage({ searchParams }: PageProps<"/goals">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadGoalsData(params, today);
  const derived = deriveGoals(data, today);
  const ids = pickIds(data, today, derived);
  const requested = typeof params.goal === "string" ? params.goal : ALL;
  const initialPick = ids.includes(requested) ? requested : ALL;

  return (
    <GoalsFormsProvider forms={goalsFormsData(data, today, demo !== null)}>
      <div className="flex flex-col gap-6">
        <PageHeader section="Goals" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={
            <>
              <RefreshButton iconOnly />
              <HeaderFormButtons />
            </>
          }
        >
          <GreetingSentence parts={summarySentence(data, today, derived)} cards={greetingView(data, today, derived)} />
          {demo !== null && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
          {orphanGoals(data).length > 0 && (
            <p role="status" className="w-fit rounded-full bg-warning-tint px-3 py-1 text-xs font-bold text-warning-text">
              {orphanGoals(data).length} part{orphanGoals(data).length === 1 ? "" : "s"} ({orphanGoals(data).map((g) => g.name).join(", ")}) {orphanGoals(data).length === 1 ? "has" : "have"} no goal to belong to, so {orphanGoals(data).length === 1 ? "it isn't" : "they aren't"} counted. Fix the Parent id in the Goals tab.
            </p>
          )}
        </PageHeader>
        <GoalsDashboard sky={skyView(data, today, derived)} side={sideView(data, today, derived)} goalSides={goalSides(data, today, derived)} widgets={goalsWidgets(data, today, derived)} attention={attentionItems(data, today)} pickIds={ids} initialPick={initialPick} />
      </div>
    </GoalsFormsProvider>
  );
}
