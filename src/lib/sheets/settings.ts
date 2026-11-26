import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { LOOKS, SETTING_KEYS, type Setting } from "./types";
import { nonEmptyString } from "./validation";

/** Which values each key may hold (ADR 0018). A key with no rule here takes any non-empty text. */
const ALLOWED: Record<Setting["key"], readonly string[] | undefined> = { look: LOOKS };

/** A key's value must be one it allows; an update that changes the value must name its key, so the value can be checked. */
const refine = (row: Partial<Pick<Setting, "key" | "value">>, ctx: z.RefinementCtx) => {
  if (row.value === undefined) return;
  if (row.key === undefined) {
    ctx.addIssue({ code: "custom", path: ["key"], message: "Send the key with its value" });
    return;
  }
  const allowed = ALLOWED[row.key];
  if (allowed && !allowed.includes(row.value)) ctx.addIssue({ code: "custom", path: ["value"], message: `${row.key} is one of ${allowed.join(", ")}` });
};

const settingFields = z.object({ key: z.enum(SETTING_KEYS), value: nonEmptyString });

export const createSettingSchema = settingFields.superRefine(refine);
export const updateSettingSchema = settingFields.partial().superRefine(refine);
/** A row as read back from the Sheet: a valid create, plus its id. */
export const settingRowSchema = settingFields.extend({ id: nonEmptyString }).superRefine(refine);

/** The Settings tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=Settings`. */
export const SETTING_COLUMNS: (keyof Setting)[] = ["id", "key", "value"];

export const settingsRepository = createRepository<Setting>({
  sheetName: "Settings",
  columns: SETTING_COLUMNS,
  schema: settingRowSchema,
  // One row per key: saveLook updates the look's row when it has one instead of adding a second.
});
