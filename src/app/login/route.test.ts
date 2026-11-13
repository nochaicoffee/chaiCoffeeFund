import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKey } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";
import { GET, POST } from "./route";

const PASSPHRASE = "correct horse battery staple";
const SECRET = "s".repeat(40);

/** The pauses the route asked for. A pause runs at once here, so a test doesn't wait for it. */
let pauses: number[] = [];

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_PASSWORD", PASSPHRASE);
  vi.stubEnv("SESSION_SECRET", SECRET);
  pauses = [];
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void, ms?: number) => {
    pauses.push(ms ?? 0);
    callback();
    return 0;
  }) as unknown as typeof setTimeout);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const post = (fields: Record<string, string>) => {
  const body = new URLSearchParams(fields);
  return POST(new Request("https://app.example/login", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }));
};

const signIn = post;

describe("GET /login", () => {
  it("shows the form, with the page to return to carried along", async () => {
    const res = await GET(new Request("https://app.example/login?next=/accounts"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('name="password"');
    expect(html).toContain('value="/accounts"');
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("escapes the page to return to, and drops one that leaves the site", async () => {
    const quoted = await (await GET(new Request(`https://app.example/login?next=${encodeURIComponent('/a"><script>x</script>')}`))).text();
    expect(quoted).not.toContain("<script>x");
    const offsite = await (await GET(new Request("https://app.example/login?next=//evil.example"))).text();
    expect(offsite).not.toContain("evil.example");
  });

  it("says so, with a 503, when the host has no login set up", async () => {
    vi.stubEnv("APP_PASSWORD", "");
    const res = await GET(new Request("https://app.example/login"));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("set up on this server");
  });
});

describe("POST /login", () => {
  it("sets a signed, http-only session cookie and goes to the page asked for", async () => {
    const res = await signIn({ password: PASSPHRASE, next: "/subscriptions" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example/subscriptions");
    const cookie = res.cookies.get("chai_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(await verifySessionToken(cookie?.value, sessionKey(process.env))).toBe(true);
    expect(pauses).toEqual([]);
  });

  it("goes home when the page asked for hides its way off the site behind a tab", async () => {
    const res = await signIn({ password: PASSPHRASE, next: "/\t/evil.example" });
    expect(res.headers.get("location")).toBe("https://app.example/");
  });

  it("goes home when the page asked for would leave the site", async () => {
    const res = await signIn({ password: PASSPHRASE, next: "//evil.example" });
    expect(res.headers.get("location")).toBe("https://app.example/");
  });

  it("sets no cookie and goes back to the form on a wrong passphrase, after a one-second pause", async () => {
    const res = await post({ password: "wrong", next: "/accounts" });
    expect(pauses).toEqual([1000]);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example/login?error=1&next=%2Faccounts");
    expect(res.cookies.get("chai_session")).toBeUndefined();
  });

  it("refuses a missing passphrase, and anything at all when the host has no login set up", async () => {
    expect((await signIn({ next: "/" })).headers.get("location")).toContain("error=1");
    vi.stubEnv("SESSION_SECRET", "");
    const res = await post({ password: PASSPHRASE });
    expect(res.status).toBe(503);
    expect(res.cookies.get("chai_session")).toBeUndefined();
  });
});
