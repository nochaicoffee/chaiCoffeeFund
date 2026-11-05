"use client";

import { useState } from "react";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { creditKey, INTEREST_KEY, totalOf } from "@/lib/epfStatement/importPlan";
import type { AccountChoice, ImportPlan, PlannedCredit, Resolution, ReviewEdits } from "@/lib/epfStatement/importPlan";
import type { PassbookCredit } from "@/lib/epfStatement/index";
import { missingWageMonths, suggestedRow, wageMonthLabel } from "@/lib/epfStatement/reviewView";
import type { EpfAccount } from "@/lib/sheets/types";
import { inputClass } from "../cards/forms/fields";

/** The review's body: the account, every row (fixable in place), the conflicts, the typed credits the file contradicts, the interest. */

export interface ReviewState {
  edits: ReviewEdits;
  choice: AccountChoice | null;
  resolutions: Record<string, Resolution>;
  contradicted: Record<string, "keep" | "remove">;
}

const TAG = "rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap";
const SMALL = "min-h-8 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

function Tag({ credit, added }: { credit: PlannedCredit; added: boolean }) {
  if (credit.source === "Typed") return <span className={`${TAG} bg-warning-tint text-warning-text`}>{added ? "added by you" : "changed by you"}</span>;
  if (credit.status === "same") return <span className={`${TAG} bg-fill text-muted`}>already there</span>;
  if (credit.status === "replaces-typed") return <span className={`${TAG} bg-accent-tint text-accent-text`}>replaces your typed one</span>;
  if (credit.status === "conflict") return <span className={`${TAG} bg-warning-tint text-warning-text`}>conflict</span>;
  return null;
}

