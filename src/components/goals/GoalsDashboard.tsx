"use client";

import { ALL, type AttentionItem, type GoalSideView, type SideView, type SkyView } from "@/app/goals/views";
import type { GoalsWidgets } from "@/app/goals/widgetsView";
import { usePickInAddress } from "../usePickInAddress";
import { AttentionStrip } from "./AttentionStrip";
import { OrbitCard } from "./OrbitCard";
import { AffordCard, ComingUpCard, FinishedCard, GoalsTableCard, MonthCard, NeedsWantsCard, SetAsidesCard, StairCard } from "./GoalsWidgets";

/**
 * The Goals page under the greeting (docs/design/goals.md, GoalsFinal): the attention strip, the Orbit card, then the widgets in 12-column rows so
 * side-by-side cards end level. One pick drives the page, kept in the address as `?goal=` (usePickInAddress); the orbit dims the other planets and the
 * side opens that goal, and the table, Coming up and Set aside lately dim the rest.
 */
export function GoalsDashboard({ sky, side, goalSides, widgets, attention, pickIds, initialPick }: { sky: SkyView; side: SideView; goalSides: Record<string, GoalSideView>; widgets: GoalsWidgets; attention: AttentionItem[]; pickIds: string[]; initialPick: string }) {
  const [pick, choose] = usePickInAddress("goal", initialPick, pickIds, (id) => id === ALL);
  const row = "grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12";
  return (
    <div className="flex flex-col gap-5">
      <AttentionStrip items={attention} onSee={(id) => { choose(id); document.getElementById("orbit")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
      <div id="orbit">
        <OrbitCard sky={sky} side={side} goalSides={goalSides} pick={pick} onPick={choose} />
      </div>
      <GoalsTableCard rows={widgets.table} pick={pick} onPick={choose} />
      <MonthCard view={widgets.month} />
      <div className={row}>
        <div className="xl:col-span-6">
          <ComingUpCard rows={widgets.comingUp} pick={pick} onPick={choose} />
        </div>
        <div className="xl:col-span-6">
          <AffordCard view={widgets.afford} />
        </div>
      </div>
      <StairCard view={widgets.stair} />
      <div className={row}>
        <div className="xl:col-span-6">
          <NeedsWantsCard view={widgets.needsWants} />
        </div>
        <div className="xl:col-span-6">
          <SetAsidesCard rows={widgets.setAsides} onPick={choose} />
        </div>
      </div>
      <FinishedCard rows={widgets.finished} />
    </div>
  );
}
