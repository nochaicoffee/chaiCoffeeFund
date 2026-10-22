"use client";

import type { ComponentProps, ReactNode } from "react";
import { DatePicker } from "../../DatePicker";
import { RingTexture } from "../../RingTexture";
import { Select, type SelectOption } from "../../Select";
import { AlertIcon, InfoIcon } from "./icons";

/**
 * The form fields from docs/design/cards-forms.md: uppercase 11px labels (a red
 * * when required, an "Optional" tag otherwise), 40px inputs with 12px corners,
 * an accent border and ring on focus, a red one with a message under the field
 * on error. Help and errors are tied to their input with aria-describedby.
 */

export const inputClass = (invalid: boolean) =>
  `h-10 w-full min-w-0 rounded-[12px] border bg-surface px-3.5 text-sm font-semibold text-fg tabular-nums placeholder:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-[3px] max-md:h-11 ${
    invalid ? "border-negative ring-[3px] ring-negative/15 focus-visible:ring-negative/25" : "border-surface-line focus-visible:border-accent focus-visible:ring-accent/25"
  }`;

export function Field({
  id,
  label,
  required,
  help,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label id={`${id}-label`} htmlFor={id} className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        {label}
        {required ? (
          <span className="text-negative" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[10px] font-semibold tracking-[0.02em] text-muted/80">Optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[11px] font-semibold text-negative">
          <AlertIcon />
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="flex items-start gap-1.5 text-[11px] font-medium text-muted">
            <InfoIcon />
            <span>{help}</span>
          </p>
        )
      )}
    </div>
  );
}

/** The props that tie an input to its Field's help or error text. */
export function describedBy(id: string, error: string | undefined, hasHelp: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHelp ? `${id}-help` : undefined,
  } as const;
}

export function TextInput({ invalid, ...props }: ComponentProps<"input"> & { invalid: boolean }) {
  return <input type="text" autoComplete="off" {...props} className={inputClass(invalid)} />;
}

/** A rupee amount: typed as text so "1,20,000" and "₹38,500.50" both work (parseAmountText reads it). */
export function MoneyInput({ invalid, ...props }: ComponentProps<"input"> & { invalid: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-muted" aria-hidden="true">
        ₹
      </span>
      <input type="text" inputMode="decimal" autoComplete="off" {...props} className={`${inputClass(invalid)} pl-8`} />
    </div>
  );
}

/**
 * A form field's dropdown: the app's Select (src/components/Select.tsx) with the
 * input look, and a menu as wide as the field. It's named by its Field's label
 * unless it's given an aria-label, and `name` submits its value with the form.
 */
export function SelectInput({
  id,
  invalid,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  name,
  disabled,
  ...aria
}: {
  id?: string;
  invalid: boolean;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Select
      id={id}
      variant="field"
      options={options}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      name={name}
      disabled={disabled}
      aria-labelledby={aria["aria-label"] || !id ? undefined : `${id}-label`}
      {...aria}
      className={`${inputClass(invalid)} flex cursor-pointer items-center gap-2 pr-3.5 text-left aria-expanded:border-accent aria-expanded:ring-[3px] aria-expanded:ring-accent/25 disabled:cursor-default disabled:bg-page disabled:text-muted`}
    />
  );
}

/**
 * A form field's date: the app's DatePicker (src/components/DatePicker.tsx) with
 * the input look, named by its Field's <label>. `name` submits the date, or what
 * was typed when it isn't one, so the form's reader can say so.
 */
export function DateInput({ invalid, ...props }: Omit<ComponentProps<typeof DatePicker>, "className"> & { invalid: boolean }) {
  return <DatePicker {...props} className={`${inputClass(invalid)} pr-10 aria-expanded:border-accent aria-expanded:ring-[3px] aria-expanded:ring-accent/25`} />;
}

/**
 * A segmented control built from real radio buttons, so arrow keys move between
 * the options and the value is submitted with the form.
 */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  required,
  help,
  error,
}: {
  name: string;
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  required?: boolean;
  help?: ReactNode;
  error?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? `${name}-error` : help ? `${name}-help` : undefined}>
      <legend className="mb-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        {legend}
        {required && (
          <span className="text-negative" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </legend>
      <div className={`flex rounded-full bg-fill p-[3px] ${error ? "ring-[3px] ring-negative/15" : ""}`}>
        {options.map((option) => (
          <label key={option.value} className="relative flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="flex h-[34px] items-center justify-center rounded-full px-2 text-xs font-bold whitespace-nowrap text-muted peer-checked:bg-surface peer-checked:text-accent-text peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent max-md:h-10">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-[11px] font-semibold text-negative">
          <AlertIcon />
          {error}
        </p>
      ) : (
        help && (
          <p id={`${name}-help`} className="flex items-start gap-1.5 text-[11px] font-medium text-muted">
            <InfoIcon />
            <span>{help}</span>
          </p>
        )
      )}
    </fieldset>
  );
}

/** The mint signature surface of the live preview panel: the details card's treatment, with rings. */
export function PreviewPanel({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[22px] border border-feature-tile-line bg-feature-tile p-5 max-md:gap-3 max-md:p-4">
      <RingTexture width={320} height={600} dx={20} dy={40} first={30} step={30} stroke="var(--feature-tile-rings)" />
      <span className="text-[11px] font-extrabold tracking-[0.06em] text-accent-text uppercase max-md:hidden">Live preview</span>
      {children}
      {caption && <p className="text-[11px] font-semibold text-muted max-md:hidden">{caption}</p>}
    </div>
  );
}
