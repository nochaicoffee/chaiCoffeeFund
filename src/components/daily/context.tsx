"use client";

import { createContext, useContext } from "react";
import type { CategoryView, DailyModel } from "@/app/daily/views";
import type { DailySpendInput } from "@/lib/forms/dailySpendForms";
import type { FailedAdd } from "@/lib/daily/pendingAdds";
import type { DailySpendMethod } from "@/lib/sheets/types";

export interface DailyContext {
  today: string;
  /** Everything the page shows, worked out here from the Sheet's rows plus any spend still being saved, so an add is in every figure at once. */
  model: DailyModel;
  /** The `?period=` the page was asked for, kept on the links that change the month. */
  periodParam?: string;
  categories: CategoryView[];
  /** The day the hero's panel and quick add are on. */
  selected: string;
  setSelected: (date: string) => void;
  /** Add a spend: it shows at once and the Sheet save finishes in the background. */
  addSpend: (input: DailySpendInput) => void;
  failed: FailedAdd[];
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  /** Open the add sheet. `fromBar` says the draft was carried over from the phone's quick-add bar, which then empties once the spend is added. */
  openAdd: (draft?: { date?: string; amount?: string; method?: DailySpendMethod; fromBar?: boolean }) => void;
  openEdit: (id: string) => void;
  openManage: () => void;
  openLimit: () => void;
  /** Toast a save; with `undo` it offers Undo for a few seconds. */
  saved: (undo: { id: string; message: string } | undefined, message: string) => void;
  /** A category made while adding a spend, shown at once, before the page has refreshed. */
  addedCategories: CategoryView[];
  noteCategory: (category: CategoryView) => void;
}

const Ctx = createContext<DailyContext | null>(null);
export const DailyProvider = Ctx.Provider;
export function useDaily(): DailyContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDaily needs the Daily page's shell");
  return value;
}
