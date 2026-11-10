"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { rateFor, saveEspp, saveTrade, saveVest } from "@/app/investments/tradeActions";
import type { TradeFormsData } from "@/app/investments/tradeFormsData";
import { cashAfterTrade } from "@/lib/aggregate/brokerCash";
import { SOURCES, sourceMix } from "@/lib/aggregate/sourceMix";
import { SOURCE_LABEL } from "@/lib/aggregate/investmentSplit";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { IDLE, type FormState } from "@/lib/forms/formState";
import { heldOn, holdingKey, readEsppForm, readTradeForm, readVestForm, type TradeFormContext } from "@/lib/forms/tradeForms";
import type { InvestmentTransaction } from "@/lib/sheets/types";
import { SummaryBox } from "../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../cards/forms/fields";
import { FormDialog } from "../cards/forms/FormDialog";
import { PlusIcon } from "../cards/forms/icons";
import { useFieldErrors } from "../cards/forms/useFieldErrors";

type Saved = (undo?: { id: string; message: string }) => void;
interface Common {
  forms: TradeFormsData;
  onClose: () => void;
  onSaved: Saved;
  onDelete?: () => void;
}

const quantityText = (n: number) => String(Math.round(n * 1e6) / 1e6);
const fixed = (n: number | undefined) => (n === undefined ? "" : quantityText(n));

/** What the three dialogs share: the holding, its brokerage account and, for a US holding, the dollar rate on the day (prefilled from Frankfurter until he types one). */
function useHoldingFields(forms: TradeFormsData, initial: { holding?: string; account?: string; rate?: string; day: string }) {
  const marketOf = (key: string) => forms.instruments.find((i) => holdingKey(i.market, i.symbol) === key)?.market;
  const offered = (key: string) => forms.brokerAccounts.filter((a) => !a.closed && (!marketOf(key) || a.currency === (marketOf(key) === "US" ? "USD" : "INR")));
  /** The account he last used for a holding (a new trade of it is most likely there too), else the only one in its currency. */
  const likely = (key: string) => {
    const last = forms.trades.filter((t) => holdingKey(t.market, t.symbol) === key && t.settlementAccountId).sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1))[0]?.settlementAccountId;
    const open = offered(key);
    return last && open.some((a) => a.id === last) ? last : open.length === 1 ? open[0].id : "";
  };
  const [holding, setHoldingState] = useState(initial.holding ?? "");
  const [account, setAccountState] = useState(initial.account ?? (initial.holding ? likely(initial.holding) : ""));
  const accountTouched = useRef(Boolean(initial.account));
  const setHolding = (key: string) => {
    setHoldingState(key);
    if (!accountTouched.current) setAccountState(likely(key));
  };
  const setAccount = (value: string) => {
    accountTouched.current = true;
    setAccountState(value);
  };
  const [rate, setRate] = useState(initial.rate ?? "");
  const [rateNote, setRateNote] = useState<string | null>(null);
  const typed = useRef(false);
  const market = forms.instruments.find((i) => holdingKey(i.market, i.symbol) === holding)?.market;
  const instrument = forms.instruments.find((i) => holdingKey(i.market, i.symbol) === holding);

  /**
   * Keeps the rate for the day: fetched when the day or holding changes, unless he typed one. An edit opens with the rate the trade has, for
   * the day it has, so that is left alone until the day is changed (a rate for the old day would be a wrong cost for the new one).
   */
  const rateDay = useRef<string | null>(initial.rate ? initial.day : null);
  useEffect(() => {
    if (market !== "US" || typed.current || rateDay.current === initial.day) return;
    let live = true;
    rateFor(initial.day).then((found) => {
      if (!live) return;
      if (found.ok) {
        rateDay.current = initial.day;
        setRate(String(found.rate));
        setRateNote("Frankfurter's rate for that day. Change it if your broker's was different.");
      } else setRateNote(found.message);
    });
    return () => {
      live = false;
    };
  }, [market, initial.day]);

  return { holding, setHolding, account, setAccount, accounts: offered(holding), rate, setRate: (v: string) => { typed.current = true; setRate(v); }, rateNote, market, instrument };
}