/** Two choices, as radio buttons so the arrow keys work. */
function Choice<T extends string>({ name, value, onChange, options, label }: { name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <fieldset className="flex rounded-full bg-fill p-[3px]" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="relative flex-1">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer absolute inset-0 cursor-pointer opacity-0" />
          <span className="flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold whitespace-nowrap text-muted peer-checked:bg-surface peer-checked:text-accent-text peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent">{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** One row's figures as inputs. Shared by "fix this row" and "add the missing row". */
function RowEditor({ initial, months, fixedMonth, hasPension, onSave, onCancel, saveLabel }: { initial: PassbookCredit; months?: string[]; fixedMonth?: boolean; hasPension: boolean; onSave: (c: PassbookCredit) => void; onCancel: () => void; saveLabel: string }) {
  const [wageMonth, setWageMonth] = useState(initial.wageMonth);
  const [date, setDate] = useState(initial.date);
  const [employee, setEmployee] = useState(String(initial.employee));
  const [employer, setEmployer] = useState(String(initial.employer));
  const [pension, setPension] = useState(String(initial.pension));
  const amounts = [parseAmountText(employee), parseAmountText(employer), hasPension ? parseAmountText(pension) : 0];
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && amounts.every((a) => a !== null && Number.isInteger(a) && a >= 0);
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-dashed border-surface-line p-3.5">
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <label className="flex flex-col gap-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Wage month
          {fixedMonth ? (
            <span className="flex h-10 items-center text-sm font-semibold tracking-normal text-fg normal-case">{wageMonthLabel(wageMonth)}</span>
          ) : (
            <select value={wageMonth} onChange={(e) => setWageMonth(e.target.value)} className={inputClass(false)}>
              {months?.map((m) => <option key={m} value={m}>{wageMonthLabel(m)}</option>)}
            </select>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Credited on
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass(!/^\d{4}-\d{2}-\d{2}$/.test(date))} />
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Employee ₹
          <input inputMode="numeric" value={employee} onChange={(e) => setEmployee(e.target.value)} className={inputClass(amounts[0] === null)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Employer ₹
          <input inputMode="numeric" value={employer} onChange={(e) => setEmployer(e.target.value)} className={inputClass(amounts[1] === null)} />
        </label>
        {hasPension && (
          <label className="flex flex-col gap-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
            Pension ₹
            <input inputMode="numeric" value={pension} onChange={(e) => setPension(e.target.value)} className={inputClass(amounts[2] === null)} />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={!valid} onClick={() => onSave({ wageMonth, date, employee: amounts[0]!, employer: amounts[1]!, pension: hasPension ? amounts[2]! : 0 })} className="min-h-8 rounded-full bg-ink px-4 text-xs font-bold text-on-ink hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent">
          {saveLabel}
        </button>
        <button type="button" onClick={onCancel} className={SMALL}>Cancel</button>
      </div>
    </div>
  );
}

export function EpfReview({ plan, state, setState, accounts }: { plan: ImportPlan; state: ReviewState; setState: (next: ReviewState) => void; accounts: EpfAccount[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [changingAccount, setChangingAccount] = useState(false);
  const hasPension = plan.passbook.credits.some((c) => c.pension !== 0) || plan.passbook.printedContributions.pension !== 0;
  const added = new Set(state.edits.added.map((c) => c.wageMonth));
  const suggestion = suggestedRow(plan);
  const conflicts = plan.credits.filter((c) => c.status === "conflict");
  const rule = plan.interest.rule;
  const chooser = !plan.choice || changingAccount || plan.match.kind !== "match";
  const selected = state.choice?.kind === "new" ? "new" : (state.choice?.kind === "existing" ? state.choice.id : plan.account?.id ?? "");

  const setEdits = (edits: ReviewEdits) => setState({ ...state, edits });
  const saveRow = (c: PassbookCredit, isAdded: boolean) => {
    const original = plan.passbook.credits.find((x) => x.wageMonth === c.wageMonth);
    if (isAdded) setEdits({ ...state.edits, added: [...state.edits.added.filter((a) => a.wageMonth !== c.wageMonth), c] });
    else if (original) setEdits({ ...state.edits, changed: { ...state.edits.changed, [c.wageMonth]: { date: c.date, employee: c.employee, employer: c.employer, pension: c.pension } } });
    setEditing(null);
    setAdding(false);
  };
  const revert = (wageMonth: string) => {
    const changed = Object.fromEntries(Object.entries(state.edits.changed).filter(([month]) => month !== wageMonth));
    setEdits({ changed, added: state.edits.added.filter((a) => a.wageMonth !== wageMonth) });
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {plan.blockers.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-[14px] bg-negative-tint px-4 py-3 text-xs font-semibold text-negative">
          {plan.blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}

      <section aria-label="Account" className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Account</h3>
        {chooser ? (
          <div className="flex flex-col gap-2">
            <select aria-label="Which EPF account" value={selected} onChange={(e) => setState({ ...state, choice: e.target.value === "new" ? { kind: "new", name: plan.passbook.establishment ?? "" } : e.target.value ? { kind: "existing", id: e.target.value } : null })} className={inputClass(!plan.choice)}>
              <option value="">Which account is this?</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.memberIdLast4 ? ` · ends ${a.memberIdLast4}` : ""}</option>)}
              <option value="new">A new account…</option>
            </select>
            {state.choice?.kind === "new" && <input aria-label="Name of the new account" placeholder="Name it, such as your employer" value={state.choice.name} onChange={(e) => setState({ ...state, choice: { kind: "new", name: e.target.value } })} className={inputClass(!state.choice.name.trim())} />}
            <p className="text-[11px] font-medium text-muted">{plan.passbook.memberIdLast4 ? `This passbook's member ID ends ${plan.passbook.memberIdLast4}. Only those four characters are kept, to match the next one.` : "This passbook doesn't print a member ID."}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-fill px-3.5 py-3 text-sm">
            <span><b className="font-extrabold">{plan.account?.name}</b> <span className="text-muted">· matched by the member ID ending {plan.passbook.memberIdLast4}</span></span>
            <button type="button" onClick={() => setChangingAccount(true)} className={SMALL}>Change</button>
          </div>
        )}
      </section>

      <section aria-label="Rows" className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Every credit in the file · {plan.passbook.credits.length}</h3>
        <ul className="flex flex-col divide-y divide-divider rounded-[14px] border border-surface-line">
          {plan.credits.map((row) => {
            const c = row.credit;
            const isEditing = editing === c.wageMonth;
            return (
              <li key={c.wageMonth} className="flex flex-col gap-2 px-3.5 py-2.5">
                <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-3 text-sm max-md:grid-cols-2 max-md:gap-y-1">
                  <span className="flex flex-wrap items-center gap-2 font-bold max-md:order-1">{wageMonthLabel(c.wageMonth)} <Tag credit={row} added={added.has(c.wageMonth)} /></span>
                  <span className="text-muted tabular-nums max-md:order-3">{formatShortDate(c.date)}</span>
                  <span className="text-right tabular-nums max-md:order-4"><span className="block font-semibold">{formatInr(totalOf(c))}</span><span className="block text-[11px] font-medium whitespace-nowrap text-muted">{formatInr(c.employee)} + {formatInr(c.employer)}{hasPension ? ` + ${formatInr(c.pension)}` : ""}</span></span>
                  <button type="button" onClick={() => setEditing(isEditing ? null : c.wageMonth)} aria-label={`Fix ${wageMonthLabel(c.wageMonth)}`} className={`${SMALL} max-md:order-2 max-md:justify-self-end`}>Fix</button>
                </div>
                {isEditing && (
                  <RowEditor initial={c} fixedMonth hasPension={hasPension} saveLabel="Use these" onSave={(next) => saveRow(next, added.has(c.wageMonth))} onCancel={() => setEditing(null)} />
                )}
                {isEditing && (state.edits.changed[c.wageMonth] || added.has(c.wageMonth)) && (
                  <button type="button" onClick={() => revert(c.wageMonth)} className="self-start text-xs font-bold text-negative underline">{added.has(c.wageMonth) ? "Remove this row" : "Put back what the file says"}</button>
                )}
              </li>
            );
          })}
        </ul>
        {suggestion && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={`${SMALL} self-start`}>
            + Add a missing row{!plan.checks.passes ? ` (${wageMonthLabel(suggestion.wageMonth)})` : ""}
          </button>
        )}
        {adding && suggestion && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium text-muted">The amounts are filled in from the gap the checks found; change them only if your passbook says otherwise. A row you add is saved as typed, marked less certain, until a passbook that has it is imported.</p>
            <RowEditor initial={suggestion} months={missingWageMonths(plan.passbook)} hasPension={hasPension} saveLabel="Add row" onSave={(next) => saveRow(next, true)} onCancel={() => setAdding(false)} />
          </div>
        )}
      </section>

      {conflicts.length > 0 && (
        <section aria-label="Conflicts" className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold tracking-[0.04em] text-warning-text uppercase">Already there, with a different day or amount</h3>
          {conflicts.map((row) => (
            <div key={row.credit.wageMonth} className="flex flex-col gap-2 rounded-[14px] bg-warning-tint/50 px-3.5 py-3 text-xs">
              <p><b>{wageMonthLabel(row.credit.wageMonth)}</b>: in the app {formatInr(totalOf(row.existing!))} on {formatDate(row.existing!.date)}{row.existing!.source === "Typed" ? " (typed)" : ""}; in this file {formatInr(totalOf(row.credit))} on {formatDate(row.credit.date)}.</p>
              <Choice name={`res-${row.credit.wageMonth}`} label={`Which to keep for ${wageMonthLabel(row.credit.wageMonth)}`} value={row.resolution!} onChange={(v) => setState({ ...state, resolutions: { ...state.resolutions, [creditKey(row.credit.wageMonth)]: v } })} options={[{ value: "passbook", label: row.source === "Typed" ? "What I entered" : "The file's" }, { value: "mine", label: "The one in the app" }]} />
            </div>
          ))}
        </section>
      )}

      {plan.contradicted.length > 0 && (
        <section aria-label="Typed credits the file doesn't have" className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold tracking-[0.04em] text-warning-text uppercase">You typed these, and the file doesn&apos;t have them</h3>
          {plan.contradicted.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-warning-tint/50 px-3.5 py-3 text-xs">
              <span><b>{wageMonthLabel(e.wageMonth ?? "")}</b>: {formatInr(totalOf(e))} on {formatDate(e.date)}</span>
              <Choice name={`keep-${e.id}`} label="Keep or remove" value={state.contradicted[e.id] ?? "keep"} onChange={(v) => setState({ ...state, contradicted: { ...state.contradicted, [e.id]: v } })} options={[{ value: "keep", label: "Keep" }, { value: "remove", label: "Remove" }]} />
            </div>
          ))}
        </section>
      )}

      {plan.passbook.interest && (
        <section aria-label="Interest" className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Interest credited</h3>
          <div className="flex flex-col gap-2 rounded-[14px] bg-fill px-3.5 py-3 text-sm">
            <span><b className="font-extrabold">{formatInr(totalOf(plan.passbook.interest))}</b> on {formatDate(plan.passbook.interest.date)} <span className="text-muted">({formatInr(plan.passbook.interest.employee)} + {formatInr(plan.passbook.interest.employer)})</span></span>
            {rule && <span className="text-xs text-muted">The rule at {rule.ratePercent}% ({rule.source.toLowerCase()}) gives {formatInr(rule.ruleGives.total)}{rule.impliedRatePercent !== null ? `; what was credited works out to ${rule.impliedRatePercent}%` : ""}. The credited figure is what is kept.</span>}
            {plan.interest.status === "same" && <span className="text-xs font-semibold text-muted">Already recorded.</span>}
            {plan.interest.status === "replaces-typed" && <span className="text-xs font-semibold text-muted">You typed this figure; it becomes the passbook&apos;s.</span>}
            {plan.interest.status === "conflict" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs">In the app: {formatInr(totalOf(plan.interest.existing!))} on {formatDate(plan.interest.existing!.date)}.</span>
                <Choice name="res-interest" label="Which interest to keep" value={plan.interest.resolution!} onChange={(v) => setState({ ...state, resolutions: { ...state.resolutions, [INTEREST_KEY]: v } })} options={[{ value: "passbook", label: "The file's" }, { value: "mine", label: "The one in the app" }]} />
              </div>
            )}
          </div>
        </section>
      )}

      {plan.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-[14px] bg-warning-tint px-4 py-3 text-xs font-semibold text-warning-text">
          {plan.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
