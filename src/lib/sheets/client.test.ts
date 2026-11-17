import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const GoogleAuth = vi.fn();
vi.mock("googleapis", () => ({ google: { auth: { GoogleAuth }, sheets: vi.fn(() => ({})) } }));

const key = JSON.stringify({ client_email: "sa@project.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n" });

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  GoogleAuth.mockClear();
});

describe("getSheetsClient", () => {
  it("signs in with the key from the setting, for the spreadsheets scope, and not with a file", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY", key);
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_FILE", "");
    const { getSheetsClient } = await import("./client");
    getSheetsClient();
    const options = GoogleAuth.mock.calls[0][0];
    expect(options.credentials).toMatchObject({ client_email: "sa@project.iam.gserviceaccount.com" });
    expect(options.keyFile).toBeUndefined();
    expect(options.scopes).toEqual(["https://www.googleapis.com/auth/spreadsheets"]);
  });

  it("signs in with the key file when there is no setting", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY", "");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_FILE", "./secrets/sa.json");
    const { getSheetsClient } = await import("./client");
    getSheetsClient();
    expect(GoogleAuth.mock.calls[0][0]).toMatchObject({ keyFile: "./secrets/sa.json", scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  });

  it("throws, and builds no client, when neither is set", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY", "");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_FILE", "");
    const { getSheetsClient } = await import("./client");
    expect(() => getSheetsClient()).toThrow(/GOOGLE_SERVICE_ACCOUNT_KEY/);
    expect(GoogleAuth).not.toHaveBeenCalled();
  });
});
