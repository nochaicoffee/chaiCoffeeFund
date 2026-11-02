import { describe, expect, it } from "vitest";
import { LABEL_BAND, MAX_RING_MONTHS, OVERDUE_RING, SOMEDAY_RING, SKY_SIZE, nameAbove, orbitAngle, placePlanets, planetRadius, ringOf, ringRadius, skyPieces } from "./goalsOrbit";
import { TODAY, goal, sample, set } from "./goals.fixture";
import { savedOf, targetOf } from "./goals";

describe("rings", () => {
  it("is the months left, capped at the last ring", () => {
    expect(ringOf("2026-12-20", false, TODAY)).toBe(1);
    expect(ringOf("2027-02-28", false, TODAY)).toBe(4);
    expect(ringOf("2029-06-30", false, TODAY)).toBe(32);
    expect(ringOf("2040-01-01", false, TODAY)).toBe(MAX_RING_MONTHS);
  });
  it("a date that has passed is overdue, and a date of today is not (it is on the first ring)", () => {
    expect(ringOf("2026-10-20", false, TODAY)).toBe(OVERDUE_RING);
    expect(ringOf("2026-10-28", false, TODAY)).toBe(OVERDUE_RING);
    expect(ringOf("2026-10-29", false, TODAY)).toBe(1);
  });
  it("paused or undated is someday, whatever the date", () => {
    expect(ringOf(null, false, TODAY)).toBe(SOMEDAY_RING);
    expect(ringOf("2027-01-01", true, TODAY)).toBe(SOMEDAY_RING);
  });
});

describe("the pieces", () => {
  const data = sample();
  const pieces = skyPieces(data, TODAY);
  it("the sample is eleven planets: the car's five, the iPad's two, and one each for the fridge, the trip, the course and the paused camera", () => {
    expect(pieces).toHaveLength(11);
    expect(pieces.filter((p) => p.topId === "car")).toHaveLength(5);
    expect(pieces.filter((p) => p.topId === "ipad")).toHaveLength(2);
  });
  it("a dropped and a bought goal are not in the sky", () => {
    expect(pieces.map((p) => p.goalId)).not.toContain("dash");
    expect(pieces.map((p) => p.goalId)).not.toContain("phones");
  });
  it("a parent's pieces add up to its target and its saved", () => {
    for (const top of data.goals.filter((g) => !g.parentId && (g.status === "Active" || g.status === "Paused"))) {
      const mine = pieces.filter((p) => p.topId === top.id);
      expect(mine.reduce((s, p) => s + p.amount, 0)).toBe(targetOf(data, top));
      expect(mine.reduce((s, p) => s + p.saved, 0)).toBe(savedOf(data, top));
    }
  });
  it("keys are unique, and a parent's own part is told from the parent", () => {
    expect(new Set(pieces.map((p) => p.key)).size).toBe(pieces.length);
    expect(pieces.find((p) => p.key === "car#own")?.name).toBe("Car upgrade: the rest");
    expect(pieces.find((p) => p.key === "tyres")?.parentName).toBe("Car upgrade");
  });
  it("is in funding order: the Fixed fridge first, the paused camera last", () => {
    expect(pieces[0].goalId).toBe("fridge");
    expect(pieces[1].goalId).toBe("tyres");
    expect(pieces.at(-1)?.goalId).toBe("camera");
    expect(pieces.at(-1)?.ring).toBe(SOMEDAY_RING);
  });
  it("a paused parent puts every piece on the someday ring and plans nothing", () => {
    const d = sample();
    d.goals.find((g) => g.id === "car")!.status = "Paused";
    const car = skyPieces(d, TODAY).filter((p) => p.topId === "car");
    expect(car.every((p) => p.paused && p.ring === SOMEDAY_RING && p.planned === 0 && p.required === 0)).toBe(true);
  });
  it("a funded piece has nothing left and needs nothing", () => {
    const d = { goals: [goal({ id: "a", name: "A", amount: 100, targetDate: "2027-05-01", plannedMonthly: 10 })], contributions: [set("a", 100)] };
    expect(skyPieces(d, TODAY)[0]).toMatchObject({ left: 0, required: 0 });
  });
  it("the same goals in any order draw the same sky", () => {
    const shuffled = { goals: [...data.goals].reverse(), contributions: data.contributions };
    expect(skyPieces(shuffled, TODAY).map((p) => p.key)).toEqual(pieces.map((p) => p.key));
  });
});

describe("where a planet sits", () => {
  it("keeps every angle clear of the ring labels at the top", () => {
    for (let i = 0; i < 200; i++) {
      const angle = orbitAngle(i);
      expect(angle < LABEL_BAND.from || angle > LABEL_BAND.to).toBe(true);
    }
  });
  it("is the same every time, and the first ten are well apart", () => {
    expect(orbitAngle(3)).toBe(orbitAngle(3));
    const angles = Array.from({ length: 10 }, (_, i) => orbitAngle(i)).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i++) expect(angles[i] - angles[i - 1]).toBeGreaterThan(8);
  });
});

describe("placing the planets", () => {
  const pieces = skyPieces(sample(), TODAY);
  const planets = pieces.map((p) => ({ ring: p.ring, radius: planetRadius(p.amount) }));
  const placed = placePlanets(planets);
  const centreOf = (i: number) => ({ x: SKY_SIZE / 2 + ringRadius(planets[i].ring) * Math.cos((placed[i].angle * Math.PI) / 180), y: SKY_SIZE / 2 + ringRadius(planets[i].ring) * Math.sin((placed[i].angle * Math.PI) / 180) });
  it("gives every planet an angle outside the label band, the same every time", () => {
    expect(placed).toHaveLength(planets.length);
    for (const { angle } of placed) expect(angle < LABEL_BAND.from || angle > LABEL_BAND.to).toBe(true);
    expect(placePlanets(planets)).toEqual(placed);
  });
  it("keeps every planet and its name clear of every other planet's name in the sample", () => {
    for (let i = 0; i < planets.length; i++)
      for (let j = i + 1; j < planets.length; j++) {
        const a = centreOf(i), b = centreOf(j);
        const sameBand = Math.abs(a.x - b.x) < 104 && Math.abs(a.y - b.y) < 36 + planets[i].radius + planets[j].radius;
        expect(sameBand).toBe(false);
      }
  });
  it("stays on its ring: the angle moves a planet, never its distance from the middle", () => {
    for (let i = 0; i < planets.length; i++) expect(Math.hypot(centreOf(i).x - SKY_SIZE / 2, centreOf(i).y - SKY_SIZE / 2)).toBeCloseTo(ringRadius(planets[i].ring), 5);
  });
  it("puts a name above a planet only when there's no room under it", () => {
    for (let i = 0; i < planets.length; i++) expect(placed[i].nameAbove).toBe(nameAbove(centreOf(i).y, planets[i].radius));
    expect(nameAbove(SKY_SIZE - 40, 20)).toBe(true);
    expect(nameAbove(100, 20)).toBe(false);
  });
});
