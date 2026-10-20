import { describe, expect, it } from "vitest";
import { addDays, clampDate, isIsoDate, monthWeeks, moveDate, parseTypedDate, sameDayIn, weekdayOf, type TypedDateContext } from "./dates";

const TODAY = "2026-10-20"; // a Tuesday

describe("isIsoDate", () => {
  it("accepts real dates only", () => {
    expect(isIsoDate("2026-10-20")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-1-01")).toBe(false);
    expect(isIsoDate("Oct 20, 2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("addDays and weekdayOf", () => {
  it("crosses months, years and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-18", 20)).toBe("2026-11-07");
  });

  it("numbers weekdays from Sunday", () => {
    expect(weekdayOf("2026-10-18")).toBe(0);
    expect(weekdayOf(TODAY)).toBe(2);
    expect(weekdayOf("2026-10-24")).toBe(6);
  });
});

describe("clampDate", () => {
  it("keeps a date inside its bounds", () => {
    expect(clampDate("2026-11-02", "2026-09-18", TODAY)).toBe(TODAY);
    expect(clampDate("2026-09-01", "2026-09-18", TODAY)).toBe("2026-09-18");
    expect(clampDate("2026-10-01", "2026-09-18", TODAY)).toBe("2026-10-01");
    expect(clampDate("2030-01-01")).toBe("2030-01-01");
  });
});

describe("sameDayIn", () => {
  it("keeps the day of the month, or the month's last day", () => {
    expect(sameDayIn("2026-09", TODAY)).toBe("2026-09-20");
    expect(sameDayIn("2026-02", "2026-01-31")).toBe("2026-02-28");
    expect(sameDayIn("2028-02", "2026-10-30")).toBe("2028-02-29");
    expect(sameDayIn("2026-04", "2026-03-31")).toBe("2026-04-30");
  });
});

describe("monthWeeks", () => {
  it("lays a month out in six weeks starting on Sunday", () => {
    const weeks = monthWeeks("2026-10");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // 1 October 2026 is a Thursday.
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks[4]).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    expect(weeks[5]).toEqual(Array(7).fill(null));
  });

  it("has every day of the month once, in order, each under its own weekday", () => {
    for (const month of ["2026-02", "2028-02", "2026-08", "2026-10", "2027-01"]) {
      for (const weekStart of [0, 1]) {
        const cells = monthWeeks(month, weekStart).flat();
        const days = cells.filter((d): d is string => d !== null);
        expect(days[0]).toBe(`${month}-01`);
        days.forEach((d, i) => i > 0 && expect(d).toBe(addDays(days[i - 1], 1)));
        expect(days.every((d) => d.startsWith(month))).toBe(true);
        cells.forEach((d, i) => d && expect(weekdayOf(d)).toBe((i + weekStart) % 7));
      }
    }
  });

  it("uses all six weeks when a month needs them", () => {
    // August 2026 starts on a Saturday.
    expect(monthWeeks("2026-08")[5][0]).toBe("2026-08-30");
    expect(monthWeeks("2026-08")[5][1]).toBe("2026-08-31");
  });

  it("starts the week on Monday when asked", () => {
    expect(monthWeeks("2026-10", 1)[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
});

describe("moveDate", () => {
  it("moves by a day and a week", () => {
    expect(moveDate(TODAY, "ArrowLeft")).toBe("2026-10-19");
    expect(moveDate(TODAY, "ArrowRight")).toBe("2026-10-21");
    expect(moveDate(TODAY, "ArrowUp")).toBe("2026-10-13");
    expect(moveDate("2026-10-31", "ArrowDown")).toBe("2026-11-07");
  });

  it("goes to the ends of the week from its start day", () => {
    expect(moveDate(TODAY, "Home")).toBe("2026-10-18");
    expect(moveDate(TODAY, "End")).toBe("2026-10-24");
    expect(moveDate("2026-10-18", "Home")).toBe("2026-10-18");
    expect(moveDate(TODAY, "Home", { weekStart: 1 })).toBe("2026-10-19");
    expect(moveDate("2026-10-18", "End", { weekStart: 1 })).toBe("2026-10-18");
  });

  it("moves by a month, or a year with Shift, onto the last day of a shorter month", () => {
    expect(moveDate(TODAY, "PageUp")).toBe("2026-09-20");
    expect(moveDate(TODAY, "PageDown")).toBe("2026-11-20");
    expect(moveDate("2026-03-31", "PageUp")).toBe("2026-02-28");
    expect(moveDate("2026-01-31", "PageDown")).toBe("2026-02-28");
    expect(moveDate(TODAY, "PageUp", { shift: true })).toBe("2025-10-20");
    expect(moveDate("2028-02-29", "PageDown", { shift: true })).toBe("2029-02-28");
  });

  it("ignores other keys", () => {
    expect(moveDate(TODAY, "Enter")).toBeNull();
    expect(moveDate(TODAY, "a")).toBeNull();
  });
});

describe("parseTypedDate", () => {
  // Paid on, for a statement of 18 Sep: up to today, typed into a field that held today.
  const paidOn = { today: TODAY, near: TODAY, max: TODAY };
  const read = (text: string, context: TypedDateContext = paidOn) => parseTypedDate(text, context);

  it("reads ISO dates", () => {
    expect(read("2026-10-18")).toBe("2026-10-18");
    expect(read("2026/10/18")).toBe("2026-10-18");
    expect(read("2026-2-5")).toBe("2026-02-05");
    expect(read("2026-02-30")).toBeNull();
  });

  it("reads numbers day first", () => {
    expect(read("18/10")).toBe("2026-10-18");
    expect(read("5/8")).toBe("2026-08-05");
    expect(read("05.08.2026")).toBe("2026-08-05");
    expect(read("5-8-26")).toBe("2026-08-05");
    expect(read("18 10 2026")).toBe("2026-10-18");
    expect(read("31/9")).toBeNull();
    expect(read("0/5")).toBeNull();
    expect(read("5/13")).toBeNull();
    expect(read("18/10/202")).toBeNull();
  });

  it("reads month names either side of the day, with or without the year", () => {
    expect(read("18 oct")).toBe("2026-10-18");
    expect(read("oct 18")).toBe("2026-10-18");
    expect(read("18th October 2026")).toBe("2026-10-18");
    expect(read("Sept 1st")).toBe("2026-09-01");
    expect(read("5 aug 26")).toBe("2026-08-05");
    expect(read("1 jan 2025")).toBe("2025-01-01");
    expect(read("  Oct   18 ")).toBe("2026-10-18");
  });

  it("reads back what the field shows, with or without a weekday", () => {
    expect(read("Oct 18, 2026")).toBe("2026-10-18");
    expect(read("Sun, Oct 18, 2026")).toBe("2026-10-18");
  });

  it("reads today, yesterday and tomorrow from three letters", () => {
    expect(read("today")).toBe(TODAY);
    expect(read("Yesterday")).toBe("2026-10-19");
    expect(read("yes")).toBe("2026-10-19");
    expect(read("tom")).toBe("2026-10-21");
    expect(read("to")).toBeNull();
  });

  it("reads a day alone as the nearest such day, never after the last day allowed", () => {
    expect(read("18")).toBe("2026-10-18");
    expect(read("18th")).toBe("2026-10-18");
    // The 25th nearest today is next Sunday, but Paid on stops at today.
    expect(read("25")).toBe("2026-09-25");
    expect(read("32")).toBeNull();
    // A due date, typed into a field that held 7 Nov: nothing stops it after today.
    expect(read("7", { today: TODAY, near: "2026-11-07" })).toBe("2026-11-07");
  });

  it("fills in the nearest year, or the year before when that's after the last day allowed", () => {
    expect(read("18 dec")).toBe("2025-12-18");
    expect(read("18 dec", { today: TODAY, near: TODAY })).toBe("2026-12-18");
    expect(read("5 jan", { today: "2026-12-20", near: "2026-12-20" })).toBe("2027-01-05");
    expect(read("28 dec", { today: "2027-01-03", near: "2027-01-03", max: "2027-01-03" })).toBe("2026-12-28");
    // Only leap years have a 29 February; it's the nearest one.
    expect(read("29 feb", { today: "2027-10-20", near: "2027-10-20" })).toBe("2028-02-29");
    expect(read("29 feb", { today: "2026-10-20", near: "2026-10-20" })).toBeNull();
  });

  it("returns null for anything else", () => {
    expect(read("")).toBeNull();
    expect(read("   ")).toBeNull();
    expect(read("hello")).toBeNull();
    expect(read("18 oct nov")).toBeNull();
    expect(read("18 oct 2026 2027")).toBeNull();
    expect(read("oct")).toBeNull();
    expect(read("18 ma")).toBeNull();
  });
});
