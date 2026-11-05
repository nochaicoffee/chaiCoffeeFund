"use client";

import type { ReactNode } from "react";
import { DOORS, DOOR_COLOR, type AttentionItem, type Door, type DoorId, type StageView } from "@/app/fixed-income/views";
import { colorGradient } from "@/lib/format/colors";
import { usePickInAddress } from "../usePickInAddress";
import { AddEpfStatementButton } from "./AddEpfStatementButton";
import { AttentionStrip } from "./AttentionStrip";
import { BuiltUpChart, DepositsChart, EpfChart } from "./charts";
import { useDepositForms } from "./forms/DepositForms";
import { useEpfForms } from "./forms/EpfForms";

/**
 * The Fixed Income page under the greeting (docs/design/fixed-income.md, J1): the attention strip, the three doors (Everything, EPF,
 * Fixed deposits) and the stage the picked door opens, which takes the door's colour. The pick is kept in the address as `?door=`.
 * What goes under the stage is passed in as children.
 */
export function FixedIncomeDashboard({ doors, stages, attention, initialPick, children }: { doors: Door[]; stages: Record<DoorId, StageView>; attention: AttentionItem[]; initialPick: DoorId; children?: ReactNode }) {
  const [pick, choose] = usePickInAddress("door", initialPick, DOORS, (id) => id === "all");
  const stage = stages[pick as DoorId] ?? stages.all;
  return (
    <div className="flex flex-col gap-5">
      <AttentionStrip items={attention} />
      <div role="group" aria-label="What to look at" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {doors.map((door) => {
          const on = stage.id === door.id;
          return (
            <button
              key={door.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(door.id)}
              className={`flex min-h-[104px] flex-col justify-between rounded-[20px] p-4 text-left text-on-card transition-[transform,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-5 ${on ? "scale-[1.015] shadow-[0_0_0_3px_var(--surface),0_0_0_5px_currentColor]" : "opacity-95 hover:opacity-100"}`}
              style={{ background: colorGradient(doorColor(door.id)) }}
            >
              <span className="text-[13px] font-extrabold">{door.label}</span>
              <span>
                <b className="block text-[26px] leading-none font-extrabold tabular-nums">{door.total}</b>
                <span className="mt-1 block text-[11px] font-semibold text-on-card-muted">{door.sub}</span>
              </span>
              <i className="mt-2 block h-1 rounded-full bg-on-card-line" aria-hidden="true">
                <i className="block h-full rounded-full bg-on-card" style={{ width: `${Math.round(door.fraction * 100)}%` }} />
              </i>
            </button>
          );
        })}
      </div>
      <Stage stage={stage} />
      {children}
    </div>
  );
}

const doorColor = (id: DoorId) => DOOR_COLOR[id];

function Stage({ stage }: { stage: StageView }) {
  const epf = useEpfForms();
  const deposits = useDepositForms();
  return (
    <section aria-label={stage.title} className="grid gap-6 rounded-[26px] p-5 text-on-card md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-7" style={{ background: colorGradient(doorColor(stage.id)) }}>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">{stage.eyebrow}</p>
          <h2 className="mt-1 text-[26px] font-extrabold">{stage.title}</h2>
        </div>
        <p className="flex items-baseline gap-1.5 leading-none" aria-label={`${stage.big.amount}${stage.big.unit}`}>
          <span className="text-3xl font-bold text-on-card-muted">₹</span>
          <span className={`font-extrabold tabular-nums ${stage.big.amount.length >= 6 ? "text-[48px] max-md:text-[40px]" : "text-[72px] max-md:text-[56px]"}`}>{stage.big.amount}</span>
          <span className="text-3xl font-bold text-on-card-muted">{stage.big.unit}</span>
        </p>
        <p className="text-[13px] font-semibold text-on-card-muted">{stage.caption}</p>
        {stage.chips.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {stage.chips.map((chip) => (
              <li key={chip} className="rounded-full bg-on-card-fill px-3 py-1 text-xs font-bold">
                {chip}
              </li>
            ))}
          </ul>
        )}
        <dl className="grid grid-cols-2 gap-2.5">
          {stage.tiles.map((tile) => (
            <div key={tile.label} className="rounded-[14px] bg-on-card-fill p-3.5">
              <dt className="text-[10px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">{tile.label}</dt>
              <dd className={`mt-1 text-xl font-extrabold tabular-nums max-md:text-lg ${/^[₹≈]/.test(tile.value) ? "whitespace-nowrap" : ""}`}>{tile.value}</dd>
              <dd className="mt-0.5 text-[11px] font-medium text-on-card-muted">{tile.note}</dd>
            </div>
          ))}
        </dl>
        {stage.id === "epf" && (
          <div className="flex flex-wrap gap-2">
            <AddEpfStatementButton />
            {(
              [
                ["Add a contribution", "contribution"],
                ["Add what EPFO credited", "credited"],
                ["EPF settings", "settings"],
              ] as const
            ).map(([label, kind]) => (
              <button key={kind} type="button" aria-disabled={epf.disabledReason ? true : undefined} title={epf.disabledReason} onClick={() => epf.open({ kind })} className={`min-h-10 rounded-full bg-on-card-fill px-4 text-[13px] font-bold hover:bg-on-card-line focus-visible:outline-2 focus-visible:outline-on-card ${epf.disabledReason ? "cursor-not-allowed opacity-60" : ""}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {stage.id === "fd" && (
          <div>
            <button type="button" onClick={() => deposits.open({ kind: "add" })} className="min-h-10 rounded-full bg-on-card px-4 text-[13px] font-bold text-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-on-card">
              Add a deposit
            </button>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-3 rounded-[20px] bg-on-card-line p-4 md:p-5">
        {stage.chart ? (
          <>
            <div>
              <ChartTitle id={stage.id} />
              {stage.chart.kind === "built" && <BuiltUpChart points={stage.chart.points} />}
              {stage.chart.kind === "epf" && <EpfChart bars={stage.chart.bars} />}
              {stage.chart.kind === "deposits" && <DepositsChart bars={stage.chart.bars} today={stage.chart.today} />}
            </div>
            <p className="text-xs font-medium text-on-card-muted">{stage.chart.note}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-on-card-muted">Nothing to draw yet.</p>
        )}
      </div>
    </section>
  );
}

function ChartTitle({ id }: { id: DoorId }) {
  const title = { all: "What you've built up, since your first contribution", epf: "What went in each month, and each March's interest", fd: "The deposits across time" }[id];
  const key = { all: "white is EPF, amber is the deposits", epf: "white is contributions, amber is interest credited", fd: "bars fill as each deposit runs its term" }[id];
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="text-[13px] font-extrabold">{title}</h3>
      <span className="text-[11px] font-semibold text-on-card-faint">{key}</span>
    </div>
  );
}
