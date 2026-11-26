import { describe, expect, it } from "vitest";
import { isMissingTabError } from "./missingTab";

describe("isMissingTabError", () => {
  it("knows the Sheets API's answer for a tab that isn't there", () => {
    expect(isMissingTabError(new Error("Unable to parse range: Settings!A1:C"), "Settings")).toBe(true);
    expect(isMissingTabError(new Error("Unable to parse range: 'Settings'!A:C"), "Settings")).toBe(true);
  });

  it("doesn't mistake another tab's, or any other failure, for it", () => {
    expect(isMissingTabError(new Error("Unable to parse range: Goals!A1:C"), "Settings")).toBe(false);
    expect(isMissingTabError(new Error("The caller does not have permission"), "Settings")).toBe(false);
    expect(isMissingTabError(undefined, "Settings")).toBe(false);
  });
});
