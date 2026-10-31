import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("keeps commas, quotes and line breaks inside a quoted field", () => {
    expect(parseCsv('a,"b, c","say ""hi""","line\nbreak"\n1,2,3,4\n')).toEqual([
      ["a", "b, c", 'say "hi"', "line\nbreak"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("reads CRLF lines and a last line with no line break", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\n")).toEqual([["a", "", "c"]]);
  });
});
