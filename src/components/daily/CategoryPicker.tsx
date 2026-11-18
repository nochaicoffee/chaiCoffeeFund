"use client";

import { useState } from "react";
import { saveCategory } from "@/app/daily/actions";
import type { CategoryView } from "@/app/daily/views";
import { CATEGORY_COLOR_CHOICES, CATEGORY_NAME_MAX } from "@/lib/daily/categories";
import { cardColorKey } from "@/lib/format/colors";
import { CheckIcon, PlusIcon } from "../cards/forms/icons";
import { useDaily } from "./context";

/** A category's tile: its colour with the first letter of its name, since a category he added has no icon. */
export function CategoryTile({ category, small }: { category: Pick<CategoryView, "name" | "colorKey">; small?: boolean }) {
  return (
    <span className={`tile${small ? " s" : ""}`} style={{ ["--cc" as string]: `var(--card-${category.colorKey})` }} aria-hidden="true">
      {category.name === "No category" ? "•" : category.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * The category chips (docs/design/daily.md, round 3): the ones on offer in the order they were made, a "+ New" chip that opens a name and a colour right
 * here, and Manage. A new category is saved at once and chosen for the spend being added. Hidden ones aren't offered, unless the spend already has one.
 */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const daily = useDaily();
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<(typeof CATEGORY_COLOR_CHOICES)[number]>("Violet");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const known = new Map([...daily.categories, ...daily.addedCategories].map((c) => [c.id, c]));
  const offered = [...known.values()].filter((c) => !c.hidden || c.id === value);

  async function save() {
    setBusy(true);
    setError(undefined);
    const data = new FormData();
    data.set("name", name);
    data.set("color", color);
    try {
      const result = await saveCategory({ status: "idle" }, data);
      if (result.status === "saved" && result.id) {
        daily.noteCategory({ id: result.id, name: name.trim().replace(/\s+/g, " "), colorKey: cardColorKey(color), hidden: false, builtIn: false });
        onChange(result.id);
        setMaking(false);
        setName("");
      } else if (result.status === "invalid") setError(result.errors.name ?? result.errors.color ?? result.errors.form ?? "That didn't save.");
      else setError("Couldn't save it. Try again.");
    } catch {
      setError("Couldn't reach the app. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="fcs" role="radiogroup" aria-label="Category">
        {offered.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={c.id === value} className={`fc${c.id === value ? " on" : ""}`} onClick={() => onChange(c.id === value ? "" : c.id)}>
            <i style={{ background: `var(--card-${c.colorKey})` }} />
            {c.name}
          </button>
        ))}
        <button type="button" className="fc new" aria-expanded={making} onClick={() => setMaking((v) => !v)}>
          <PlusIcon /> New
        </button>
        <button type="button" className="fc-link" onClick={daily.openManage}>
          Manage
        </button>
      </div>
      {making && (
        <div className="ncat">
          <label className="inp">
            <span className="sr-only">Category name</span>
            <input autoFocus value={name} maxLength={CATEGORY_NAME_MAX + 6} placeholder="Name, like Pets" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())} />
          </label>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {CATEGORY_COLOR_CHOICES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} className={`sw-c${c === color ? " on" : ""}`} style={{ background: `var(--card-${cardColorKey(c)})` }} onClick={() => setColor(c)}>
                {c === color && <CheckIcon />}
              </button>
            ))}
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="ncat-act">
            <button type="button" className="btn-s" onClick={() => setMaking(false)}>
              Cancel
            </button>
            <button type="button" className="btn-s go" disabled={busy || name.trim() === ""} onClick={save}>
              {busy ? "Saving…" : `Save “${name.trim() || "category"}”`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
