"use client";

import { useEffect, useState } from "react";
import type { SubscriptionsPageView } from "@/app/subscriptions/views";
import { ALL } from "@/lib/format/subscriptionLabels";
import { CostMapCard } from "./CostMapCard";
import { ChargedToCard, PaymentsCard } from "./PaymentsCard";
import { SubscriptionChart } from "./SubscriptionChart";
import { SubscriptionHero } from "./SubscriptionHero";

/**
 * The Subscriptions page under the greeting (#126): the hero, then the cost map beside
 * the payments and Charged to, then the chart (#127). One pick drives all of them. It's kept in the address
 * (`?sub=`) with the history API, which the Next router follows without asking the
 * server again, so turning the carousel is instant and a link opens the same pick.
 */
export function SubscriptionsDashboard({ view, initialPick }: { view: SubscriptionsPageView; initialPick: string }) {
  // The pick is kept by id, not by place: a refresh can reorder the carousel or drop the
  // subscription (and Next keeps this state across it), so its place is looked up each time.
  const [pickId, setPickId] = useState(initialPick);
  const [shownPick, setShownPick] = useState(initialPick);
  // A link to another ?sub= on this page arrives as a new initialPick: follow it.
  if (initialPick !== shownPick) {
    setShownPick(initialPick);
    setPickId(initialPick);
  }
  const found = view.picks.findIndex((p) => p.id === pickId);
  const index = found < 0 ? 0 : found;
  const pick = view.picks[index];

  // A ?sub= that isn't a subscription (any more) falls back to All; take it out of the address too.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get("sub");
    if (sub && !view.picks.some((p) => p.id === sub)) {
      params.delete("sub");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, [view.picks]);

  function choose(next: number) {
    setPickId(view.picks[next].id);
    const params = new URLSearchParams(window.location.search);
    if (view.picks[next].id === ALL) params.delete("sub");
    else params.set("sub", view.picks[next].id);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  function chooseId(id: string) {
    const next = view.picks.findIndex((p) => p.id === id);
    if (next < 0) return;
    choose(next);
    // On a phone the hero is off screen above the map, so bring it into view. It waits two
    // frames, until the router has taken in the new address, which would otherwise stop the scroll.
    if (window.matchMedia("(max-width: 767px)").matches) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("subscriptions-hero")?.scrollIntoView({ behavior, block: "start" })));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Clear of the phone's sticky app bar (about 61px) when a tap in the map scrolls up to it. */}
      <div id="subscriptions-hero" className="scroll-mt-[76px] md:scroll-mt-4">
        <SubscriptionHero picks={view.picks} index={index} onIndex={choose} />
      </div>
      {/* With no subscriptions yet there's nothing to map or list, so the hero's "Add your first subscription" stands alone. */}
      {view.picks.length > 1 && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <CostMapCard view={view} picked={pick.id} onPick={chooseId} />
          {/* The last card grows, so this column ends level with the map. */}
          <div className="flex min-w-0 flex-col gap-5 [&>:last-child]:flex-1">
            <PaymentsCard key={pick.id} pick={pick} payments={view.payments[pick.id]} onAll={() => choose(0)} />
            <ChargedToCard rows={view.chargedTo} />
          </div>
        </div>
      )}
      <SubscriptionChart chart={view.chart} pick={pick} empty={view.picks.length === 1} />
    </div>
  );
}
