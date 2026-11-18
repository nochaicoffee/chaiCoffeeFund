import { checkCategoryName, type CategoryDef } from "../daily/categories";
import { COLORS, type Color } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/** Add a category, or rename or recolour one (docs/design/daily.md, round 3): a name and a colour. `selfId` is the one being changed, so it may keep its own name. */
export interface CategoryInput {
  name: string;
  color: Color;
}

export function readCategoryForm(fields: FormFields, categories: readonly CategoryDef[], selfId?: string): FormResult<CategoryInput> {
  const f = new FieldReader(fields);
  const checked = checkCategoryName(f.raw("name"), categories, selfId);
  if (!checked.ok) f.fail("name", checked.error);
  const color = f.choice("color", COLORS, "Pick a colour");
  if (!f.ok || !checked.ok || !color) return { ok: false, errors: f.errors };
  return { ok: true, input: { name: checked.name, color } };
}
