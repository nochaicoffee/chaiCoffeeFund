"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveBigSpend } from "@/app/expenses/actions";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readBigSpendForm } from "@/lib/forms/expenseForms";
import { IDLE } from "@/lib/forms/formState";
import { BIG_SPEND_CATEGORIES, type BigSpend } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import type { ColorKey } from "@/lib/format/colors";

export interface ExpenseFormsData {
  today: string;
  spends: BigSpend[];
  accounts: { id: string; name: string; inactive?: boolean }[];
  cards: { id: string; name: string; color: ColorKey; inactive?: boolean }[];
}

const CATEGORY_OPTIONS = BIG_SPEND_CATEGORIES.map((c) => ({ value: c, label: c }));

const paidFromValue = (s?: BigSpend) => (s?.paidFromCardId ? `card:${s.paidFromCardId}` : s?.paidFromAccountId ? `account:${s.paidFromAccountId}` : "");

/**
 * Add or edit a big spend (docs/design/expenses.md, "Big spends"). It explains a month and never adds to it, which the preview says: one on a card
 * counts in the month its bill is paid, one from a bank account in its own month, inside cash and UPI.
 */
export function BigSpendDialog({ forms, spend, onClose, onSaved, onDelete }: { forms: ExpenseFormsData; spend?: BigSpend; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveBigSpend, IDLE);
  const [name, setName] = useState(spend?.name ?? "");
  const [date, setDate] = useState(spend?.date ?? forms.today);
  const [amount, setAmount] = useState(spend ? String(spend.amount) : "");
  const [category, setCategory] = useState<string>(spend?.category ?? "");
  const [paidFrom, setPaidFrom] = useState(paidFromValue(spend));
  const [note, setNote] = useState(spend?.note ?? "");

  const values = { name, date, amount, category, paidFrom, note };
  const read = readBigSpendForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cost = parseAmountText(amount);
  const onCard = paidFrom.startsWith("card:");
  const where = onCard ? "It's already inside that card's bill, so it counts in the month the bill is paid." : paidFrom ? "It's already inside the month's cash and UPI, so it counts in the month you bought it." : "Say what paid for it, so the page can put it in the right month.";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={spend ? "Edit big spend" : "Add a big spend"}
      subtitle="A large purchase, so a month can say what made it high."
      preview={
        <PreviewPanel caption="A big spend explains a month; it never adds to what was spent.">
          <div className="flex flex-col gap-2 text-sm">
            <b className="text-[22px] font-extrabold tabular-nums">{cost ? formatInr(cost) : "₹—"}</b>
            <p className="text-xs font-semibold text-muted">{where}</p>
          </div>
        </PreviewPanel>
      }
      footerNote={
        spend && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete this big spend
          </button>
        ) : (
          <span className="max-md:hidden">You can edit or delete it from Big spends.</span>
        )
      }
      primaryLabel={spend ? "Save" : "Add big spend"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {spend && <input type="hidden" name="id" value={spend.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="name" label="What it was" required error={errors.name} className="md:col-span-2">
          <TextInput {...describedBy("name", errors.name, false)} data-autofocus name="name" value={name} placeholder="Flights home" onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} />
        </Field>
        <Field id="date" label="Bought on" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Bought on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="amount" label="Amount" required error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, false)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <Field id="category" label="Category" required error={errors.category}>
          <SelectInput id="category" name="category" invalid={Boolean(errors.category)} options={CATEGORY_OPTIONS} value={category} onChange={setCategory} onBlur={() => reveal("category")} placeholder="Choose one" />
        </Field>
        <Field id="note" label="Note" error={errors.note}>
          <TextInput {...describedBy("note", errors.note, false)} name="note" value={note} onChange={(e) => setNote(e.target.value)} invalid={Boolean(errors.note)} />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField name="paidFrom" label="Paid from" value={paidFrom} onChange={setPaidFrom} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Optional. The card it was charged to, or the account it left." error={errors.paidFrom} />
        </div>
      </div>
    </FormDialog>
  );
}
