"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { renewPolicyForm } from "@/app/insurance/actions";
import type { FormPolicy, InsuranceFormsData } from "@/app/insurance/formsView";
import { gapDays, quoteChange, termPreview } from "@/lib/aggregate/insurance";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readRenewForm } from "@/lib/forms/insuranceForms";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { AlertIcon, CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { TileMark } from "../parts";
import { NcbField } from "./PolicyFormDialog";
import { FormProblem, Line, PreviewCard, YEAR_OPTIONS } from "./shared";

const ICON = { Health: "heart", Life: "user", Motor: "car", Home: "home", Accident: "shield" } as const;

/**
 * Renew (InsForms 3 and 4): the next term of a policy, pre-filled from the last one: it starts where the old one ends (or today, when it
 * ended already), runs the same years, and the cover and the account stay as they were. The insurer's quote is the only thing to type.
 * A start after the old term ended leaves a gap in cover, and the form says how many days; it's allowed, and the gap stays in the
 * policy's history. Recording the term is the renewal: the page's renewal date moves to it.
 */
export function RenewDialog({ forms, policyId, onClose, onSaved }: { forms: InsuranceFormsData; policyId?: string; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(renewPolicyForm, IDLE);
  const choices = forms.policies.filter((p) => !p.cancelled);
  const first = choices.find((p) => p.id === policyId) ?? choices[0];
  const [chosen, setChosen] = useState(first?.id ?? "");
  const [periodStart, setPeriodStart] = useState(first?.defaults?.start ?? forms.today);
  const [years, setYears] = useState(String(first?.defaults?.years ?? 1));
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [sumInsured, setSumInsured] = useState(first ? String(first.sumInsured || "") : "");
  const [ncb, setNcb] = useState(first?.defaults?.ncb !== undefined ? String(first.defaults.ncb) : "");
  const [paidFrom, setPaidFrom] = useState(first?.paidFrom ?? "");
  const picked: FormPolicy | undefined = choices.find((p) => p.id === chosen);
  const motor = picked?.kind === "Motor";

  const values = { policyId: chosen, periodStart, years, amount, paidOn, sumInsured, ncb: motor ? ncb : "", paidFrom };
  const read = readRenewForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) }, Boolean(motor));
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, `${picked?.name ?? "Policy"} renewed`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function choose(id: string) {
    const next = choices.find((p) => p.id === id);
    setChosen(id);
    // The quote and the day paid belong to one policy.
    setAmount("");
    setPaidOn("");
    if (!next) return;
    setPeriodStart(next.defaults?.start ?? forms.today);
    setYears(String(next.defaults?.years ?? 1));
    setSumInsured(String(next.sumInsured || ""));
    setNcb(next.defaults?.ncb !== undefined ? String(next.defaults.ncb) : "");
    setPaidFrom(next.paidFrom);
  }

  const n = Number(years) || 1;
  const quote = parseAmountText(amount);
  const ends = periodStart ? termPreview({ start: periodStart, years: n, amount: quote ?? 0, cover: 0 }).end : null;
  // How many days the old term had run out by the time this one starts: a gap, when it's more than none.
  const gap = picked?.renewsOn && periodStart ? gapDays(picked.renewsOn, periodStart) : 0;
  const change = quote && picked?.last ? quoteChange({ amount: quote, years: n }, picked.last) : null;

  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Renew policy"
      subtitle={picked ? `${picked.name} · ${picked.insurer}` : "The next term of a policy"}
      preview={
        <PreviewPanel caption="Saves the new term as a payment, and the policy's renewal date moves to it.">
          {picked ? (
            <>
              <PreviewCard mark={<TileMark icon={ICON[picked.kind]} colorKey={picked.colorKey} size={40} />} title={picked.name} sub={`${picked.insurer} · ${picked.covers}`} big={quote ? formatInr(quote) : "₹—"} small={n > 1 ? `for ${n} years` : "for the year"} />
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                <Line label="New term" value={periodStart && ends ? `${formatDate(periodStart)} to ${formatDate(ends)}` : "—"} strong />
                {picked.last && <Line label="Last term" value={`${formatInr(picked.last.amount)} for ${picked.last.years === 1 ? "1 year" : `${picked.last.years} years`}`} />}
                {change !== null && <Line label="Cost of a year" value={`${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change * 100).toFixed(1)}%`} />}
                {gap > 0 && <Line label="Days with no cover" value={String(gap)} />}
              </dl>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">Add a policy first, then renew it here.</p>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">You can Undo a renewal for six seconds after it&apos;s saved.</span>}
      primaryLabel="Renew"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <FormProblem message={state.status === "invalid" ? state.errors.form : undefined} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field id="policyId" label="Policy" required error={errors.policyId}>
            <SelectInput id="policyId" name="policyId" invalid={Boolean(errors.policyId)} options={choices.map((p) => ({ value: p.id, label: p.name, meta: p.insurer, swatch: { background: `var(--card-${p.colorKey})` } }))} value={chosen} onChange={choose} placeholder="Choose the policy" />
          </Field>
        </div>
        <Field id="periodStart" label="New term starts" required help={gap > 0 ? undefined : "The day the last term ends. Change it if the insurer gave a different date."} error={errors.periodStart}>
          <DateInput {...describedBy("periodStart", errors.periodStart, gap === 0)} label="New term starts" name="periodStart" value={periodStart} onChange={setPeriodStart} onBlur={() => reveal("periodStart")} today={forms.today} invalid={Boolean(errors.periodStart)} />
        </Field>
        <Field id="paidOn" label="Paid on" help="Leave it blank if you don't know: the day the term starts is used, and marked assumed." error={errors.paidOn}>
          <DateInput {...describedBy("paidOn", errors.paidOn, true)} label="Paid on" name="paidOn" value={paidOn} onChange={setPaidOn} onBlur={() => reveal("paidOn")} today={forms.today} invalid={Boolean(errors.paidOn)} />
        </Field>
        <div className="md:col-span-2">
          <Segmented name="years" legend="Cover lasts" required options={YEAR_OPTIONS} value={years} onChange={setYears} help="A multi-year renewal is one premium for all of it." error={errors.years} />
        </div>
        <Field id="amount" label="Premium" required help={picked?.last ? `The insurer's quote for the whole term. Last time: ${formatInr(picked.last.amount)}.` : "The insurer's quote for the whole term."} error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, true)} data-autofocus name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <Field id="sumInsured" label={motor ? "IDV" : "Sum insured"} help="Same as before. Change it if the cover changed." error={errors.sumInsured}>
          <MoneyInput {...describedBy("sumInsured", errors.sumInsured, true)} name="sumInsured" value={sumInsured} onChange={(e) => setSumInsured(e.target.value)} onBlur={() => reveal("sumInsured")} invalid={Boolean(errors.sumInsured)} />
        </Field>
        {motor && (
          <div className="md:col-span-2">
            <NcbField value={ncb} onChange={setNcb} error={errors.ncb} />
          </div>
        )}
        <div className="md:col-span-2">
          <ChargedToField name="paidFrom" label="Paid from" value={paidFrom} onChange={setPaidFrom} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Where this premium was paid from." error={errors.paidFrom} />
        </div>
        {gap > 0 && (
          <div className="flex items-start gap-2 rounded-[14px] bg-warning-tint px-4 py-3 text-[12.5px] font-bold text-warning-text md:col-span-2">
            <AlertIcon />
            <span>
              This renews after the term ended. The {gap === 1 ? "day" : `${gap} days`} with no cover stay{gap === 1 ? "s" : ""} on the policy&apos;s history, and the page showed it as lapsed until now.
            </span>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