function HoldingFieldsBlock({ forms, h, errors, reveal }: { forms: TradeFormsData; h: ReturnType<typeof useHoldingFields>; errors: Record<string, string>; reveal: (field: string) => void }) {
  return (
    <>
      <Field id="holding" label="Holding" required error={errors.holding} help="Not listed? Close this and use Add holding at the top of the page.">
        <SelectInput id="holding" name="holding" invalid={Boolean(errors.holding)} placeholder="Choose" options={forms.instruments.map((i) => ({ value: holdingKey(i.market, i.symbol), label: `${i.name} · ${i.symbol}` }))} value={h.holding} onChange={h.setHolding} />
      </Field>
      {h.market === "US" && (
        <Field id="fxRateToInr" label="USD → INR on that day" required error={errors.fxRateToInr} help={h.rateNote ?? "Fetched for the day."}>
          <MoneyInput {...describedBy("fxRateToInr", errors.fxRateToInr, true)} symbol="₹" name="fxRateToInr" inputMode="decimal" value={h.rate} onChange={(e) => h.setRate(e.target.value)} onBlur={() => reveal("fxRateToInr")} invalid={Boolean(errors.fxRateToInr)} />
        </Field>
      )}
      <Field id="brokerAccount" label="Brokerage account" required error={errors.brokerAccount} help={forms.brokerAccounts.length === 0 ? "Add your brokerage account in Accounts first (type Brokerage)." : "From your Accounts. A US holding is in a dollar account."}>
        <SelectInput
          id="brokerAccount"
          name="brokerAccount"
          invalid={Boolean(errors.brokerAccount)}
          placeholder="Choose"
          options={[...h.accounts.map((a) => ({ value: a.id, label: a.name })), ...(h.account !== "" && !h.accounts.some((a) => a.id === h.account) ? [{ value: h.account, label: forms.brokerAccounts.find((a) => a.id === h.account)?.name ?? "The account it was saved with" }] : [])]}
          value={h.account}
          onChange={h.setAccount}
        />
      </Field>
    </>
  );
}

function ErrorBanner({ state }: { state: FormState }) {
  return state.status === "invalid" && state.errors.form ? (
    <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">{state.errors.form}</p>
  ) : null;
}

function deleteLink(onDelete: (() => void) | undefined, label: string, fallback: ReactNode) {
  return onDelete ? (
    <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">{label}</button>
  ) : (
    fallback
  );
}

const ctxOf = (forms: TradeFormsData): TradeFormContext => ({ instruments: forms.instruments, trades: forms.trades, brokerAccounts: forms.brokerAccounts });

