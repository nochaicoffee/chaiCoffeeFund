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

export interface InsuranceFormsData {
  demo: boolean;
  today: string;
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
  /** What the policies already cover ("You", "Car"), offered when adding. */
  covers: string[];
  policies: FormPolicy[];
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
  return {
    demo,
    today,
    accounts: data.accounts,
    cards: data.cards,
    covers: [...new Map(data.policies.map((p) => p.covers.trim()).filter(Boolean).map((c) => [c.toLowerCase(), c])).values()],
    policies,
    yearlyAll: yearlyCover(views.filter(isLive)),
  };
}
