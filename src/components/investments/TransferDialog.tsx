"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveTransfer } from "@/app/investments/tradeActions";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readTransferForm, transferMoney, type TransferAccounts, type TransferDirection } from "@/lib/forms/transferForm";
import type { Transfer } from "@/lib/sheets/types";
import { SummaryBox } from "../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../cards/forms/fields";
import { FormDialog } from "../cards/forms/FormDialog";
import { PlusIcon } from "../cards/forms/icons";
import { useFieldErrors } from "../cards/forms/useFieldErrors";

const SYMBOL = { INR: "₹", USD: "$" } as const;

/**
 * Add a transfer: money moved between a bank account and a Brokerage account, either way. Accounts counts the bank's side only (sent is
 * Invested, back is Taken back), so recording one here is what keeps a month's cash and UPI honest. A US broker's dollars are asked for
 * apart from the rupees, so one is never counted as the other.
 */
export function TransferDialog({ accounts: all, today, transfer, onClose, onSaved, onDelete }: { accounts: TransferAccounts | null; today: string; transfer?: Transfer; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveTransfer, IDLE);
  // A closed account is offered only to the transfer that already uses it.
  const mine = transfer ? [transfer.fromAccountId, transfer.toAccountId] : [];
  const accounts: TransferAccounts = all
    ? { banks: all.banks.filter((a) => !a.closed || mine.includes(a.id)), brokers: all.brokers.filter((a) => !a.closed || mine.includes(a.id)) }
    : { banks: [], brokers: [] };
  const savedBroker = transfer ? accounts.brokers.find((a) => a.id === transfer.fromAccountId || a.id === transfer.toAccountId) : undefined;
  const savedBank = transfer ? accounts.banks.find((a) => a.id === transfer.fromAccountId || a.id === transfer.toAccountId) : undefined;
  const [direction, setDirection] = useState<TransferDirection>(transfer && savedBroker?.id === transfer.fromAccountId ? "back" : "out");
  const [bank, setBank] = useState(savedBank?.id ?? (accounts.banks.length === 1 ? accounts.banks[0].id : ""));
  const [broker, setBroker] = useState(savedBroker?.id ?? (accounts.brokers.length === 1 ? accounts.brokers[0].id : ""));
  const [date, setDate] = useState(transfer?.date ?? today);
  const [amount, setAmount] = useState(transfer ? String(transfer.amount) : "");
  const [received, setReceived] = useState(transfer?.receivedAmount === undefined ? "" : String(transfer.receivedAmount));
  const [reference, setReference] = useState(transfer?.reference ?? "");

  const brokerAccount = accounts.brokers.find((a) => a.id === broker);
  const bankAccount = accounts.banks.find((a) => a.id === bank);
  const money = transferMoney(direction, brokerAccount);
  const different = money.left !== money.arrived;

  const values: Record<string, string> = { direction, bank, broker, date, amount, receivedAmount: different ? received : "", reference };
  // The server also checks the reference against what is saved; this is the part the form can tell by itself.
  const check = readTransferForm(values, { accounts, transfers: [], today, ...(transfer && { editing: transfer }) });
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

  const from = direction === "out" ? bankAccount?.name : brokerAccount?.name;
  const to = direction === "out" ? brokerAccount?.name : bankAccount?.name;
  const shown = check.ok ? check.input : null;
  return (
    <FormDialog
      icon={<PlusIcon />}
      title={transfer ? "Edit this transfer" : "Add a transfer"}
      subtitle={transfer ? `${formatDate(transfer.date)} · ${from ?? "a bank account"} and ${to ?? "a broker"}` : "Money you moved between a bank account and a broker, either way."}
      preview={
        <PreviewPanel caption={direction === "out" ? "Money sent to a broker counts as Invested on Accounts." : "Money a broker sent back counts as Taken back on Accounts: it is investing in reverse, never income."}>
          <SummaryBox rows={[
            { label: "From", value: from ?? "—" },
            { label: "To", value: to ?? "—" },
            { label: "Left", value: shown ? formatMoney(money.left, shown.amount) : "—" },
            ...(different ? [{ label: "Arrived", value: shown?.receivedAmount ? formatMoney(money.arrived, shown.receivedAmount) : "—" }] : []),
          ]} />
        </PreviewPanel>
      }
      footerNote={onDelete ? <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">Delete transfer</button> : <span className="max-md:hidden">It is added to the Transfers tab of your Sheet.</span>}
      primaryLabel={transfer ? "Save changes" : "Add transfer"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {!all && <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">Your accounts couldn&apos;t be read just now. Close this and refresh the page.</p>}
      {transfer && <input type="hidden" name="id" value={transfer.id} />}
      {state.status === "invalid" && state.errors.form && <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">{state.errors.form}</p>}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Segmented name="direction" legend="Which way" required options={[{ value: "out", label: "Sent to a broker" }, { value: "back", label: "Back from a broker" }]} value={direction} onChange={setDirection} />
        </div>
        <Field id="bank" label="Bank account" required error={errors.bank}>
          <SelectInput id="bank" name="bank" invalid={Boolean(errors.bank)} placeholder="Choose" options={accounts.banks.map((a) => ({ value: a.id, label: a.name }))} value={bank} onChange={setBank} onBlur={() => reveal("bank")} />
        </Field>
        <Field id="broker" label="Broker" required error={errors.broker}>
          <SelectInput id="broker" name="broker" invalid={Boolean(errors.broker)} placeholder="Choose" options={accounts.brokers.map((a) => ({ value: a.id, label: `${a.name}${a.currency === "USD" ? " (dollars)" : ""}` }))} value={broker} onChange={setBroker} onBlur={() => reveal("broker")} />
        </Field>
        <Field id="date" label="Date" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} data-autofocus label="Date" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="amount" label={money.left === "USD" ? "Amount sent, in dollars" : "Amount that left"} required error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, false)} symbol={SYMBOL[money.left]} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        {different && (
          <Field id="receivedAmount" label={money.arrived === "USD" ? "Dollars that arrived" : "Rupees that arrived"} required error={errors.receivedAmount} help="Different money, so it is asked for apart: read it off the broker's statement.">
            <MoneyInput {...describedBy("receivedAmount", errors.receivedAmount, true)} symbol={SYMBOL[money.arrived]} name="receivedAmount" value={received} onChange={(e) => setReceived(e.target.value)} onBlur={() => reveal("receivedAmount")} invalid={Boolean(errors.receivedAmount)} />
          </Field>
        )}
        <Field id="reference" label="Reference" error={errors.reference} help="The broker's or bank's reference, if you have it. It stops the same transfer being added twice.">
          <TextInput {...describedBy("reference", errors.reference, true)} name="reference" value={reference} onChange={(e) => setReference(e.target.value)} onBlur={() => reveal("reference")} invalid={Boolean(errors.reference)} />
        </Field>
      </div>
    </FormDialog>
  );
}
