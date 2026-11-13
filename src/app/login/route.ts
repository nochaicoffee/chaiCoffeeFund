import { NextResponse } from "next/server";
import { loginConfigured, sessionKey } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/gate";
import { safeEqual } from "@/lib/auth/safeEqual";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { loginPage } from "./loginPage";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
/** A wrong passphrase waits this long before answering. It slows one client; parallel guesses are not limited, which is why the passphrase has a long minimum (lib/auth/config.ts). */
const WRONG_PASSPHRASE_DELAY_MS = 1000;

/**
 * The sign-in page. A route handler rather than a page, so it stands alone without the app's
 * sidebar around it. The form posts back here; a right passphrase sets the signed session cookie.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const configured = loginConfigured(process.env);
  return new NextResponse(loginPage({ next: safeNextPath(params.get("next")), failed: params.get("error") === "1", configured }), {
    status: configured ? 200 : 503,
    headers: HTML_HEADERS,
  });
}

export async function POST(request: Request) {
  if (!loginConfigured(process.env)) return new NextResponse(loginPage({ next: "/", failed: false, configured: false }), { status: 503, headers: HTML_HEADERS });

  const form = await request.formData().catch(() => null);
  const passphrase = form?.get("password");
  const nextField = form?.get("next");
  const next = safeNextPath(typeof nextField === "string" ? nextField : null);

  if (typeof passphrase !== "string" || !(await safeEqual(passphrase, process.env.APP_PASSWORD ?? ""))) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSPHRASE_DELAY_MS));
    const retry = new URL("/login", request.url);
    retry.searchParams.set("error", "1");
    if (next !== "/") retry.searchParams.set("next", next);
    return NextResponse.redirect(retry, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(sessionKey(process.env) ?? ""),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
