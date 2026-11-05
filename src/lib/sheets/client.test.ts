import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Sheets client's limits: a request with no answer must time out (a form once sat on "Saving…" for ever),
 * and a request that got no answer at all must not be sent again (an append that had landed would be added
 * twice). Only a 429, which Google turned away unprocessed, is retried.
 */
const made = vi.hoisted(() => ({ options: undefined as Record<string, unknown> | undefined }));
vi.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth: class {} },
    sheets: (options: Record<string, unknown>) => {
      made.options = options;
      return {};
    },
  },
}));

beforeEach(() => {
  made.options = undefined;
  vi.resetModules();
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = "./secrets/none.json";
});

describe("getSheetsClient", () => {
  it("gives every request a time limit", async () => {
    const { getSheetsClient, SHEETS_REQUEST_TIMEOUT_MS } = await import("./client");
    getSheetsClient();
    expect(made.options?.timeout).toBe(SHEETS_REQUEST_TIMEOUT_MS);
    expect(SHEETS_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("retries only a 429, and never a request that got no answer", async () => {
    const { getSheetsClient } = await import("./client");
    getSheetsClient();
    expect(made.options?.retryConfig).toMatchObject({ statusCodesToRetry: [[429, 429]], noResponseRetries: 0 });
  });
});
