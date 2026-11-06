"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { rateFor, saveEspp, saveTrade, saveVest } from "@/app/investments/tradeActions";
import type { TradeFormsData } from "@/app/investments/tradeFormsData";
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

/** What the three dialogs share: the holding, the broker and, for a US holding, the dollar rate on the day (prefilled from Frankfurter until he types one). */
function useHoldingFields(forms: TradeFormsData, initial: { holding?: string; broker?: string; rate?: string; day: string }) {
  /** The broker he last used for a holding: a new trade of it is most likely there too. */
  const lastBroker = (key: string) => forms.trades.filter((t) => holdingKey(t.market, t.symbol) === key).sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1))[0]?.broker;
  const [holding, setHoldingState] = useState(initial.holding ?? "");
  const [broker, setBrokerState] = useState(initial.broker ?? (initial.holding ? lastBroker(initial.holding) : undefined) ?? forms.brokers[0] ?? "");
  const brokerTouched = useRef(Boolean(initial.broker));
  const setHolding = (key: string) => {
    setHoldingState(key);
    const last = lastBroker(key);
    if (!brokerTouched.current && last) setBrokerState(last);
  };
  const setBroker = (value: string) => {
    brokerTouched.current = true;
    setBrokerState(value);
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

  return { holding, setHolding, broker, setBroker, rate, setRate: (v: string) => { typed.current = true; setRate(v); }, rateNote, market, instrument };
}

function HoldingFieldsBlock({ forms, h, errors, reveal }: { forms: TradeFormsData; h: ReturnType<typeof useHoldingFields>; errors: Record<string, string>; reveal: (field: string) => void }) {
  return (
    <>
      <Field id="holding" label="Holding" required error={errors.holding}>
        <SelectInput id="holding" name="holding" invalid={Boolean(errors.holding)} placeholder="Choose" options={forms.instruments.map((i) => ({ value: holdingKey(i.market, i.symbol), label: `${i.name} · ${i.symbol}` }))} value={h.holding} onChange={h.setHolding} />
      </Field>
      {h.market === "US" && (
        <Field id="fxRateToInr" label="USD → INR on that day" required error={errors.fxRateToInr} help={h.rateNote ?? "Fetched for the day."}>
          <MoneyInput {...describedBy("fxRateToInr", errors.fxRateToInr, true)} symbol="₹" name="fxRateToInr" inputMode="decimal" value={h.rate} onChange={(e) => h.setRate(e.target.value)} onBlur={() => reveal("fxRateToInr")} invalid={Boolean(errors.fxRateToInr)} />
        </Field>
      )}
      <Field id="broker" label="Broker" required error={errors.broker}>
        <TextInput {...describedBy("broker", errors.broker, false)} list="trade-brokers" name="broker" value={h.broker} onChange={(e) => h.setBroker(e.target.value)} onBlur={() => reveal("broker")} invalid={Boolean(errors.broker)} />
        <datalist id="trade-brokers">{forms.brokers.map((b) => <option key={b} value={b} />)}</datalist>
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

const ctxOf = (forms: TradeFormsData): TradeFormContext => ({ instruments: forms.instruments, trades: forms.trades });

/** Add a trade (a buy or a sell on the market) or Edit one, whatever its source. */
export function TradeDialog({ forms, trade, onClose, onSaved, onDelete }: Common & { trade?: InvestmentTransaction }) {
  const [state, formAction, pending] = useActionState(saveTrade, IDLE);
  const [tradeType, setTradeType] = useState<"Buy" | "Sell">(trade?.tradeType ?? "Buy");
  const [date, setDate] = useState(trade?.tradeDate ?? forms.today);
  const [quantity, setQuantity] = useState(fixed(trade?.quantity));
  const [price, setPrice] = useState(fixed(trade?.price));
  const [total, setTotal] = useState(trade ? fixed(trade.total) : "");
  const h = useHoldingFields(forms, { holding: trade ? holdingKey(trade.market, trade.symbol) : undefined, broker: trade?.broker, rate: trade?.fxRateToInr ? String(trade.fxRateToInr) : undefined, day: date });
  const source = trade?.source ?? "Market";

  const values: Record<string, string> = { tradeType, source, tradeDate: date, holding: h.holding, quantity, price, total, fxRateToInr: h.rate, broker: h.broker };
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
      </div>
    </FormDialog>
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
  const h = useHoldingFields(forms, { holding: vest ? holdingKey(vest.market, vest.symbol) : forms.instruments.find((i) => i.symbol === "NTAP") ? "US:NTAP" : undefined, broker: vest?.broker, rate: vest?.fxRateToInr ? String(vest.fxRateToInr) : undefined, day: date });

  const values: Record<string, string> = { tradeDate: date, holding: h.holding, sharesVested: vested, fairValue: fair, sharesSold: sold, soldAt, fxRateToInr: h.rate, broker: h.broker };
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
  const h = useHoldingFields(forms, { holding: purchase ? holdingKey(purchase.market, purchase.symbol) : forms.instruments.find((i) => i.symbol === "NTAP") ? "US:NTAP" : undefined, broker: purchase?.broker, rate: purchase?.fxRateToInr ? String(purchase.fxRateToInr) : undefined, day: date });

  const values: Record<string, string> = { tradeDate: date, holding: h.holding, quantity, price, fxRateToInr: h.rate, broker: h.broker };
  const check = readEsppForm(values, ctxOf(forms), forms.today);
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
