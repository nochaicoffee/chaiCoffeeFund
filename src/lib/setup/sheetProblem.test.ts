import { describe, expect, it } from "vitest";
import { sheetProblem } from "./sheetProblem";

const google = (code: number, message: string) => Object.assign(new Error(message), { code });

describe("sheetProblem", () => {
  it("says to share the Sheet, naming the service account", () => {
    const problem = sheetProblem(google(403, "The caller does not have permission"), "robot@proj.iam.gserviceaccount.com");
    expect(problem.kind).toBe("not-shared");
    expect(problem.fix).toContain("robot@proj.iam.gserviceaccount.com");
  });
  it("still helps when the service account's email isn't known", () => {
    expect(sheetProblem(google(403, "The caller does not have permission")).fix).toMatch(/client_email/);
  });
  it("tells a wrong ID from an unshared Sheet", () => {
    expect(sheetProblem(google(404, "Requested entity was not found.")).kind).toBe("wrong-id");
  });
  it("spots a Sheets API that isn't turned on, which Google also reports as a 403", () => {
    expect(sheetProblem(google(403, "Google Sheets API has not been used in project 123 before or it is disabled.")).kind).toBe("api-off");
  });
  it("spots a key that can't sign in", () => {
    expect(sheetProblem(new Error("invalid_grant: Invalid JWT Signature.")).kind).toBe("bad-key");
    expect(sheetProblem(new Error("GOOGLE_SERVICE_ACCOUNT_KEY isn't the service account's JSON key, or base64 of it")).kind).toBe("bad-key");
  });
  it("spots an uploaded Excel file", () => {
    expect(sheetProblem(google(400, "This operation is not supported for this document")).kind).toBe("not-a-sheet");
  });
  it("does not mistake other errors for a wrong ID or a disabled API", () => {
    expect(sheetProblem(new Error("Unable to parse range: Accounts not found")).kind).toBe("other");
    expect(sheetProblem(new Error("Feature is disabled for this table")).kind).toBe("other");
  });
  it("calls a quota refusal a wait", () => {
    expect(sheetProblem(google(429, "Quota exceeded for quota metric")).kind).toBe("quota");
  });
  it("doesn't guess at anything else, and never repeats the raw message", () => {
    const problem = sheetProblem(new Error("socket hang up secret-detail"));
    expect(problem.kind).toBe("other");
    expect(JSON.stringify(problem)).not.toContain("secret-detail");
  });
});
