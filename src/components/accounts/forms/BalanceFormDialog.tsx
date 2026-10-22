"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveBalance } from "@/app/accounts/actions";
import type { AccountsFormsData } from "@/app/accounts/views";
import { balanceBefore, isBigDrop, sameDayBalance } from "@/lib/aggregate/accounts";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readBalanceForm } from "@/lib/forms/accountForms";
import { IDLE } from "@/lib/forms/formState";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { BankIcon } from "../../subscriptions/icons";
import { MiniAccountCard, SummaryBox } from "./MiniAccountCard";

/**
 * Update balance (docs/design/accounts.md "Forms"): what an account holds on a day. As you type,
 * the card shows the new balance and the change under it; a drop of more than a fifth asks you
 * to check it (decision 8) and never blocks the save, and a day that already has a balance
 * says it will be replaced (decision 7).
 */
export function BalanceFormDialog({ accountId, forms, onClose }: { accountId?: string; forms: AccountsFormsData; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveBalance, IDLE);
  const open = forms.accounts.filter((a) => !a.closed);
  const [id, setId] = useState(accountId ?? open[0]?.id ?? "");
  const [date, setDate] = useState(forms.today);
  const [balance, setBalance] = useState("");

  const account = forms.accounts.find((a) => a.id === id);
  const values = { accountId: id, date, balance };
  const check = readBalanceForm(values, { accountIds: forms.accounts.map((a) => a.id) }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  const next = parseAmountText(balance);
  // Compared with the balance before the chosen day, not today's: a back-dated balance sits among the older ones.
  const readings = (account?.readings ?? []).map((r) => ({ ...r, accountId: id }));
  const last = date ? (balanceBefore(readings, id, date)?.balance ?? null) : (account?.balance ?? null);
  const change = next !== null && last !== null ? next - last : null;
  const drop = next !== null && isBigDrop(last, next);
  // Only a balance on or after the latest one changes what's held today.
  const becomesLatest = !account?.latestDate || (date !== "" && date >= account.latestDate);
  const allAfter = forms.total + (becomesLatest && next !== null ? next - (account?.balance ?? 0) : 0);
  const sameDay = date !== "" && sameDayBalance(readings, id, date) !== null;

  return (
    <FormDialog
      icon={<BankIcon size={16} />}
      title="Update balance"
      subtitle={account ? account.name : "Record what an account holds"}
      preview={
        <PreviewPanel caption="A balance is saved as you type it, never worked out.">
          {account && <MiniAccountCard colorKey={account.colorKey} initial={account.initial} name={account.name} last4={account.last4 || undefined} balance={becomesLatest ? (next ?? account.balance) : account.balance} corner={account.bank} closed={account.closed} />}
          <SummaryBox
            rows={[
              { label: "Now", value: account?.balance == null ? "No balance yet" : formatInr(account.balance) },
              { label: "Change from the one before", value: change === null ? "–" : `${change >= 0 ? "+" : "−"}${formatInr(Math.abs(change))}` },
              { label: "All accounts", value: formatInr(allAfter) },
            ]}
          />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">A day with a balance already is replaced.</span>}
      primaryLabel="Save balance"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <Field id="accountId" label="Account" required error={errors.accountId}>
        <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={open.map((a) => ({ value: a.id, label: a.name, meta: a.last4 ? `•••• ${a.last4}` : undefined }))} value={id} onChange={setId} placeholder="Choose an account" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" label="Read on" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Read on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="balance" label="Balance" required error={errors.balance}>
          <MoneyInput {...describedBy("balance", errors.balance, false)} data-autofocus name="balance" value={balance} onChange={(e) => setBalance(e.target.value)} onBlur={() => reveal("balance")} invalid={Boolean(errors.balance)} />
        </Field>
      </div>
      {drop && (
        <p role="status" className="rounded-[12px] bg-warning-tint px-3.5 py-2.5 text-xs font-semibold text-warning-text">
          That&rsquo;s more than a fifth below the last balance, {formatInr(last!)}. Check it&rsquo;s right; you can still save it.
        </p>
      )}
      {sameDay && (
        <p role="status" className="rounded-[12px] bg-fill px-3.5 py-2.5 text-xs font-semibold text-muted">
          {account?.name} already has a balance for this day. Saving replaces it.
        </p>
      )}
    </FormDialog>
  );
}
