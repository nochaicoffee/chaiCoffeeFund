"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { savePolicy } from "@/app/insurance/actions";
import type { FormPolicy, InsuranceFormsData } from "@/app/insurance/formsView";
import { termPreview } from "@/lib/aggregate/insurance";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readPolicyForm } from "@/lib/forms/insuranceForms";
import { POLICY_KINDS, type PolicyKind } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, TextInput, describedBy, inputClass } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { TileMark } from "../parts";
import { FormProblem, Line, NCB_OPTIONS, PreviewCard, YEAR_OPTIONS } from "./shared";

const KIND_OPTIONS = POLICY_KINDS.map((k) => ({ value: k, label: k }));
const ICON: Record<PolicyKind, "heart" | "user" | "car" | "home" | "shield"> = { Health: "heart", Life: "user", Motor: "car", Home: "home", Accident: "shield" };

/**
 * Add policy and Edit policy (InsForms 1 and 2). The kind decides the fields: a motor policy has its vehicle, its IDV and a no-claim step.
 * Adding records the first term with the policy: when the cover starts, how many years this premium buys (1 to 5), and what was paid for
 * all of it, so a premium paid once for three years is one payment. Editing changes the policy only: the terms are Renew's, and a blank
 * policy number is left as it is, since the browser only ever has the last four digits.
 */
