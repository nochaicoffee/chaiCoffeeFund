"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveAccount } from "@/app/accounts/actions";
import type { AccountsFormsData, FormAccount } from "@/app/accounts/views";
import { cardColorKey } from "@/lib/format/subscriptionLabels";
import { optionLabel } from "@/lib/format/labels";
import { ACCOUNT_PURPOSES, ACCOUNT_TYPES, readAccountForm } from "@/lib/forms/accountForms";
import { IDLE } from "@/lib/forms/formState";
import { parseAmountText } from "@/lib/format/money";
import { CARD_COLORS, type CardColor } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { MiniAccountCard } from "./MiniAccountCard";

/** The first colour no open account has, so a new account starts apart from the others; it can still be picked. */
function freeColor(accounts: FormAccount[]): CardColor {
  return CARD_COLORS.find((c) => !accounts.some((a) => !a.closed && a.color === c)) ?? "Sapphire";
}

/**
 * Add account, and Edit account when given one (docs/design/accounts.md "Forms"): the account's
 * card is the live preview. Add has an optional balance today, saved as its first balance.
 */
export function AccountFormDialog({ account, forms, onClose }: { account?: FormAccount; forms: AccountsFormsData; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveAccount, IDLE);
  const editing = Boolean(account);
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState(account?.bank ?? "");
  const [accountType, setType] = useState<string>(account?.accountType ?? "Savings");
  const [purpose, setPurpose] = useState<string>(account?.purpose ?? "Spending");
  const [startDate, setStartDate] = useState(account?.startDate ?? "");
  const [color, setColor] = useState<string>(account?.color ?? freeColor(forms.accounts));
  const [last4, setLast4] = useState(account?.last4 ?? "");
  const [balance, setBalance] = useState("");

  const values = { name, bank, accountType, purpose, startDate, color, last4, balance };
  const check = readAccountForm(values, editing);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  const opening = parseAmountText(balance);

  return (
    <FormDialog
      icon={<span className="text-sm font-extrabold">+</span>}
      title={editing ? "Edit account" : "Add account"}
      subtitle={editing ? account!.name : "A bank account and, if you like, what it holds today"}
      preview={
        <PreviewPanel>
          <MiniAccountCard colorKey={cardColorKey(color as CardColor)} initial={bank.trim()[0]?.toUpperCase() ?? ""} name={name} last4={last4.length === 4 ? last4 : undefined} balance={editing ? account!.balance : opening} />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">{editing ? "Balances stay as they are." : "Saved as its first balance, dated today."}</span>}
      primaryLabel={editing ? "Save changes" : "Add account"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {account && <input type="hidden" name="id" value={account.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          <TextInput {...describedBy("name", errors.name, false)} data-autofocus name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} placeholder="HDFC Salary" />
        </Field>
        <Field id="bank" label="Bank" required error={errors.bank}>
          <TextInput {...describedBy("bank", errors.bank, false)} name="bank" value={bank} onChange={(e) => setBank(e.target.value)} onBlur={() => reveal("bank")} invalid={Boolean(errors.bank)} placeholder="HDFC Bank" />
        </Field>
        <Field id="accountType" label="Type" required error={errors.accountType}>
          <SelectInput id="accountType" name="accountType" invalid={Boolean(errors.accountType)} options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))} value={accountType} onChange={setType} />
        </Field>
        <Field id="startDate" label="Opened on" required error={errors.startDate}>
          <DateInput {...describedBy("startDate", errors.startDate, false)} label="Opened on" name="startDate" value={startDate} onChange={setStartDate} onBlur={() => reveal("startDate")} today={forms.today} invalid={Boolean(errors.startDate)} />
        </Field>
        <Field id="purpose" label="Purpose" required error={errors.purpose}>
          <SelectInput id="purpose" name="purpose" invalid={Boolean(errors.purpose)} options={ACCOUNT_PURPOSES.map((p) => ({ value: p, label: optionLabel(p) }))} value={purpose} onChange={setPurpose} />
        </Field>
        <Field id="color" label="Colour" required error={errors.color}>
          <SelectInput id="color" name="color" invalid={Boolean(errors.color)} options={CARD_COLORS.map((c) => ({ value: c, label: c }))} value={color} onChange={setColor} />
        </Field>
        <Field id="last4" label="Last 4 digits" help="Optional. Never the full number." error={errors.last4}>
          <TextInput {...describedBy("last4", errors.last4, true)} name="last4" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} onBlur={() => reveal("last4")} invalid={Boolean(errors.last4)} placeholder="4821" />
        </Field>
        {!editing && (
          <Field id="balance" label="Balance today" help="Optional." error={errors.balance}>
            <MoneyInput {...describedBy("balance", errors.balance, true)} name="balance" value={balance} onChange={(e) => setBalance(e.target.value)} onBlur={() => reveal("balance")} invalid={Boolean(errors.balance)} />
          </Field>
        )}
      </div>
    </FormDialog>
  );
}
