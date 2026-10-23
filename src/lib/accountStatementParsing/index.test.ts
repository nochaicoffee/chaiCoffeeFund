import { describe, expect, it } from "vitest";
import { parseAccountStatements } from "./index";

describe("parseAccountStatements", () => {
  it("is none of the three banks for other text, so the email is reported rather than guessed at", () => {
    expect(parseAccountStatements("State Bank of India statement")).toBeNull();
  });

  it("does not take one bank's statement for another's because its narrations name that bank", () => {
    const text = "STATEMENT OF ACCOUNT PERIOD : 10-FEB-2022 to 23-OCT-2026 The Federal Bank UPI-x@okhdfcbank Payment from slice help@slice.bank.in";
    const r = parseAccountStatements(text);
    expect(r).toHaveLength(1);
    expect(r![0].ok === false && r![0].problem).toBe("couldn't read the opening balance");
  });

  it("reads HDFC's NetBanking statement as HDFC, not as the combined one or another bank", () => {
    const text = "Statement   From : 01/01/26   TO   :   31/03/26 Date   Narration   Chq. / Ref No.   Value Date   Withdrawal Amount   Deposit Amount   Closing Balance* STATEMENT SUMMARY HDFC BANK LIMITED UPI-X@okhdfcbank slice";
    const r = parseAccountStatements(text);
    expect(r).toHaveLength(1);
    expect(r![0].ok === false && r![0].problem).toBe("couldn't read the statement's period");
  });
});