export function PolicyFormDialog({ forms, editing, onClose, onSaved }: { forms: InsuranceFormsData; editing?: FormPolicy; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(savePolicy, IDLE);
  const [kind, setKind] = useState<PolicyKind>(editing?.kind ?? "Health");
  const [name, setName] = useState(editing?.name ?? "");
  const [insurer, setInsurer] = useState(editing?.insurer ?? "");
  const [covers, setCovers] = useState(editing?.covers ?? "");
  const [coversDetail, setCoversDetail] = useState(editing?.coversDetail ?? "");
  const [policyNumber, setPolicyNumber] = useState("");
  const [sumInsured, setSumInsured] = useState(editing ? String(editing.sumInsured || "") : "");
  const [periodStart, setPeriodStart] = useState("");
  const [years, setYears] = useState("1");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [paidFrom, setPaidFrom] = useState(editing?.paidFrom ?? "");
  const [ncb, setNcb] = useState("");
  const [addOns, setAddOns] = useState(editing?.addOns ?? "");
  const [claimsPhone, setClaimsPhone] = useState(editing?.claimsPhone ?? "");
  const [documentUrl, setDocumentUrl] = useState(editing?.documentUrl ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const motor = kind === "Motor";

  const values = { id: editing?.id ?? "", name, kind, insurer, covers, coversDetail, policyNumber, sumInsured, periodStart, years, amount, paidOn, paidFrom, ncb: motor ? ncb : "", addOns, claimsPhone, documentUrl, notes };
  const read = readPolicyForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) }, Boolean(editing));
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, editing ? `${name.trim() || editing.name} saved` : `${name.trim()} added`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // The live preview: what this term will show on the page.
  const cover = parseAmountText(sumInsured) ?? 0;
  const paid = parseAmountText(amount) ?? 0;
  const n = Number(years) || 1;
  const preview = periodStart ? termPreview({ start: periodStart, years: n, amount: paid, cover }) : null;
  const covered = Boolean(preview && paid);

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={editing ? "Edit policy" : "Add policy"}
      subtitle={editing ? `${editing.name} · ${editing.insurer}` : "Something you're insured under"}
      preview={
        <PreviewPanel caption={editing ? "Only the policy changes. Its terms and payments stay as they are." : "The term you're in is saved as its first payment, so the page can count the days left."}>
          <PreviewCard
            mark={<TileMark icon={ICON[kind]} colorKey={editing?.colorKey} size={40} />}
            title={name.trim() || "New policy"}
            sub={`${insurer.trim() || "Insurer"} · ${covers.trim() || "Covers"}`}
            big={cover ? formatInr(cover) : "₹—"}
            small={motor ? "IDV" : "sum insured"}
          />
          {!editing && (
            <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
              <Line label="Paid" value={paid ? (n > 1 ? `${formatInr(paid)} once` : `${formatInr(paid)} for the year`) : "₹—"} strong />
              <Line label="Cover" value={periodStart && preview ? `${formatDate(periodStart)} to ${formatDate(preview.end)}` : "—"} />
              <Line label="A year of it" value={covered ? formatInr(preview!.perYear) : "₹—"} />
              {covered && preview!.ratio !== null && <Line label="A year ÷ cover" value={`${(preview!.ratio * 100).toFixed(preview!.ratio < 0.01 ? 2 : 1)}%`} />}
              {motor && ncb !== "" && <Line label="No-claim bonus" value={`${ncb}%`} />}
            </dl>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">{editing ? "The policy number is only changed if you type one." : "A policy is added once, and each renewal is a new term on it."}</span>}
      primaryLabel={editing ? "Save policy" : "Add policy"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <FormProblem message={state.status === "invalid" ? state.errors.form : undefined} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Segmented name="kind" legend="Kind" required options={KIND_OPTIONS} value={kind} onChange={setKind} help="The kind decides which fields follow. Pick Motor for a car or bike." error={errors.kind} />
        </div>
        <Field id="name" label="Name" required help="The plan's name, so two policies from one insurer stay apart." error={errors.name}>
          <TextInput {...describedBy("name", errors.name, true)} data-autofocus name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} />
        </Field>
        <Field id="insurer" label="Insurer" required error={errors.insurer}>
          <TextInput {...describedBy("insurer", errors.insurer, false)} name="insurer" value={insurer} onChange={(e) => setInsurer(e.target.value)} onBlur={() => reveal("insurer")} invalid={Boolean(errors.insurer)} />
        </Field>
        <Field id="covers" label="Covers" required help="A person, a vehicle or the home. The page groups policies by this." error={errors.covers}>
          <input {...describedBy("covers", errors.covers, true)} list="insurance-covers" name="covers" value={covers} onChange={(e) => setCovers(e.target.value)} onBlur={() => reveal("covers")} autoComplete="off" placeholder="You, Car, Bike, Home" className={inputClass(Boolean(errors.covers))} />
          <datalist id="insurance-covers">
            {forms.covers.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field id="coversDetail" label={motor ? "Vehicle" : "More about it"} help={motor ? "The model, like Honda City." : undefined} error={errors.coversDetail}>
          <TextInput {...describedBy("coversDetail", errors.coversDetail, motor)} name="coversDetail" value={coversDetail} onChange={(e) => setCoversDetail(e.target.value)} invalid={Boolean(errors.coversDetail)} />
        </Field>
        <Field id="policyNumber" label="Policy number" help={editing?.policyNumber ? `Now ${editing.policyNumber}. Only the last four digits are kept on the page; leave it blank to keep the number as it is.` : "Only the last four digits are shown on the page."} error={errors.policyNumber}>
          <TextInput {...describedBy("policyNumber", errors.policyNumber, true)} name="policyNumber" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} onBlur={() => reveal("policyNumber")} invalid={Boolean(errors.policyNumber)} placeholder={editing?.policyNumber || undefined} />
        </Field>
        <Field id="sumInsured" label={motor ? "IDV" : "Sum insured"} required={!motor} help={motor ? "Insured declared value: the most paid if it's stolen or written off. Leave it blank for third party only." : "The most the policy pays in a policy year."} error={errors.sumInsured}>
          <MoneyInput {...describedBy("sumInsured", errors.sumInsured, true)} name="sumInsured" value={sumInsured} onChange={(e) => setSumInsured(e.target.value)} onBlur={() => reveal("sumInsured")} invalid={Boolean(errors.sumInsured)} />
        </Field>
        {!editing && (
          <>
            <Field id="periodStart" label="Cover starts" required help="The first day of cover, from the schedule." error={errors.periodStart}>
              <DateInput {...describedBy("periodStart", errors.periodStart, true)} label="Cover starts" name="periodStart" value={periodStart} onChange={setPeriodStart} onBlur={() => reveal("periodStart")} today={forms.today} invalid={Boolean(errors.periodStart)} />
            </Field>
            <div className="md:col-span-2">
              <Segmented name="years" legend="Cover lasts" required options={YEAR_OPTIONS} value={years} onChange={setYears} help="How long this premium buys. The renewal date is worked out from it." error={errors.years} />
            </div>
            <Field id="amount" label="Premium" required help={n > 1 ? `What you paid for all ${n} years, with GST.` : "What you paid, with GST."} error={errors.amount}>
              <MoneyInput {...describedBy("amount", errors.amount, true)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
            </Field>
            <Field id="paidOn" label="Paid on" help="If the schedule doesn't say, leave it blank: the day cover starts is used, and marked assumed." error={errors.paidOn}>
              <DateInput {...describedBy("paidOn", errors.paidOn, true)} label="Paid on" name="paidOn" value={paidOn} onChange={setPaidOn} onBlur={() => reveal("paidOn")} today={forms.today} invalid={Boolean(errors.paidOn)} />
            </Field>
            {motor && (
              <div className="md:col-span-2">
                <NcbField value={ncb} onChange={setNcb} error={errors.ncb} />
              </div>
            )}
          </>
        )}
        <div className="md:col-span-2">
          <ChargedToField name="paidFrom" label="Paid from" value={paidFrom} onChange={setPaidFrom} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Where it's usually paid from. A card's premium is counted once, as a premium." error={errors.paidFrom} />
        </div>
        <Field id="addOns" label="Add-ons and covers" className="md:col-span-2" help="Separate them with commas." error={errors.addOns}>
          <TextInput {...describedBy("addOns", errors.addOns, true)} name="addOns" value={addOns} onChange={(e) => setAddOns(e.target.value)} invalid={Boolean(errors.addOns)} />
        </Field>
        <Field id="claimsPhone" label="Claims helpline" help="So it's here when you need to claim." error={errors.claimsPhone}>
          <TextInput {...describedBy("claimsPhone", errors.claimsPhone, true)} name="claimsPhone" value={claimsPhone} onChange={(e) => setClaimsPhone(e.target.value)} invalid={Boolean(errors.claimsPhone)} />
        </Field>
        <Field id="documentUrl" label="Policy document" help="A link to the PDF." error={errors.documentUrl}>
          <TextInput {...describedBy("documentUrl", errors.documentUrl, true)} name="documentUrl" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} onBlur={() => reveal("documentUrl")} invalid={Boolean(errors.documentUrl)} placeholder="https://" />
        </Field>
        <Field id="notes" label="Notes" className="md:col-span-2" help="Waiting periods, the deductible, what it leaves out: anything to look up when claiming." error={errors.notes}>
          <textarea {...describedBy("notes", errors.notes, true)} name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass(Boolean(errors.notes))} h-auto py-2.5`} />
        </Field>
      </div>
    </FormDialog>
  );
}

/** The no-claim step on a motor term: none, or one of the steps. */
export function NcbField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <Segmented
      name="ncb"
      legend="No-claim bonus"
      options={[{ value: "", label: "None" }, ...NCB_OPTIONS]}
      value={value}
      onChange={onChange}
      help="The step on this term, from the schedule."
      error={error}
    />
  );
}
