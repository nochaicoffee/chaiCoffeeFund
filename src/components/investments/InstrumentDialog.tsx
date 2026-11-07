"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveInstrument } from "@/app/investments/tradeActions";
import { IDLE } from "@/lib/forms/formState";
import { readInstrumentForm, suggestTicker } from "@/lib/forms/instrumentForm";
import { INVESTMENT_ASSET_TYPES, type InvestmentAssetType, type InvestmentMarket } from "@/lib/sheets/types";
import { SummaryBox } from "../accounts/forms/MiniAccountCard";
import { Field, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../cards/forms/fields";
import { FormDialog } from "../cards/forms/FormDialog";
import { PlusIcon } from "../cards/forms/icons";
import { useFieldErrors } from "../cards/forms/useFieldErrors";

/**
 * Add a holding (docs/design/investments.md, InvForms "Add an instrument"): what it is and where its price comes from. The trade forms
 * offer it once it is saved; its price arrives with the next Refresh prices.
 */
export function InstrumentDialog({ existing, onClose, onSaved }: { existing: { symbol: string; market: InvestmentMarket; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(saveInstrument, IDLE);
  const [market, setMarket] = useState<InvestmentMarket>("US");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<InvestmentAssetType>("Equity");
  const [ticker, setTicker] = useState("");
  // The ticker follows the symbol until he types one of his own.
  const [tickerTyped, setTickerTyped] = useState(false);
  const shownTicker = tickerTyped ? ticker : suggestTicker(market, assetType, symbol);

  const values: Record<string, string> = { market, symbol, name, assetType, priceTicker: shownTicker };
  const check = readInstrumentForm(values, existing);
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

  const fund = assetType === "Mutual-Fund" || assetType === "Debt-Fund";
  return (
    <FormDialog
      icon={<PlusIcon />}
      title="Add a holding"
      subtitle="Something you trade that isn't listed yet. Once it is saved, the trade forms offer it."
      preview={
        <PreviewPanel caption="Its price comes the next time you press Refresh prices. Until then it is counted at what it cost.">
          <SummaryBox rows={[
            { label: "Holding", value: symbol.trim() === "" ? "—" : symbol.trim().toUpperCase() },
            { label: "Price from", value: shownTicker === "" ? "—" : /^\d+$/.test(shownTicker) ? `AMFI, scheme ${shownTicker}` : `Yahoo, ${shownTicker.toUpperCase()}` },
          ]} />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">It is added to the Instruments tab of your Sheet.</span>}
      primaryLabel="Add holding"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {state.status === "invalid" && state.errors.form && <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">{state.errors.form}</p>}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Segmented name="market" legend="Market" required options={[{ value: "US", label: "United States" }, { value: "IND", label: "India" }]} value={market} onChange={setMarket} />
        </div>
        <Field id="symbol" label="Symbol" required error={errors.symbol} help="How it appears on your trades, like NTAP or NIFTYBEES.">
          <TextInput {...describedBy("symbol", errors.symbol, true)} data-autofocus name="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} onBlur={() => reveal("symbol")} invalid={Boolean(errors.symbol)} />
        </Field>
        <Field id="name" label="Name" required error={errors.name}>
          <TextInput {...describedBy("name", errors.name, false)} name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} />
        </Field>
        <Field id="assetType" label="What it is" required error={errors.assetType}>
          <SelectInput id="assetType" name="assetType" invalid={Boolean(errors.assetType)} options={INVESTMENT_ASSET_TYPES.map((t) => ({ value: t, label: t.replaceAll("-", " ") }))} value={assetType} onChange={(v) => setAssetType(v as InvestmentAssetType)} />
        </Field>
        <Field id="priceTicker" label="Price ticker" required error={errors.priceTicker} help={fund && market === "IND" ? "A mutual fund's AMFI scheme code, all digits." : market === "IND" ? "Yahoo's ticker: .NS for NSE, .BO for BSE." : "Yahoo's ticker."}>
          <TextInput {...describedBy("priceTicker", errors.priceTicker, true)} name="priceTicker" value={shownTicker} onChange={(e) => { setTickerTyped(true); setTicker(e.target.value.toUpperCase()); }} onBlur={() => reveal("priceTicker")} invalid={Boolean(errors.priceTicker)} />
        </Field>
      </div>
    </FormDialog>
  );
}
