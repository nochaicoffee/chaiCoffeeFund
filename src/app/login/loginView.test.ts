import { describe, expect, it } from "vitest";
import { isInAppBrowser, pageLabel, signInError, signInView, type SignInInput } from "./loginView";

const plain: SignInInput = { next: "/", error: null, signedOut: false, sessionEnded: false, configured: true, inApp: false, showSettingNames: false };
const view = (change: Partial<SignInInput> = {}) => signInView({ ...plain, ...change });
const text = (v: ReturnType<typeof signInView>) => v.notice?.parts.map((p) => (typeof p === "string" ? p : p.strong)).join("");

describe("signInError", () => {
  it("knows only our three reasons", () => {
    expect(signInError("denied")).toBe("denied");
    expect(signInError("cancelled")).toBe("cancelled");
    expect(signInError("failed")).toBe("failed");
    for (const other of [null, undefined, "", "Send money to evil", "constructor", "toString", "__proto__"]) expect(signInError(other)).toBeNull();
  });
});

describe("pageLabel", () => {
  it("names a section, and its sub-pages, from our own list", () => {
    expect(pageLabel("/cards")).toBe("Cards");
    expect(pageLabel("/cards/statements?month=2026-10")).toBe("Cards");
    expect(pageLabel("/fixed-income")).toBe("Fixed Income");
  });
  it("says nothing for the home page or a path it doesn't know, rather than repeat the address", () => {
    expect(pageLabel("/")).toBeNull();
    expect(pageLabel("/?x=1")).toBeNull();
    expect(pageLabel("/evil-page")).toBeNull();
    expect(pageLabel("/cardsx")).toBeNull();
  });
});

describe("isInAppBrowser", () => {
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const chromeIos = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
  const chromeAndroid = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
  it("lets the ordinary browsers through", () => {
    for (const ua of [safari, chromeIos, chromeAndroid, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18 Safari/605.1.15", null, undefined, ""]) expect(isInAppBrowser(ua)).toBe(false);
  });
  it("spots the built-in browsers Google refuses", () => {
    expect(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 [FBAN/FB4A;FBAV/450.0]")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Version/4.0 Chrome/130 Mobile Safari/537.36")).toBe(true);
    // No "Safari" in an iPhone UA: a web view inside some app.
    expect(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit/605 Mobile/15E148 Line/14.0")).toBe(true);
    // "Line/" is a token of its own, not the end of another word.
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Safari/537.36 Baseline/2.0")).toBe(false);
  });
});

describe("signInView", () => {
  it("is quiet for a plain visit", () => {
    expect(view()).toEqual({ notice: null, button: "Continue with Google", disabled: false, inApp: false });
  });

  it("explains each reason the last sign-in failed, with the button to match", () => {
    expect(text(view({ error: "denied" }))).toBe("That Google account isn't allowed here.");
    expect(view({ error: "denied" }).button).toBe("Choose another account");
    expect(view({ error: "denied" }).notice?.tone).toBe("err");
    expect(view({ error: "cancelled" }).notice?.tone).toBe("info");
    expect(view({ error: "cancelled" }).button).toBe("Try again");
    expect(view({ error: "failed" }).notice?.detail).toContain("cookies");
    expect(view({ error: "failed" }).button).toBe("Try again");
  });

  it("never says which address would work", () => {
    expect(JSON.stringify(view({ error: "denied" }))).not.toMatch(/@|allowed address/i);
  });

  it("confirms a sign-out, and says the other devices stay in", () => {
    const v = view({ signedOut: true });
    expect(text(v)).toBe("You're signed out on this device.");
    expect(v.notice?.detail).toContain("Other devices");
    expect(v.button).toBe("Sign in again");
  });

  it("names where he was going: after a session ended, or on a first visit to a page", () => {
    expect(text(view({ next: "/cards", sessionEnded: true }))).toBe("Your session ended. Sign in to carry on to Cards.");
    expect(text(view({ next: "/cards" }))).toBe("Sign in to carry on to Cards.");
    expect(text(view({ next: "/nowhere-we-know", sessionEnded: true }))).toBe("Your session ended. Sign in to carry on.");
    expect(text(view({ next: "/cards" }))).not.toContain("session ended");
  });

  it("leaves the setting names out unless it's running locally", () => {
    const hosted = view({ configured: false, showSettingNames: false });
    expect(hosted.disabled).toBe(true);
    expect(JSON.stringify(hosted)).not.toContain("GOOGLE_CLIENT_ID");
    expect(view({ configured: false, showSettingNames: true }).notice?.detail).toContain("GOOGLE_CLIENT_ID");
  });

  it("warns in an in-app browser and says where to go instead, but never locks him out of trying", () => {
    const v = view({ inApp: true });
    expect(v.disabled).toBe(false);
    expect(v.button).toBe("Try anyway");
    expect(v.inApp).toBe(true);
    expect(v.notice?.detail).toContain("Safari or Chrome");
  });

  it("puts what can't work ahead of what happened last time", () => {
    expect(view({ configured: false, error: "denied", inApp: true }).notice?.parts[0]).toContain("isn't set up");
    expect(view({ inApp: true, error: "denied" }).inApp).toBe(true);
    expect(view({ error: "denied", signedOut: true }).notice?.tone).toBe("err");
  });
});
