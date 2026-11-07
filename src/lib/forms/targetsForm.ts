import { parseAmountText } from "../format/money";
import { LIMIT_NAMES, TARGET_NAMES, type InvestmentTarget, type InvestmentTargetName } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Your targets and limits form (docs/design/investments.md, InvForms): eight numbers he may set, each blank until he does. A blank one is
 * not set (and clears one already set). Plain-word errors by field; the app never fills in a number of its own.
 */

export type TargetValues = Partial<Record<InvestmentTargetName, number>>;

const kindOf = (name: InvestmentTargetName): "Target" | "Limit" => ((TARGET_NAMES as readonly string[]).includes(name) ? "Target" : "Limit");

/** A share as typed: "35", "35%" or "7.5". Blank is not set. A share from 0 to 100, and nothing between 0 and 1 (which would be 35% typed as 0.35). */
function share(f: FieldReader, name: InvestmentTargetName): number | undefined {
  const text = f.raw(name).trim().replace(/%$/, "").trim();
  if (text === "") return undefined;
  const value = parseAmountText(text);
  if (value === null || !Number.isFinite(value)) {
    f.fail(name, "Enter a share as a number, like 35");
    return undefined;
  }
  if (value < 0 || value > 100) {
    f.fail(name, "A share is from 0 to 100");
    return undefined;
  }
  if (value > 0 && value < 1) {
    f.fail(name, "Enter it as 35 for 35%, not 0.35");
    return undefined;
  }
  return value;
}

export function readTargetsForm(fields: FormFields): FormResult<TargetValues> {
  const f = new FieldReader(fields);
  const values: TargetValues = {};
  for (const name of [...TARGET_NAMES, ...LIMIT_NAMES]) {
    const v = share(f, name);
    if (v !== undefined) values[name] = v;
  }
  const setTargets = TARGET_NAMES.filter((n) => values[n] !== undefined);
  const total = setTargets.reduce((s, n) => s + (values[n] ?? 0), 0);
  // Round before comparing: 33.3 + 33.3 + 33.4 is 100 whatever the floating point says.
  if (Math.round(total * 100) / 100 > 100) f.fail(setTargets[0] ?? "India-Equity", `Your targets add up to ${Math.round(total * 100) / 100}%: they can't be more than 100%`);
  else if (setTargets.length === TARGET_NAMES.length && Math.round(total * 100) / 100 !== 100) f.fail("India-Equity", `All four targets are set and add up to ${Math.round(total * 100) / 100}%: they should add up to 100%`);
  return f.ok ? f.result(values) : f.result(undefined as never);
}

export interface TargetWrites {
  create: Omit<InvestmentTarget, "id">[];
  update: { id: string; percent: number }[];
  remove: string[];
}

/** What to write so the saved rows say exactly `values`: new ones created, changed ones updated, blanked ones removed, and the rest left alone. */
export function planTargetWrites(existing: InvestmentTarget[], values: TargetValues): TargetWrites {
  const writes: TargetWrites = { create: [], update: [], remove: [] };
  for (const name of [...TARGET_NAMES, ...LIMIT_NAMES]) {
    const rows = existing.filter((t) => t.name === name);
    const wanted = values[name];
    if (wanted === undefined) writes.remove.push(...rows.map((r) => r.id));
    else if (rows.length === 0) writes.create.push({ kind: kindOf(name), name, percent: wanted });
    else {
      const [first, ...extra] = rows;
      if (first.percent !== wanted) writes.update.push({ id: first.id, percent: wanted });
      // A name that somehow has two rows keeps one.
      writes.remove.push(...extra.map((r) => r.id));
    }
  }
  return writes;
}

/** The saved rows as the form's fields: each name's percent as text, blank when not set. */
export function targetFieldValues(existing: InvestmentTarget[]): Record<InvestmentTargetName, string> {
  const out = {} as Record<InvestmentTargetName, string>;
  for (const name of [...TARGET_NAMES, ...LIMIT_NAMES]) {
    const row = existing.find((t) => t.name === name);
    out[name] = row ? String(row.percent) : "";
  }
  return out;
}
