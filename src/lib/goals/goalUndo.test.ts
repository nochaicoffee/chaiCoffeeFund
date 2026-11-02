import { describe, expect, it } from "vitest";
import { goalUndoToken, parseGoalUndo, type GoalUndo } from "./goalUndo";

describe("undo tokens", () => {
  it("round trip each kind", () => {
    const kinds: GoalUndo[] = [{ undo: "add", goalId: "g" }, { undo: "entry", entryId: "e" }, { undo: "status", changes: [{ id: "g", was: "Active" }] }, { undo: "edit", goalId: "g", previous: { name: "A", amount: 10 } }, { undo: "delete", goals: [{ id: "g", name: "A" }], contributions: [] }];
    for (const undo of kinds) expect(parseGoalUndo(goalUndoToken(undo))).toEqual(undo);
  });
  it("refuses anything else: not JSON, an unknown kind, a status that isn't one, an empty id", () => {
    for (const bad of ["nope", "{}", JSON.stringify({ undo: "wipe" }), JSON.stringify({ undo: "status", changes: [{ id: "g", was: "Gone" }] }), JSON.stringify({ undo: "add", goalId: "" }), JSON.stringify({ undo: "status", changes: [] })])
      expect(parseGoalUndo(bad)).toBeNull();
  });
});
