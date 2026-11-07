"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveTargets } from "@/app/investments/tradeActions";
import { IDLE } from "@/lib/forms/formState";
import { readTargetsForm, targetFieldValues } from "@/lib/forms/targetsForm";
import { LIMIT_NAMES, TARGET_NAMES, type InvestmentTarget, type InvestmentTargetName } from "@/lib/sheets/types";
import { SummaryBox } from "../accounts/forms/MiniAccountCard";
import { Field, PreviewPanel, TextInput, describedBy } from "../cards/forms/fields";
import { FormDialog } from "../cards/forms/FormDialog";
import { PlusIcon } from "../cards/forms/icons";
import { useFieldErrors } from "../cards/forms/useFieldErrors";

const TARGET_LABEL: Record<(typeof TARGET_NAMES)[number], string> = { "India-Equity": "India equity", "US-Equity": "US equity", Debt: "Debt", Gold: "Gold" };
const LIMIT_LABEL: Record<(typeof LIMIT_NAMES)[number], string> = { "One-Holding": "One holding, at most", Dollars: "Dollars, at most", "Debt-Floor": "Debt, at least", "Single-Companies": "Single companies, at most" };

/**
 * Your targets and limits (docs/design/investments.md, InvForms): eight numbers, each left blank until he sets it. They are only ever compared
 * with what he holds: the app suggests none. A blank clears one that was set.
 */
export function TargetsDialog({ saved, onClose, onSaved }: { saved: InvestmentTarget[]; onClose: () => void; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(saveTargets, IDLE);
  const [values, setValues] = useState<Record<InvestmentTargetName, string>>(() => targetFieldValues(saved));
  const check = readTargetsForm(values);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const targetTotal = TARGET_NAMES.reduce((s, n) => s + (Number(values[n].replace(/%$/, "")) || 0), 0);
  const field = (name: InvestmentTargetName, label: string) => (
    <Field key={name} id={name} label={label} error={errors[name]}>
      <TextInput {...describedBy(name, errors[name], false)} name={name} inputMode="decimal" placeholder="Not set" value={values[name]} onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))} onBlur={() => reveal(name)} invalid={Boolean(errors[name])} />
    </Field>
  );

  return (
    <FormDialog
      icon={<PlusIcon />}
      title="Your targets and limits"
      subtitle="Numbers you set, in percent of what you hold. Leave one blank and it isn't set."
      preview={
        <PreviewPanel caption="The app suggests no split and no limit: it only sets what you hold against these. A breach of your own limit isn't a call to act.">
          <SummaryBox rows={[
            { label: "Targets set", value: `${TARGET_NAMES.filter((n) => values[n].trim() !== "").length} of 4` },
            { label: "Targets add up to", value: `${Math.round(targetTotal * 100) / 100}%` },
            { label: "Limits set", value: `${LIMIT_NAMES.filter((n) => values[n].trim() !== "").length} of 4` },
          ]} />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">They are kept in the InvestmentTargets tab of your Sheet.</span>}
      primaryLabel="Save"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {state.status === "invalid" && state.errors.form && <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">{state.errors.form}</p>}
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-extrabold">Your targets <span className="font-semibold text-muted">· how you&apos;d like it split: together at most 100%, and exactly 100% once all four are set</span></legend>
          <div className="grid gap-x-3.5 gap-y-3 md:grid-cols-2">{TARGET_NAMES.map((n) => field(n, TARGET_LABEL[n]))}</div>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-extrabold">Your limits <span className="font-semibold text-muted">· the most or least you&apos;d want</span></legend>
          <div className="grid gap-x-3.5 gap-y-3 md:grid-cols-2">{LIMIT_NAMES.map((n) => field(n, LIMIT_LABEL[n]))}</div>
        </fieldset>
      </div>
    </FormDialog>
  );
}
