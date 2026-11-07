"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { GoBackKey } from "@/app/investments/stageView";

/**
 * The day the page is looking at ("Go back to" on the stage). The stage, the Returns row and the holdings table all read it, so going back
 * takes all three back together (docs/design/investments.md, K5 Time machine).
 */
interface AsOfState {
  goBack: GoBackKey;
  setGoBack: (key: GoBackKey) => void;
}

const AsOfContext = createContext<AsOfState>({ goBack: "now", setGoBack: () => {} });

export function AsOfProvider({ children }: { children: ReactNode }) {
  const [goBack, setGoBack] = useState<GoBackKey>("now");
  return <AsOfContext.Provider value={{ goBack, setGoBack }}>{children}</AsOfContext.Provider>;
}

export const useAsOf = () => useContext(AsOfContext);
