import { describe, expect, it } from "vitest";
import { addPolicy, cancelPolicy, createTerm, deletePolicy, editableFields, parsePolicyUndo, parseRenewalUndo, policyUndoToken, renewPolicy, renewalUndoToken, restartPolicy, undoRenewal, updateTerm, type InsuranceRepos } from "./policyWrites";
import { checkPolicy } from "../sheets/policies";
import { checkPolicyPayment } from "../sheets/policyPayments";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import { coverGaps, paidTerms, viewPolicy } from "../aggregate/insurance";
import type { Policy, PolicyPayment } from "../sheets/types";

/** In-memory repositories that behave as the real one does: an update is merged over the row and the whole row checked before it's kept. */
function memory<T extends { id: string }>(check: (row: Omit<T, "id">) => string | null, failOnCreate?: () => boolean) {
  const rows: T[] = [];
  let next = 1;
  return {
    rows,
    list: async () => rows.map((r) => ({ ...r })),
    get: async (id: string) => rows.find((r) => r.id === id) ?? null,
    create: async (input: Omit<T, "id">) => {
      if (failOnCreate?.()) throw new Error("Sheets is down");
      const problem = check(input);
      if (problem) throw new InvalidRowError(problem);
      const row = { ...input, id: `id-${next++}` } as T;
      rows.push(row);
      return row;
    },
    update: async (id: string, patch: Partial<Omit<T, "id">>) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at < 0) throw new NotFoundError("gone");
      const merged = { ...rows[at], ...patch } as T;
      const problem = check(merged);
      if (problem) throw new InvalidRowError(problem);
      rows[at] = merged;
      return merged;
    },
    // As the real repository's remove: a row that's already gone is not an error.
    remove: async (id: string) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at >= 0) rows.splice(at, 1);
    },
    removeWhere: async (match: (values: Partial<Record<keyof T, unknown>>) => boolean) => {
      let n = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (!match(rows[i])) continue;
        rows.splice(i, 1);
        n++;
      }
      return n;
    },
  };
}
const setup = (failPayments?: () => boolean) => {
  const policies = memory<Policy>(checkPolicy);
  const payments = memory<PolicyPayment>(checkPolicyPayment, failPayments);
  return { repos: { policies, payments } as InsuranceRepos, policies, payments };
};

const accident = { name: "Accident · Owner-driver cover", kind: "Accident" as const, insurer: "Digit", covers: "You", sumInsured: 1_500_000, status: "Active" as const };
const car = { name: "Car · Comprehensive", kind: "Motor" as const, insurer: "Acko", covers: "Car", sumInsured: 442_000, status: "Active" as const };
const firstTerm = { periodStart: "2026-03-21", years: 1, amount: 451, paidOn: "2026-03-18" };

describe("addPolicy", () => {
  it("writes the policy and its first term, as a Paid payment for the policy", async () => {
    const { repos, policies, payments } = setup();
    const { policy, payment } = await addPolicy(repos, accident, firstTerm);
    expect(policies.rows).toHaveLength(1);
    expect(payments.rows).toEqual([expect.objectContaining({ id: payment.id, policyId: policy.id, status: "Paid", years: 1, amount: 451, periodStart: "2026-03-21" })]);
  });

  it("takes the policy back out if its first term can't be written, so Try again starts clean", async () => {
    const { repos, policies, payments } = setup(() => true);
    await expect(addPolicy(repos, accident, firstTerm)).rejects.toThrow("Sheets is down");
    expect(policies.rows).toEqual([]);
    expect(payments.rows).toEqual([]);
  });

  it("refuses a no-claim step on a policy that isn't motor, before writing anything", async () => {
    const { repos, policies } = setup();
    await expect(addPolicy(repos, accident, { ...firstTerm, ncb: 20 })).rejects.toThrow("A no-claim bonus is for a motor policy");
    expect(policies.rows).toEqual([]);
  });

  it("refuses a policy the schema refuses (an active one with an end date)", async () => {
    const { repos, policies } = setup();
    await expect(addPolicy(repos, { ...accident, endedOn: "2026-01-01" }, firstTerm)).rejects.toThrow();
    expect(policies.rows).toEqual([]);
  });
});

