import { describe, expect, it } from "vitest";
import { investedTile } from "./investedTile";

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
