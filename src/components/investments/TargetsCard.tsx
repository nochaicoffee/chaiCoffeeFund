"use client";

import { useState } from "react";
import type { TargetRowView, TargetsView } from "@/app/investments/targetViews";
import { WidgetCard } from "../shell/WidgetCard";
import { TargetsButton } from "./TargetsButton";

/**
 * Your targets (docs/design/investments.md, Understand it): the four buckets against targets he sets, each with how far it is from its target
 * in rupees, what it would take to land on them, and where new money would go. The numbers are his; the app only does the sum, and says so.
 */
export function TargetsCard({ view }: { view: TargetsView }) {
  const [add, setAdd] = useState<string | null>(null);
  const money = view.newMoney.find((n) => n.key === add);

  return (
    <WidgetCard
      label="Your targets"
      title="Your targets"
      note="yours, not the app's"
      right={
        <div className="flex flex-wrap items-center gap-2">
          {view.anySet && (
            <div role="group" aria-label="Add new money" className="flex rounded-full bg-fill p-1">
              {view.newMoney.map((n) => (
                <button key={n.key} type="button" aria-pressed={add === n.key} onClick={() => setAdd(add === n.key ? null : n.key)} className={`min-h-8 rounded-full px-3 text-[12px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${add === n.key ? "bg-ink text-on-ink" : "text-muted hover:text-fg"}`}>
                  +{n.short}
                </button>
              ))}
            </div>
          )}
          <TargetsButton label={view.anySet ? "Change targets" : "Set your targets"} />
        </div>
      }
    >
      {!view.anySet ? (
        <p className="text-[13px] font-semibold text-muted">You haven&apos;t set any targets. Set one for a bucket and this shows how far it is from it, in rupees, and where new money would go. Nothing is set for you.</p>
      ) : (
        <div aria-live="polite" className="flex flex-col gap-1.5 text-[13px] font-extrabold">
          {money ? `Adding ${money.label}: it goes only where you're below your target, in proportion to how far below, and never sells.` : "Today: the tick is your target."}
        </div>
      )}

      <ul className="flex flex-col gap-3.5">
        {view.rows.map((r) => (
          <li key={r.bucket}>
            <Row r={r} after={money?.rows.find((m) => m.bucket === r.bucket)} />
          </li>
        ))}
      </ul>
      {view.otherNote && <p className="text-xs font-semibold text-muted">{view.otherNote}</p>}

      {view.anySet && view.moves.length > 0 && !money && (
        <div className="flex flex-col gap-2 border-t border-divider pt-3">
          <b className="text-[13px] font-extrabold">To land exactly on your targets, with no new money</b>
          <div className="flex flex-wrap gap-2">
            {view.moves.map((m) => (
              <span key={m.bucket} className={`rounded-full px-3 py-1 text-xs font-extrabold ${m.sell ? "bg-negative-tint text-negative" : "bg-accent-tint text-positive"}`}>
                {m.text} <em className="font-semibold not-italic opacity-80">{m.label}</em>
              </span>
            ))}
          </div>
          {view.sumNote && <p className="text-xs font-semibold text-muted">{view.sumNote}</p>}
        </div>
      )}
      <p className="text-xs font-semibold text-muted">The app suggests no split: these targets are numbers you set, and this only does the sum. Adding money never sells anything.</p>
    </WidgetCard>
  );
}

function Row({ r, after }: { r: TargetRowView; after?: { add: string; after: number; afterText: string } }) {
  const shown = after ? after.after : r.share;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <i aria-hidden="true" className="block size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--card-${r.colour})` }} />
        <b className="font-extrabold">{r.label}</b>
        <span className="truncate font-semibold text-muted">{r.targetText ?? "no target set"}</span>
      </div>
      <div className="text-right text-[13px]">
        <b className="font-extrabold">{after ? after.afterText : r.shareText}</b>
        <small className="ml-1.5 font-semibold text-muted">{after ? (after.add === "—" ? "no change" : after.add) : (r.drift ?? r.worth)}</small>
      </div>
      <div className="relative col-span-2 h-2.5 rounded-full bg-fill" role="img" aria-label={`${r.label}: ${after ? after.afterText : r.shareText} of what you hold${r.targetText ? `, ${r.targetText}` : ""}`}>
        <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${Math.min(100, shown * 100)}%`, background: `var(--card-${r.colour})` }} />
        {r.target !== null && <i aria-hidden="true" className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `${Math.min(100, r.target * 100)}%` }} />}
      </div>
    </div>
  );
}
