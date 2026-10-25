"use client";

import { ALL, type CoverView } from "@/app/income/views";
import type { IncomeWidgets } from "@/app/income/widgetsView";
import { SpendHeatmap } from "../cards/SpendHeatmap";
import { usePickInAddress } from "../usePickInAddress";
import { EntriesCard } from "./EntriesCard";
import { IncomeCover } from "./IncomeCover";
import { IncomeMapCard } from "./IncomeMapCard";

/**
 * The Income page under the greeting (#188, #189, IncomeZ1): the cover, the income heatmap, then the income map
 * beside the Entries card. One pick drives all of it, kept in the address as `?source=` (usePickInAddress), as on
 * Accounts.
 */
export function IncomeDashboard({ cover, widgets, today, initialPick }: { cover: CoverView; widgets: IncomeWidgets; today: string; initialPick: string }) {
  const [pickId, choose] = usePickInAddress("source", initialPick, cover.picks.map((p) => p.id), (id) => id === ALL);
  const pick = cover.picks.find((p) => p.id === pickId) ?? cover.picks[0];
  const heat = widgets.heatmap[pick.id] ?? widgets.heatmap[ALL];

  return (
    <div className="flex flex-col gap-5">
      <IncomeCover cover={cover} pickId={pick.id} onPick={choose} />
      <SpendHeatmap
        heading="Income heatmap"
        title={`${cover.year - 1} and ${cover.year} · ${pick.id === ALL ? "every source" : pick.label}`}
        rows={heat.rows}
        yearTotals={heat.totals}
        peak={heat.peak}
        currentMonth={today.slice(0, 7)}
        noData="No payment"
        legendNoData="No payment"
        legendUpcoming="Expected"
        empty="Nothing received yet. The heatmap fills in as income lands."
        footnote="Shaded against the biggest month shown, by the day each payment landed. Pick a source in the cover and the cells are that source's."
      />
      {/* An equal split; the cards stretch so they end level. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
        <IncomeMapCard map={widgets.map} picked={pick.id} onPick={choose} />
        <EntriesCard card={widgets.entries[pick.id] ?? widgets.entries[ALL]} pickLabel={pick.id === ALL ? "all sources" : pick.label} />
      </div>
    </div>
  );
}
