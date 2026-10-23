"use client";

import { useState, type KeyboardEvent } from "react";
import { colorGradient, familiesOf, type ColorKey } from "@/lib/format/colors";
import type { Color } from "@/lib/sheets/types";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const gradient = (c: Color) => colorGradient(c.toLowerCase() as ColorKey);

/**
 * The colour picker in a form's preview panel (Prathik's pick, 2026-10-23): choose a colour family,
 * then a shade in it. The family pills are named, and the one holding the current pick has a tick;
 * the shades under them are named too, so nothing is guessed from a bare swatch, and the form is
 * the same height whatever is picked. The pick is a hidden input, so it submits with the form
 * whichever family is showing. One picker for Add card, Add account and Add subscription; it
 * offers whichever of the palette it's given.
 */
export function ColorSwatches({ colors, value, onChange, error }: { colors: readonly Color[]; value: string; onChange: (color: string) => void; error?: string }) {
  const families = familiesOf(colors);
  const familyOfValue = families.findIndex((f) => f.colors.includes(value as Color));
  // The family being browsed; it follows the pick until the user opens another.
  const [browsing, setBrowsing] = useState(Math.max(0, familyOfValue));
  // A pick made from outside (a form reset, another row) brings its family into view.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (familyOfValue >= 0) setBrowsing(familyOfValue);
  }
  const family = families[browsing] ?? families[0];
  const rovingIndex = Math.max(0, family.colors.indexOf(value as Color));

  // Arrow keys move through the shades and pick as they go, as native radios do.
  function onShadeKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (rovingIndex + step + family.colors.length) % family.colors.length;
    onChange(family.colors[next]);
    (event.currentTarget.children[next] as HTMLElement).focus();
  }

  return (
    <fieldset aria-describedby={error ? "color-error" : undefined}>
      <legend className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        Colour<span className="text-negative" aria-hidden="true"> *</span>
      </legend>
      <input type="hidden" name="color" value={value} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour family">
        {families.map((f, i) => {
          const holdsPick = i === familyOfValue;
          return (
            <button
              key={f.name}
              type="button"
              aria-pressed={i === browsing}
              onClick={() => setBrowsing(i)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-xs font-semibold text-fg ${focus} ${i === browsing ? "border-accent bg-surface ring-2 ring-accent/25" : "border-surface-line bg-surface/70 hover:bg-surface"}`}
            >
              <span aria-hidden="true" className="size-[18px] rounded-md" style={{ background: gradient(holdsPick ? (value as Color) : f.colors[0]) }} />
              {f.name}
              {holdsPick && (
                <span className="flex size-3.5 items-center justify-center rounded-full bg-accent text-[9px] leading-none font-bold text-on-accent">
                  <span aria-hidden="true">✓</span>
                  <span className="sr-only">, has your pick</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 rounded-xl bg-surface/55 px-2.5 pt-2.5 pb-1.5">
        <p className="mb-2 text-[11px] font-semibold text-muted">{family.name} shades</p>
        <div role="radiogroup" aria-label={`${family.name} shades`} onKeyDown={onShadeKey} className="flex flex-wrap gap-x-2.5 gap-y-2">
          {family.colors.map((c, i) => {
            const on = value === c;
            return (
              <button key={c} type="button" role="radio" aria-checked={on} tabIndex={i === rovingIndex ? 0 : -1} onClick={() => onChange(c)} className={`flex w-[46px] cursor-pointer flex-col items-center gap-1 rounded-[9px] ${focus}`}>
                <span
                  aria-hidden="true"
                  className={`relative flex size-9 items-center justify-center rounded-[9px] text-sm font-bold text-white shadow-[0_2px_5px_oklch(0_0_0/0.18)] ring-offset-2 ring-offset-feature-tile ${on ? "ring-2 ring-accent" : ""}`}
                  style={{ background: gradient(c) }}
                >
                  {on && <span className="[text-shadow:0_1px_2px_oklch(0_0_0/0.5)]">✓</span>}
                </span>
                <span className={`max-w-full truncate text-[10px] ${on ? "font-bold text-fg" : "font-semibold text-muted"}`}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-fg">
        <span aria-hidden="true" className="size-3 rounded-[4px]" style={{ background: gradient(value as Color) }} />
        {value}
      </p>
      {error && (
        <p id="color-error" className="mt-1.5 text-[11px] font-semibold text-negative">
          {error}
        </p>
      )}
    </fieldset>
  );
}
