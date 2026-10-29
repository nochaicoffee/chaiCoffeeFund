import { describe, expect, it } from "vitest";
import { checkPolicy, createPolicySchema, policyRowSchema, updatePolicySchema } from "./policies";
import type { Policy } from "./types";

const valid = {
  name: "Health · Lifetime Health",
  kind: "Health",
  insurer: "ManipalCigna",
  covers: "You",
  sumInsured: 5000000,
  status: "Active",
};

/** A stored row, typed, with an update merged over it the way the repository does before it checks the whole row. */
const stored: Omit<Policy, "id"> = { name: "Car", kind: "Motor", insurer: "Acko", covers: "Car", sumInsured: 442000, status: "Cancelled", endedOn: "2026-11-02" };
const merged = (update: object): Omit<Policy, "id"> => ({ ...stored, ...(updatePolicySchema.parse(update) as Partial<Policy>) });

describe("createPolicySchema", () => {
  it("accepts a policy with only its required fields", () => {
    expect(createPolicySchema.safeParse(valid).success).toBe(true);
  });

  it("takes a kind from the fixed list, with its Sheet spelling", () => {
    for (const kind of ["Health", "Life", "Motor", "Home", "Accident"]) expect(createPolicySchema.safeParse({ ...valid, kind }).success).toBe(true);
    expect(createPolicySchema.safeParse({ ...valid, kind: "health" }).success).toBe(false);
    expect(createPolicySchema.safeParse({ ...valid, kind: "Travel" }).success).toBe(false);
  });

  it("accepts a cover of ₹0 only for a motor policy (third party only has no IDV), and never a negative one", () => {
    expect(createPolicySchema.safeParse({ ...valid, kind: "Motor", sumInsured: 0 }).success).toBe(true);
    for (const kind of ["Health", "Life", "Home", "Accident"]) expect(createPolicySchema.safeParse({ ...valid, kind, sumInsured: 0 }).success).toBe(false);
    expect(createPolicySchema.safeParse({ ...valid, sumInsured: -1 }).success).toBe(false);
  });

  it("accepts a policy paid from a card, from an account, or neither, but not both", () => {
    expect(createPolicySchema.safeParse({ ...valid, paidFromCardId: "card-1" }).success).toBe(true);
    expect(createPolicySchema.safeParse({ ...valid, paidFromAccountId: "acc-1" }).success).toBe(true);
    const both = createPolicySchema.safeParse({ ...valid, paidFromCardId: "card-1", paidFromAccountId: "acc-1" });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0]?.message).toBe("Pay it from a card or a bank account, not both");
  });

  it("accepts Cancelled with a cancelled-on date, and without one, but not Active with one", () => {
    expect(createPolicySchema.safeParse({ ...valid, status: "Cancelled", endedOn: "2026-11-02" }).success).toBe(true);
    expect(createPolicySchema.safeParse({ ...valid, status: "Cancelled" }).success).toBe(true);
    const active = createPolicySchema.safeParse({ ...valid, endedOn: "2026-11-02" });
    expect(active.success).toBe(false);
    expect(active.error?.issues[0]?.path).toEqual(["endedOn"]);
  });

  it("only takes a document link that is http or https", () => {
    expect(createPolicySchema.safeParse({ ...valid, documentUrl: "https://drive.example.com/policy.pdf" }).success).toBe(true);
    expect(createPolicySchema.safeParse({ ...valid, documentUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(createPolicySchema.safeParse({ ...valid, documentUrl: "policy.pdf" }).success).toBe(false);
  });

  it("refuses an empty required text", () => {
    expect(createPolicySchema.safeParse({ ...valid, insurer: "" }).success).toBe(false);
    expect(createPolicySchema.safeParse({ ...valid, covers: "" }).success).toBe(false);
  });
});

describe("updatePolicySchema", () => {
  it("switching to an account clears the card, and switching to a card clears the account", () => {
    expect(updatePolicySchema.parse({ paidFromAccountId: "acc-1" })).toEqual({ paidFromAccountId: "acc-1", paidFromCardId: "" });
    expect(updatePolicySchema.parse({ paidFromCardId: "card-1" })).toEqual({ paidFromCardId: "card-1", paidFromAccountId: "" });
  });

  it("rejects both set in one update", () => {
    expect(updatePolicySchema.safeParse({ paidFromAccountId: "acc-1", paidFromCardId: "card-1" }).success).toBe(false);
  });

  it("clears an optional field with \"\", such as the cancelled-on date when a policy restarts", () => {
    expect(updatePolicySchema.parse({ status: "Active", endedOn: "" })).toEqual({ status: "Active", endedOn: "" });
    expect(updatePolicySchema.parse({ claimsPhone: "" })).toEqual({ claimsPhone: "" });
  });

  it("still refuses \"\" for a required field and a bad date", () => {
    expect(updatePolicySchema.safeParse({ name: "" }).success).toBe(false);
    expect(updatePolicySchema.safeParse({ endedOn: "soon" }).success).toBe(false);
  });

  it("setting a policy Active implies its cancelled-on date is cleared, so a restart is one field", () => {
    expect(updatePolicySchema.parse({ status: "Active" })).toEqual({ status: "Active", endedOn: "" });
    expect(updatePolicySchema.parse({ status: "Cancelled" })).toEqual({ status: "Cancelled" });
    expect(updatePolicySchema.parse({ status: "Active", endedOn: "2026-11-02" })).toEqual({ status: "Active", endedOn: "2026-11-02" });
  });

  it("leaves an update that doesn't touch where it's paid from alone", () => {
    expect(updatePolicySchema.parse({ sumInsured: 442000 })).toEqual({ sumInsured: 442000 });
  });
});

describe("checkPolicy (a whole row, after an update is merged over it)", () => {
  it("catches both places set, and an active policy with an end date", () => {
    expect(checkPolicy({ ...stored, paidFromAccountId: "a", paidFromCardId: "c" })).toBe("Pay it from a card or a bank account, not both");
    expect(checkPolicy({ ...stored, status: "Active" })).toContain("hasn't ended");
  });

  it("restarts a cancelled policy with one field: the merged row is valid", () => {
    const row = merged({ status: "Active" });
    expect(row.endedOn).toBe("");
    expect(checkPolicy(row)).toBeNull();
  });

  it("switching where it's paid from, and clearing a field, merge to valid rows", () => {
    expect(checkPolicy(merged({ paidFromCardId: "card-1" }))).toBeNull();
    expect(checkPolicy({ ...merged({ paidFromCardId: "card-1" }), ...updatePolicySchema.parse({ paidFromAccountId: "acc-1" }) })).toBeNull();
    expect(checkPolicy(merged({ documentUrl: "" }))).toBeNull();
  });

  it("refuses a document link that isn't http or https once merged", () => {
    expect(checkPolicy(merged({ documentUrl: "ftp://example.com/p.pdf" }))).toContain("http");
  });
});

describe("policyRowSchema", () => {
  it("reads a row with its id and every optional column blank", () => {
    expect(policyRowSchema.safeParse({ ...valid, id: "pol-1" }).success).toBe(true);
  });

  it("applies the same rules to a stored row", () => {
    expect(policyRowSchema.safeParse({ ...valid, id: "pol-1", endedOn: "2026-11-02" }).success).toBe(false);
  });
});
