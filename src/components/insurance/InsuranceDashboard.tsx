"use client";

import { ALL, type AttentionItem, type CoverView } from "@/app/insurance/views";
import { usePickInAddress } from "../usePickInAddress";
import { AttentionStrip } from "./AttentionStrip";
import { CoverMap } from "./CoverMap";

/**
 * The Insurance page under the greeting (docs/design/insurance.md, InsFinal): the attention strip, then the cover map. One pick
 * drives the page, kept in the address as `?policy=` (usePickInAddress); the widgets under the map follow it as they're added.
 */
export function InsuranceDashboard({ cover, attention, initialPick }: { cover: CoverView; attention: AttentionItem[]; initialPick: string }) {
  const [pickId, choose] = usePickInAddress("policy", initialPick, cover.picks, (id) => id === ALL);
  return (
    <div className="flex flex-col gap-5">
      <AttentionStrip items={attention} onSee={choose} />
      <CoverMap cover={cover} pickId={pickId} onPick={choose} />
    </div>
  );
}
