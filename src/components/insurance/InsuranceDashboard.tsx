"use client";

import { ALL, insuranceHref, type AttentionItem, type CoverView } from "@/app/insurance/views";
import type { InsuranceWidgets } from "@/app/insurance/widgetsView";
import { usePickInAddress } from "../usePickInAddress";
import { AttentionStrip } from "./AttentionStrip";
import { ComingUpCard } from "./ComingUpCard";
import { CostCard } from "./CostCard";
import { CoverMap } from "./CoverMap";
import { DetailsCard } from "./DetailsCard";
import { NcbCard } from "./NcbCard";
import { PaymentsCard } from "./PaymentsCard";
import { PoliciesTableCard } from "./PoliciesTableCard";
import { RunwayCard } from "./RunwayCard";
import { TimelineCard } from "./TimelineCard";

/**
 * The Insurance page under the greeting (docs/design/insurance.md, InsFinal): the attention strip, the cover map, then the widgets
 * in 12-column rows so side-by-side cards end level: the runway (7) beside Coming up (5); the policies table; Premiums paid beside
 * Policy details; the timeline (7) beside the no-claim bonus (5, or the timeline alone with no motor policy); What cover costs.
 * One pick drives the page, kept in the address as `?policy=` (usePickInAddress); Premiums paid and Policy details follow it.
 */
export function InsuranceDashboard({ cover, widgets, attention, initialPick, demo }: { cover: CoverView; widgets: InsuranceWidgets; attention: AttentionItem[]; initialPick: string; demo: string | null }) {
  const [pickId, choose] = usePickInAddress("policy", initialPick, cover.picks, (id) => id === ALL);
  const picked = pickId === ALL ? null : (widgets.table.rows.find((r) => r.id === pickId) ?? null);
  const row = "grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12";
  return (
    <div className="flex flex-col gap-5">
      <AttentionStrip items={attention} onSee={choose} />
      <CoverMap cover={cover} pickId={pickId} onPick={choose} />
      <div className={row}>
        <div className="xl:col-span-7">
          <RunwayCard view={widgets.runway} />
        </div>
        <div className="xl:col-span-5">
          <ComingUpCard card={widgets.comingUp} picked={pickId} onPick={choose} />
        </div>
      </div>
      <PoliciesTableCard table={widgets.table} pickId={pickId} onPick={choose} />
      <div className={row}>
        <div className="xl:col-span-6">
          <PaymentsCard view={widgets.payments[pickId] ?? widgets.payments[ALL]} pickName={picked?.name ?? ""} picked={picked !== null} allHref={insuranceHref("/insurance/payments", { demo, policy: pickId })} />
        </div>
        <div className="xl:col-span-6">
          <DetailsCard view={widgets.details[pickId] ?? widgets.details[ALL]} />
        </div>
      </div>
      <div className={row}>
        <div className={widgets.ncb ? "xl:col-span-7" : "xl:col-span-12"}>
          <TimelineCard view={widgets.timeline} pickId={pickId} onPick={choose} />
        </div>
        {widgets.ncb && (
          <div className="xl:col-span-5">
            <NcbCard view={widgets.ncb} />
          </div>
        )}
      </div>
      {widgets.cost && <CostCard view={widgets.cost} />}
    </div>
  );
}
