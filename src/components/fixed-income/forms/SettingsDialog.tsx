"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveEpfSettings } from "@/app/fixed-income/epfFormActions";
import type { EpfFormsData } from "@/app/fixed-income/epfFormsData";
import { readSettingsForm } from "@/lib/forms/epfForms";
import { IDLE } from "@/lib/forms/formState";
import { formatInr } from "@/lib/format/money";
import { Field, MoneyInput, PreviewPanel, Segmented, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";

const SOURCES = [
  { value: "Assumed", label: "Assumed" },
  { value: "Declared", label: "Declared" },
] as const;

const WHERE: Record<string, string> = { Implied: "worked back from the interest EPFO credited", Assumed: "the latest known rate, until EPFO declares it", Declared: "declared by EPFO" };

/**
 * EPF settings (FiForms): the rate for each year that isn't credited yet, and the monthly credit the growth path uses. A credited
 * year's rate is read from its own interest and can't be set. A rate he has been told, such as 8.5%, is entered as Declared.
 */
export function SettingsDialog({ forms, onClose, onSaved }: { forms: EpfFormsData; onClose: () => void; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(saveEpfSettings, IDLE);
  const accountId = forms.accounts[0]?.id ?? "";
  const account = forms.accounts.find((a) => a.id === accountId);
  const editable = (account?.years ?? []).filter((y) => y.editable);
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries((forms.accounts[0]?.years ?? []).filter((y) => y.editable).map((y) => [y.financialYear, y.entered ? String(y.entered.ratePercent) : ""])));
  const [sources, setSources] = useState<Record<string, string>>(() => Object.fromEntries((forms.accounts[0]?.years ?? []).filter((y) => y.editable).map((y) => [y.financialYear, y.entered?.source ?? "Assumed"])));
  const [credit, setCredit] = useState(account?.projectionCredit !== undefined ? String(account.projectionCredit) : "");

  const values: Record<string, string> = { epfAccountId: accountId, projectionCredit: credit, ...Object.fromEntries(editable.flatMap((y) => [[`rate:${y.financialYear}`, rates[y.financialYear] ?? ""], [`source:${y.financialYear}`, sources[y.financialYear] ?? "Assumed"]])) };
  const check = readSettingsForm(values, { accountIds: forms.accounts.map((a) => a.id), editableYears: editable.map((y) => y.financialYear) });
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

  return (
    <FormDialog
      icon={<PlusIcon />}
      title="EPF settings"
      subtitle="The rate for each year, and the monthly credit the growth path uses."
      preview={
        <PreviewPanel caption="Only the estimates use these. Credited interest is never changed.">
          <SummaryBox rows={[{ label: "Balance today", value: formatInr(account?.balance ?? 0) }, { label: "Monthly credit", value: credit ? formatInr(Number(credit.replace(/[^\d.]/g, "")) || 0) : "the last one" }]} />
          <p className="text-xs font-medium text-muted">A passbook doesn&apos;t print the rate, so a year already credited shows the rate its interest <b>implies</b>. This year is <b>assumed</b> to be the latest known rate until EPFO declares it. If you&apos;ve seen it announced, set it and mark it <b>declared</b>.</p>
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">Only the estimates use these.</span>}
      primaryLabel="Save"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="epfAccountId" value={accountId} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Rate for each year</span>
        {(account?.years ?? []).map((y) =>
          y.editable ? (
            <div key={y.financialYear} className="flex flex-col gap-2 rounded-[14px] border border-surface-line p-3">
              <Field id={`rate-${y.financialYear}`} label={`FY ${y.financialYear}`} error={errors[`rate:${y.financialYear}`]} help={y.ratePercent !== null && !y.entered ? `${y.ratePercent}% is used now (${WHERE[y.source ?? "Assumed"]}). Type one to replace it, or leave blank.` : "Leave blank to go back to the latest known rate."}>
                <TextInput {...describedBy(`rate-${y.financialYear}`, errors[`rate:${y.financialYear}`], true)} inputMode="decimal" name={`rate:${y.financialYear}`} placeholder={y.ratePercent !== null ? String(y.ratePercent) : "8.25"} value={rates[y.financialYear] ?? ""} onChange={(e) => setRates({ ...rates, [y.financialYear]: e.target.value })} onBlur={() => reveal(`rate:${y.financialYear}`)} invalid={Boolean(errors[`rate:${y.financialYear}`])} />
              </Field>
              <Segmented name={`source:${y.financialYear}`} legend="It is" options={SOURCES} value={(sources[y.financialYear] ?? "Assumed") as "Assumed" | "Declared"} onChange={(v) => setSources({ ...sources, [y.financialYear]: v })} error={errors[`source:${y.financialYear}`]} />
            </div>
          ) : (
            <div key={y.financialYear} className="flex flex-col gap-0.5 rounded-[14px] bg-fill px-3.5 py-2.5 text-sm md:flex-row md:items-center md:justify-between md:gap-3">
              <b className="font-extrabold whitespace-nowrap">FY {y.financialYear}</b>
              <span className="text-xs text-muted">
                {y.ratePercent !== null ? `${y.ratePercent}%` : "—"} · {y.source?.toLowerCase()} · {WHERE[y.source ?? "Implied"]}
              </span>
            </div>
          ),
        )}
      </div>
      <Field id="projectionCredit" label="Monthly credit for the growth path" help="Both shares together. Blank uses the last credit." error={errors.projectionCredit}>
        <MoneyInput {...describedBy("projectionCredit", errors.projectionCredit, true)} name="projectionCredit" value={credit} onChange={(e) => setCredit(e.target.value)} onBlur={() => reveal("projectionCredit")} invalid={Boolean(errors.projectionCredit)} />
      </Field>
    </FormDialog>
  );
}