/** Add a trade (a buy or a sell on the market) or Edit one, whatever its source. */
export function TradeDialog({ forms, trade, onClose, onSaved, onDelete }: Common & { trade?: InvestmentTransaction }) {
  const [state, formAction, pending] = useActionState(saveTrade, IDLE);
  const [tradeType, setTradeType] = useState<"Buy" | "Sell">(trade?.tradeType ?? "Buy");
  const [date, setDate] = useState(trade?.tradeDate ?? forms.today);
  const [quantity, setQuantity] = useState(fixed(trade?.quantity));
  const [price, setPrice] = useState(fixed(trade?.price));
  const [total, setTotal] = useState(trade ? fixed(trade.total) : "");
  const h = useHoldingFields(forms, { holding: trade ? holdingKey(trade.market, trade.symbol) : undefined, account: trade?.settlementAccountId, rate: trade?.fxRateToInr ? String(trade.fxRateToInr) : undefined, day: date });
  const source = trade?.source ?? "Market";
  const [soldFrom, setSoldFrom] = useState<string>(trade?.soldFrom ?? "");

  const values: Record<string, string> = { tradeType, source, tradeDate: date, holding: h.holding, quantity, price, total, fxRateToInr: h.rate, brokerAccount: h.account, soldFrom: tradeType === "Sell" ? soldFrom : "" };
  const check = readTradeForm(values, ctxOf(forms), forms.today, trade?.id);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const q = Number(quantity.replace(/,/g, ""));
  const p = Number(price.replace(/,/g, ""));
  const worked = Number.isFinite(q) && Number.isFinite(p) && q > 0 && p >= 0 ? q * p : null;
  const currency = h.market === "US" ? "USD" : "INR";
  const before = h.instrument && date ? heldOn(forms.trades.filter((x) => x.id !== trade?.id), h.instrument.market, h.instrument.symbol, date) : null;
  const after = before !== null && Number.isFinite(q) && q > 0 ? before + (tradeType === "Buy" ? q : -q) : null;
  // What was held by source on the day, without this trade: a sale can say which of them it took, once there is more than one to take from.
  const held = h.instrument && date ? sourceMix(forms.trades.filter((x) => x.id !== trade?.id), date).get(holdingKey(h.instrument.market, h.instrument.symbol)) : undefined;
  const sourcesHeld = held ? SOURCES.filter((k) => held.pools[k] > 1e-9) : [];
  const picksSource = tradeType === "Sell" && (sourcesHeld.length > 1 || soldFrom !== "");
  // A market buy or a sale moves the account's cash (a sell-to-cover pays tax, and is edited in the vest form, not here).
  const account = forms.cash.find((c) => c.id === h.account);
  const typedTotal = total.trim() === "" ? null : Number(total.replace(/,/g, ""));
  const amount = typedTotal !== null && Number.isFinite(typedTotal) ? typedTotal : worked;
  const cashAfter = account && amount !== null ? cashAfterTrade(account.balance, { tradeType, total: amount, currency }, account.currency) : null;

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={trade ? "Edit this trade" : "Add a trade"}
      subtitle={trade ? `${formatDate(trade.tradeDate)} · ${trade.tradeType === "Buy" ? "a buy" : "a sell"} of ${trade.symbol}` : "A buy or a sell. It joins the log; your holdings are worked out from it."}
      preview={
        <PreviewPanel caption="The cost of these shares is fixed at the dollar rate on the day, so today's rate never changes it. Fees belong in the total.">
          <SummaryBox rows={[
            { label: h.instrument ? `${h.instrument.name} on that day` : "Holding", value: before === null ? "—" : `${quantityText(before)}${after !== null ? ` → ${quantityText(after)}` : ""}` },
            { label: "This trade", value: total.trim() !== "" ? formatMoney(currency, Number(total.replace(/,/g, "")) || 0) : worked !== null ? formatMoney(currency, worked) : "—" },
          ]} />
        </PreviewPanel>
      }
      footerNote={deleteLink(onDelete, "Delete trade", <span className="max-md:hidden">You can undo it for a few seconds after saving.</span>)}
      primaryLabel={trade ? "Save changes" : tradeType === "Buy" ? "Add buy" : "Add sell"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {trade && <input type="hidden" name="id" value={trade.id} />}
      <input type="hidden" name="source" value={source} />
      <ErrorBanner state={state} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Segmented name="tradeType" legend="Type" required options={[{ value: "Buy", label: "Buy" }, { value: "Sell", label: "Sell" }]} value={tradeType} onChange={setTradeType} />
        </div>
        <Field id="tradeDate" label="Date" required error={errors.tradeDate}>
          <DateInput {...describedBy("tradeDate", errors.tradeDate, false)} data-autofocus label="Date" name="tradeDate" value={date} onChange={setDate} onBlur={() => reveal("tradeDate")} today={forms.today} invalid={Boolean(errors.tradeDate)} />
        </Field>
        <HoldingFieldsBlock forms={forms} h={h} errors={errors} reveal={reveal} />
        <Field id="quantity" label="Shares" required error={errors.quantity}>
          <TextInput {...describedBy("quantity", errors.quantity, false)} inputMode="decimal" name="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} onBlur={() => reveal("quantity")} invalid={Boolean(errors.quantity)} />
        </Field>
        <Field id="price" label="Price a share" required error={errors.price}>
          <MoneyInput {...describedBy("price", errors.price, false)} symbol={h.market === "US" ? "$" : "₹"} inputMode="decimal" name="price" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => reveal("price")} invalid={Boolean(errors.price)} />
        </Field>
        <Field id="total" label="Total" error={errors.total} help="Worked out as shares × price. Change it if your broker's total differs (fees).">
          <MoneyInput {...describedBy("total", errors.total, true)} symbol={h.market === "US" ? "$" : "₹"} inputMode="decimal" name="total" placeholder={worked !== null ? quantityText(worked) : ""} value={total} onChange={(e) => setTotal(e.target.value)} onBlur={() => reveal("total")} invalid={Boolean(errors.total)} />
        </Field>
        {picksSource && (
          <div className="md:col-span-2">
            <Field id="soldFrom" label="Which shares did it take?" error={errors.soldFrom} help="Only for How it came in: your worth, gain and returns count every share alike.">
              <SelectInput id="soldFrom" name="soldFrom" invalid={Boolean(errors.soldFrom)} placeholder="Not marked" options={[{ value: "", label: trade && trade.source !== "Market" ? `Its own: ${SOURCE_LABEL[trade.source]} (as recorded)` : "Not marked: counted in proportion" }, ...SOURCES.filter((k) => !held || held.pools[k] > 1e-9 || k === soldFrom).map((k) => ({ value: k, label: `${SOURCE_LABEL[k]}${held ? ` · ${Math.round(held.pools[k] * 1e4) / 1e4} held` : ""}` }))]} value={soldFrom} onChange={setSoldFrom} />
            </Field>
            {soldFrom !== "" && held && Number.isFinite(q) && q > held.pools[soldFrom as keyof typeof held.pools] + 1e-9 && (
              <p role="status" className="mt-1.5 text-xs font-semibold text-muted">You held {Math.round(held.pools[soldFrom as keyof typeof held.pools] * 1e4) / 1e4} {SOURCE_LABEL[soldFrom as keyof typeof SOURCE_LABEL]} shares on that day, so the rest of the sale comes out of the others in proportion.</p>
            )}
          </div>
        )}
        {account && cashAfter && (tradeType === "Sell" || source === "Market") && (
          <div className="md:col-span-2">
            <CashAfterNote account={account} after={cashAfter} tradeType={tradeType} tradeDate={date} />
          </div>
        )}
      </div>
    </FormDialog>
  );
}

