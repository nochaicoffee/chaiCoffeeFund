"use client";

import { ALL, type CoverView } from "@/app/income/views";
import { usePickInAddress } from "../usePickInAddress";
import { IncomeCover } from "./IncomeCover";

/**
 * The Income page under the greeting (#188): the cover, and below it what's built as the page grows (#189). One
 * pick drives all of it, kept in the address as `?source=` (usePickInAddress), as on Accounts.
 */
export function IncomeDashboard({ cover, initialPick }: { cover: CoverView; initialPick: string }) {
  const [pickId, choose] = usePickInAddress("source", initialPick, cover.picks.map((p) => p.id), (id) => id === ALL);

  return (
    <div className="flex flex-col gap-5">
      <IncomeCover cover={cover} pickId={pickId} onPick={choose} />
    </div>
  );
}
