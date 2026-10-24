"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveCard } from "@/app/cards/actions";
import { readCardForm } from "@/lib/forms/cardForms";
import type { ClientCard } from "@/lib/forms/clientCard";
import { IDLE } from "@/lib/forms/formState";
import { cardName, optionLabel, ordinal } from "@/lib/format/labels";
import { parseAmountText, formatInr } from "@/lib/format/money";
import { freeColor } from "@/lib/format/colors";
import { ColorSwatches } from "../../shell/ColorSwatches";
import { CARD_COLORS, CARD_ISSUERS, CARD_TYPES, type CardColor } from "@/lib/sheets/types";
import { CardTile } from "../CardTile";
import { Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy, inputClass } from "./fields";
import { FormDialog } from "./FormDialog";
import { CardIcon } from "./icons";
import { PdfPasswordField } from "./PdfPasswordField";
import { useFieldErrors } from "./useFieldErrors";

const KEYWORDS_HELP = (
  <>
    Only needed if your bank&rsquo;s statement subject doesn&rsquo;t contain this card&rsquo;s name or short name. Comma-separated words to look for in the card name taken
    from the subject line (the words before &ldquo;Credit Card&rdquo;), e.g. <b>edge, csb</b>. Leave it blank for most cards.
  </>
);

/**
 * Add card, and Edit card (the same dialog, prefilled), as designed in
 * docs/design/cards-forms.md (artboards 1, 2). The tile on the left builds
 * itself as you type. A saved PDF password is never shown back: Edit card says
 * it's saved and offers to change or remove it, and leaving it alone keeps it.
 */
