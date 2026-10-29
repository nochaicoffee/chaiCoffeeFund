"use client";

import { useState, type ReactNode } from "react";
import type { FormsData } from "@/app/subscriptions/formsView";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { SelectInput } from "../../cards/forms/fields";
import { AlertIcon, InfoIcon } from "../../cards/forms/icons";

/**
 * "Usually charged to" (Add and Edit subscription) and "Charged to" (Record a payment): a
 * card or a bank account, never both, as the data model requires. It submits one value,
 * "card:<id>" or "account:<id>", or "" for not set (lib/forms/subscriptionForms.ts).
 * Switching between card and account clears the other's choice.
 */
export function ChargedToField({
  name = "chargedTo",
  label,
  value,
  onChange,
  forms,
  help,
  error,
}: {
  /** The field's name in the form (and the base of its help and error ids): "chargedTo", or "paidFrom" on the Insurance forms. */
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  forms: Pick<FormsData, "cards" | "accounts">;
  help: ReactNode;
  error?: string;
}) {
  // The tab follows the value whenever there is one (a newly picked subscription brings its own), and is only its own choice while it's blank.
  const [chosen, setChosen] = useState<"card" | "account">(value.startsWith("account:") ? "account" : "card");
  const kind = value.startsWith("account:") ? "account" : value.startsWith("card:") ? "card" : chosen;
  const id = value.slice(value.indexOf(":") + 1);
  const options =
    kind === "card"
      ? forms.cards.map((c) => ({ value: c.id, label: c.inactive ? `${c.name} (no longer active)` : c.name, swatch: { background: colorGradient(c.color), shape: "card" as const } }))
      : forms.accounts.map((a) => ({ value: a.id, label: a.inactive ? `${a.name} (no longer active)` : a.name }));
  const none = kind === "card" ? "No cards yet" : "No accounts yet";

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? `${name}-error` : `${name}-help`}>
      <legend className="mb-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        {label} <span className="ml-1 text-[10px] font-semibold tracking-[0.02em] text-muted/80">Optional</span>
      </legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex rounded-full bg-fill p-[3px]">
          {(["card", "account"] as const).map((k) => (
            <label key={k} className="relative flex-1">
              <input
                type="radio"
                name={`${name}Kind`}
                value={k}
                checked={kind === k}
                onChange={() => {
                  setChosen(k);
                  onChange("");
                }}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span className="flex h-[34px] items-center justify-center rounded-full text-xs font-bold whitespace-nowrap text-muted peer-checked:bg-surface peer-checked:text-accent-text peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent max-md:h-10">
                {k === "card" ? "Credit card" : "Bank account"}
              </span>
            </label>
          ))}
        </div>
        <SelectInput
          aria-label={kind === "card" ? "Credit card" : "Bank account"}
          value={value.startsWith(`${kind}:`) ? id : ""}
          onChange={(picked) => onChange(picked ? `${kind}:${picked}` : "")}
          disabled={options.length === 0}
          placeholder={options.length === 0 ? none : kind === "card" ? "Choose card" : "Choose account"}
          options={options.length === 0 ? [] : [{ value: "", label: "Not set", display: kind === "card" ? "Choose card" : "Choose account", quiet: true }, ...options]}
          invalid={Boolean(error)}
        />
      </div>
      {error ? (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-[11px] font-semibold text-negative">
          <AlertIcon />
          {error}
        </p>
      ) : (
        <p id={`${name}-help`} className="flex items-start gap-1.5 text-[11px] font-medium text-muted">
          <InfoIcon />
          <span>{help}</span>
        </p>
      )}
    </fieldset>
  );
}
