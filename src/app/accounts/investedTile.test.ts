import { describe, expect, it } from "vitest";
import { cameInTile, investedTile, savedNote } from "./investedTile";

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
    expect(cameInTile({ cameIn: 200000, borrowed: 0 })).toEqual({ label: "Came in", value: "₹2,00,000", note: "Income received" });
    expect(cameInTile({ cameIn: 200000, borrowed: 1100920 }).note).toBe("Income, plus ₹11,00,920 borrowed");
  });
});

describe("savedNote", () => {
  it("gives what was kept in the bank once brokers or loans moved money, and the plain rule otherwise", () => {
    expect(savedNote({ invested: 0, borrowed: 0, lent: 0, keptInBank: 5000 })).toBe("Came in less expenses");
    expect(savedNote({ invested: 1100920, borrowed: 1100920, lent: 0, keptInBank: 200000 })).toBe("₹2,00,000 kept in the bank");
    expect(savedNote({ invested: 300000, borrowed: 0, lent: 0, keptInBank: -100000 })).toBe("₹1,00,000 more left the bank than you saved");
    // More taken back from brokers than sent: the bank kept more than was saved, and says so.
    expect(savedNote({ invested: -160000, borrowed: 0, lent: 0, keptInBank: 260000 })).toBe("₹2,60,000 kept in the bank");
    // Lending alone is enough to work out what was kept, and the note says how much is out with people.
    expect(savedNote({ invested: 0, borrowed: 0, lent: 182000, keptInBank: 18000 })).toBe("₹18,000 kept in the bank · ₹1,82,000 lent out");
  });
});
