"use client";

import { useRef, useState } from "react";
import { saveCategory, setCategoryStatus } from "@/app/daily/actions";
import type { CategoryView } from "@/app/daily/views";
import { CATEGORY_COLOR_CHOICES } from "@/lib/daily/categories";
import { cardColorKey, colorName } from "@/lib/format/colors";
import { COLORS } from "@/lib/sheets/types";
import { CheckIcon, CloseIcon } from "../cards/forms/icons";
import { CategoryTile } from "./CategoryPicker";
import { useDaily } from "./context";

/**
 * Manage categories: rename, recolour, or hide one from the chips. Nothing is deleted, so the spends a category has, and old months, keep it. A change is
 * saved as soon as it's made; the list shows it at once and the page catches up.
 */
export function ManageCategories() {
  const daily = useDaily();
  const [local, setLocal] = useState<Record<string, Partial<CategoryView>>>({});
  const [editing, setEditing] = useState<{ id: string; field: "name" | "color" } | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  // Enter and then the input losing focus would save a rename twice: one save at a time for a category.
  const inflight = useRef(new Set<string>());
  const all = [...daily.categories, ...daily.addedCategories.filter((a) => !daily.categories.some((c) => c.id === a.id))].map((c) => ({ ...c, ...local[c.id] }));

  async function change(id: string, patch: Partial<CategoryView>, run: () => Promise<{ status: string; errors?: Record<string, string> }>) {
    if (inflight.current.has(id)) return;
    inflight.current.add(id);
    setError(undefined);
    const before = local[id];
    setLocal((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
    try {
      const result = await run();
      if (result.status === "invalid") throw new Error(result.errors?.name ?? result.errors?.form ?? "That didn't save.");
      if (result.status !== "saved") throw new Error("Couldn't save it. Try again.");
      setEditing(null);
    } catch (e) {
      setLocal((l) => ({ ...l, [id]: before ?? {} }));
      setError(e instanceof Error ? e.message : "Couldn't reach the app.");
    } finally {
      inflight.current.delete(id);
    }
  }
  const rename = (c: CategoryView) => {
    const data = new FormData();
    data.set("id", c.id);
    data.set("name", name);
    data.set("color", colorName(c.colorKey));
    return change(c.id, { name: name.trim().replace(/\s+/g, " ") }, () => saveCategory({ status: "idle" }, data));
  };
  const recolour = (c: CategoryView, color: string) => {
    const data = new FormData();
    data.set("id", c.id);
    data.set("name", c.name);
    data.set("color", color);
    return change(c.id, { colorKey: cardColorKey(color as (typeof COLORS)[number]) }, () => saveCategory({ status: "idle" }, data));
  };
  const toggle = (c: CategoryView) => {
    const data = new FormData();
    data.set("id", c.id);
    data.set("status", c.hidden ? "Active" : "Hidden");
    return change(c.id, { hidden: !c.hidden }, () => setCategoryStatus({ status: "idle" }, data));
  };

  return (
    <div className="mg" role="list">
      {error && <p className="err" role="alert">{error}</p>}
      {all.map((c) => (
        <div key={c.id} role="listitem">
          <div className={`mg-r${c.hidden ? " off" : ""}`}>
            <CategoryTile category={c} />
            <span className="mg-n">
              {editing?.id === c.id && editing.field === "name" ? (
                <span className="inp" style={{ height: 36 }}>
                  <input data-autofocus value={name} aria-label={`Name for ${c.name}`} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(c); if (e.key === "Escape") setEditing(null); }} onBlur={() => name.trim() && name.trim() !== c.name && rename(c)} />
                </span>
              ) : (
                <>
                  <b>{c.name}</b>
                  {!c.builtIn && <em>yours</em>}
                </>
              )}
            </span>
            <button type="button" className="mg-a" aria-label={`Rename ${c.name}`} onClick={() => { setName(c.name); setEditing(editing?.id === c.id && editing.field === "name" ? null : { id: c.id, field: "name" }); }}>
              ✎
            </button>
            <button type="button" className="mg-a" aria-label={`Colour for ${c.name}`} aria-expanded={editing?.id === c.id && editing.field === "color"} onClick={() => setEditing(editing?.id === c.id && editing.field === "color" ? null : { id: c.id, field: "color" })}>
              <i style={{ background: `var(--card-${c.colorKey})` }} />
            </button>
            <button type="button" className={`mg-a eye${c.hidden ? " off" : ""}`} aria-label={c.hidden ? `Show ${c.name} in the list` : `Hide ${c.name} from the list`} aria-pressed={!c.hidden} onClick={() => toggle(c)}>
              {c.hidden ? <CloseIcon /> : <CheckIcon />}
            </button>
          </div>
          {editing?.id === c.id && editing.field === "color" && (
            <div className="mg-edit">
              <div className="swatches" role="radiogroup" aria-label={`Colour for ${c.name}`}>
                {CATEGORY_COLOR_CHOICES.map((color) => (
                  <button key={color} type="button" role="radio" aria-checked={cardColorKey(color) === c.colorKey} aria-label={color} className={`sw-c${cardColorKey(color) === c.colorKey ? " on" : ""}`} style={{ background: `var(--card-${cardColorKey(color)})` }} onClick={() => recolour(c, color)}>
                    {cardColorKey(color) === c.colorKey && <CheckIcon />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <p className="note-p" style={{ marginTop: 8 }}>
        The pencil renames, the dot recolours, the tick hides a category from the chips. A hidden one stays on the spends it has and in old months. There&apos;s no delete.
      </p>
    </div>
  );
}
