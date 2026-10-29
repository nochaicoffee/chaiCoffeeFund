import { describe, expect, it } from "vitest";
import { toClientPolicy } from "./clientPolicy";
import { checkPolicy } from "../sheets/policies";
import type { Policy } from "../sheets/types";

const policy: Policy = { id: "p1", name: "Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: 5_000_000, status: "Active", policyNumber: "LIFET2050113850" };

describe("toClientPolicy", () => {
  it("cuts the policy number to its last four characters, and sends nothing of the rest", () => {
    const sent = toClientPolicy(policy);
    expect(sent.policyNumber).toBe("…3850");
    expect(JSON.stringify(sent)).not.toContain("LIFET2050113850");
  });

  it("ignores punctuation, so a number with slashes and dashes is cut the same way", () => {
    expect(toClientPolicy({ ...policy, policyNumber: "DCCR10587152051/04" }).policyNumber).toBe("…5104");
    expect(toClientPolicy({ ...policy, policyNumber: "OG-26-9906-1843-00030322" }).policyNumber).toBe("…0322");
  });

  it("leaves a policy with no number without one, and keeps every other field", () => {
    const sent = toClientPolicy({ ...policy, policyNumber: undefined });
    expect("policyNumber" in sent).toBe(false);
    expect(sent).toMatchObject({ id: "p1", name: "Health", sumInsured: 5_000_000 });
  });

  it("the shortened number can't be saved back over the whole one", () => {
    expect(checkPolicy({ ...policy, policyNumber: toClientPolicy(policy).policyNumber })).toBe("Enter the whole policy number, not the shortened one");
  });
});
