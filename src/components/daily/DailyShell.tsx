"use client";

import "./daily.css";
import { useCallback, useMemo, useOptimistic, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { deleteDailySpend, saveDailySpend, undoAddedSpend } from "@/app/daily/actions";
import { dailyModel, defaultSelectedDay, METHOD_NAMES, type CategoryView } from "@/app/daily/views";
import { clearFailure, failureMessage, pendingId, pendingSpend, recordFailure, type FailedAdd } from "@/lib/daily/pendingAdds";
import { cardColorKey } from "@/lib/format/colors";
import { formatDate } from "@/lib/format/date";
import { formatInr, formatInrExact } from "@/lib/format/money";
import { readDailySpendForm, type DailySpendInput } from "@/lib/forms/dailySpendForms";
import { IDLE, type FormState } from "@/lib/forms/formState";
import { DAILY_SPEND_METHODS, type DailyBudget, type DailyCategory, type DailyCategoryLimit, type DailySpend, type DailySpendMethod } from "@/lib/sheets/types";
import { AlertIcon, CheckIcon } from "../cards/forms/icons";
import { useUndoToast } from "../shell/UndoToast";
import { ConfirmDialog } from "../subscriptions/forms/ConfirmDialog";
import { DailyProvider, useDaily } from "./context";
import { LimitForm } from "./LimitSheet";
import { ManageCategories } from "./ManageCategories";
import { OftenRow } from "./OftenRow";
import { Sheet } from "./Sheet";
import { SpendForm } from "./SpendForm";

type Open = { kind: "add"; draft: { date: string; amount: string; method: DailySpendMethod }; fromBar: boolean } | { kind: "edit"; id: string } | { kind: "delete"; id: string } | { kind: "limit" };

/** What the page was asked for and what the Sheet holds: the shell works every figure out from this plus any spend still being saved. */
export interface DailyRaw {
  spends: DailySpend[];
  budgets: DailyBudget[];
  categoryLimits: DailyCategoryLimit[];
  categoryRows: DailyCategory[];
  today: string;
  month?: string;
  period?: string;
}

const toFormData = (input: DailySpendInput) => {
  const data = new FormData();
  data.set("date", input.date);
  data.set("amount", String(input.amount));
  data.set("method", input.method);
  if (input.category) data.set("category", input.category);
  if (input.note) data.set("note", input.note);
  return data;
};

/**
 * The Daily page's client shell (docs/design/daily.md): it holds the Sheet's rows and works every figure on the page out from them, so a spend added here
 * shows on the calendar, in the totals, the strip and the widgets the moment it's added, while the save to the Sheet finishes in the background (a save
 * that fails leaves the entry on its day, marked, with Retry). It also holds the selected day, the add, edit, limit and Manage sheets, the toast with Undo,
 * and the quick-add bar pinned to the foot of a phone.
 */
export function DailyShell({ raw, children }: { raw: DailyRaw; children: ReactNode }) {
  const [spends, addOptimistic] = useOptimistic(raw.spends, (list: DailySpend[], spend: DailySpend) => [...list, spend]);
  const model = useMemo(() => dailyModel({ spends, budgets: raw.budgets, categoryLimits: raw.categoryLimits, categoryRows: raw.categoryRows, today: raw.today, month: raw.month, period: raw.period }), [spends, raw.budgets, raw.categoryLimits, raw.categoryRows, raw.today, raw.month, raw.period]);
  const { today } = raw;
  const [selected, setSelected] = useState(() => defaultSelectedDay(model));
  // Moving to another month starts on its default day; anything still being saved, or failed, stays.
  const [shownMonth, setShownMonth] = useState(raw.month);
  if (shownMonth !== raw.month) {
    setShownMonth(raw.month);
    setSelected(defaultSelectedDay(model));
  }
  const [open, setOpen] = useState<Open | null>(null);
  // Manage sits on top of whatever is open (a half-typed spend, say), so opening it from the add sheet loses nothing.
  const [managing, setManaging] = useState(false);
  const [added, setAdded] = useState<CategoryView[]>([]);
  const [failed, setFailed] = useState<FailedAdd[]>([]);
  const counter = useRef(0);
  const [, startTransition] = useTransition();
  const { saved, fail, view } = useUndoToast(undoAddedSpend);
  const close = () => setOpen(null);
  // The phone's quick-add bar empties after each add: a new key remounts it, whether the add came from the bar or from the sheet it handed its amount to.
  const [barKey, setBarKey] = useState(0);
  const emptyBar = () => setBarKey((n) => n + 1);
  const spend = open && "id" in open ? model.spends.find((s) => s.id === open.id) : undefined;
  const categories: CategoryView[] = useMemo(() => model.categories.map((c) => ({ id: c.id, name: c.name, colorKey: cardColorKey(c.color), hidden: c.hidden, builtIn: c.builtIn })), [model.categories]);

  const addSpend = useCallback(
    (input: DailySpendInput, retryId?: string) => {
      const id = retryId ?? pendingId(++counter.current);
      startTransition(async () => {
        addOptimistic(pendingSpend(id, input));
        let result: FormState | "unreachable";
        try {
          result = await saveDailySpend(IDLE, toFormData(input));
        } catch {
          result = "unreachable";
        }
        if (result !== "unreachable" && result.status === "saved") {
          setFailed((list) => clearFailure(list, id));
          saved(result.undo, "Spend added.");
          return;
        }
        // Kept, with what was typed, in a notice at the top of the page (whichever day he's looking at), and said again in a toast.
        setFailed((list) => recordFailure(list, { id, input, message: failureMessage(result) }));
        fail(`${formatInrExact(input.amount)} wasn't saved. See the notice at the top.`);
      });
    },
    [addOptimistic, saved, fail],
  );
  const retry = useCallback(
    (id: string) => {
      const item = failed.find((f) => f.id === id);
      if (!item) return;
      setFailed((list) => clearFailure(list, id));
      addSpend(item.input, id);
    },
    [failed, addSpend],
  );
  const dismiss = useCallback((id: string) => setFailed((list) => clearFailure(list, id)), []);

  const value = useMemo(
    () => ({
      today,
      model,
      periodParam: raw.period,
      categories,
      selected,
      setSelected,
      addSpend,
      failed,
      retry,
      dismiss,
      openAdd: (draft?: { date?: string; amount?: string; method?: DailySpendMethod; fromBar?: boolean }) => setOpen({ kind: "add", draft: { date: draft?.date ?? (selected > today ? today : selected), amount: draft?.amount ?? "", method: draft?.method ?? "UPI" }, fromBar: draft?.fromBar ?? false }),
      openEdit: (id: string) => setOpen({ kind: "edit", id }),
      openManage: () => setManaging(true),
      openLimit: () => setOpen({ kind: "limit" }),
      saved,
      addedCategories: added,
      noteCategory: (c: CategoryView) => setAdded((list) => (list.some((x) => x.id === c.id) ? list : [...list, c])),
    }),
    [today, model, raw.period, categories, selected, addSpend, failed, retry, dismiss, saved, added],
  );

  return (
    <DailyProvider value={value}>
      <div className="dy">{children}</div>
      <QuickBar key={barKey} onAdded={emptyBar} />
      {open?.kind === "add" && (
        <Sheet title="Add a spend" subtitle="What you spent, and how you paid. A rough diary, nothing more." onClose={close}>
          {/* The sheet took the bar's amount over, so once it's added the bar empties too; a sheet opened from the calendar leaves what's typed in the bar alone. */}
          <SpendForm variant="sheet" draft={{ ...open.draft, category: "", note: "" }} onAdded={() => { if (open.fromBar) emptyBar(); close(); }} />
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
        <Sheet title="Limits" subtitle="The most you want to spend in a month, and optionally in each category." onClose={close}>
          <LimitForm month={model.current.month} current={model.limit} onSaved={() => { saved(undefined, "Limit saved."); close(); }} />
        </Sheet>
      )}
      {view}
    </DailyProvider>
  );
}

/** The bar pinned to the foot of a phone: the amount, UPI or card, a chevron for the rest, and the add button. It adds to today. */
function QuickBar({ onAdded }: { onAdded: () => void }) {
  const daily = useDaily();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<DailySpendMethod>("UPI");
  const [error, setError] = useState<string>();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const read = readDailySpendForm({ date: daily.today, amount, method }, { categoryIds: [] }, daily.today);
    if (!read.ok) return setError(read.errors.amount ?? read.errors.method ?? read.errors.date);
    // It's on the calendar and in every total at once; the save to the Sheet finishes in the background.
    daily.addSpend(read.input);
    onAdded();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="dy-qbar" aria-label="Quick add">
      <OftenRow variant="bar" date={daily.today} />
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
          <input name="amount" inputMode="decimal" autoComplete="off" placeholder="Amount" value={amount} onChange={(e) => { setAmount(e.target.value); setError(undefined); }} />
        </label>
        <div className="seg3" role="radiogroup" aria-label="Paid with">
          {DAILY_SPEND_METHODS.map((m) => (
            <label key={m}>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
              <span>{m}</span>
            </label>
          ))}
        </div>
        <button type="button" className="qb-more" aria-label={`More: day, category and note (${METHOD_NAMES[method]})`} onClick={() => daily.openAdd({ date: daily.today, amount, method, fromBar: true })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15" /></svg>
        </button>
        <button type="submit" className="qb-add" aria-label="Add spend" disabled={amount.trim() === ""}>
          <CheckIcon />
        </button>
      </div>
    </form>
  );
}
