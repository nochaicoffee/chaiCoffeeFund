import { describe, expect, it } from "vitest";
import { policyEditPatch, readCancelForm, readPolicyForm, readRenewForm } from "./insuranceForms";

const known = { accountIds: ["acc-1"], cardIds: ["card-1"] };
const health = { name: "Health · Lifetime Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: "50,00,000", periodStart: "2026-07-05", years: "3", amount: "38,427.59", paidOn: "" };
const car = { name: "Car · Comprehensive", kind: "Motor", insurer: "Acko", covers: "Car", sumInsured: "4,42,000", periodStart: "2026-08-06", years: "1", amount: "5,504", ncb: "50", paidFrom: "card:card-1", color: "Copper" };

describe("readPolicyForm (add)", () => {
  it("reads a health policy and its first term: a single premium for three years, with no paid-on day", () => {
    expect(readPolicyForm(health, known, false)).toEqual({
      ok: true,
      input: { policy: { name: "Health · Lifetime Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: 5_000_000 }, term: { periodStart: "2026-07-05", years: 3, amount: 38_427.59 } },
    });
  });

  it("reads a car with its no-claim step, colour and where it was paid from", () => {
    const result = readPolicyForm(car, known, false);
    expect(result).toMatchObject({ ok: true, input: { policy: { kind: "Motor", sumInsured: 442_000, color: "Copper", paidFromCardId: "card-1" }, term: { years: 1, amount: 5_504, ncb: 50 } } });
  });

  it("says what's missing in plain words, beside each field", () => {
    const result = readPolicyForm({ kind: "", years: "", amount: "" }, known, false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      name: "Enter the policy's name",
      kind: "Choose what kind of policy it is",
      insurer: "Enter the insurer",
      covers: "Say who or what it covers, like You or Car",
      sumInsured: "Enter the cover, like 10,00,000",
      periodStart: "Enter when the cover starts",
      years: "Choose how long it lasts, from 1 to 5 years",
      amount: "Enter what you paid, with GST",
    });
  });

  it("lets a motor policy have no cover figure (third party only), and no other kind", () => {
    expect(readPolicyForm({ ...car, sumInsured: "" }, known, false)).toMatchObject({ ok: true, input: { policy: { sumInsured: 0 } } });
    const result = readPolicyForm({ ...health, sumInsured: "" }, known, false);
    expect(result.ok).toBe(false);
  });

  it("refuses a length outside one to five years, and a no-claim step that isn't on the list", () => {
    for (const years of ["0", "6", "2.5", "three"]) expect(readPolicyForm({ ...health, years }, known, false)).toMatchObject({ ok: false, errors: { years: expect.any(String) } });
    expect(readPolicyForm({ ...car, ncb: "30" }, known, false)).toMatchObject({ ok: false, errors: { ncb: "Choose one of 0, 20, 25, 35, 45, 50 percent" } });
  });

  it("only a motor policy takes a no-claim step", () => {
    expect(readPolicyForm({ ...health, ncb: "20" }, known, false)).toMatchObject({ ok: false, errors: { ncb: "A no-claim bonus is for a motor policy" } });
  });

  it("refuses a card or account you don't have, a link that isn't http, and the shortened policy number", () => {
    expect(readPolicyForm({ ...car, paidFrom: "card:other" }, known, false)).toMatchObject({ ok: false, errors: { paidFrom: expect.any(String) } });
    expect(readPolicyForm({ ...health, documentUrl: "javascript:alert(1)" }, known, false)).toMatchObject({ ok: false, errors: { documentUrl: "Enter a link that starts with http:// or https://" } });
    expect(readPolicyForm({ ...health, policyNumber: "…3850" }, known, false)).toMatchObject({ ok: false, errors: { policyNumber: "Enter the whole policy number, not the shortened one" } });
  });

  it("keeps the optional text it was given and drops the rest", () => {
    const result = readPolicyForm({ ...health, policyNumber: "LIFET2050113850", addOns: "OPD, Shield", claimsPhone: "1800-102-4461", notes: "", documentUrl: "https://example.com/p.pdf" }, known, false);
    expect(result).toMatchObject({ ok: true, input: { policy: { policyNumber: "LIFET2050113850", addOns: "OPD, Shield", claimsPhone: "1800-102-4461", documentUrl: "https://example.com/p.pdf" } } });
    if (result.ok) expect("notes" in result.input.policy).toBe(false);
  });
});

describe("readPolicyForm (edit)", () => {
  it("reads the policy alone: the terms are Renew's, so none of the term fields are asked for", () => {
    const result = readPolicyForm({ name: "Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: "50,00,000" }, known, true);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.term).toBeUndefined();
  });
});

describe("readRenewForm", () => {
  it("reads the next term, the new cover and where it was paid from", () => {
    const result = readRenewForm({ policyId: "pol-1", periodStart: "2027-08-06", years: "1", amount: "5,300", ncb: "50", sumInsured: "3,90,000", paidFrom: "account:acc-1", paidOn: "2027-08-03" }, known, true);
    expect(result).toEqual({
      ok: true,
      input: { policyId: "pol-1", term: { periodStart: "2027-08-06", years: 1, amount: 5_300, paidOn: "2027-08-03", ncb: 50, paidFromAccountId: "acc-1" }, sumInsured: 390_000 },
    });
  });

  it("leaves the cover alone when the box is blank", () => {
    const result = readRenewForm({ policyId: "pol-1", periodStart: "2027-03-21", years: "1", amount: "473" }, known, false);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect("sumInsured" in result.input).toBe(false);
  });

  it("says what's missing", () => {
    const result = readRenewForm({}, known, true);
    expect(result).toMatchObject({ ok: false, errors: { policyId: "Choose the policy", periodStart: "Enter when the new term starts", years: expect.any(String), amount: "Enter what you paid, with GST" } });
  });

  it("refuses a date that doesn't exist, and a negative premium", () => {
    expect(readRenewForm({ policyId: "p", periodStart: "2027-02-30", years: "1", amount: "5" }, known, true)).toMatchObject({ ok: false, errors: { periodStart: "Enter a date, like 5 Aug 2026" } });
    expect(readRenewForm({ policyId: "p", periodStart: "2027-02-01", years: "1", amount: "-5" }, known, true)).toMatchObject({ ok: false, errors: { amount: expect.stringContaining("negative") } });
  });
});

describe("readCancelForm", () => {
  it("reads the day and the reason, and either may be left out", () => {
    expect(readCancelForm({ policyId: "pol-1", endedOn: "2026-11-02", reason: "Vehicle sold" })).toEqual({ ok: true, input: { policyId: "pol-1", endedOn: "2026-11-02", reason: "Vehicle sold" } });
    expect(readCancelForm({ policyId: "pol-1" })).toEqual({ ok: true, input: { policyId: "pol-1" } });
  });

  it("refuses an unreadable day and says which policy is missing", () => {
    expect(readCancelForm({ policyId: "pol-1", endedOn: "soon" })).toMatchObject({ ok: false, errors: { endedOn: "Enter a date, like 5 Aug 2026" } });
    expect(readCancelForm({})).toMatchObject({ ok: false, errors: { policyId: "Choose the policy" } });
  });
});

describe("policyEditPatch", () => {
  const read = (fields: Record<string, string>) => {
    const result = readPolicyForm({ name: "Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: "50,00,000", ...fields }, known, true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return policyEditPatch(result.input.policy);
  };

  it("a blank optional box clears its column", () => {
    expect(read({})).toMatchObject({ coversDetail: "", addOns: "", claimsPhone: "", documentUrl: "", notes: "", paidFromAccountId: "", paidFromCardId: "" });
  });

  it("a blank policy number is left as it is, since the browser never has the whole one", () => {
    expect("policyNumber" in read({})).toBe(false);
    expect(read({ policyNumber: "LIFET2050113850" })).toMatchObject({ policyNumber: "LIFET2050113850" });
  });

  it("the colour is only ever set, and choosing a card or an account names just that one", () => {
    expect("color" in read({})).toBe(false);
    expect(read({ color: "Teal" })).toMatchObject({ color: "Teal" });
    expect(read({ paidFrom: "card:card-1" })).toMatchObject({ paidFromCardId: "card-1", paidFromAccountId: "" });
    expect(read({ paidFrom: "account:acc-1" })).toMatchObject({ paidFromAccountId: "acc-1", paidFromCardId: "" });
  });

  it("carries the fields that were typed", () => {
    expect(read({ notes: "Waiting periods apply" })).toMatchObject({ name: "Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: 5_000_000, notes: "Waiting periods apply" });
  });
});