/**
 * What the picked cash account would hold after the trade, from the balance on record. A buy bigger than the cash is a warning, never a block:
 * the balance may be old (PRD Q13). A trade in the other currency than the account's isn't worked out.
 */
function CashAfterNote({ account, after, tradeType, tradeDate }: { account: TradeFormsData["cash"][number]; after: ReturnType<typeof cashAfterTrade>; tradeType: "Buy" | "Sell"; tradeDate: string }) {
  const read = `read ${formatDate(account.date)}`;
  // A trade from before the balance was read is already in it: taking it off again would count it twice.
  if (tradeDate !== "" && tradeDate < account.date) return <p role="status" className="mt-1.5 text-xs font-semibold text-muted">{account.name}&apos;s balance ({formatMoney(account.currency, account.balance)}) was {read}, after this trade, so it is already in it and isn&apos;t taken off again.</p>;
  if (after.mismatch) return <p role="status" className="mt-1.5 text-xs font-semibold text-muted">This trade is in a different currency from {account.name}, so its balance isn&apos;t worked out ({formatMoney(account.currency, account.balance)}, {read}).</p>;
  return (
    <p role="status" className={`mt-1.5 text-xs font-semibold ${after.short ? "text-negative" : "text-muted"}`}>
      {after.short
        ? `This is ${formatMoney(account.currency, after.shortBy)} more than the cash on record (${formatMoney(account.currency, account.balance)}, ${read}). The balance may be old, so you can still save.`
        : `${account.name} would hold ${formatMoney(account.currency, after.after)} after ${tradeType === "Buy" ? "paying for this" : "this sale"} (${formatMoney(account.currency, account.balance)} now, ${read}).`}
    </p>
  );
}

