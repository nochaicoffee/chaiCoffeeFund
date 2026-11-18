import { describe, expect, it } from "vitest";
import { readCookie } from "./cookies";

describe("readCookie", () => {
  it("finds one cookie among several", () => {
    expect(readCookie("a=1; chai_session=abc.def; b=2", "chai_session")).toBe("abc.def");
    expect(readCookie("chai_session=x", "chai_session")).toBe("x");
  });
  it("keeps an = inside the value", () => {
    expect(readCookie("t=a=b==", "t")).toBe("a=b==");
  });
  it("matches the whole name, not the end of another", () => {
    expect(readCookie("not_chai_session=1", "chai_session")).toBeUndefined();
  });
  it("is undefined when there is no header or no such cookie", () => {
    expect(readCookie(null, "x")).toBeUndefined();
    expect(readCookie("", "x")).toBeUndefined();
    expect(readCookie("a=1", "x")).toBeUndefined();
    expect(readCookie("garbage", "x")).toBeUndefined();
  });
});