describe("renewPolicy", () => {
  it("records the next term on time: it starts the day the last one ends, and the policy is covered through it", async () => {
    const { repos, payments } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    const { payment } = await renewPolicy(repos, policy.id, { periodStart: "2027-03-21", years: 1, amount: 473, paidOn: "2027-03-18" });
    expect(payment).toMatchObject({ policyId: policy.id, status: "Paid", amount: 473 });
    const view = viewPolicy(policy, payments.rows, "2027-03-25");
    expect(view.state).toBe("In force");
    expect(view.renewsOn).toBe("2028-03-21");
    expect(coverGaps(view.terms)).toEqual([]);
  });

  it("records a late renewal and keeps the gap in the history", async () => {
    const { repos, payments } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await renewPolicy(repos, policy.id, { periodStart: "2027-03-27", years: 1, amount: 473, paidOn: "2027-03-27" });
    expect(coverGaps(paidTerms(policy.id, payments.rows))).toEqual([{ from: "2027-03-21", to: "2027-03-26", days: 6 }]);
    expect(viewPolicy(policy, payments.rows, "2027-03-25").state).toBe("Lapsed");
    expect(viewPolicy(policy, payments.rows, "2027-03-28").state).toBe("In force");
  });

  it("refuses to renew twice for the same start, and a term that overlaps one already there", async () => {
    const { repos, payments } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await renewPolicy(repos, policy.id, { periodStart: "2027-03-21", years: 1, amount: 473 });
    await expect(renewPolicy(repos, policy.id, { periodStart: "2027-03-21", years: 1, amount: 473 })).rejects.toThrow("already has a term that starts on Mar 21, 2027");
    await expect(renewPolicy(repos, policy.id, { periodStart: "2027-09-01", years: 1, amount: 473 })).rejects.toThrow("overlaps");
    expect(payments.rows).toHaveLength(2);
  });

  it("moves the policy's cover to the new term's, and Undo takes the term out and puts the old cover back", async () => {
    const { repos, policies, payments } = setup();
    const { policy } = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    const renewal = await renewPolicy(repos, policy.id, { periodStart: "2027-08-06", years: 1, amount: 5_300, ncb: 50 }, 390_000);
    expect(policies.rows[0].sumInsured).toBe(390_000);
    expect(renewal.previousSumInsured).toBe(442_000);
    await undoRenewal(repos, policy.id, { paymentId: renewal.payment.id, previousSumInsured: renewal.previousSumInsured });
    expect(payments.rows).toHaveLength(1);
    expect(policies.rows[0].sumInsured).toBe(442_000);
  });

  it("leaves the cover alone when the form didn't change it", async () => {
    const { repos, policies } = setup();
    const { policy } = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    await renewPolicy(repos, policy.id, { periodStart: "2027-08-06", years: 1, amount: 5_300, ncb: 50 }, 442_000);
    expect(policies.rows[0].sumInsured).toBe(442_000);
  });

  it("takes the new term back out if the cover can't be moved, so Try again doesn't renew twice", async () => {
    const { repos, payments } = setup();
    const { policy } = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    const failing = { ...repos, policies: { ...repos.policies, update: async () => { throw new Error("Sheets is down"); } } } as InsuranceRepos;
    await expect(renewPolicy(failing, policy.id, { periodStart: "2027-08-06", years: 1, amount: 5_300, ncb: 50 }, 390_000)).rejects.toThrow("Sheets is down");
    expect(payments.rows).toHaveLength(1);
  });

  it("Undo of a term already gone is not an error", async () => {
    const { repos } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await expect(undoRenewal(repos, policy.id, { paymentId: "never-existed", previousSumInsured: 1_500_000 })).resolves.toBeUndefined();
  });

  it("Undo only takes out a term that is the named policy's, and never moves another policy's cover", async () => {
    const { repos, policies, payments } = setup();
    const a = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    const b = await addPolicy(repos, accident, firstTerm);
    await expect(undoRenewal(repos, a.policy.id, { paymentId: b.payment.id, previousSumInsured: 0 })).rejects.toThrow("belongs to a different policy");
    expect(payments.rows).toHaveLength(2);
    expect(policies.rows.map((p) => p.sumInsured)).toEqual([442_000, 1_500_000]);
  });

  it("takes the policy it already has, so a Renew doesn't read it again", async () => {
    const { repos } = setup();
    const { policy } = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    let gets = 0;
    const counting = { ...repos, policies: { ...repos.policies, get: async (id: string) => (gets++, repos.policies.get(id)) } } as InsuranceRepos;
    await renewPolicy(counting, policy.id, { periodStart: "2027-08-06", years: 1, amount: 5_300, ncb: 50 }, undefined, policy);
    expect(gets).toBe(0);
  });

  it("refuses a cancelled policy and one that isn't there", async () => {
    const { repos } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await cancelPolicy(repos, policy.id, { endedOn: "2026-11-02" });
    await expect(renewPolicy(repos, policy.id, { periodStart: "2027-03-21", years: 1, amount: 473 })).rejects.toThrow("restart it before renewing");
    await expect(renewPolicy(repos, "nope", { periodStart: "2027-03-21", years: 1, amount: 473 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("cancelPolicy and restartPolicy", () => {
  it("cancels with the day and the reason on its notes, and keeps every payment", async () => {
    const { repos, policies, payments } = setup();
    const { policy } = await addPolicy(repos, { ...car, notes: "Deductible 1,000" }, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    await cancelPolicy(repos, policy.id, { endedOn: "2026-11-02", reason: "Vehicle sold" });
    expect(policies.rows[0]).toMatchObject({ status: "Cancelled", endedOn: "2026-11-02", notes: "Deductible 1,000 · Cancelled: Vehicle sold" });
    expect(payments.rows).toHaveLength(1);
  });

  it("cancelling, restarting and cancelling again for the same reason writes the note once", async () => {
    const { repos, policies } = setup();
    const { policy } = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    await cancelPolicy(repos, policy.id, { reason: "Vehicle sold" });
    await restartPolicy(repos, policy.id);
    await cancelPolicy(repos, policy.id, { reason: "Vehicle sold" });
    expect(policies.rows[0].notes).toBe("Cancelled: Vehicle sold");
    await restartPolicy(repos, policy.id);
    await cancelPolicy(repos, policy.id, { reason: "Replaced" });
    expect(policies.rows[0].notes).toBe("Cancelled: Vehicle sold · Cancelled: Replaced");
  });

  it("cancels without a day, which a cancelled policy may lack", async () => {
    const { repos, policies } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await cancelPolicy(repos, policy.id, {});
    expect(policies.rows[0]).toMatchObject({ status: "Cancelled" });
    expect(policies.rows[0].endedOn || "").toBe("");
  });

  it("restarts with one field: Active again, and the cancelled-on date cleared", async () => {
    const { repos, policies } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await cancelPolicy(repos, policy.id, { endedOn: "2026-11-02" });
    await restartPolicy(repos, policy.id);
    expect(policies.rows[0].status).toBe("Active");
    expect(policies.rows[0].endedOn).toBe("");
  });

  it("says so when the policy isn't there", async () => {
    const { repos } = setup();
    await expect(cancelPolicy(repos, "nope", {})).rejects.toBeInstanceOf(NotFoundError);
    await expect(restartPolicy(repos, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deletePolicy", () => {
  it("deleting one that's already gone is not an error, as for every entity", async () => {
    const { repos } = setup();
    await expect(deletePolicy(repos, "never-existed")).resolves.toBeUndefined();
  });

  it("removes the policy's payments and it, and nobody else's", async () => {
    const { repos, policies, payments } = setup();
    const a = await addPolicy(repos, accident, firstTerm);
    const b = await addPolicy(repos, car, { periodStart: "2026-08-06", years: 1, amount: 5_504, ncb: 50 });
    await deletePolicy(repos, a.policy.id);
    expect(policies.rows.map((p) => p.id)).toEqual([b.policy.id]);
    expect(payments.rows.map((p) => p.policyId)).toEqual([b.policy.id]);
  });
});

describe("createTerm and updateTerm (the API's writes: the same guard as Renew)", () => {
  it("createTerm records a term that fits and refuses a duplicate, an overlap and a missing policy", async () => {
    const { repos, payments } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    const next = { policyId: policy.id, periodStart: "2027-03-21", years: 1, amount: 473, status: "Paid" as const };
    await expect(createTerm(repos, next)).resolves.toMatchObject({ amount: 473 });
    await expect(createTerm(repos, next)).rejects.toThrow("already has a term");
    await expect(createTerm(repos, { ...next, periodStart: "2027-09-01" })).rejects.toThrow("overlaps");
    await expect(createTerm(repos, { ...next, policyId: "nope" })).rejects.toBeInstanceOf(NotFoundError);
    expect(payments.rows).toHaveLength(2);
  });

  it("createTerm lets a Pending quote overlap, since it isn't cover", async () => {
    const { repos } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    await expect(createTerm(repos, { policyId: policy.id, periodStart: "2026-09-01", years: 1, amount: 460, status: "Pending" })).resolves.toMatchObject({ status: "Pending" });
  });

  it("updateTerm refuses a change that would make a term overlap another, or a no-claim step on a non-motor policy", async () => {
    const { repos, payments } = setup();
    const { policy, payment } = await addPolicy(repos, accident, firstTerm);
    const second = await createTerm(repos, { policyId: policy.id, periodStart: "2027-03-21", years: 1, amount: 473, status: "Paid" });
    await expect(updateTerm(repos, second.id, { years: 2 })).resolves.toMatchObject({ years: 2 });
    await expect(updateTerm(repos, second.id, { periodStart: "2026-12-01" })).rejects.toThrow("overlaps");
    await expect(updateTerm(repos, payment.id, { years: 2 })).rejects.toThrow("overlaps");
    await expect(updateTerm(repos, second.id, { ncb: 20 })).rejects.toThrow("motor");
    await expect(updateTerm(repos, "nope", { amount: 1 })).rejects.toBeInstanceOf(NotFoundError);
    expect(payments.rows.find((p) => p.id === second.id)?.periodStart).toBe("2027-03-21");
  });

  it("updateTerm leaves a change that isn't about the dates or cover alone, and doesn't count the term itself as overlapping", async () => {
    const { repos } = setup();
    const { policy } = await addPolicy(repos, accident, firstTerm);
    const second = await createTerm(repos, { policyId: policy.id, periodStart: "2027-03-21", years: 1, amount: 473, status: "Paid" });
    await expect(updateTerm(repos, second.id, { amount: 480, paidOn: "2027-03-19" })).resolves.toMatchObject({ amount: 480 });
    await expect(updateTerm(repos, second.id, { periodStart: "2027-03-21" })).resolves.toMatchObject({ periodStart: "2027-03-21" });
  });
});

describe("the Undo token", () => {
  it("round-trips what Undo needs through one string", () => {
    const undo = { paymentId: "pay-1", policyId: "pol-1", previousSumInsured: 442_000 };
    expect(parseRenewalUndo(renewalUndoToken(undo))).toEqual(undo);
  });

  it("refuses anything that isn't one", () => {
    for (const token of ["", "nope", "{}", '{"paymentId":"a","policyId":"","previousSumInsured":1}', '{"paymentId":"a","policyId":"b","previousSumInsured":"1"}', '{"paymentId":"a","policyId":"b","previousSumInsured":-1}', "null"]) {
      expect(parseRenewalUndo(token)).toBeNull();
    }
  });
});

describe("the Undo tokens for add, cancel, restart and edit", () => {
  it("reads back what it wrote, and refuses anything else", () => {
    for (const undo of [{ undo: "add", policyId: "p1" }, { undo: "cancel", policyId: "p1" }, { undo: "restart", policyId: "p1", endedOn: "2026-10-01" }, { undo: "restart", policyId: "p1" }, { undo: "edit", policyId: "p1", previous: { name: "Old", sumInsured: 5 } }] as const) {
      expect(parsePolicyUndo(policyUndoToken(undo))).toEqual(undo);
    }
    for (const bad of ["", "nope", "{}", '{"undo":"add"}', '{"undo":"add","policyId":""}', '{"undo":"drop","policyId":"p"}', '{"undo":"edit","policyId":"p","previous":[1]}', '{"undo":"edit","policyId":"p","previous":{"a":{"b":1}}}', '{"paymentId":"x","policyId":"p","previousSumInsured":1}']) {
      expect(parsePolicyUndo(bad)).toBeNull();
    }
  });

  it("an edit's token holds the fields as they were, never the policy number", () => {
    const fields = editableFields({ id: "p", name: "Health", kind: "Health", insurer: "Insurer", covers: "You", sumInsured: 500000, status: "Active", policyNumber: "ZXCV1234567890", notes: "30-day wait" });
    expect(fields).toMatchObject({ name: "Health", sumInsured: 500000, notes: "30-day wait", coversDetail: "", addOns: "", paidFromAccountId: "", paidFromCardId: "" });
    expect(JSON.stringify(policyUndoToken({ undo: "edit", policyId: "p", previous: fields }))).not.toContain("1234567");
  });
});