export function CardFormDialog({
  card,
  accounts,
  usedColors,
  onClose,
}: {
  /** The card to edit; without one this is Add card. */
  card?: ClientCard;
  accounts: { id: string; name: string }[];
  /** Colours other cards already use, so a new card starts with a free one. */
  usedColors: CardColor[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCard, IDLE);
  const [name, setName] = useState(card?.name ?? "");
  const [alias, setAlias] = useState(card?.alias && card.alias !== card.name ? card.alias : "");
  const [issuer, setIssuer] = useState<string>(card?.issuer ?? "");
  const [cardType, setCardType] = useState<string>(card?.cardType ?? "");
  const [status, setStatus] = useState<string>(card?.status ?? "Active");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [creditLimit, setCreditLimit] = useState(card ? card.creditLimit.toLocaleString("en-IN") : "");
  const [statementDay, setStatementDay] = useState(card ? String(card.statementDay) : "");
  const [dueDayBuffer, setDueDayBuffer] = useState(card ? String(card.dueDayBuffer) : "");
  const [color, setColor] = useState<CardColor>(card?.color ?? (freeColor(usedColors, ["Emerald"]) as CardColor));
  const [account, setAccount] = useState(card?.defaultPaidFromAccountId ?? "");
  const [password, setPassword] = useState("");
  const [keywords, setKeywords] = useState(card?.emailMatchKeywords ?? "");
  const [importOpen, setImportOpen] = useState(false);

  const values = { name, alias, issuer, cardType, status, last4, creditLimit, statementDay, dueDayBuffer, color, defaultPaidFromAccountId: account, statementPdfPassword: password, emailMatchKeywords: keywords };
  const check = readCardForm(values, { accountIds: accounts.map((a) => a.id) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
    if (check.errors.statementPdfPassword || check.errors.emailMatchKeywords) setImportOpen(true);
  }

  const limit = parseAmountText(creditLimit);
  const day = Number(statementDay);
  const preview = (
    <PreviewPanel caption="This is how the card will look in your card row. It updates as you type.">
      <div className="flex justify-center max-md:justify-start">
        <CardTile
          selected={false}
          variant="card"
          title={cardName({ name: name.trim() || "Card name", alias })}
          corner={issuer ? optionLabel(issuer) : "Issuer"}
          color={color}
          last4={last4.replace(/\D/g, "").slice(0, 4).padStart(4, "•")}
          balance={`₹0 / ${limit !== null ? formatInr(limit) : "₹–"}`}
          utilizationLabel="0%"
          utilization={0}
          footnote={`${day >= 1 && day <= 31 ? `Statement on the ${ordinal(day)}` : "Statement day"} · ${Number(dueDayBuffer) > 0 ? `Due ${dueDayBuffer} days later` : "Days to pay"}`}
        />
      </div>
      <ColorSwatches colors={CARD_COLORS} value={color} onChange={(c) => setColor(c as CardColor)} error={errors.color} />
    </PreviewPanel>
  );

  return (
    <FormDialog
      icon={<CardIcon />}
      title={card ? "Edit card" : "Add card"}
      subtitle={card ? cardName(card) : "Fill it in and watch the card take shape"}
      preview={preview}
      footerNote="Saves to the Cards tab"
      primaryLabel={card ? "Save changes" : "Save card"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {card && <input type="hidden" name="id" value={card.id} />}
      {errors.form && (
        <p role="alert" className="text-xs font-semibold text-negative">
          {errors.form}
        </p>
      )}

      <Field id="card-name" label="Card name" required help="The full name from your statement." error={errors.name}>
        <TextInput {...describedBy("card-name", errors.name, true)} name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} placeholder="e.g. HDFC Bank Regalia Gold Credit Card" invalid={Boolean(errors.name)} data-autofocus />
      </Field>

      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="card-alias" label="Short name" help="Shown on the tile. Blank uses the card name.">
          <TextInput {...describedBy("card-alias", undefined, true)} name="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Regalia Gold" invalid={false} />
        </Field>
        <Field id="card-issuer" label="Issuer" required error={errors.issuer}>
          <SelectInput
            {...describedBy("card-issuer", errors.issuer, false)}
            name="issuer"
            value={issuer}
            onChange={setIssuer}
            onBlur={() => reveal("issuer")}
            placeholder="Choose bank"
            options={CARD_ISSUERS.map((i) => ({ value: i, label: optionLabel(i) }))}
            invalid={Boolean(errors.issuer)}
          />
        </Field>
      </div>

      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Segmented name="cardType" legend="Card type" required options={CARD_TYPES.map((t) => ({ value: t, label: optionLabel(t) }))} value={cardType} onChange={setCardType} error={errors.cardType} />
        <Segmented name="status" legend="Status" options={(["Active", "Inactive", "Closed"] as const).map((s) => ({ value: s, label: s }))} value={status} onChange={setStatus} error={errors.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
        <Field id="card-last4" label="Last 4 digits" help="Filled in from your statements if left blank." error={errors.last4}>
          <TextInput {...describedBy("card-last4", errors.last4, true)} name="last4" value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => reveal("last4")} inputMode="numeric" maxLength={4} placeholder="e.g. 7042" invalid={Boolean(errors.last4)} />
        </Field>
        <Field id="card-limit" label="Credit limit" required error={errors.creditLimit}>
          <MoneyInput {...describedBy("card-limit", errors.creditLimit, false)} name="creditLimit" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} onBlur={() => reveal("creditLimit")} placeholder="e.g. 1,50,000" invalid={Boolean(errors.creditLimit)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
        <Field id="card-day" label="Statement day" required help="Day of the month it's generated." error={errors.statementDay}>
          <SelectInput
            {...describedBy("card-day", errors.statementDay, true)}
            name="statementDay"
            value={statementDay}
            onChange={setStatementDay}
            onBlur={() => reveal("statementDay")}
            placeholder="Choose day"
            options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))}
            invalid={Boolean(errors.statementDay)}
          />
        </Field>
        <Field id="card-buffer" label="Days to pay" required help="Each due date is this many days later." error={errors.dueDayBuffer}>
          <div className="relative">
            <input
              {...describedBy("card-buffer", errors.dueDayBuffer, true)}
              type="text"
              inputMode="numeric"
              name="dueDayBuffer"
              value={dueDayBuffer}
              onChange={(e) => setDueDayBuffer(e.target.value.replace(/\D/g, "").slice(0, 2))}
              onBlur={() => reveal("dueDayBuffer")}
              placeholder="20"
              className={`${inputClass(Boolean(errors.dueDayBuffer))} pr-[11.5rem] max-sm:pr-14`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-muted max-sm:hidden" aria-hidden="true">
              days after the statement
            </span>
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-muted sm:hidden" aria-hidden="true">
              days
            </span>
          </div>
        </Field>
      </div>

      <Field id="card-account" label="Usually paid from" help={accounts.length === 0 ? "Add your accounts to choose one here." : "Mark paid starts with this account."} error={errors.defaultPaidFromAccountId}>
        <SelectInput
          {...describedBy("card-account", errors.defaultPaidFromAccountId, true)}
          name="defaultPaidFromAccountId"
          value={account}
          onChange={setAccount}
          disabled={accounts.length === 0}
          placeholder={accounts.length === 0 ? "No accounts yet" : "Not set"}
          options={accounts.length === 0 ? [] : [{ value: "", label: "Not set", quiet: true }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          invalid={Boolean(errors.defaultPaidFromAccountId)}
        />
      </Field>

      <details open={importOpen} onToggle={(e) => setImportOpen(e.currentTarget.open)} className="group rounded-[16px] border border-surface-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-sm font-bold">Statement import from email</span>{" "}
            <span className="text-xs font-semibold text-muted">· Optional · PDF password and subject keywords</span>
          </span>
          <svg className="shrink-0 text-muted transition-transform group-open:rotate-180" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="flex flex-col gap-4 border-t border-divider px-4 py-4">
          <PdfPasswordField id="card-password" help="Opens this card's statement PDFs during email import. Stored in the Cards tab; never shown again after saving." saved={Boolean(card?.hasPdfPassword)} value={password} onChange={setPassword} />
          <Field id="card-keywords" label="Subject keywords" help={KEYWORDS_HELP}>
            <TextInput {...describedBy("card-keywords", undefined, true)} name="emailMatchKeywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. edge, csb" invalid={false} />
          </Field>
        </div>
      </details>

    </FormDialog>
  );
}
