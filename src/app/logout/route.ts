import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Signs this device out: the cookie is cleared and the login shown. A POST, so a link or an image
 * on another site can't sign him out. Other devices stay signed in until ALLOWED_EMAIL or
 * SESSION_SECRET changes (the cookie is signed with both).
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
