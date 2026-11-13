import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubHostedEnv } from "@/lib/auth/google.testutil";
import { GET } from "./route";

beforeEach(() => stubHostedEnv((name, value) => vi.stubEnv(name, value)));
afterEach(() => vi.unstubAllEnvs());

const page = (query = "") => GET(new Request(`https://app.example/login${query}`));

describe("GET /login", () => {
  it("shows the Google button, with the page to return to carried along", async () => {
    const res = await page("?next=/accounts");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('href="/login/google?next=%2Faccounts"');
    expect(html).toContain("Continue with Google");
    expect(html).not.toContain('type="password"');
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("has a plain button when there is nowhere to return to", async () => {
    expect(await (await page()).text()).toContain('href="/login/google"');
  });

  it("escapes the page to return to, and drops one that leaves the site", async () => {
    const quoted = await (await page(`?next=${encodeURIComponent('/a"><script>x</script>')}`)).text();
    expect(quoted).not.toContain("<script>x");
    expect(await (await page("?next=//evil.example")).text()).not.toContain("evil.example");
  });

  it("says why the last sign-in failed, for the reasons it knows", async () => {
    expect(await (await page("?error=denied")).text()).toContain("isn&#39;t allowed here");
    expect(await (await page("?error=cancelled")).text()).toContain("cancelled");
    expect(await (await page("?error=failed")).text()).toContain("didn&#39;t work");
  });

  it("shows nothing it was given as the reason, so a link can't put words on the page", async () => {
    const html = await (await page("?error=Send%20money%20to%20evil")).text();
    expect(html).not.toContain("evil");
    expect(html).not.toContain('role="alert"');
    expect(await (await page("?error=constructor")).text()).not.toContain('role="alert"');
  });

  it("says so, with a 503 and a disabled button, when the host has no login set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const res = await page();
    const html = await res.text();
    expect(res.status).toBe(503);
    expect(html).toContain("set up on this server");
    expect(html).toContain('aria-disabled="true"');
  });
});
