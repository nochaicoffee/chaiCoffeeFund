import { pathToFileURL } from "url";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { decryptAndExtractText, pdfWorkerPath } from "./decryptAndExtractText";

// Throwaway synthetic PDF generated locally with pypdf — never a real
// statement, even encrypted. Password is "test1234".
const FIXTURE_PATH = join(__dirname, "__fixtures__/synthetic-encrypted-statement.pdf");

function loadFixture(): Uint8Array {
  return new Uint8Array(readFileSync(FIXTURE_PATH));
}

describe("decryptAndExtractText", () => {
  it("extracts text once the correct password is found among candidates", async () => {
    const result = await decryptAndExtractText(loadFixture(), ["wrong-password", "test1234"]);
    expect(result).not.toHaveProperty("failure");
    if ("text" in result) {
      expect(result.passwordUsed).toBe("test1234");
      expect(result.text).toContain("Total Amount Due: Rs. 1,234.56");
      expect(result.text).toContain("Payment Due Date: 20/09/2026");
    }
  });

  it("reports no_password_matched when no candidate password works", async () => {
    const result = await decryptAndExtractText(loadFixture(), ["nope", "still-wrong"]);
    expect(result).toEqual({ failure: "no_password_matched" });
  });

  it("reports no_password_matched when given no candidates at all", async () => {
    const result = await decryptAndExtractText(loadFixture(), []);
    expect(result).toEqual({ failure: "no_password_matched" });
  });
});

describe("pdfWorkerPath", () => {
  it("points at pdf.js's worker file, as a plain path string", () => {
    const worker = pdfWorkerPath();
    expect(typeof worker).toBe("string");
    expect(worker.endsWith("pdf.worker.mjs")).toBe(true);
    expect(existsSync(worker)).toBe(true);
  });
});

describe("worker setup", () => {
  it("points pdf.js at the real worker file, not its relative default", async () => {
    const { GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    await decryptAndExtractText(loadFixture(), ["test1234"]);
    // pdf.js's own default is "./pdf.worker.mjs", which breaks once Next bundles pdf.js.
    expect(GlobalWorkerOptions.workerSrc).toBe(pathToFileURL(pdfWorkerPath()).href);
  });
});