/** Record an RSU vest (two trades at once: the shares that vested and the ones sold to cover tax), or Edit one. */
export function VestDialog({ forms, vest, cover, onClose, onSaved, onDelete }: Common & { vest?: InvestmentTransaction; cover?: InvestmentTransaction }) {
  const [state, formAction, pending] = useActionState(saveVest, IDLE);
  const [date, setDate] = useState(vest?.tradeDate ?? forms.today);
  const [vested, setVested] = useState(fixed(vest?.quantity));
  const [fair, setFair] = useState(fixed(vest?.price));
  const [sold, setSold] = useState(cover ? fixed(cover.quantity) : "");
  const [soldAt, setSoldAt] = useState(cover && cover.price !== vest?.price ? fixed(cover.price) : "");
  const h = useHoldingFields(forms, { holding: vest ? holdingKey(vest.market, vest.symbol) : forms.instruments.find((i) => i.symbol === "NTAP") ? "US:NTAP" : undefined, account: vest?.settlementAccountId, rate: vest?.fxRateToInr ? String(vest.fxRateToInr) : undefined, day: date });

  const values: Record<string, string> = { tradeDate: date, holding: h.holding, sharesVested: vested, fairValue: fair, sharesSold: sold, soldAt, fxRateToInr: h.rate, brokerAccount: h.account };
  const editingIds = [vest?.id, cover?.id].filter((x): x is string => Boolean(x));
  const check = readVestForm(values, ctxOf(forms), forms.today, editingIds);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const currency = h.market === "US" ? "USD" : "INR";
  const kept = check.ok ? check.input.vest.quantity - (check.input.cover?.quantity ?? 0) : null;

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={vest ? "Edit this RSU vest" : "Record an RSU vest"}
      subtitle="One form, two trades: the shares that vested and the ones sold to cover tax."
      preview={
        <PreviewPanel caption="A vest is money in at its fair value on the day, and the shares sold for tax are money out, so what you keep counts at fair value. Both trades are saved together or not at all.">
          <SummaryBox rows={check.ok ? [
            { label: "Buy · RSU", value: `${quantityText(check.input.vest.quantity)} × ${formatMoney(currency, check.input.vest.price)}` },
            ...(check.input.cover ? [{ label: "Sell · RSU", value: `${quantityText(check.input.cover.quantity)} × ${formatMoney(currency, check.input.cover.price)}` }] : []),
            { label: "Shares you keep", value: quantityText(kept ?? 0) },
          ] : [{ label: "Buy · RSU", value: "—" }, { label: "Sell · RSU", value: "—" }]} />
        </PreviewPanel>
      }
      footerNote={deleteLink(onDelete, "Delete vest", <span className="max-md:hidden">Both trades are saved together or not at all.</span>)}
      primaryLabel={vest ? "Save changes" : "Record vest"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {editingIds.length > 0 && <input type="hidden" name="ids" value={editingIds.join(",")} />}
      <ErrorBanner state={state} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="tradeDate" label="Vest date" required error={errors.tradeDate}>
          <DateInput {...describedBy("tradeDate", errors.tradeDate, false)} data-autofocus label="Vest date" name="tradeDate" value={date} onChange={setDate} onBlur={() => reveal("tradeDate")} today={forms.today} invalid={Boolean(errors.tradeDate)} />
        </Field>
        <HoldingFieldsBlock forms={forms} h={h} errors={errors} reveal={reveal} />
        <Field id="sharesVested" label="Shares vested" required error={errors.sharesVested}>
          <TextInput {...describedBy("sharesVested", errors.sharesVested, false)} inputMode="decimal" name="sharesVested" value={vested} onChange={(e) => setVested(e.target.value)} onBlur={() => reveal("sharesVested")} invalid={Boolean(errors.sharesVested)} />
        </Field>
        <Field id="fairValue" label="Fair value a share" required error={errors.fairValue} help="On the vest day, from your stock plan.">
          <MoneyInput {...describedBy("fairValue", errors.fairValue, true)} symbol="$" inputMode="decimal" name="fairValue" value={fair} onChange={(e) => setFair(e.target.value)} onBlur={() => reveal("fairValue")} invalid={Boolean(errors.fairValue)} />
        </Field>
        <Field id="sharesSold" label="Shares sold to cover tax" error={errors.sharesSold}>
          <TextInput {...describedBy("sharesSold", errors.sharesSold, false)} inputMode="decimal" name="sharesSold" placeholder="None" value={sold} onChange={(e) => setSold(e.target.value)} onBlur={() => reveal("sharesSold")} invalid={Boolean(errors.sharesSold)} />
        </Field>
        <Field id="soldAt" label="Sold at" error={errors.soldAt} help="Usually the fair value; leave blank to use it.">
          <MoneyInput {...describedBy("soldAt", errors.soldAt, true)} symbol="$" inputMode="decimal" name="soldAt" placeholder={fair} value={soldAt} onChange={(e) => setSoldAt(e.target.value)} invalid={Boolean(errors.soldAt)} />
        </Field>
      </div>
    </FormDialog>
  );
}

