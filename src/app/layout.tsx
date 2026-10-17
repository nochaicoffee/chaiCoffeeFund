import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

// The design's typeface (design/dashboards/CardsListLight.dc.html), exposed as
// --font-manrope for the --font-sans theme token in globals.css.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full">
        <Nav />
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
