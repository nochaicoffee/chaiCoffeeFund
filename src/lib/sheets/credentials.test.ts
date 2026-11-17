import { describe, expect, it } from "vitest";
import { serviceAccountAuth } from "./credentials";

const key = { type: "service_account", client_email: "sa@project.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n", project_id: "p" };
const json = JSON.stringify(key);
const expected = { credentials: { client_email: key.client_email, private_key: key.private_key } };

describe("serviceAccountAuth", () => {
  it("reads the key from the setting, as JSON", () => {
    expect(serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: json })).toEqual(expected);
    expect(serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: `  ${json}\n` })).toEqual(expected);
  });

  it("reads it as base64 of the JSON too, and keeps the private key's line breaks", () => {
    const auth = serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: Buffer.from(json).toString("base64") });
    expect(auth).toEqual(expected);
    expect("credentials" in auth && auth.credentials.private_key).toContain("\n");
  });

  it("falls back to the key file on the laptop, and prefers the setting when both are set", () => {
    expect(serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "./secrets/sa.json" })).toEqual({ keyFile: "./secrets/sa.json" });
    expect(serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: json, GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "./x.json" })).toEqual(expected);
    expect(serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: "  ", GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "./x.json" })).toEqual({ keyFile: "./x.json" });
  });

  it("says which settings are missing when neither is set", () => {
    expect(() => serviceAccountAuth({})).toThrow(/GOOGLE_SERVICE_ACCOUNT_KEY.*GOOGLE_SERVICE_ACCOUNT_KEY_FILE/);
  });

  it("refuses a bad paste without quoting any of it", () => {
    for (const bad of ["not json", "{broken", Buffer.from("nope").toString("base64"), JSON.stringify({ client_email: "a@b.c" }), JSON.stringify({ private_key: 5, client_email: "a" }), "null"]) {
      let message = "";
      try {
        serviceAccountAuth({ GOOGLE_SERVICE_ACCOUNT_KEY: bad });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toMatch(/GOOGLE_SERVICE_ACCOUNT_KEY/);
      expect(message).not.toContain(bad);
    }
  });
});
