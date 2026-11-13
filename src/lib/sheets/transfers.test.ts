import { describe, expect, it } from "vitest";
import { updateTransferSchema } from "./transfers";

describe("updateTransferSchema", () => {
  it("lets an edit clear the received amount and the reference with a blank", () => {
    const patch = updateTransferSchema.parse({ amount: 5, receivedAmount: "", reference: "" });
    expect(patch.amount).toBe(5);
    expect(patch.receivedAmount).toBeUndefined();
    expect(patch.reference).toBeUndefined();
  });

  it("still refuses a received amount that isn't above zero", () => {
    expect(updateTransferSchema.safeParse({ receivedAmount: 0 }).success).toBe(false);
  });
});
