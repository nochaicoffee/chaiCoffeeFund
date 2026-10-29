"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { cancelPolicyForm } from "@/app/insurance/actions";
import type { InsuranceFormsData } from "@/app/insurance/formsView";
import { formatInr } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readCancelForm } from "@/lib/forms/insuranceForms";
import { DateInput, Field, PreviewPanel, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CloseIcon, InfoIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { TileMark } from "../parts";
import { FormProblem, Line, PreviewCard } from "./shared";

const REASONS = ["Vehicle sold", "Replaced by another policy", "Surrendered", "No longer needed", "Other"];
const ICON = { Health: "heart", Life: "user", Motor: "car", Home: "home", Accident: "shield" } as const;

/**
 * Cancel (InsForms 5): a policy that has ended (sold, surrendered, replaced) stops renewing and counting, and keeps every payment, as a
 * cancelled subscription does. The reason is kept in the policy's notes. Restart brings it back.
 */
export function CancelDialog({ forms, policyId, onClose, onSaved }: { forms: InsuranceFormsData; policyId?: string; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(cancelPolicyForm, IDLE);
  const choices = forms.policies.filter((p) => !p.cancelled);
  const first = choices.find((p) => p.id === policyId) ?? choices[0];
  const [chosen, setChosen] = useState(first?.id ?? "");
  const [endedOn, setEndedOn] = useState(forms.today);
  const [reason, setReason] = useState("");
  const picked = choices.find((p) => p.id === chosen);

  const values = { policyId: chosen, endedOn, reason };
  const read = readCancelForm(values);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, `${picked?.name ?? "Policy"} cancelled`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const holding = picked?.yearly != null;
  return (
    <FormDialog
      icon={<CloseIcon />}
      title="Cancel policy"
      subtitle="It stops renewing and counting"
      preview={
        <PreviewPanel caption="Cancelled, sold, surrendered or replaced: the page keeps the record.">
          {picked ? (
            <>
              <PreviewCard mark={<TileMark icon={ICON[picked.kind]} colorKey={picked.colorKey} size={40} />} title={picked.name} sub={`${picked.insurer} · ${picked.covers}`} big="Stops counting" small="" />
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                {holding && <Line label="A year of cover" value={`${formatInr(forms.yearlyAll)} → ${formatInr(forms.yearlyAll - (picked.yearly ?? 0))}`} strong />}
                <Line label="Renewals" value="none to come" />
                <Line label="History" value="every payment stays" />
              </dl>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">There&apos;s no policy left to cancel.</p>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">Nothing is deleted. Restart brings it back.</span>}
      primaryLabel="Cancel policy"
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
            <SelectInput id="policyId" name="policyId" invalid={Boolean(errors.policyId)} options={choices.map((p) => ({ value: p.id, label: p.name, meta: p.insurer, swatch: { background: `var(--card-${p.colorKey})` } }))} value={chosen} onChange={setChosen} placeholder="Choose the policy" />
          </Field>
        </div>
        <Field id="endedOn" label="Cancelled on" help="The day it stopped. Leave it blank if you don't know." error={errors.endedOn}>
          <DateInput {...describedBy("endedOn", errors.endedOn, true)} data-autofocus label="Cancelled on" name="endedOn" value={endedOn} onChange={setEndedOn} onBlur={() => reveal("endedOn")} today={forms.today} invalid={Boolean(errors.endedOn)} />
        </Field>
        <Field id="reason" label="Why" error={errors.reason}>
          <SelectInput id="reason" name="reason" invalid={Boolean(errors.reason)} options={[{ value: "", label: "Not said", display: "Choose a reason", quiet: true }, ...REASONS.map((r) => ({ value: r, label: r }))]} value={reason} onChange={setReason} placeholder="Choose a reason" />
        </Field>
        <div className="flex items-start gap-2 rounded-[14px] bg-fill px-4 py-3 text-[12.5px] font-semibold text-muted md:col-span-2">
          <InfoIcon />
          <span>
            <b className="text-fg">Nothing is deleted.</b> A cancelled policy is left out of every total and its payments stay. It&apos;s shown dimmed, and Restart brings it back.
          </span>
        </div>
      </div>
    </FormDialog>
  );
}
