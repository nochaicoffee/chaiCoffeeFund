"use client";

import type { SettledPart } from "@/app/goals/views";
import { CloseIcon, MenuAction, RowMenu } from "../RowMenu";
import { CheckIcon } from "../cards/forms/icons";
import { useGoalsForms } from "./forms/GoalsForms";

/**
 * A part that was bought or dropped, dimmed under its goal's live parts: what it was, when, and what it cost, with Reopen or Restore and Delete in
 * its menu. A bought part has left the goal's total, so this is where it's still found (the Finished card lists every bought goal).
 */
export function SettledPartRow({ part }: { part: SettledPart }) {
  const { open } = useGoalsForms();
  const bought = part.state === "bought";
  return (
    <div className="flex items-center gap-3 opacity-70">
      <span aria-hidden="true" className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-fill-strong text-muted">
        {bought ? <CheckIcon /> : <CloseIcon />}
      </span>
      <div className="min-w-0 flex-1">
        <b className={`block truncate text-[12.5px] font-extrabold ${bought ? "" : "line-through"}`}>{part.name}</b>
        <small className="block truncate text-[11px] font-semibold text-muted">{part.line}</small>
      </div>
      <b className="text-[12.5px] font-extrabold tabular-nums">{part.amount}</b>
      <span className="text-fg">
        <RowMenu triggerLabel={`More for ${part.name}`} menuLabel={`${part.name} actions`}>
          <MenuAction icon={<CheckIcon />} label={bought ? "Reopen" : "Restore"} onSelect={() => open({ kind: bought ? "reopen" : "restore", goalId: part.goalId })} />
          <MenuAction icon={<CloseIcon />} label="Delete" danger onSelect={() => open({ kind: "delete", goalId: part.goalId })} />
        </RowMenu>
      </span>
    </div>
  );
}
