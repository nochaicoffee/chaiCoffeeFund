import { isLive, renewalDefaults, yearlyCover, type PolicyState, type RenewalDefaults } from "@/lib/aggregate/insurance";
import { toClientPolicy } from "@/lib/forms/clientPolicy";
import type { ColorKey } from "@/lib/format/colors";
import type { PolicyKind } from "@/lib/sheets/types";
import { allViews, policyColor, type InsuranceData } from "./views";

/**
 * What the Insurance forms start from (docs/design/insurance.md, InsForms), as plain data for the client: each policy as a form needs
 * it (its policy number cut to the last four, never whole), what Renew pre-fills, and the accounts and cards a premium can be paid
 * from. Built from the same views as the page, so the forms and the page agree on what a policy is today.
 */

export interface FormPolicy {
  id: string;
  name: string;
  kind: PolicyKind;
  insurer: string;
  covers: string;
  coversDetail: string;
  /** "…3850", or "" when none is recorded. */
  policyNumber: string;
  sumInsured: number;
  colorKey: ColorKey;
  cancelled: boolean;
  endedOn: string;
  /** "account:<id>", "card:<id>" or "": where it's usually paid from. */
  paidFrom: string;
  addOns: string;
  claimsPhone: string;
  documentUrl: string;
  notes: string;
  state: PolicyState;
  /** The renewal date, when a term is recorded. */
  renewsOn: string | null;
  /** What Renew starts from; null with no term to renew from. */
  defaults: RenewalDefaults | null;
  /** The last term's years and cost, to compare a quote with. */
  last: { years: number; amount: number } | null;
  /** A year of cover while it's in force. */
  yearly: number | null;
}

/** A recorded term, as Edit payment starts from it. */
export interface FormPayment {
  id: string;
  policyId: string;
  periodStart: string;
  years: number;
  amount: number;
  /** The day it was paid, or "" when it isn't known (the start of cover is used and marked assumed). */
  paidOn: string;
  ncb: string;
  /** "account:<id>", "card:<id>" or "". */
  paidFrom: string;
  /** What the policy's other terms cost a year, for the change it makes: the term before this one, when there is one. */
  before: { years: number; amount: number } | null;
}

export interface InsuranceFormsData {
  demo: boolean;
  today: string;
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
  /** What the policies already cover ("You", "Car"), offered when adding. */
  covers: string[];
  policies: FormPolicy[];
  /** Every recorded (Paid) term, to edit or delete. */
  payments: FormPayment[];
  /** A year of cover across everything in force, for Cancel's before and after. */
  yearlyAll: number;
}

export function insuranceFormsData(data: InsuranceData, today: string, demo: boolean): InsuranceFormsData {
  const views = allViews(data, today);
  const policies = views.map((v): FormPolicy => {
    const p = toClientPolicy(v.policy);
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      insurer: p.insurer,
      covers: p.covers,
      coversDetail: p.coversDetail ?? "",
      policyNumber: p.policyNumber ?? "",
      sumInsured: p.sumInsured,
      colorKey: policyColor(p),
      cancelled: p.status === "Cancelled",
      endedOn: p.endedOn ?? "",
      paidFrom: p.paidFromCardId ? `card:${p.paidFromCardId}` : p.paidFromAccountId ? `account:${p.paidFromAccountId}` : "",
      addOns: p.addOns ?? "",
      claimsPhone: p.claimsPhone ?? "",
      documentUrl: p.documentUrl ?? "",
      notes: p.notes ?? "",
      state: v.state,
      renewsOn: v.renewsOn,
      defaults: renewalDefaults(v, today),
      last: v.latest ? { years: v.latest.payment.years, amount: v.latest.payment.amount } : null,
      yearly: v.yearly,
    };
  });
  const payments = views.flatMap((v) =>
    v.terms.map((t, k): FormPayment => ({
      id: t.payment.id,
      policyId: v.policy.id,
      periodStart: t.payment.periodStart,
      years: t.payment.years,
      amount: t.payment.amount,
      paidOn: t.payment.paidOn ?? "",
      ncb: t.payment.ncb !== undefined ? String(t.payment.ncb) : "",
      paidFrom: t.payment.paidFromCardId ? `card:${t.payment.paidFromCardId}` : t.payment.paidFromAccountId ? `account:${t.payment.paidFromAccountId}` : "",
      before: k > 0 ? { years: v.terms[k - 1].payment.years, amount: v.terms[k - 1].payment.amount } : null,
    })),
  );
  return {
    demo,
    today,
    accounts: data.accounts,
    cards: data.cards,
    covers: [...new Map(data.policies.map((p) => p.covers.trim()).filter(Boolean).map((c) => [c.toLowerCase(), c])).values()],
    policies,
    payments,
    yearlyAll: yearlyCover(views.filter(isLive)),
  };
}
