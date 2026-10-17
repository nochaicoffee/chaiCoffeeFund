import { describe, expect, it } from "vitest";
import { optionLabel } from "./labels";

describe("optionLabel", () => {
  it("shows hyphenated dropdown values with spaces", () => {
    expect(optionLabel("HDFC-Bank")).toBe("HDFC Bank");
    expect(optionLabel("AU-Small-Finance-Bank")).toBe("AU Small Finance Bank");
    expect(optionLabel("Reward-Points")).toBe("Reward Points");
    expect(optionLabel("Cashback")).toBe("Cashback");
  });
});
