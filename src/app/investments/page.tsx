import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Investments" };

export default function Page() {
  return <ComingSoon href="/investments" />;
}
