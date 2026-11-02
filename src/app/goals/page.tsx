import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { GoalsDashboard } from "@/components/goals/GoalsDashboard";
import { GoalsFormsProvider } from "@/components/goals/forms/GoalsForms";
import { GreetingSentence } from "@/components/goals/GreetingSentence";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { loadGoalsData } from "./loadGoalsData";
import { ALL, attentionView, goalSides, greetingView, pickIds, sideView, skyView, summarySentence } from "./views";
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
  const ids = pickIds(data, today);
  const requested = typeof params.goal === "string" ? params.goal : ALL;
  const initialPick = ids.includes(requested) ? requested : ALL;

  return (
    <GoalsFormsProvider>
      <div className="flex flex-col gap-6">
        <PageHeader section="Goals" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<RefreshButton iconOnly />}>
          <GreetingSentence parts={summarySentence(data, today)} cards={greetingView(data, today)} />
          {demo !== null && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        <GoalsDashboard sky={skyView(data, today)} side={sideView(data, today)} goalSides={goalSides(data, today)} widgets={goalsWidgets(data, today)} attention={attentionView(data, today)} pickIds={ids} initialPick={initialPick} />
      </div>
    </GoalsFormsProvider>
  );
}
