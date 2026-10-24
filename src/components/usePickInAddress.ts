"use client";

import { useEffect, useState } from "react";

/** The address with `?param=` set or removed, keeping a bare `?demo` bare. */
function withParam(param: string, value: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (value === null) params.delete(param);
  else params.set(param, value);
  const query = params.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

/**
 * A dashboard's pick, kept by id and in the address (`?<param>=`) with the history API, which the Next router
 * follows without asking the server again, so picking is instant and a link opens the same pick (Accounts'
 * `?account=`, Income's `?source=`). A link to another pick on the same page arrives as a new `initialPick` and is
 * followed; a requested id that isn't one of `ids` (any more) is taken out of the address. `isDefault` picks
 * leave the parameter out.
 */
export function usePickInAddress(param: string, initialPick: string, ids: readonly string[], isDefault: (id: string) => boolean): [string, (id: string) => void] {
  const [pickId, setPickId] = useState(initialPick);
  const [shownPick, setShownPick] = useState(initialPick);
  if (initialPick !== shownPick) {
    setShownPick(initialPick);
    setPickId(initialPick);
  }

  const known = ids.join("\u0000");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(param);
    if (requested && !known.split("\u0000").includes(requested)) window.history.replaceState(null, "", withParam(param, null));
  }, [param, known]);

  function choose(id: string) {
    setPickId(id);
    window.history.replaceState(null, "", withParam(param, isDefault(id) ? null : id));
  }

  return [pickId, choose];
}
