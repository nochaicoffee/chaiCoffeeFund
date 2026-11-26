"use client";

import { useEffect } from "react";
import { LOOK_COOKIE, LOOK_COOKIE_MAX_AGE } from "@/lib/look/look";
import type { Look } from "@/lib/sheets/types";

/**
 * Brings this device's `look` cookie up to the Sheet's look (ADR 0018). The root layout renders it only when they
 * differ, after a change made on another device: a Server Component can't set a cookie while it renders.
 */
export function LookCookieSync({ look }: { look: Look }) {
  useEffect(() => {
    document.cookie = `${LOOK_COOKIE}=${look}; path=/; max-age=${LOOK_COOKIE_MAX_AGE}; samesite=lax`;
  }, [look]);
  return null;
}
