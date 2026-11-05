import type { Metadata } from "next";
import { AddEpfStatementButton } from "@/components/fixed-income/AddEpfStatementButton";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Fixed Income" };

/** Until the page is built (milestone M4), the import is reachable from here so a passbook can already be added. */
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <AddEpfStatementButton />
      </div>
      <ComingSoon href="/fixed-income" />
    </div>
  );
}
