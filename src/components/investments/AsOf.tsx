"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { GoBackKey } from "@/app/investments/stageView";

/**
 * What the page is looking at: the day ("Go back to" on the stage). The stage, the Returns row and the holdings table all read it, so going back
 * takes all three back together (docs/design/investments.md, K5 Time machine).
 */
interface AsOfState {
  goBack: GoBackKey;
  setGoBack: (key: GoBackKey) => void;
  /** What the stage is looking at: "all" (everything) or a holding's lens key. The Returns row follows it too. */
  pick: string;
  setPick: (key: string) => void;
}

const AsOfContext = createContext<AsOfState>({ goBack: "now", setGoBack: () => {}, pick: "all", setPick: () => {} });

export function AsOfProvider({ children }: { children: ReactNode }) {
  const [goBack, setGoBack] = useState<GoBackKey>("now");
  const [pick, setPick] = useState("all");
  return <AsOfContext.Provider value={{ goBack, setGoBack, pick, setPick }}>{children}</AsOfContext.Provider>;
}

export const useAsOf = () => useContext(AsOfContext);
