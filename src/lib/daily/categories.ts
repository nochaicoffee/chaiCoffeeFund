import type { Color, DailyCategory } from "../sheets/types";

/**
 * The Daily page's categories (docs/design/daily.md, round 3). Eight are built in, here in code with a stable id, so the Sheet needs nothing
 * written before the first spend. A DailyCategories row either changes one of them (it names it in `builtIn`: a rename, a colour, hiding it) or
 * is a category he added. A spend keeps its category's id, so renaming or recolouring never touches a spend, and nothing is ever deleted.
 */
export interface CategoryDef {
  id: string;
  name: string;
  color: Color;
  hidden: boolean;
  builtIn: boolean;
  /** The DailyCategories row behind it, when there is one (a change to a built-in, or one he added). */
  rowId?: string;
}

export const BUILT_IN_CATEGORIES: { id: string; name: string; color: Color }[] = [
  { id: "food", name: "Food", color: "Copper" },
  { id: "groceries", name: "Groceries", color: "Olive" },
  { id: "transport", name: "Transport", color: "Ocean" },
  { id: "shopping", name: "Shopping", color: "Raspberry" },
  { id: "bills", name: "Bills", color: "Amber" },
  { id: "health", name: "Health", color: "Coral" },
  { id: "fun", name: "Fun", color: "Indigo" },
  { id: "other", name: "Other", color: "Slate" },
];

/** The colours a new category is offered: one from each family, spread around the wheel (the shared 36 stay valid in the Sheet for a fuller picker later). */
export const CATEGORY_COLOR_CHOICES: Color[] = ["Ruby", "Raspberry", "Coral", "Copper", "Amber", "Olive", "Emerald", "Teal", "Ocean", "Indigo", "Violet", "Slate"];

export const CATEGORY_NAME_MAX = 24;

/** Every category, built-ins first (with any change applied), then the ones he added in the order added. Hidden ones are included, marked. */
export function resolveCategories(rows: readonly DailyCategory[]): CategoryDef[] {
  const changes = new Map(rows.filter((r) => r.builtIn).map((r) => [r.builtIn as string, r]));
  const builtIns = BUILT_IN_CATEGORIES.map((b): CategoryDef => {
    const row = changes.get(b.id);
    return { id: b.id, name: row?.name ?? b.name, color: row?.color ?? b.color, hidden: row?.status === "Hidden", builtIn: true, rowId: row?.id };
  });
  const added = rows.filter((r) => !r.builtIn).map((r): CategoryDef => ({ id: r.id, name: r.name, color: r.color, hidden: r.status === "Hidden", builtIn: false, rowId: r.id }));
  return [...builtIns, ...added];
}

/** A category's name as typed, or why it can't be: empty, too long, or one already there (capitals ignored). `selfId` is the one being renamed. */
export function checkCategoryName(name: string, categories: readonly CategoryDef[], selfId?: string): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed === "") return { ok: false, error: "Give it a name" };
  if (trimmed.length > CATEGORY_NAME_MAX) return { ok: false, error: `Keep it under ${CATEGORY_NAME_MAX} characters` };
  const clash = categories.find((c) => c.id !== selfId && c.name.toLowerCase() === trimmed.toLowerCase());
  if (clash) return { ok: false, error: `${clash.name} is already there` };
  return { ok: true, name: trimmed };
}
