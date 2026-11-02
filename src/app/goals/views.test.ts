import { describe, expect, it } from "vitest";
import { sentenceText } from "@/app/cards/summarySentence";
import { demoGoalsData } from "@/lib/demo/goalsDemo";
import { ALL, deriveGoals, goalSides, greetingView, pickIds, sideView, skyView, summarySentence, type GoalsPageData } from "./views";

const TODAY = "2026-10-29";
const sample = (variant = "") => demoGoalsData(TODAY, variant);
const points = (parts: ReturnType<typeof summarySentence>) => [...new Set(parts.filter((p) => p.point).map((p) => p.point as string))];

describe("the greeting", () => {
  for (const variant of ["", "one", "overdue", "over", "funded", "earmark", "empty"]) {
    it(`gives every figure in the sentence a card, and every card a figure (${variant || "the sample"})`, () => {
      const data = sample(variant);
      expect(points(summarySentence(data, TODAY)).sort()).toEqual(Object.keys(greetingView(data, TODAY)).sort());
    });
  }

  it("reads as the design's sentence for the sample goals", () => {
    const text = sentenceText(summarySentence(sample(), TODAY));
    expect(text).toBe("You're saving for 5 goals, and ₹3.1L of the ₹11.7L is set aside. Paying each on its own schedule takes ₹73,690 a month, but ₹27,000 would hit every date if they're funded in order, and you plan ₹65,000. New fridge is next, due Dec 20 with ₹17,000 still to set aside.");
  });

  it("says so when nothing is set up, when every goal is funded, and when a date has already passed", () => {
    expect(sentenceText(summarySentence(sample("empty"), TODAY))).toContain("Nothing is set aside yet");
    expect(sentenceText(summarySentence(sample("funded"), TODAY))).toMatch(/^Every goal is funded\. ₹11\.7L is set aside for 5 goals/);
    expect(sentenceText(summarySentence(sample("overdue"), TODAY))).toContain("a date has already passed");
  });

  it("each card's rows add up to its total", () => {
    const cards = greetingView(sample(), TODAY);
    const rupees = (text: string) => Number(text.replace(/[^\d]/g, ""));
    expect(cards.saved!.rows.reduce((s, r) => s + rupees(r.amount), 0)).toBe(rupees(cards.saved!.total));
    expect(cards.target!.rows.reduce((s, r) => s + rupees(r.amount), 0)).toBe(rupees(cards.target!.total));
  });
});

describe("the picks and the sky", () => {
  const data = sample();
  it("picks All and each goal that has a planet, in the sky's order, and no bought or dropped goal", () => {
    const ids = pickIds(data, TODAY);
    expect(ids[0]).toBe(ALL);
    expect(ids).toEqual([ALL, "fridge", "car", "ipad", "goa", "masters", "camera"]);
  });
  it("draws a planet per piece, each with its own ring and angle and its name, and the sun reads what's saved", () => {
    const sky = skyView(data, TODAY);
    expect(sky.planets).toHaveLength(11);
    expect(new Set(sky.planets.map((p) => p.key)).size).toBe(11);
    expect(sky.sun).toMatchObject({ saved: "₹3.1L", of: "of ₹11.7L · 27%", empty: false, done: false });
    expect(sky.hasSomeday).toBe(true);
    expect(sky.hasOverdue).toBe(false);
    expect(sky.planets.find((p) => p.key === "car#own")?.label).toBe("Car upgrade · the rest");
  });
  it("a late goal sits on the overdue ring and draws red; an over-funded one shows the extra", () => {
    const late = skyView(sample("overdue"), TODAY);
    expect(late.hasOverdue).toBe(true);
    expect(late.planets.find((p) => p.key === "fridge")).toMatchObject({ ring: 0, late: true });
    const over = skyView(sample("over"), TODAY);
    expect(over.planets.find((p) => p.key === "fridge")).toMatchObject({ progress: 1, over: "+₹3.1k" });
  });
  it("the empty sky is empty and the funded sky glows", () => {
    expect(skyView(sample("empty"), TODAY).sun).toMatchObject({ empty: true, saved: "₹0" });
    expect(skyView(sample("funded"), TODAY).sun.done).toBe(true);
  });
  it("derives the totals and pieces once and every view reads them", () => {
    const d = deriveGoals(data, TODAY);
    expect(skyView(data, TODAY, d)).toEqual(skyView(data, TODAY));
    expect(goalSides(data, TODAY, d)).toEqual(goalSides(data, TODAY));
  });
});

describe("the side of the sky", () => {
  const data = sample();
  it("the bands add up to what's to go on every dated piece", () => {
    const side = sideView(data, TODAY);
    const rupees = (text: string) => Number(text.replace(/[^\d]/g, ""));
    expect(side.bands.map((b) => b.title)).toEqual(["Within 3 months", "3 to 12 months", "1 to 2 years", "Further out"]);
    expect(side.bands.reduce((s, b) => s + rupees(b.togo), 0)).toBe(27000 + 127800 + 233500 + 470000);
    expect(side.closest?.name).toBe("New fridge");
    expect(side.furthest?.name).toBe("Masters course");
  });
  it("each picked goal's side: the car's five pieces, the fridge's set-asides, and the paused camera", () => {
    const sides = goalSides(data, TODAY);
    expect(Object.keys(sides)).toEqual(["fridge", "car", "ipad", "goa", "masters", "camera"]);
    expect(sides.car).toMatchObject({ hasKids: true, big: "₹2,68,500", standing: "Behind" });
    expect(sides.car.pieces).toHaveLength(5);
    expect(sides.fridge).toMatchObject({ hasKids: false, fixed: true, need: true, big: "₹17,000" });
    expect(sides.fridge.entries.map((e) => e.amount)).toEqual(["+₹15,000", "+₹15,000", "+₹15,000"]);
    expect(sides.camera).toMatchObject({ status: "Paused", bigNote: "set aside · paused", facts: [] });
  });
  it("an over-funded goal says how much more than it needs", () => {
    const sides = goalSides(sample("over"), TODAY);
    expect(sides.fridge.facts[0]).toEqual({ name: "More than it needs", value: "₹3,100" });
  });
});

describe("a goal with nothing the sky can show", () => {
  it("has no picks but All, and no sides", () => {
    const data: GoalsPageData = sample("empty");
    expect(pickIds(data, TODAY)).toEqual([ALL]);
    expect(goalSides(data, TODAY)).toEqual({});
  });
});