/** Record an ESPP purchase (one Buy at the price he paid, PRD Q12), or Edit one. */
export function EsppDialog({ forms, purchase, onClose, onSaved, onDelete }: Common & { purchase?: InvestmentTransaction }) {
  const [state, formAction, pending] = useActionState(saveEspp, IDLE);
  const [date, setDate] = useState(purchase?.tradeDate ?? forms.today);
  const [quantity, setQuantity] = useState(fixed(purchase?.quantity));
  const [price, setPrice] = useState(fixed(purchase?.price));
  const h = useHoldingFields(forms, { holding: purchase ? holdingKey(purchase.market, purchase.symbol) : forms.instruments.find((i) => i.symbol === "NTAP") ? "US:NTAP" : undefined, account: purchase?.settlementAccountId, rate: purchase?.fxRateToInr ? String(purchase.fxRateToInr) : undefined, day: date });

  const values: Record<string, string> = { tradeDate: date, holding: h.holding, quantity, price, fxRateToInr: h.rate, brokerAccount: h.account };
  const check = readEsppForm(values, ctxOf(forms), forms.today, purchase?.id);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const currency = h.market === "US" ? "USD" : "INR";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={purchase ? "Edit this ESPP purchase" : "Record an ESPP purchase"}
      subtitle="The shares the plan bought for you, at the price you paid."
      preview={
        <PreviewPanel caption="The trade's price is what you paid, the discounted one, so the discount shows up as return. The money left your salary, so there is no account to choose.">
          <SummaryBox rows={check.ok ? [{ label: "Buy · ESPP", value: `${quantityText(check.input.quantity)} × ${formatMoney(currency, check.input.price)}` }, { label: "Cost", value: formatMoney(currency, check.input.total) }] : [{ label: "Buy · ESPP", value: "—" }]} />
        </PreviewPanel>
      }
      footerNote={deleteLink(onDelete, "Delete purchase", <span className="max-md:hidden">You can undo it for a few seconds after saving.</span>)}
      primaryLabel={purchase ? "Save changes" : "Record purchase"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {purchase && <input type="hidden" name="id" value={purchase.id} />}
      <ErrorBanner state={state} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="tradeDate" label="Purchase date" required error={errors.tradeDate}>
          <DateInput {...describedBy("tradeDate", errors.tradeDate, false)} data-autofocus label="Purchase date" name="tradeDate" value={date} onChange={setDate} onBlur={() => reveal("tradeDate")} today={forms.today} invalid={Boolean(errors.tradeDate)} />
        </Field>
        <HoldingFieldsBlock forms={forms} h={h} errors={errors} reveal={reveal} />
        <Field id="quantity" label="Shares bought" required error={errors.quantity}>
          <TextInput {...describedBy("quantity", errors.quantity, false)} inputMode="decimal" name="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} onBlur={() => reveal("quantity")} invalid={Boolean(errors.quantity)} />
        </Field>
        <Field id="price" label="Price you paid" required error={errors.price} help="The discounted price, from your purchase confirmation.">
          <MoneyInput {...describedBy("price", errors.price, true)} symbol="$" inputMode="decimal" name="price" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => reveal("price")} invalid={Boolean(errors.price)} />
        </Field>
      </div>
    </FormDialog>
  );
}
