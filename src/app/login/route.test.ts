import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubHostedEnv } from "@/lib/auth/google.testutil";
import { GET } from "./route";

beforeEach(() => stubHostedEnv((name, value) => vi.stubEnv(name, value)));
afterEach(() => vi.unstubAllEnvs());

const page = (query = "") => GET(new Request(`https://app.example/login${query}`));

describe("GET /login", () => {
  it("follows the look the browser last saw (ADR 0018's cookie mirror), and ignores anything else", async () => {
    const withCookie = (cookie: string) => GET(new Request("https://app.example/login", { headers: { cookie } })).then((r) => r.text());
    const neubrutal = await withCookie("look=Neubrutalism");
    expect(neubrutal).toContain('<html lang="en" data-look="neubrutal">');
    // ...and the page's own CSS still has the block that attribute switches on.
    expect(neubrutal).toContain(':root[data-look="neubrutal"] main');
    expect(await withCookie("look=Classic")).toContain('<html lang="en">');
    expect(await withCookie("look=%3Cscript%3E")).toContain('<html lang="en">');
    expect(await (await page()).text()).toContain('<html lang="en">');
  });

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

describe("GET /login, the new page", () => {
  const get = (query: string, headers: Record<string, string> = {}) => GET(new Request(`https://app.example/login${query}`, { headers }));

  it("greets him by name, by the time of day, and draws the cup with its three coins", async () => {
    const html = await (await page()).text();
    expect(html).toMatch(/Good (morning|afternoon|evening)/);
    expect(html).toContain('class="kh"');
    expect(html.match(/class="kh-coin"/g)).toHaveLength(3);
  });

  it("sends someone already signed in straight on, to the page he was going to", async () => {
    const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth/session");
    const { sessionKey } = await import("@/lib/auth/config");
    const cookie = `${SESSION_COOKIE}=${await createSessionToken(sessionKey(process.env)!)}`;
    const home = await get("", { cookie });
    expect(home.status).toBe(303);
    expect(home.headers.get("location")).toBe("https://app.example/");
    const cards = await get("?next=/cards", { cookie });
    expect(cards.headers.get("location")).toBe("https://app.example/cards");
    // Never back to the login, whatever the address says: that would loop.
    expect((await get("?next=/login", { cookie })).headers.get("location")).toBe("https://app.example/");
    expect((await get("?next=//evil.example", { cookie })).headers.get("location")).toBe("https://app.example/");
  });

  it("shows the page when the cookie is no good (expired, forged or someone else's)", async () => {
    const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth/session");
    const stale = `${SESSION_COOKIE}=${await createSessionToken("another-secret-another-secret-12345", Date.now())}`;
    expect((await get("", { cookie: stale })).status).toBe(200);
    expect((await get("", { cookie: `${SESSION_COOKIE}=garbage` })).status).toBe(200);
  });

  it("says he is signed out, only for ?signedout=1", async () => {
    expect(await (await get("?signedout=1")).text()).toContain("signed out on this device");
    expect(await (await get("?signedout=yes")).text()).not.toContain("signed out on this device");
  });

  it("says the session ended and names the page from our own list, never the address", async () => {
    const html = await (await get("?session=ended&next=%2Fcards")).text();
    expect(html).toContain("Your session ended. Sign in to carry on to <b>Cards</b>.");
    const unknown = await (await get(`?session=ended&next=${encodeURIComponent("/<b>evil</b>")}`)).text();
    // The path is still in the button's link (encoded, which is harmless), but never as words or markup on the page.
    expect(unknown).not.toContain("<b>evil");
    expect(unknown).toContain("Your session ended. Sign in to carry on.");
  });

  it("warns and offers Copy link in an in-app browser, with the button still usable", async () => {
    const html = await (await get("", { "user-agent": "Mozilla/5.0 (iPhone) AppleWebKit/605 Mobile/15E148 Instagram 350.0" })).text();
    expect(html).toContain("Safari or Chrome");
    expect(html).toContain("Try anyway");
    expect(html).not.toContain('aria-disabled="true"');
    expect(html).toContain('id="copy"');
    expect(await (await get("")).text()).not.toContain('id="copy"');
  });

  it("names the missing settings only outside production", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(await (await page()).text()).not.toContain("GOOGLE_CLIENT_ID");
    vi.stubEnv("NODE_ENV", "development");
    expect(await (await page()).text()).toContain("GOOGLE_CLIENT_ID");
  });

  it("is a plain link without script, and its script says nothing it wasn't given", async () => {
    const html = await (await page()).text();
    expect(html).toMatch(/<a class="button" id="go" href="\/login\/google"/);
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain("color-scheme: light");
    // Notices the script shows are plain text set into a region that is already there.
    expect(html).not.toContain("innerHTML");
  });

  it("lets the short-screen rule hide the cup: the cup's own styles come first, so they can't win over it", async () => {
    const html = await (await page()).text();
    expect(html.indexOf(".kh { display: block")).toBeGreaterThan(-1);
    expect(html.indexOf(".kh { display: block")).toBeLessThan(html.indexOf("@media (max-height: 480px)"));
  });
});
