"use client";

import "./daily.css";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { deleteDailySpend, saveDailySpend, undoAddedSpend } from "@/app/daily/actions";
import { METHOD_NAMES, type CategoryView } from "@/app/daily/views";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { DAILY_SPEND_METHODS, type DailySpendMethod } from "@/lib/sheets/types";
import { AlertIcon, CheckIcon } from "../cards/forms/icons";
import { useUndoToast } from "../shell/UndoToast";
import { ConfirmDialog } from "../subscriptions/forms/ConfirmDialog";
import { DailyProvider, useDaily, type EditableSpend } from "./context";
import { LimitForm } from "./LimitSheet";
import { ManageCategories } from "./ManageCategories";
import { Sheet } from "./Sheet";
import { SpendForm } from "./SpendForm";

type Open = { kind: "add"; draft: { date: string; amount: string; method: DailySpendMethod } } | { kind: "edit"; id: string } | { kind: "delete"; id: string } | { kind: "limit" };

/**
 * The Daily page's client shell: which day is selected, the add, edit, limit and Manage sheets, the toast with Undo for a spend just added, and the quick-add
 * bar pinned to the foot of a phone. Everything the page draws sits inside it, so the calendar, the strip and the sheets share it.
 */
export function DailyShell({ today, categories, spends, currentMonth, limit, defaultSelected, children }: { today: string; categories: CategoryView[]; spends: EditableSpend[]; currentMonth: string; limit: number | null; defaultSelected: string; children: ReactNode }) {
  const [selected, setSelected] = useState(defaultSelected);
  const [open, setOpen] = useState<Open | null>(null);
  // Manage sits on top of whatever is open (a half-typed spend, say), so opening it from the add sheet loses nothing.
  const [managing, setManaging] = useState(false);
  const [added, setAdded] = useState<CategoryView[]>([]);
  const { saved, view } = useUndoToast(undoAddedSpend);
  const close = () => setOpen(null);
  const spend = open && "id" in open ? spends.find((s) => s.id === open.id) : undefined;

  const value = {
    today,
    categories,
    selected,
    setSelected,
    openAdd: (draft?: { date?: string; amount?: string; method?: DailySpendMethod }) => setOpen({ kind: "add", draft: { date: draft?.date ?? (selected > today ? today : selected), amount: draft?.amount ?? "", method: draft?.method ?? "UPI" } }),
    openEdit: (id: string) => setOpen({ kind: "edit", id }),
    openManage: () => setManaging(true),
    openLimit: () => setOpen({ kind: "limit" }),
    saved,
    addedCategories: added,
    noteCategory: (c: CategoryView) => setAdded((list) => (list.some((x) => x.id === c.id) ? list : [...list, c])),
  };

  return (
    <DailyProvider value={value}>
      <div className="dy">{children}</div>
      <QuickBar />
      {open?.kind === "add" && (
        <Sheet title="Add a spend" subtitle="What you spent, and how you paid. A rough diary, nothing more." onClose={close}>
          <SpendForm variant="sheet" draft={{ ...open.draft, category: "", note: "" }} onSaved={(s) => { saved(s.status === "saved" ? s.undo : undefined, "Spend added."); close(); }} />
        </Sheet>
      )}
      {open?.kind === "edit" && spend && (
        <Sheet title="Edit spend" onClose={close}>
          <SpendForm
            variant="sheet"
            editing={spend}
            draft={{ date: spend.date, amount: String(spend.amount), method: spend.method, category: spend.category ?? "", note: spend.note ?? "" }}
            onSaved={() => { saved(undefined, "Saved."); close(); }}
            footer={
              <button type="button" onClick={() => setOpen({ kind: "delete", id: spend.id })} className="self-center text-[13px] font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                Delete this spend
              </button>
            }
          />
        </Sheet>
      )}
      {open?.kind === "delete" && spend && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this spend?"
          body={`${spend.note ?? "This spend"} (${formatInr(spend.amount)}, ${formatDate(spend.date)}) is removed from the Sheet, and that can't be undone.`}
          hidden={{ id: spend.id }}
          keepLabel="Keep it"
          confirmLabel="Delete spend"
          action={deleteDailySpend}
          today={today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
        />
      )}
      {managing && (
        <Sheet title="Manage categories" subtitle="Rename, recolour or hide. Nothing is deleted." onClose={() => setManaging(false)}>
          <ManageCategories />
        </Sheet>
      )}
      {open?.kind === "limit" && (
        <Sheet title="Monthly limit" subtitle="The most you want to spend in a month." onClose={close}>
          <LimitForm month={currentMonth} current={limit} onSaved={() => { saved(undefined, "Limit saved."); close(); }} />
        </Sheet>
      )}
      {view}
    </DailyProvider>
  );
}

/** The bar pinned to the foot of a phone: the amount, UPI or card, a chevron for the rest, and the add button. It adds to today. */
function QuickBar() {
  // The bar empties after each add: a new key remounts it.
  const [added, setAdded] = useState(0);
  return <QuickBarForm key={added} onAdded={() => setAdded((n) => n + 1)} />;
}

function QuickBarForm({ onAdded }: { onAdded: () => void }) {
  const daily = useDaily();
  const [state, formAction, pending] = useActionState(saveDailySpend, IDLE);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<DailySpendMethod>("UPI");
  useEffect(() => {
    if (state.status !== "saved") return;
    daily.saved(state.undo, "Spend added.");
    onAdded();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const error = state.status === "invalid" ? (state.errors.amount ?? state.errors.form) : state.status === "failed" ? (state.message ?? "Couldn't save. Try again.") : undefined;
  return (
    <form action={formAction} className="dy-qbar" aria-label="Quick add">
      <input type="hidden" name="date" value={daily.today} />
      <p className="qb-hint">
        Adds to <b>today</b> · {formatDate(daily.today)}
      </p>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="qb-row">
        <label className={`qb-amt${amount ? "" : " empty"}`}>
          <span className="sr-only">Amount</span>
          <em>₹</em>
          <input name="amount" inputMode="decimal" autoComplete="off" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="seg3" role="radiogroup" aria-label="Paid with">
          {DAILY_SPEND_METHODS.map((m) => (
            <label key={m}>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
              <span>{m === "UPI" ? "UPI" : "Card"}</span>
            </label>
          ))}
        </div>
        <button type="button" className="qb-more" aria-label={`More: day, category and note (${METHOD_NAMES[method]})`} onClick={() => daily.openAdd({ date: daily.today, amount, method })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15" /></svg>
        </button>
        <button type="submit" className="qb-add" aria-label="Add spend" disabled={pending || amount.trim() === ""}>
          <CheckIcon />
        </button>
      </div>
    </form>
  );
}
