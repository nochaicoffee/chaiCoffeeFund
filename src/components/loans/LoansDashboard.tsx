"use client";

import type { CSSProperties } from "react";
import { ALL, type AttentionItem, type CoverView } from "@/app/loans/views";
import type { LoanWidgets } from "@/app/loans/widgetsView";
import { usePickInAddress } from "../usePickInAddress";
import { AnatomyCard } from "./AnatomyCard";
import { AttentionStrip } from "./AttentionStrip";
import { ClockCard } from "./ClockCard";
import { ComingUpCard } from "./ComingUpCard";
import { CostCard } from "./CostCard";
import { EmiAnatomyCard } from "./EmiAnatomyCard";
import { LoadCard } from "./LoadCard";
import { LoansCover } from "./LoansCover";
import { LoansTableCard } from "./LoansTableCard";
import { PaymentsCard } from "./PaymentsCard";
import { ScheduleCard } from "./ScheduleCard";
import { SplitCard } from "./SplitCard";
import { WhatIfCard } from "./WhatIfCard";

/** The page's accent in the picked loan's colour (LoansN1: the whole page follows the pick). All loans keeps emerald. */
function accentOf(colorKey: string): CSSProperties {
  return {
    "--accent": `var(--card-${colorKey})`,
    "--accent-tint": `color-mix(in oklch, var(--card-${colorKey}) 15%, white)`,
    "--accent-text": `color-mix(in oklch, var(--card-${colorKey}) 62%, black)`,
  } as CSSProperties;
}

/**
 * The Loans page under the greeting (docs/design/loans.md, LoansN1): the attention strip, the dark cover, then equal
 * two-up rows (as on Accounts and Income, so edges line up and cards end level) with the Loans table full width:
 * Principal and interest beside Payments; Loans; Schedule beside Coming up; Cost anatomy beside the Debt-free clock;
 * What if beside Inside an EMI; EMI load beside Cost of borrowing. One pick drives all of it, kept in the address as
 * `?loan=` (usePickInAddress).
 */
export function LoansDashboard({ cover, widgets, attention, today, initialPick, installmentsHref }: { cover: CoverView; widgets: LoanWidgets; attention: AttentionItem[]; today: string; initialPick: string; installmentsHref: Record<string, string> }) {
  const ids = cover.tiles.map((t) => t.id);
  const [pickId, choose] = usePickInAddress("loan", initialPick, ids, (id) => id === ALL);
  const tile = cover.tiles.find((t) => t.id === pickId) ?? cover.tiles[0];
  const pick = tile.id;
  const picked = pick === ALL ? null : pick;
  const allHref = installmentsHref[pick] ?? installmentsHref[ALL];
  const row = "grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2";
  const schedule = widgets.schedule[pick] ?? widgets.schedule[ALL];
  const what = widgets.whatIf[pick] ?? widgets.whatIf[ALL];
  const emi = widgets.emiAnatomy[pick] ?? widgets.emiAnatomy[ALL];

  return (
    <div className="flex flex-col gap-5" style={accentOf(tile.colorKey)}>
      <AttentionStrip items={attention} onSchedule={choose} />
      <LoansCover cover={cover} pickId={pick} onPick={choose} />
      <div className={row}>
        <SplitCard key={`split-${pick}`} split={widgets.split[pick] ?? widgets.split[ALL]} />
        <PaymentsCard card={widgets.payments[pick] ?? widgets.payments[ALL]} pickName={tile.name} picked={picked} allHref={allHref} />
      </div>
      <LoansTableCard table={widgets.table} picked={pick} onPick={choose} allHref={installmentsHref[ALL]} />
      <div className={row}>
        {schedule ? <ScheduleCard schedule={schedule} allHref={installmentsHref[schedule.loan.id] ?? allHref} /> : <div />}
        <ComingUpCard card={widgets.comingUp} picked={picked} />
      </div>
      <div className={row}>
        <AnatomyCard rows={widgets.anatomy.rows} scale={widgets.anatomy.scale} picked={picked} />
        <ClockCard clock={widgets.clock[pick] ?? widgets.clock[ALL]} picked={picked} />
      </div>
      <div className={row}>
        {what ? <WhatIfCard key={`what-${what.loan.id}`} what={what} today={today} isAll={pick === ALL} /> : <div />}
        {emi ? <EmiAnatomyCard key={`emi-${emi.loan.id}`} view={emi} /> : <div />}
      </div>
      <div className={row}>
        <LoadCard load={widgets.load[pick] ?? widgets.load[ALL]} picked={picked} />
        <CostCard cost={widgets.cost} />
      </div>
    </div>
  );
}
