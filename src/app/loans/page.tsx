import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Loans" };

export default function Page() {
  return <ComingSoon href="/loans" />;
}
