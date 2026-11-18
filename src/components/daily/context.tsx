"use client";

import { createContext, useContext } from "react";
import type { CategoryView } from "@/app/daily/views";
import type { DailySpendMethod } from "@/lib/sheets/types";

/** What a spend needs to be edited: the month's spends as the Sheet has them. */
export interface EditableSpend {
  id: string;
  date: string;
  amount: number;
  method: DailySpendMethod;
  category?: string;
  note?: string;
}

export interface DailyContext {
  today: string;
  categories: CategoryView[];
  /** The day the hero's panel and quick add are on. */
  selected: string;
  setSelected: (date: string) => void;
  openAdd: (draft?: { date?: string; amount?: string; method?: DailySpendMethod }) => void;
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
