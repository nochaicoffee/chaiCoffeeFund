import { describe, expect, it } from "vitest";
import { cameInTile, investedTile, leftTile, savedNote, spentTile } from "./investedTile";

describe("investedTile", () => {
  it("is what was sent to brokers less what came back, with both under it", () => {
    expect(investedTile({ sent: 506000, takenBack: 449583, invested: 56417 })).toEqual({ label: "Invested", value: "₹56,417", note: "₹5,06,000 sent · ₹4,49,583 back" });
  });
  it("says Taken back when more came back than went, never a negative Invested", () => {
    expect(investedTile({ sent: 100000, takenBack: 259048, invested: -159048 })).toEqual({ label: "Taken back", value: "₹1,59,048", note: "₹1,00,000 sent · ₹2,59,048 back" });
  });
  it("says when nothing was sent, or only sent", () => {
    expect(investedTile({ sent: 0, takenBack: 0, invested: 0 }).note).toBe("Nothing sent to brokers");
    expect(investedTile({ sent: 5000, takenBack: 0, invested: 5000 }).note).toBe("Sent to your brokers");
  });
});

describe("cameInTile", () => {
  it("is income only, naming money borrowed under it", () => {
    expect(cameInTile({ cameIn: 200000, borrowed: 0, held: 0 })).toEqual({ label: "Came in", value: "₹2,00,000", note: "Income received" });
    expect(cameInTile({ cameIn: 200000, borrowed: 1100920, held: 0 }).note).toBe("Income, plus ₹11,00,920 borrowed");
  });

  it("names money held for a friend apart from loans, and never as income", () => {
    expect(cameInTile({ cameIn: 200000, borrowed: 0, held: 200000 })).toMatchObject({ value: "₹2,00,000", note: "Income, plus ₹2,00,000 held for others" });
    expect(cameInTile({ cameIn: 0, borrowed: 1100920, held: 200000 }).note).toBe("Income, plus ₹11,00,920 borrowed and ₹2,00,000 held for others");
  });
});

describe("savedNote", () => {
  it("gives what was kept in the bank once brokers or loans moved money, and the plain rule otherwise", () => {
    expect(savedNote({ invested: 0, borrowed: 0, lent: 0, moved: 0, keptInBank: 5000 })).toBe("Came in less expenses");
    expect(savedNote({ invested: 1100920, borrowed: 1100920, lent: 0, moved: 0, keptInBank: 200000 })).toBe("₹2,00,000 kept in the bank");
    expect(savedNote({ invested: 300000, borrowed: 0, lent: 0, moved: 0, keptInBank: -100000 })).toBe("₹1,00,000 more left the bank than you saved");
    // More taken back from brokers than sent: the bank kept more than was saved, and says so.
    expect(savedNote({ invested: -160000, borrowed: 0, lent: 0, moved: 0, keptInBank: 260000 })).toBe("₹2,60,000 kept in the bank");
    // Lending alone is enough to work out what was kept, and the note says how much is out with people.
    expect(savedNote({ invested: 0, borrowed: 0, lent: 182000, moved: 0, keptInBank: 18000 })).toBe("₹18,000 kept in the bank · ₹1,82,000 lent out");
    // Money moved in from another of his banks counts in what this one kept.
    expect(savedNote({ invested: 0, borrowed: 0, lent: 0, moved: 92000, keptInBank: 1_00_000 })).toBe("₹1,00,000 kept in the bank");
  });
});

describe("spentTile", () => {
  const out = { "Card bills": 700330, Subscriptions: 4390, EMIs: 390324, "Big spends": 560066, Investments: 0 };
  it("adds the cash and UPI that left with no record to what the records explain, and says how much of it there is", () => {
    expect(spentTile({ expenses: 1655110, out }, -316061)).toEqual({ label: "Spent", value: "₹19,71,171", note: "₹16,55,110 recorded, ₹3,16,061 cash and UPI" });
  });
  it("is the recorded expenses alone when nothing left unrecorded, and never counts money that came in with no record as spending", () => {
    expect(spentTile({ expenses: 1655110, out }, 0).value).toBe("₹16,55,110");
    expect(spentTile({ expenses: 1655110, out }, 25000)).toEqual({ label: "Spent", value: "₹16,55,110", note: "Card bills, subscriptions, EMIs, big spends" });
    expect(spentTile({ expenses: 5000, out: { ...out, "Big spends": 0 } }, 0).note).toBe("Card bills, subscriptions, EMIs");
  });
});

describe("leftTile", () => {
  const banks = { start: 24224, end: 13218, from: "2026-01-01" };
  it("is the balance now, with how far it moved since the period began", () => {
    expect(leftTile(-11006, 0, banks)).toEqual({ label: "In the bank now", value: "₹13,218", note: "Down ₹11,006 since Jan 1, from ₹24.2k", footnote: "Matches your balances, to the rupee", tone: undefined });
    expect(leftTile(42000, 0, { start: 100000, end: 142000, from: "2026-01-01" })).toMatchObject({ value: "₹1,42,000", note: "Up ₹42,000 since Jan 1, from ₹1.0L", tone: "positive" });
  });
  it("says so when an account opened inside the period, since then the change is not the two balances' difference", () => {
    expect(leftTile(-11006, 0, { start: 10000, end: 13218, from: "2026-01-01" }).footnote).toBe("Accounts first read in this period count from their first balance");
  });
  it("names money that came in with no record, but not cash and UPI out, which Spent already holds", () => {
    expect(leftTile(-11006, -316061, banks).footnote).toBe("Matches your balances, to the rupee");
    expect(leftTile(-11006, 25000, banks).footnote).toBe("Matches your balances, to the rupee · ₹25,000 came in with no record");
  });
});
