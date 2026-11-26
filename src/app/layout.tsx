import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/Sidebar";
import { SIDEBAR_COOKIE } from "@/components/shell/sections";
import { appConfig } from "@/lib/appConfig";
import { loginRequired, sessionKey } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import "./globals.css";

// The design's typeface (design/dashboards/CardsListLight.dc.html), exposed as
// --font-manrope for the --font-sans theme token in globals.css.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: appConfig.appName, template: `%s · ${appConfig.appName}` },
  description: "Personal finance dashboard",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const sidebarExpanded = cookieStore.get(SIDEBAR_COOKIE)?.value === "expanded";
  // The proxy lets only the public /setup guide reach a page without a session; it gets no sidebar, whose links would all bounce to the sign-in.
  const showShell = !loginRequired(process.env) || (await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value, sessionKey(process.env)));

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        {showShell ? (
          <div className="mx-auto flex min-h-dvh w-full max-w-[1760px] flex-col md:flex-row md:items-start md:gap-5 md:p-6">
            <Sidebar initiallyExpanded={sidebarExpanded} appName={appConfig.appName} ownerName={appConfig.ownerName} showSignOut={loginRequired(process.env)} />
            <main className="min-w-0 flex-1 bg-surface py-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] max-md:pb-[calc(var(--phone-nav-h)+1.25rem)] md:min-h-[calc(100dvh-3rem)] md:rounded-[36px] md:surface-edge md:p-[26px] md:shadow-card">
              {children}
            </main>
          </div>
        ) : (
          <main className="min-h-dvh bg-surface px-4 py-8 md:py-12">{children}</main>
        )}
      </body>
    </html>
  );
}
