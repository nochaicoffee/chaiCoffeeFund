/** The game's best score lives in this browser only, under one key; nothing is sent anywhere. */
export const BEST_KEY = "chai-best-catch";

type Store = Pick<Storage, "getItem" | "setItem">;

/** A private window, blocked site data or a full disk can make storage throw: the game then plays on without a kept best. */
function safeStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadBest(store: Store | null = safeStore()): number {
  try {
    const n = Number(store?.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** Keeps the higher of what is stored and `best`: another tab may have got further since this one loaded its own. */
export function saveBest(best: number, store: Store | null = safeStore()): void {
  try {
    if (!store || Math.floor(best) <= loadBest(store)) return;
    store.setItem(BEST_KEY, String(Math.floor(best)));
  } catch {
    /* not kept */
  }
}
