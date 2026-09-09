import { createRequire } from "module";
import { GlobalWorkerOptions, getDocument, PasswordResponses } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

// pdf.js's in-process "fake worker" fallback (used when no workerSrc is set)
// throws a DataCloneError from its loopback postMessage simulation in this
// version — pointing it at the real worker file makes it use an actual
// worker_threads worker instead, which works cleanly. Resolved once, at
// module load, via `require.resolve` rather than `import.meta.resolve` —
// the latter returns an unresolved relative path under Vitest's module
// runner (fine in plain Node/tsx, broken under `vitest run`), so this file's
// own tests would otherwise hit the exact DataCloneError this is avoiding.
GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

export type DecryptResult =
  | { text: string; passwordUsed: string | null }
  | { failure: "no_password_matched" | "no_text_extracted" };

/**
 * Opens a PDF (encrypted or not) and extracts its plain text.
 *
 * For an encrypted PDF, pdf.js rejects `getDocument(...).promise` with a
 * `PasswordException` — `NEED_PASSWORD` on the first attempt (no password
 * given yet) and `INCORRECT_PASSWORD` after a wrong one — so
 * `candidatePasswords` are tried in order by re-calling `getDocument`,
 * mirroring the reference pypdf `decrypt()`-then-retry loop. Text
 * extraction (`getTextContent`) never touches canvas/DOMMatrix — those are
 * only needed for `page.render()` (rasterizing), never called here.
 */
export async function decryptAndExtractText(
  pdfBytes: Uint8Array,
  candidatePasswords: string[],
): Promise<DecryptResult> {
  const attempts: (string | null)[] = [null, ...candidatePasswords];

  for (const password of attempts) {
    // pdf.js's Node "fake worker" transfers (detaches) the `data` buffer on
    // each call — reusing `pdfBytes` across retry attempts would hand the
    // second attempt an already-detached buffer and fail with an unrelated
    // DataCloneError. Each attempt gets its own copy.
    const task = getDocument({
      data: pdfBytes.slice(),
      password: password ?? undefined,
      disableFontFace: true,
      standardFontDataUrl: undefined,
    });

    let doc: PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (error) {
      // Always destroy a rejected task before retrying — leaving its fake
      // worker/message-port state alive corrupts the *next* getDocument
      // call in this process (surfaces as an unrelated DataCloneError deep
      // in pdf.js's internal message passing, not as an error here).
      await task.destroy();
      if (isPasswordException(error)) {
        // NEED_PASSWORD (no password given yet) or INCORRECT_PASSWORD
        // (wrong candidate) — move on to the next candidate.
        continue;
      }
      throw error;
    }

    try {
      const text = await extractAllText(doc);
      if (!text.trim()) return { failure: "no_text_extracted" };
      return { text, passwordUsed: password };
    } finally {
      await task.destroy();
    }
  }

  return { failure: "no_password_matched" };
}

function isPasswordException(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) return false;
  if (error.name !== "PasswordException") return false;
  const code = (error as { code?: number }).code;
  return code === PasswordResponses.NEED_PASSWORD || code === PasswordResponses.INCORRECT_PASSWORD;
}

async function extractAllText(doc: PDFDocumentProxy): Promise<string> {
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(pageText);
  }
  return pageTexts.join("\n");
}
