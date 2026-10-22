import { describe, expect, it } from "vitest";
import { subscriptionsPageView } from "@/app/subscriptions/views";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { categoryCard, GAP, mapCategories, mapLayout, whatIf, type Box, type MapEntry } from "./costMap";

// The design's sample data, on its "today".
const view = subscriptionsPageView(demoSubscriptionData("2026-10-20"), "2026-10-20");
const entries: MapEntry[] = view.blocks;
const total = entries.reduce((t, e) => t + e.monthly, 0);
const area = (b: Box) => b.w * b.h;
const inside = (b: Box, t: Box) => b.x >= t.x - 1e-6 && b.y >= t.y - 1e-6 && b.x + b.w <= t.x + t.w + 1e-6 && b.y + b.h <= t.y + t.h + 1e-6;
const none = new Set<string>();

describe("the map's categories", () => {
  it("groups the blocks by category, biggest first, as the design's legend does", () => {
    expect(mapCategories(entries).map((c) => `${c.label} ${Math.round(c.monthly)}`)).toEqual(["Software 2516", "Fitness 1500", "Streaming 798", "Shopping 225", "Cloud storage 219", "Food 183", "Music 119"]);
  });

  it("lists each category's subscriptions biggest first, adding up to its total", () => {
    for (const c of mapCategories(entries)) {
      expect(c.members.reduce((t, m) => t + m.monthly, 0)).toBeCloseTo(c.monthly, 9);
      for (let i = 1; i < c.members.length; i++) expect(c.members[i - 1].monthly).toBeGreaterThanOrEqual(c.members[i].monthly);
    }
  });

  it("gives a category's hover card its count and share", () => {
    const [software] = mapCategories(entries);
    expect(categoryCard(software, total)).toEqual({ count: `${software.members.length} subscriptions`, share: `${Math.round((software.monthly / total) * 100)}% of your ₹5,559 a month` });
    const music = mapCategories(entries).find((c) => c.key === "Music")!;
    expect(categoryCard(music, total).count).toBe("1 subscription");
  });
});

describe("the map's layout", () => {
  const W = 700, H = 520;

  it("sizes Each's blocks by what they cost, inside the map", () => {
    const { boxes, tiles } = mapLayout(entries, { by: "each", without: none, ghost: null, width: W, height: H });
    expect(boxes.size).toBe(entries.length);
    expect(tiles.size).toBe(0);
    for (const b of boxes.values()) expect(inside(b, { x: 0, y: 0, w: W, h: H })).toBe(true);
    const netflix = boxes.get("demo-netflix")!, spotify = boxes.get("demo-spotify")!;
    // Bigger cost, bigger block: roughly in proportion, less the gaps.
    expect(area(netflix)).toBeGreaterThan(area(spotify) * 3);
  });

  it("lays each subscription out inside its category's tile By category, so the same blocks move", () => {
    const { boxes, tiles } = mapLayout(entries, { by: "category", without: none, ghost: null, width: W, height: H });
    expect(boxes.size).toBe(entries.length);
    expect([...tiles.keys()]).toEqual(mapCategories(entries).map((c) => c.key));
    for (const e of entries) expect(inside(boxes.get(e.id)!, tiles.get(e.category)!)).toBe(true);
  });

  it("leaves out the ones tried without, folding each to the middle of where it was, and grows the rest", () => {
    const before = mapLayout(entries, { by: "each", without: none, ghost: null, width: W, height: H }).boxes;
    const after = mapLayout(entries, { by: "each", without: new Set(["demo-chatgpt"]), ghost: null, width: W, height: H }).boxes;
    const was = before.get("demo-chatgpt")!;
    expect(after.get("demo-chatgpt")).toEqual({ x: was.x + was.w / 2, y: was.y + was.h / 2, w: 0, h: 0 });
    expect(area(after.get("demo-netflix")!)).toBeGreaterThan(area(before.get("demo-netflix")!));
  });

  it("makes room for a ghost, sized by what it would cost, in either view", () => {
    for (const by of ["each", "category"] as const) {
      const plain = mapLayout(entries, { by, without: none, ghost: null, width: W, height: H });
      const { ghost, boxes } = mapLayout(entries, { by, without: none, ghost: 299, width: W, height: H });
      expect(plain.ghost).toBeNull();
      expect(ghost).not.toBeNull();
      expect(area(ghost!)).toBeGreaterThan(0);
      // Everything else gives up a little room for it.
      expect(area(boxes.get("demo-netflix")!)).toBeLessThan(area(plain.boxes.get("demo-netflix")!));
    }
  });

  it("insets every box by the gap, so neighbours never touch", () => {
    const { boxes } = mapLayout(entries, { by: "each", without: none, ghost: null, width: W, height: H });
    const list = [...boxes.values()];
    for (const a of list)
      for (const b of list) {
        if (a === b) continue;
        const apart = a.x + a.w + GAP - 1e-6 <= b.x || b.x + b.w + GAP - 1e-6 <= a.x || a.y + a.h + GAP - 1e-6 <= b.y || b.y + b.h + GAP - 1e-6 <= a.y;
        expect(apart).toBe(true);
      }
  });
});

describe("trying the map without some", () => {
  it("says nothing while none are left out", () => {
    expect(whatIf(entries, none)).toBeNull();
  });

  it("says what's left to pay a month and what it saves a year", () => {
    const one = whatIf(entries, new Set(["demo-chatgpt"]))!;
    expect(one.names).toBe("ChatGPT");
    expect(one.monthly).toBeCloseTo(total - 1999, 9);
    expect(one.savedYearly).toBeCloseTo(1999 * 12, 9);
  });

  it("counts a yearly plan by its monthly share, so a year saved is its yearly price", () => {
    const m365 = entries.find((e) => e.id === "demo-m365")!;
    expect(whatIf(entries, new Set(["demo-m365"]))!.savedYearly).toBeCloseTo(m365.monthly * 12, 9);
    expect(m365.monthly * 12).toBeCloseTo(6199, 6);
  });

  it("names several the way a sentence would", () => {
    expect(whatIf(entries, new Set(["demo-chatgpt", "demo-netflix", "demo-spotify"]))!.names).toBe("ChatGPT, Netflix and Spotify");
  });
});
