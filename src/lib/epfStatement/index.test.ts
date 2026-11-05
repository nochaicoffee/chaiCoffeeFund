import { describe, expect, it } from "vitest";
import { parseEpfPassbook } from "./index";
import { parseEpfPassbookText } from "./parseEpfPassbookText";
import { FAKE, aTypicalYear, pdfOfLines, syntheticPassbookPdf, syntheticPassbookText } from "./__fixtures__/syntheticPassbook";

describe("parseEpfPassbook (a real PDF through the app's PDF reader)", () => {
  it("reads a synthetic passbook to the same rows and checks as its text", async () => {
    const year = aTypicalYear();
    const fromPdf = await parseEpfPassbook(syntheticPassbookPdf(year));
    expect(fromPdf).toEqual(parseEpfPassbookText(syntheticPassbookText(year)));
    if (!fromPdf.ok) throw new Error(fromPdf.problem);
    expect(fromPdf.passbook.credits).toHaveLength(12);
    expect(fromPdf.passbook.memberIdLast4).toBe(FAKE.memberIdLast4);
    expect(fromPdf.checks.passes).toBe(true);
  });
  it("says what's wrong with a file that doesn't add up, from the PDF", async () => {
    const r = await parseEpfPassbook(syntheticPassbookPdf(aTypicalYear({ closing: { employee: 230000, employer: 229000, pension: 0 } })));
    if (!r.ok) throw new Error(r.problem);
    expect(r.checks.passes).toBe(false);
    expect(r.checks.balanceGap.employee).toBe(1000);
  });
  it("is not fooled by a PDF that isn't a passbook, or by bytes that aren't a PDF", async () => {
    const other = await parseEpfPassbook(pdfOfLines(["Statement of account", "Opening balance  1,000.00  Closing balance  2,000.00"]));
    expect(other).toEqual({ ok: false, problem: "this doesn't look like an EPF passbook (no financial year heading)" });
    expect(await parseEpfPassbook(new Uint8Array())).toEqual({ ok: false, problem: "couldn't open the file as a PDF" });
    const junk = await parseEpfPassbook(new TextEncoder().encode("this is not a pdf"));
    expect(junk).toEqual({ ok: false, problem: "couldn't open the file as a PDF" });
  });
});
