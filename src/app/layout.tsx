import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/Sidebar";
import { SIDEBAR_COOKIE } from "@/components/shell/sections";
import { appConfig } from "@/lib/appConfig";
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
  const sidebarExpanded = (await cookies()).get(SIDEBAR_COOKIE)?.value === "expanded";

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1760px] flex-col md:flex-row md:items-start md:gap-5 md:p-6">
          <Sidebar initiallyExpanded={sidebarExpanded} appName={appConfig.appName} ownerName={appConfig.ownerName} />
          <main className="min-w-0 flex-1 bg-surface py-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:min-h-[calc(100dvh-3rem)] md:rounded-[36px] md:border md:border-surface-line md:p-[26px] md:shadow-card">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
