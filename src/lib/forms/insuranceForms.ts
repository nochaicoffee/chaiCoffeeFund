import { NCB_STEPS, POLICY_COLORS, POLICY_KINDS, MAX_POLICY_YEARS, type Policy, type PolicyColor, type PolicyKind, type PolicyPayment } from "../sheets/types";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/**
 * The Insurance forms (#211), as designed in design/insurance/InsForms.dc.html: Add and Edit policy, Renew, and Cancel. Each one's
 * fields read into the input its write expects (lib/insurance/policyWrites.ts), or plain-word errors by field. The wording here is
 * the source of truth for the forms' messages. Where a term was paid from is one value, "account:<id>" or "card:<id>", as on the
 * other forms.
 */

type Known = { accountIds: string[]; cardIds: string[] };
const YEARS = Array.from({ length: MAX_POLICY_YEARS }, (_, i) => String(i + 1));
const NCB = NCB_STEPS.map(String);

/** A term as a form sends it. It belongs to the policy the write names. */
export type TermFields = Omit<PolicyPayment, "id" | "policyId" | "status">;

function readYears(f: FieldReader): number | undefined {
  const text = f.choice("years", YEARS, `Choose how long it lasts, from 1 to ${MAX_POLICY_YEARS} years`);
  return text === undefined ? undefined : Number(text);
}

/** The no-claim step, for a motor policy: blank is none, and anything else must be one of the steps. */
function readNcb(f: FieldReader, motor: boolean): number | undefined {
  const text = f.raw("ncb").trim();
  if (text === "") return undefined;
  if (!motor) {
    f.fail("ncb", "A no-claim bonus is for a motor policy");
    return undefined;
  }
  const step = f.choice("ncb", NCB, `Choose one of ${NCB_STEPS.join(", ")} percent`);
  return step === undefined ? undefined : Number(step);
}

/** The term the Add and Renew forms share: the cover's start, how many years, what was paid, and when. */
function readTerm(f: FieldReader, motor: boolean, startMessage: string): Partial<TermFields> {
  const periodStart = f.date("periodStart", startMessage);
  const years = readYears(f);
  const amount = f.amount("amount", { required: "Enter what you paid, with GST", label: "premium" });
  const paidOn = f.date("paidOn");
  const ncb = readNcb(f, motor);
  return { periodStart, years, amount, ...(paidOn !== undefined && { paidOn }), ...(ncb !== undefined && { ncb }) };
}

export interface PolicyFormInput {
  policy: Omit<Policy, "id" | "status" | "endedOn">;
  /** The first term, when adding. Editing a policy leaves its terms alone. */
  term?: TermFields;
}

/** Add policy, or Edit policy (`editing`: no term, since the terms are Renew's). */
export function readPolicyForm(fields: FormFields, known: Known, editing: boolean): FormResult<PolicyFormInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter the policy's name");
  const kind = f.choice<PolicyKind>("kind", POLICY_KINDS, "Choose what kind of policy it is");
  const insurer = f.text("insurer", "Enter the insurer");
  const covers = f.text("covers", "Say who or what it covers, like You or Car");
  const motor = kind === "Motor";
  // A motor policy can have no cover figure (third party only has no IDV); anything else needs one.
  const sumInsured = f.amount("sumInsured", { required: motor ? undefined : "Enter the cover, like 10,00,000", label: motor ? "IDV" : "cover" });
  const colorText = f.raw("color").trim();
  const color = colorText === "" ? undefined : f.choice<PolicyColor>("color", POLICY_COLORS, "Choose a colour from the list");
  const paid = readPaidFrom(f, "paidFrom", known);
  const documentUrl = f.text("documentUrl");
  if (documentUrl !== undefined && !/^https?:\/\/\S+$/.test(documentUrl)) f.fail("documentUrl", "Enter a link that starts with http:// or https://");
  const policyNumber = f.text("policyNumber");
  if (policyNumber?.startsWith("…")) f.fail("policyNumber", "Enter the whole policy number, not the shortened one");
  const term = editing ? undefined : readTerm(f, motor, "Enter when the cover starts");
  if (!f.ok || !name || !kind || !insurer || !covers) return { ok: false, errors: f.errors };
  const optional = { policyNumber, coversDetail: f.text("coversDetail"), color, addOns: f.text("addOns"), claimsPhone: f.text("claimsPhone"), documentUrl, notes: f.text("notes"), ...paid };
  const policy = { name, kind, insurer, covers, sumInsured: sumInsured ?? 0, ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)) } as PolicyFormInput["policy"];
  return { ok: true, input: { policy, ...(term && { term: term as TermFields }) } };
}

export interface RenewFormInput {
  policyId: string;
  term: TermFields & Pick<PolicyPayment, "paidFromAccountId" | "paidFromCardId">;
  /** The cover the new term gives, when the form has one (the new IDV of a vehicle). */
  sumInsured?: number;
}

/** Renew: the next term of a policy. `motor` says whether a no-claim step is allowed (the policy's kind). */
export function readRenewForm(fields: FormFields, known: Known, motor: boolean): FormResult<RenewFormInput> {
  const f = new FieldReader(fields);
  const policyId = f.text("policyId", "Choose the policy");
  const term = readTerm(f, motor, "Enter when the new term starts");
  const sumInsured = f.amount("sumInsured", { label: "cover" });
  const paid = readPaidFrom(f, "paidFrom", known);
  if (!f.ok || !policyId) return { ok: false, errors: f.errors };
  return { ok: true, input: { policyId, term: { ...(term as TermFields), ...paid }, ...(sumInsured !== undefined && { sumInsured }) } };
}

export interface CancelFormInput {
  policyId: string;
  endedOn?: string;
  reason?: string;
}

/** Cancel: the day it stopped (it may be left out) and why. */
export function readCancelForm(fields: FormFields): FormResult<CancelFormInput> {
  const f = new FieldReader(fields);
  const policyId = f.text("policyId", "Choose the policy");
  const endedOn = f.date("endedOn");
  const reason = f.text("reason");
  if (!f.ok || !policyId) return { ok: false, errors: f.errors };
  return { ok: true, input: { policyId, ...(endedOn !== undefined && { endedOn }), ...(reason !== undefined && { reason }) } };
}

/**
 * What an Edit writes for the policy it read: a blank optional box clears its column, the colour is only ever set (the palette has no
 * "none"), and the policy number is only written when one was typed, since the browser never has the whole number to show. Where it
 * was paid from is both columns, so choosing a card clears the account and a blank clears both.
 */
export function policyEditPatch(policy: PolicyFormInput["policy"]): Record<string, string | number> {
  const { policyNumber, color, paidFromAccountId, paidFromCardId, ...rest } = policy;
  return {
    ...rest,
    coversDetail: rest.coversDetail ?? "",
    addOns: rest.addOns ?? "",
    claimsPhone: rest.claimsPhone ?? "",
    documentUrl: rest.documentUrl ?? "",
    notes: rest.notes ?? "",
    paidFromAccountId: paidFromAccountId ?? "",
    paidFromCardId: paidFromCardId ?? "",
    ...(policyNumber !== undefined && { policyNumber }),
    ...(color !== undefined && { color }),
  };
}
